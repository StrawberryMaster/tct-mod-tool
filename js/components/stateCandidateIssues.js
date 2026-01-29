window.defineComponent('data-table', {
    props: ['items', 'columns', 'title', 'keyField', 'deletable', 'deleteLabel'],

    data() {
        return {
            filter: '',
            sortKey: '',
            sortDir: 1, // 1 for ascending, -1 for descending
            batchMode: false,
            batchValues: {},
            selectedItems: []
        }
    },

    template: `
    <div class="mx-auto bg-white rounded-sm shadow p-4 mb-4">
        <div class="flex justify-between items-center mb-4">
            <h2 class="font-bold text-lg">{{ title }} ({{ filteredItems.length }})</h2>
            <div class="flex">
                <input v-model="filter" placeholder="Filter items..." class="border p-1 mr-2 rounded">
                <button @click="toggleBatchMode" class="bg-blue-500 text-white px-3 py-1 rounded-sm hover:bg-blue-600">
                    {{ batchMode ? 'Exit batch mode' : 'Batch edit' }}
                </button>
            </div>
        </div>
        
        <!-- Batch Edit Mode -->
        <div v-if="batchMode" class="bg-gray-100 p-3 mb-4 rounded">
            <div class="flex items-center justify-between mb-2">
                <h3 class="font-bold">Batch edit {{ selectedItems.length }} items</h3>
                <button 
                    v-if="deletable && selectedItems.length" 
                    @click="deleteSelected" 
                    class="bg-red-500 text-white px-3 py-1 rounded-sm hover:bg-red-600 text-sm"
                >{{ deleteLabel || 'Delete selected' }}</button>
            </div>
            <div v-for="(col, idx) in safeColumns" :key="col.field || idx" class="mb-2" v-if="col && col.editable">
                <label class="block text-sm">{{ col.label }}</label>
                <div class="flex items-center">
                    <input 
                        v-model="batchValues[col.field]" 
                        :placeholder="col.label"
                        class="border p-1 rounded-sm mr-2 grow"
                        :type="col.type || 'text'"
                        :min="col.min"
                        :max="col.max"
                        :step="col.step"
                        @click.stop
                        @keydown.stop
                    >
                    <button @click="applyBatchEdit(col.field)" class="bg-green-500 text-white px-2 py-1 rounded-sm text-sm">Apply</button>
                </div>
            </div>
        </div>
        
        <!-- Table Headers -->
        <div class="grid grid-cols-12 bg-gray-200 p-2 rounded-sm font-bold">
            <div v-if="batchMode" class="col-span-1">
                <input type="checkbox" v-model="allSelected">
            </div>
            <div 
                v-for="(col, idx) in safeColumns" 
                :key="col.field || idx"
                :class="['col-span-' + (col.width || '2'), 'cursor-pointer']"
                @click="sortBy(col.field)"
            >
                {{ col.label }} 
                <span v-if="sortKey === col.field">{{ sortDir === 1 ? '▲' : '▼' }}</span>
            </div>
        </div>
        
        <!-- Table Rows -->
        <div 
            v-for="item in filteredItems" 
            :key="item[keyField]"
            class="grid grid-cols-12 border-b p-2 hover:bg-gray-100"
        >
            <div v-if="batchMode" class="col-span-1">
                <input 
                    type="checkbox" 
                    :value="item[keyField]" 
                    v-model="selectedItems"
                >
            </div>
            <template v-for="(col, idx) in safeColumns">
                <div :class="['col-span-' + (col.width || '2')]" :key="col.field || idx">
                    <input 
                        v-if="col && col.editable"
                        :value="item[col.field]" 
                        @input="updateItem($event, item, col.field)"
                        :type="col.type || 'text'"
                        :min="col.min"
                        :max="col.max"
                        :step="col.step"
                        class="w-full border rounded-sm p-1"
                        @click.stop
                        @keydown.stop
                    >
                    <span v-else>{{ formatValue(item[col.field], col) }}</span>
                </div>
            </template>
        </div>
    </div>
    `,

    methods: {
        sortBy(key) {
            if (this.sortKey === key) {
                this.sortDir *= -1;
            } else {
                this.sortKey = key;
                this.sortDir = 1;
            }
        },

        updateItem(event, item, field) {
            let value = event.target.value;
            if (event.target.type === 'number') {
                value = Number(value);
            }
            this.$emit('update-item', item, field, value);
        },

        formatValue(value, column) {
            if (column.formatter) {
                return column.formatter(value);
            }
            return value;
        },

        toggleBatchMode() {
            this.batchMode = !this.batchMode;
            this.selectedItems = [];
            this.batchValues = {};
        },

        toggleSelectAll(checked) {
            const items = this.filteredItems || [];
            if (checked) {
                this.selectedItems = items.map(item => item[this.keyField]);
            } else {
                this.selectedItems = [];
            }
        },

        applyBatchEdit(field) {
            if (this.batchValues[field] === undefined) return;

            const itemsList = Array.isArray(this.selectedItems) ? this.selectedItems : [];
            const items = Array.isArray(this.items) ? this.items : Object.values(this.items || {});

            itemsList.forEach(itemKey => {
                const item = items.find(i => i[this.keyField] === itemKey);
                if (item) {
                    this.$emit('update-item', item, field, this.batchValues[field]);
                }
            });
        },
        deleteSelected() {
            this.$emit('delete-items', (Array.isArray(this.selectedItems) ? this.selectedItems : []).slice());
            this.selectedItems = [];
        }
    },

    computed: {
        allSelected: {
            get() {
                const filtered = this.filteredItems || [];
                if (!filtered.length) return false;
                return Array.isArray(this.selectedItems) && this.selectedItems.length === filtered.length;
            },
            set(val) {
                this.toggleSelectAll(!!val);
            }
        },

        safeColumns() {
            return Array.isArray(this.columns) ? this.columns.filter(c => c && typeof c === 'object') : [];
        },

        filteredItems() {
            let result = Array.isArray(this.items) ? this.items : (this.items ? Object.values(this.items) : []);

            // Apply filter
            if (this.filter) {
                const lowerFilter = this.filter.toLowerCase();
                result = result.filter(item => {
                    return this.safeColumns.some(col => {
                        if (!col) return false;
                        const value = item[col.field];
                        return value !== null &&
                            value !== undefined &&
                            String(value).toLowerCase().includes(lowerFilter);
                    });
                });
            }

            // Apply sorting
            if (this.sortKey) {
                result = [...result].sort((a, b) => {
                    const aVal = a[this.sortKey];
                    const bVal = b[this.sortKey];
                    return this.sortDir * (aVal > bVal ? 1 : aVal < bVal ? -1 : 0);
                });
            }

            return result;
        }
    }
});

window.defineComponent('state-shift-editor', {
    props: ['shifts', 'title'],
    data() {
        return {
            newStatePk: null,
            newShiftValue: 0
        };
    },
    computed: {
        items() {
            const states = Vue.prototype.$TCT.states;
            return (this.shifts || []).map(s => {
                const st = states[s.state];
                const fields = st ? st.fields : {};
                return {
                    state: s.state,
                    abbr: fields.abbr || '',
                    stateName: fields.name || `State ${s.state}`,
                    electoral_votes: fields.electoral_votes || 0,
                    shift: s.shift
                };
            });
        },
        columns() {
            return [
                { field: 'abbr', label: 'Abbr', width: 1 },
                { field: 'stateName', label: 'State', width: 4 },
                { field: 'electoral_votes', label: 'EV', width: 1 },
                { field: 'shift', label: 'Shift', editable: true, type: 'number', step: 0.1, width: 2 }
            ];
        },
        availableStates() {
            const used = new Set((this.shifts || []).map(s => s.state));
            const states = Vue.prototype.$TCT.states || {};
            return Object.values(states)
                .map(s => ({ pk: s.pk, abbr: s.fields.abbr, name: s.fields.name }))
                .filter(s => !used.has(s.pk))
                .sort((a, b) => a.name.localeCompare(b.name));
        }
    },
    methods: {
        onUpdate(item, field, value) {
            if (field !== 'shift') return;
            this.$emit('update-shift', item.state, value);
        },
        onDeleteSelected(keys) {
            this.$emit('remove-shifts', keys);
        },
        addShift() {
            if (this.newStatePk == null) return;
            const shiftVal = Number(this.newShiftValue);
            this.$emit('add-shift', Number(this.newStatePk), isNaN(shiftVal) ? 0 : shiftVal);
            this.newStatePk = null;
            this.newShiftValue = 0;
        }
    },
    template: `
    <div class="mx-auto bg-white rounded-sm shadow p-4 mb-4">
        <div class="flex justify-between items-end mb-3">
            <div>
                <h2 class="font-bold text-lg">{{ title || 'State Shifts' }} ({{ items.length }})</h2>
            </div>
            <div class="flex items-center space-x-2">
                <select v-model="newStatePk" class="border p-1 rounded-sm min-w-[12rem]">
                    <option :value="null" disabled>Select state…</option>
                    <option v-for="s in availableStates" :key="s.pk" :value="s.pk">
                        {{ s.abbr }} - {{ s.name }}
                    </option>
                </select>
                <input v-model.number="newShiftValue" type="number" step="0.1" class="border p-1 rounded-sm w-28" placeholder="Shift">
                <button @click="addShift" class="bg-green-500 text-white px-3 py-1 rounded-sm hover:bg-green-600">Add</button>
            </div>
        </div>
        <data-table 
            :items="items" 
            :columns="columns" 
            :title="'Shifts'" 
            keyField="state"
            :deletable="true"
            :deleteLabel="'Remove Selected'"
            @update-item="onUpdate"
            @delete-items="onDeleteSelected"
        ></data-table>
    </div>
    `
});

window.defineComponent('state', {
    props: ['pk'],

    data() {
        return {
            temp: 1,
            activeTab: 'details',
            stateColumns: [
                { field: 'pk', label: 'PK', width: 1 },
                { field: 'name', label: 'Name', editable: true, width: 3 },
                { field: 'abbr', label: 'Abbr', editable: true, width: 1 },
                { field: 'electoral_votes', label: 'EV', editable: true, type: 'number', step: 1, width: 1 },
                { field: 'popular_votes', label: 'PV', editable: true, type: 'number', step: 1000, width: 2 },
                { field: 'poll_closing_time', label: 'Close Time', editable: true, type: 'number', step: 1, width: 1 },
                { field: 'winner_take_all_flg', label: 'WTA', editable: true, type: 'number', step: 1, width: 1 }
            ],
            multiplierColumns: [
                { field: 'pk', label: 'PK', width: 1 },
                { field: 'candidate', label: 'Candidate', width: 2 },
                { field: 'candidateName', label: 'Name', width: 3, formatter: val => val || 'Unknown' },
                { field: 'state_multiplier', label: 'Multiplier', editable: true, type: 'number', step: 0.01, width: 3 }
            ],
            issueScoreColumns: [
                { field: 'pk', label: 'PK', width: 1 },
                { field: 'issue', label: 'Issue', width: 2 },
                { field: 'issueName', label: 'Issue Name', width: 3, formatter: val => val || 'Unknown' },
                { field: 'state_issue_score', label: 'Score (-1 to 1)', editable: true, type: 'number', step: 0.01, min: -1, max: 1, width: 3 },
                { field: 'weight', label: 'Weight', editable: true, type: 'number', step: 0.01, width: 2 }
            ]
        };
    },

    template: `
    <div class="bg-white rounded-lg shadow">
        <!-- Header -->
        <div class="border-b p-4 flex justify-between items-center">
            <div class="flex items-center space-x-4">
                <h1 class="font-bold text-xl">{{stateName}} ({{abbr}})</h1>
                <span class="text-gray-500">PK: {{this.pk}}</span>
            </div>
            <div class="flex space-x-2">
                <button @click="refreshMargins" class="bg-blue-500 text-white px-3 py-1 rounded-sm hover:bg-blue-600">
                    Refresh margins
                </button>
                <button @click="deleteState" class="bg-red-500 text-white px-3 py-1 rounded-sm hover:bg-red-600">
                    Delete state
                </button>
            </div>
        </div>

        <!-- Predicted Margins Section -->
        <div class="border-b p-4 bg-gray-50">
            <h2 class="font-bold text-lg mb-2">Predicted starting PV</h2>
            <div class="space-y-2">
                <div v-for="info in margins" :key="info" class="p-3 bg-white rounded-sm shadow-xs">
                    {{info}}
                </div>
            </div>
        </div>

        <!-- Tabs -->
        <div class="border-b">
            <nav class="flex space-x-4 px-4">
                <button 
                    v-for="tab in ['details', 'multipliers', 'issues']"
                    :key="tab"
                    @click="activeTab = tab"
                    :class="[
                        'px-3 py-2 text-sm font-medium border-b-2',
                        activeTab === tab 
                            ? 'border-blue-500 text-blue-600' 
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    ]"
                >
                    {{ tab.charAt(0).toUpperCase() + tab.slice(1) }}
                </button>
            </nav>
        </div>

        <!-- Content -->
        <div class="p-4">
            <!-- State Details Tab -->
            <div v-if="activeTab === 'details'" class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">State Name</label>
                        <input @input="onInput($event)" :value="stateName" name="name" type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-blue-500 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Abbreviation</label>
                        <input @input="onInput($event)" :value="abbr" name="abbr" type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-blue-500 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Electoral Votes</label>
                        <input @input="onInput($event)" :value="electoralVotes" name="electoral_votes" type="number" class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-blue-500 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Popular Votes</label>
                        <input @input="onInput($event)" :value="popularVotes" name="popular_votes" type="number" class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-blue-500 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Poll Closing Time</label>
                        <input @input="onInput($event)" :value="pollClosingTime" name="poll_closing_time" type="number" class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-blue-500 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Winner Take All (0/1)</label>
                        <input @input="onInput($event)" :value="winnerTakeAll" name="winner_take_all_flg" type="number" class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-blue-500 focus:ring-blue-500">
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700">Election PK</label>
                        <input @input="onInput($event)" :value="election" name="election" type="number" class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-blue-500 focus:ring-blue-500">
                    </div>
                </div>
            </div>

            <!-- Multipliers Tab -->
            <div v-if="activeTab === 'multipliers'">
                <data-table 
                    :items="stateMultipliersWithNames" 
                    :columns="multiplierColumns" 
                    title="Candidate State Multipliers" 
                    keyField="pk"
                    @update-item="updateMultiplier"
                ></data-table>
            </div>

            <!-- Issue Scores Tab -->
            <div v-if="activeTab === 'issues'">
                <data-table 
                    :items="stateIssueScoresWithNames" 
                    :columns="issueScoreColumns" 
                    title="State Issue Scores" 
                    keyField="pk"
                    @update-item="updateIssueScore"
                ></data-table>
            </div>
        </div>
    </div>
    `,

    methods: {
        deleteState: function () {
            Vue.prototype.$TCT.deleteState(Number(this.pk));
            Vue.prototype.$globalData.state = Vue.prototype.$TCT.getFirstStatePK();
            Vue.prototype.$globalData.mode = QUESTION;
            Vue.prototype.$globalData.mode = STATE;
            const temp = Vue.prototype.$globalData.filename;
            Vue.prototype.$globalData.filename = null;
            Vue.prototype.$globalData.filename = temp;
        },

        onInput: function (evt) {
            let value = evt.target.value;
            if (shouldBeSavedAsNumber(value)) {
                value = Number(value);
            }
            Vue.prototype.$TCT.states[Number(this.pk)].fields[evt.target.name] = value;
            this.temp *= -1;
        },

        refreshMargins: function () {
            this.temp *= -1;
        },

        updateMultiplier: function (item, field, value) {
            Vue.prototype.$TCT.candidate_state_multiplier[item.pk].fields[field] = value;
            this.temp *= -1;
        },

        updateIssueScore: function (item, field, value) {
            Vue.prototype.$TCT.state_issue_scores[item.pk].fields[field] = value;
            this.temp *= -1;
        }
    },

    computed: {
        statePk() {
            return Number(this.pk);
        },

        stateName: function () {
            this.temp;
            return Vue.prototype.$TCT.states[this.statePk]?.fields.name;
        },

        abbr: function () {
            this.temp;
            return Vue.prototype.$TCT.states[this.statePk]?.fields.abbr;
        },

        electoralVotes: function () {
            this.temp;
            return Vue.prototype.$TCT.states[this.statePk]?.fields.electoral_votes;
        },

        popularVotes: function () {
            this.temp;
            return Vue.prototype.$TCT.states[this.statePk]?.fields.popular_votes;
        },

        pollClosingTime: function () {
            this.temp;
            return Vue.prototype.$TCT.states[this.statePk]?.fields.poll_closing_time;
        },

        winnerTakeAll: function () {
            this.temp;
            return Vue.prototype.$TCT.states[this.statePk]?.fields.winner_take_all_flg;
        },

        election: function () {
            this.temp;
            return Vue.prototype.$TCT.states[this.statePk]?.fields.election;
        },

        candidateStateMultipliers: function () {
            return Vue.prototype.$TCT.getCandidateStateMultipliersForState(this.statePk);
        },

        stateMultipliersWithNames: function () {
            return this.candidateStateMultipliers.map(multiplier => {
                const candidatePk = multiplier.fields.candidate;
                return {
                    ...multiplier.fields,
                    pk: multiplier.pk,
                    candidateName: Vue.prototype.$TCT.getNicknameForCandidate(candidatePk)
                };
            });
        },

        stateIssueScores: function () {
            return Vue.prototype.$TCT.getIssueScoreForState(this.statePk) || [];
        },

        stateIssueScoresWithNames: function () {
            return this.stateIssueScores.map(score => {
                const issuePk = score.fields.issue;
                const issue = Vue.prototype.$TCT.issues[issuePk];
                return {
                    ...score.fields,
                    pk: score.pk,
                    issueName: issue ? issue.fields.name : null
                };
            });
        },

        margins: function () {
            this.temp;
            return Vue.prototype.$TCT.getPVForState(this.statePk);
        }
    }
});

window.defineComponent('candidate-state-multiplier', {
    props: ['pk'],
    template: `
    <li class="bg-white rounded-sm shadow-sm p-3 mb-2">
        <div class="flex justify-between items-center">
            <div>
                <span class="font-medium">{{stateName}}</span>
                <span v-if="nickname" class="text-gray-500 ml-2">({{nickname}})</span>
            </div>
            <div class="flex items-center">
                <label class="mr-2">Multiplier:</label>
                <input @input="onInput($event)" :value="stateMultiplier" name="state_multiplier" type="number" class="border rounded-sm p-1 w-24">
            </div>
        </div>
    </li>
    `,
    methods: {
        onInput: function (evt) {
            let value = evt.target.value;
            if (shouldBeSavedAsNumber(value)) value = Number(value);
            Vue.prototype.$TCT.candidate_state_multiplier[this.pk].fields[evt.target.name] = value;
        }
    },
    computed: {
        stateMultiplier: function () {
            return Vue.prototype.$TCT.candidate_state_multiplier[this.pk].fields.state_multiplier;
        },
        candidate: function () {
            return Vue.prototype.$TCT.candidate_state_multiplier[this.pk].fields.candidate;
        },
        nickname: function () {
            Vue.prototype.$globalData.filename;
            return Vue.prototype.$TCT.getNicknameForCandidate(this.candidate);
        },
        stateName: function () {
            const statePk = Vue.prototype.$TCT.candidate_state_multiplier[this.pk].fields.state;
            return Vue.prototype.$TCT.states[statePk]?.fields.name || 'Unknown State';
        }
    }
})

window.defineComponent('state-issue-score', {
    props: ['pk', 'hideIssuePK'],
    template: `
    <li class="bg-white rounded-sm shadow-sm p-3 mb-2">
        <div class="flex justify-between items-center mb-3">
            <div>
                <span class="font-medium">{{ stateName }}</span>
                <span v-if="stateAbbr" class="text-gray-500 ml-2">({{ stateAbbr }})</span>
            </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label class="block font-medium">Issue:</label>
                <select v-if="!hideIssuePK" @change="onInput($event)" name="issue" class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-blue-500 focus:ring-blue-500">
                    <option v-for="issue in issues" :selected="issue.pk == currentIssue" :value="issue.pk" :key="issue.pk">
                        {{issue.pk}} - {{issue.fields.name}}
                    </option>
                </select>
                <div v-else class="py-2 text-gray-700">{{getIssueName(currentIssue)}}</div>
            </div>
            <div>
                <label class="block font-medium">Score (-1 to 1):</label>
                <input @input="onInput($event)" :value="stateIssueScore" name="state_issue_score" type="number" class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-blue-500 focus:ring-blue-500">
                <p class="text-xs text-gray-500 mt-1">-1.0 = Stance 1, 1.0 = Stance 7</p>
            </div>
            <div>
                <label class="block font-medium">Weight:</label>
                <input @input="onInput($event)" :value="weight" name="weight" type="number" class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-blue-500 focus:ring-blue-500">
            </div>
        </div>
    </li>
    `,
    methods: {
        onInput: function (evt) {
            const entry = Vue.prototype.$TCT?.state_issue_scores?.[this.pk];
            if (!entry) return;
            let value = evt.target.value;
            if (shouldBeSavedAsNumber(value)) value = Number(value);
            entry.fields[evt.target.name] = value;
        },
        getIssueName: function (issuePk) {
            if (!Vue.prototype.$TCT.issues[issuePk]) return 'Unknown Issue';
            return `${issuePk} - ${Vue.prototype.$TCT.issues[issuePk].fields.name}`;
        }
    },
    computed: {
        issues: function () {
            let a = [Vue.prototype.$globalData.filename];
            return Object.values(Vue.prototype.$TCT?.issues || {});
        },
        currentIssue: function () {
            return Vue.prototype.$TCT?.state_issue_scores?.[this.pk]?.fields?.issue;
        },
        stateName: function () {
            const statePK = Vue.prototype.$TCT?.state_issue_scores?.[this.pk]?.fields?.state;
            return Vue.prototype.$TCT?.states?.[statePK]?.fields?.name || '';
        },
        stateIssueScore: function () {
            return Vue.prototype.$TCT?.state_issue_scores?.[this.pk]?.fields?.state_issue_score ?? 0;
        },
        weight: function () {
            return Vue.prototype.$TCT?.state_issue_scores?.[this.pk]?.fields?.weight ?? 0;
        },
        stateAbbr: function () {
            const statePK = Vue.prototype.$TCT?.state_issue_scores?.[this.pk]?.fields?.state;
            return Vue.prototype.$TCT?.states?.[statePK]?.fields?.abbr || '';
        }
    }
})

window.defineComponent('issue', {
    props: ['pk'],
    template: `
    <div class="bg-white rounded-lg shadow-sm">
        <div class="border-b p-4 flex justify-between items-center">
            <div class="flex items-center space-x-4">
                <h1 class="font-bold text-xl">{{ name || 'Issue' }}</h1>
                <span class="text-gray-500">PK: {{ pk }}</span>
            </div>
            <button :class="['px-3 py-1 rounded-sm', canDelete ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-red-500 text-white opacity-50 cursor-not-allowed']" :disabled="!canDelete" v-on:click="deleteIssue()">Delete Issue</button>
        </div>
        <div class="p-4 space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Issue name</label>
                    <input @input="onInputUpdatePicker($event)" :value="name" name="name" type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-blue-500 focus:ring-blue-500">
                </div>
                <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700">Issue description (optional)</label>
                    <textarea @input="onInput2($event)" :value="description" name="description" class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-blue-500 focus:ring-blue-500" rows="3"></textarea>
                </div>
            </div>
            <div>
                <h2 class="font-bold text-lg mb-2">Stances</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <stance v-for="n in 7" :key="n" :pk="issuePk" :n="n"></stance>
                </div>
            </div>
            <details open class="border rounded-md">
                <summary class="px-4 py-2 font-semibold cursor-pointer select-none">Candidate Issue Scores ({{this.candidateIssueScores.length}})</summary>
                <ul class="p-4">
                    <candidate-issue-score isRunning="false" v-for="c in candidateIssueScores" :pk="c.pk" :key="c.pk"></candidate-issue-score>
                </ul>
            </details>
            <details open class="border rounded-md">
                <summary class="px-4 py-2 font-semibold cursor-pointer select-none">Running Mate Issue Scores ({{this.runningMateIssueScores.length}})</summary>
                <ul class="p-4">
                    <candidate-issue-score isRunning="true" v-for="c in runningMateIssueScores" :pk="c.pk" :key="c.pk"></candidate-issue-score>
                </ul>
            </details>
            <details open class="border rounded-md">
                <summary class="px-4 py-2 font-semibold cursor-pointer select-none">State Issue Scores For This Issue</summary>
                <div class="p-4 space-y-4">
                    <issue-state-map-editor :issuePk="issuePk"></issue-state-map-editor>
                    <ul class="space-y-3">
                        <state-issue-score :hideIssuePK="true" v-for="c in stateIssueScores" :pk="c.pk" :key="c.pk"></state-issue-score>
                    </ul>
                </div>
            </details>
        </div>
    </div>
    `,
    methods: {
        onInput: function (evt) {
            let value = evt.target.value;
            if (shouldBeSavedAsNumber(value)) value = Number(value);
            Vue.prototype.$TCT.issues[this.issuePk].fields[evt.target.name] = value;
        },
        onInput2: function (evt) {
            Vue.prototype.$TCT.issues[this.issuePk].fields.description = evt.target.value;
        },
        onInputUpdatePicker: function (evt) {
            Vue.prototype.$TCT.issues[this.issuePk].fields[evt.target.name] = evt.target.value;
            const temp = Vue.prototype.$globalData.filename;
            Vue.prototype.$globalData.filename = "";
            Vue.prototype.$globalData.filename = temp;
        },
        deleteIssue: function () {
            try {
                Vue.prototype.$TCT.removeIssue(this.issuePk);
                const remaining = Object.values(Vue.prototype.$TCT.issues);
                Vue.prototype.$globalData.issue = remaining.length ? remaining[0].pk : null;
                const temp = Vue.prototype.$globalData.filename;
                Vue.prototype.$globalData.filename = "";
                Vue.prototype.$globalData.filename = temp;
            } catch (err) {
                alert(err.message || 'Zoinks! Failed to delete issue.');
            }
        }
    },
    computed: {
        issuePk() { return Number(this.pk); },
        name: function () {
            return Vue.prototype.$TCT?.issues?.[this.issuePk]?.fields?.name || '';
        },
        description: function () {
            const issue = Vue.prototype.$TCT?.issues?.[this.issuePk];
            if (!issue || !issue.fields) return '';
            if (issue.fields.description == null || issue.fields.description == "'") {
                issue.fields.description = "";
            }
            return issue.fields.description;
        },
        candidateIssueScores: function () {
            return Vue.prototype.$TCT?.getCandidateIssueScoreForIssue?.(this.issuePk) || [];
        },
        runningMateIssueScores: function () {
            return Vue.prototype.$TCT?.getRunningMateIssueScoreForIssue?.(this.issuePk) || [];
        },
        stateIssueScores: function () {
            return Vue.prototype.$TCT?.getStateIssueScoresForIssue?.(this.issuePk) || [];
        },
        issueCount() {
            return Object.keys(Vue.prototype.$TCT?.issues || {}).length;
        },
        canDelete() {
            return this.issueCount > 1;
        }
    }
})

window.defineComponent('stance', {
    props: ['pk', 'n'],
    template: `
    <div class="bg-white rounded-sm shadow-sm p-3">
        <label class="block font-medium">Stance {{n}}</label>
        <input @input="onInput($event)" :value="stance" name="stance" type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-blue-500 focus:ring-blue-500">
        <label class="block font-medium mt-3">Stance {{n}} description (optional)</label>
        <textarea @input="onInput2($event)" :value="stance_desc" name="stance_desc" class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-blue-500 focus:ring-blue-500" rows="2"></textarea>
    </div>
    `,
    methods: {
        onInput: function (evt) {
            Vue.prototype.$TCT.issues[Number(this.pk)].fields["stance_" + this.n] = evt.target.value;
        },
        onInput2: function (evt) {
            Vue.prototype.$TCT.issues[Number(this.pk)].fields["stance_desc_" + this.n] = evt.target.value;
        },
    },
    computed: {
        stance: function () {
            return Vue.prototype.$TCT.issues[Number(this.pk)].fields["stance_" + this.n];
        },
        stance_desc: function () {
            const val = Vue.prototype.$TCT.issues[Number(this.pk)].fields["stance_desc_" + this.n];
            return (val == null || val == "'") ? "" : val;
        },
    }
})

window.defineComponent('candidate-issue-score', {
    props: ['pk', 'isRunning'],
    template: `
    <li class="bg-white rounded-sm shadow-sm p-3 mb-2">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label class="block font-medium">Candidate PK <span v-if="nickname" class="text-gray-500 ml-1">({{this.nickname}})</span></label>
                <input @input="onInput($event)" :value="candidate" name="candidate" type="number" class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-blue-500 focus:ring-blue-500">
            </div>
            <div>
                <label class="block font-medium">Issue Score</label>
                <input @input="onInput($event)" :value="issueScore" name="issue_score" type="number" class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-blue-500 focus:ring-blue-500">
                <p class="text-xs text-gray-500 mt-1">(-1.0 = Stance 1, 1.0 = Stance 7)</p>
            </div>
        </div>
    </li>
    `,
    methods: {
        onInput: function (evt) {
            let value = evt.target.value;
            if (shouldBeSavedAsNumber(value)) value = Number(value);
            if (this.isRunning != "true") {
                Vue.prototype.$TCT.candidate_issue_score[this.pk].fields[evt.target.name] = value;
            } else {
                Vue.prototype.$TCT.running_mate_issue_score[this.pk].fields[evt.target.name] = value;
            }
        },
    },
    computed: {
        candidate: function () {
            if (this.isRunning != "true") {
                return Vue.prototype.$TCT.candidate_issue_score[this.pk].fields["candidate"];
            } else {
                return Vue.prototype.$TCT.running_mate_issue_score[this.pk].fields["candidate"];
            }
        },
        nickname: function () {
            return Vue.prototype.$TCT.getNicknameForCandidate(this.candidate);
        },
        issueScore: function () {
            if (this.isRunning != "true") {
                return Vue.prototype.$TCT.candidate_issue_score[this.pk].fields["issue_score"];
            } else {
                return Vue.prototype.$TCT.running_mate_issue_score[this.pk].fields["issue_score"];
            }
        },
    }
})

window.defineComponent('candidate', {
    props: ['pk'],
    data() { return { temp: [0] }; },
    template: `
    <div class="bg-white rounded-lg shadow-sm mx-auto">
        <div class="border-b p-4 flex justify-between items-center">
            <div>
                <h1 class="font-bold text-xl">Candidate PK {{ this.pk }} <span v-if="nickname" class="italic text-gray-400">({{ nickname }})</span></h1>
            </div>
            <button @click="deleteCandidate" class="bg-red-500 text-white px-3 py-1 rounded-sm hover:bg-red-600 text-sm">
                Delete candidate
            </button>
        </div>

        <div class="p-4 space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700">Nickname</label>
                <input @input="onInputNickname($event)" :value="nickname" name="nickname" type="text"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-blue-500 focus:ring-blue-500"
                    placeholder="e.g. J. Smith">
                <p class="text-xs text-gray-500 mt-1">A nickname will display next to a candidate's PK, so you know who they are more easily!</p>
            </div>

            <details open class="border rounded-md">
                <summary class="px-4 py-2 font-semibold cursor-pointer select-none">
                    Candidate state multipliers ({{ this.stateMultipliersForCandidate.length }})
                </summary>
                <div class="p-4">
                    <button @click="generateStateMultipliers()"
                        class="bg-green-500 text-white px-3 py-1 rounded-sm hover:bg-green-600 mb-3"
                        v-if="stateMultipliersForCandidate.length == 0">
                        Generate missing state multipliers
                    </button>
                    <ul class="space-y-2">
                        <candidate-state-multiplier v-for="c in stateMultipliersForCandidate" :pk="c.pk" :key="c.pk"></candidate-state-multiplier>
                    </ul>
                </div>
            </details>
        </div>
    </div>
    `,
    methods: {
        generateStateMultipliers: function () {
            const candidatePk = Number(this.pk);
            if (!Number.isFinite(candidatePk)) return;
            if (typeof Vue.prototype.$TCT?.addStateMultipliersForCandidate !== 'function') return;
            this.temp = [];
            Vue.prototype.$TCT.addStateMultipliersForCandidate(candidatePk);
        },
        onInput: function (evt, pk) {
            let value = evt.target.value;
            if (shouldBeSavedAsNumber(value)) value = Number(value);
            Vue.prototype.$TCT.candidate_state_multiplier[pk].fields[evt.target.name] = value;
        },
        onInputNickname: function (evt) {
            if (Vue.prototype.$TCT.jet_data.nicknames == null) Vue.prototype.$TCT.jet_data.nicknames = {};
            Vue.prototype.$TCT.jet_data.nicknames[Number(this.pk)] = evt.target.value;
            const temp = Vue.prototype.$globalData.filename;
            Vue.prototype.$globalData.filename = "";
            Vue.prototype.$globalData.filename = temp;
        },
        deleteCandidate: function () {
            Vue.prototype.$TCT.deleteCandidate(Number(this.pk));
            Vue.prototype.$globalData.candidate = Vue.prototype.$TCT.getAllCandidatePKs()[0];
            const temp = Vue.prototype.$globalData.filename;
            Vue.prototype.$globalData.filename = "";
            Vue.prototype.$globalData.filename = temp;
        }
    },
    computed: {
        nickname: function () {
            Vue.prototype.$globalData.filename;
            return Vue.prototype.$TCT.getNicknameForCandidate(Number(this.pk));
        },
        stateMultipliersForCandidate: function () {
            this.temp;
            return Vue.prototype.$TCT.getStateMultiplierForCandidate(Number(this.pk));
        },
    }
})

window.defineComponent('issue-state-map-editor', {
    props: ['issuePk'],
    data() {
        return {
            selectedStates: {},
            highlightedState: null,
            stateMetrics: {},
            editScore: 0,
            editWeight: 1,
            mapData: [],
            mapAvailable: false,
            fallbackViewBox: null,
            usingBasicShapes: false,
            stateDropdownPk: null,
            renderVersion: 0,
            
            zoom: 1,
            minZoom: 0.25,
            maxZoom: 10,
            baseWidth: 1000,
            baseHeight: 600,
            panX: 0,
            panY: 0,
            isPanning: false,
            dragMoved: false,
            lastPointer: null,
            svgBounds: null,
            viewportInitialized: false
        };
    },
    watch: {
        issuePk: {
            immediate: true,
            handler() {
                this.resetSelection();
                this.loadStateScores();
            }
        }
    },
    computed: {
        states() {
            return Object.values(Vue.prototype.$TCT.states || {}).filter(s => s && s.pk != null);
        },
        currentEntries() {
            return Vue.prototype.$TCT.getStateIssueScoresForIssue(this.issuePk) || [];
        },
        selectedCount() {
            return Object.values(this.selectedStates).filter(Boolean).length;
        },
        sortedStateMetrics() {
            return this.states
                .map(state => ({
                    pk: state.pk,
                    name: state.fields?.name || `State ${state.pk}`,
                    abbr: state.fields?.abbr,
                    score: this.stateMetrics[state.pk]?.score ?? 0,
                    weight: this.stateMetrics[state.pk]?.weight ?? 0
                }))
                .sort((a, b) => a.name.localeCompare(b.name));
        },
        viewBoxString() {
            const width = this.baseWidth / this.zoom;
            const height = this.baseHeight / this.zoom;
            return `${this.panX} ${this.panY} ${width} ${height}`;
        },
        zoomLabel() {
            return `${Math.round(this.zoom * 100)}%`;
        }
    },
    mounted() {
        this.loadStateScores();
        this.loadMapData();
        window.addEventListener('resize', this.onResize);
    },
    beforeDestroy() {
        window.removeEventListener('resize', this.onResize);
    },
    methods: {
        resetSelection() {
            this.selectedStates = {};
            this.editScore = 0;
            this.editWeight = 1;
        },

        loadStateScores() {
            const metrics = {};
            this.states.forEach(s => {
                metrics[s.pk] = { score: 0, weight: 0, pk: s.pk };
            });
            
            this.currentEntries.forEach(entry => {
                const sPk = entry.fields.state;
                if(metrics[sPk]) {
                    metrics[sPk].score = Number(entry.fields.state_issue_score) || 0;
                    metrics[sPk].weight = Number(entry.fields.weight) || 0;
                }
            });
            this.stateMetrics = metrics;
            this.renderVersion++;
        },

        async loadMapData() {
            try {
                const mapping = Vue.prototype.$TCT.jet_data?.mapping_data;
                if (mapping?.mapSvg) {
                    this.mapData = Vue.prototype.$TCT.getMapForPreview(mapping.mapSvg) || [];
                    if (this.mapData.length) {
                        this.mapAvailable = true;
                        this.initializeViewport(true);
                        return;
                    }
                }
                if (typeof loadDefaultUSMap === 'function') {
                    const svg = await loadDefaultUSMap();
                    if (svg) {
                        this.mapData = Vue.prototype.$TCT.getMapForPreview(svg) || [];
                        if (this.mapData.length) {
                            this.mapAvailable = true;
                            this.fallbackViewBox = '0 0 1000 589'; 
                            this.initializeViewport(true);
                            return;
                        }
                    }
                }
            } catch (err) {
                console.warn('Issue map load failed, falling back to grid:', err);
            }
            
            this.createBasicStateShapes();
        },

        createBasicStateShapes() {
            const states = this.states;
            if (!states.length) {
                this.mapAvailable = false;
                return;
            }
            const cols = Math.ceil(Math.sqrt(states.length));
            const size = 40;
            const padding = 10;
            
            this.mapData = states.map((state, index) => {
                const row = Math.floor(index / cols);
                const col = index % cols;
                const x = col * (size + padding) + 50;
                const y = row * (size + padding) + 50;
                const path = `M${x},${y} h${size} v${size} h-${size} Z`;
                return [state.fields?.abbr || `S${state.pk}`, path];
            });
            
            this.usingBasicShapes = true;
            this.mapAvailable = true;
            this.fallbackViewBox = `0 0 ${cols * (size + padding) + 100} ${Math.ceil(states.length / cols) * (size + padding) + 100}`;
            this.initializeViewport(true);
        },

        initializeViewport(force = false) {
            const dims = this.resolveBaseDimensions();
            this.baseWidth = dims.width;
            this.baseHeight = dims.height;
            if (!this.viewportInitialized || force) {
                this.viewportInitialized = true;
                this.resetViewport();
            }
        },

        resolveBaseDimensions() {
            const mapping = Vue.prototype.$TCT.jet_data?.mapping_data || {};
            const mapWidth = Number(mapping.x);
            const mapHeight = Number(mapping.y);
            if (mapWidth > 0 && mapHeight > 0) {
                return { width: mapWidth, height: mapHeight };
            }
            const parsed = this.parseViewBoxString(this.fallbackViewBox);
            if (parsed) return parsed;
            return { width: 1000, height: 600 };
        },

        parseViewBoxString(str) {
            if (!str) return null;
            const parts = str.split(/\s+/).map(Number);
            if (parts.length === 4 && parts.every(v => Number.isFinite(v))) {
                return { width: parts[2], height: parts[3] };
            }
            return null;
        },


        resetViewport() {
            this.zoom = 1;
            this.panX = 0;
            this.panY = 0;
        },

        setZoom(next, centerPoint = null) {
            const target = Math.min(this.maxZoom, Math.max(this.minZoom, next));
            if(target === this.zoom) return;

            const oldZoom = this.zoom;
            this.zoom = target;

            if (centerPoint) {
                const scaleChange = 1 / this.zoom - 1 / oldZoom;
                this.panX += (centerPoint.x) * scaleChange * this.zoom;
            }
        },

        zoomIn() { this.setZoom(this.zoom * 1.25); },
        zoomOut() { this.setZoom(this.zoom / 1.25); },

        onWheel(evt) {
            const direction = evt.deltaY > 0 ? 0.9 : 1.1;
            this.setZoom(this.zoom * direction);
        },

        startPan(evt) {
            if (evt.pointerType === 'mouse' && evt.button !== 0) return;
            this.isPanning = true;
            this.dragMoved = false;
            this.lastPointer = { x: evt.clientX, y: evt.clientY };
            this.svgBounds = evt.currentTarget.getBoundingClientRect();
            evt.currentTarget.setPointerCapture?.(evt.pointerId);
        },

        onPan(evt) {
            if (!this.isPanning || !this.svgBounds) return;
            
            const dx = evt.clientX - this.lastPointer.x;
            const dy = evt.clientY - this.lastPointer.y;
            
            if (!this.dragMoved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
                this.dragMoved = true;
            }

            const scaleX = (this.baseWidth / this.zoom) / this.svgBounds.width;
            const scaleY = (this.baseHeight / this.zoom) / this.svgBounds.height;

            this.panX -= dx * scaleX;
            this.panY -= dy * scaleY;

            this.lastPointer = { x: evt.clientX, y: evt.clientY };
        },

        endPan(evt) {
            if (!this.isPanning) return;
            this.isPanning = false;
            this.lastPointer = null;
            if (evt?.pointerId !== undefined) {
                evt.currentTarget?.releasePointerCapture?.(evt.pointerId);
            }
        },
        
        onResize() {
            // recalculate bounds if needed
        },

        toggleStateSelection(statePk) {
            const isSelected = !!this.selectedStates[statePk];
            
            if (isSelected) {
                delete this.selectedStates[statePk];
            } else {
                this.selectedStates[statePk] = true;
                
                const keys = Object.keys(this.selectedStates);
                if (keys.length === 1) {
                    const metrics = this.stateMetrics[statePk];
                    if (metrics) {
                        this.editScore = metrics.score;
                        this.editWeight = metrics.weight;
                    }
                }
            }
        },

        handleStateClick(statePk) {
            if (this.dragMoved) {
                this.dragMoved = false;
                return;
            }
            this.toggleStateSelection(statePk);
        },

        selectFromDropdown() {
            if (this.stateDropdownPk == null) return;
            this.toggleStateSelection(this.stateDropdownPk);
            this.stateDropdownPk = null;
        },

        selectAll() {
            const newSelection = {};
            this.states.forEach(state => {
                if (state?.pk != null) {
                    newSelection[state.pk] = true;
                }
            });
            this.selectedStates = newSelection;
        },

        clearSelection() {
            this.selectedStates = {};
        },

        ensureEntry(statePk) {
            let entry = this.currentEntries.find(item => item.fields.state == statePk);
            
            if (!entry) {
                const newPk = Vue.prototype.$TCT.getNewPk();
                entry = {
                    model: 'campaign_trail.state_issue_score',
                    pk: newPk,
                    fields: {
                        state: statePk,
                        issue: this.issuePk,
                        state_issue_score: 0,
                        weight: 1
                    }
                };
                Vue.prototype.$TCT.state_issue_scores[newPk] = entry;
            }
            return entry;
        },

        applyToSelected() {
            const targets = Object.keys(this.selectedStates).filter(pk => this.selectedStates[pk]);
            if (!targets.length) return;

            const score = Number(this.editScore);
            const weight = Number(this.editWeight);

            targets.forEach(statePk => {
                const entry = this.ensureEntry(statePk);
                entry.fields.state_issue_score = isNaN(score) ? 0 : score;
                entry.fields.weight = isNaN(weight) ? 0 : weight;
            });

            this.loadStateScores();
            
            const temp = Vue.prototype.$globalData.filename;
            Vue.prototype.$globalData.filename = "";
            Vue.prototype.$globalData.filename = temp;
        },

        getStateColor(statePk) {
            const score = this.stateMetrics[statePk]?.score ?? 0;
            if (Math.abs(score) < 0.05) return '#f3f4f6'; 

            const reds = ['#fee2e2', '#fca5a5', '#f87171', '#ef4444', '#b91c1c'];
            const blues = ['#dbeafe', '#93c5fd', '#60a5fa', '#3b82f6', '#1d4ed8'];
            
            const intensity = Math.min(1, Math.abs(score));
            const bucket = Math.floor(intensity * 4.99); 
            
            return score > 0 ? blues[bucket] : reds[bucket];
        },

        getStatePath(state) {
            const abbr = state.fields?.abbr;
            if (abbr) {
                let entry = this.mapData.find(item => item[0] === abbr);
                if (entry) return entry[1];
                const normalized = abbr.replaceAll('-', '_');
                entry = this.mapData.find(item => item[0] === normalized);
                if (entry) return entry[1];
            }
            if (state.d) return state.d;
            return 'M0,0 h20 v20 h-20 Z';
        },

        stateStroke(statePk) {
            if (this.selectedStates[statePk]) return '#000000';
            if (this.highlightedState == statePk) return '#666666';
            return '#a1a1aa';
        },

        strokeWidth(statePk) {
            if (this.selectedStates[statePk]) return 2.5;
            if (this.highlightedState == statePk) return 1.5;
            return 0.75;
        },

        onMouseEnter(statePk) {
            this.highlightedState = statePk;
        },

        onMouseLeave() {
            this.highlightedState = null;
        }
    },
    template: `
    <div class="space-y-4">
        <div v-if="mapAvailable" class="relative border rounded overflow-hidden shadow-inner bg-slate-50">
            <svg
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                :viewBox="viewBoxString"
                preserveAspectRatio="xMidYMid meet"
                class="w-full h-96 select-none cursor-move"
                style="touch-action: none;"
                @pointerdown="startPan"
                @pointermove="onPan"
                @pointerup="endPan"
                @pointerleave="endPan"
                @pointercancel="endPan"
                @wheel.prevent="onWheel"
            >
                <g :key="renderVersion">
                    <path
                        v-for="state in states"
                        :key="state.pk"
                        :d="getStatePath(state)"
                        :style="{
                            fill: getStateColor(state.pk),
                            stroke: stateStroke(state.pk),
                            'stroke-width': strokeWidth(state.pk),
                            cursor: 'pointer',
                            transition: 'fill 0.2s ease'
                        }"
                        @pointerdown.stop
                        @click.stop="handleStateClick(state.pk)"
                        @mouseenter="onMouseEnter(state.pk)"
                        @mouseleave="onMouseLeave"
                        vector-effect="non-scaling-stroke"
                    >
                        <title>{{ state.fields.name }}: {{ (stateMetrics[state.pk]?.score || 0).toFixed(2) }}</title>
                    </path>
                </g>
            </svg>
            
            <div class="absolute bottom-2 right-2 flex flex-col gap-1">
                <button class="bg-white shadow border rounded px-2 py-1 text-sm font-bold hover:bg-gray-100" @click.stop="zoomIn">+</button>
                <button class="bg-white shadow border rounded px-2 py-1 text-sm font-bold hover:bg-gray-100" @click.stop="zoomOut">-</button>
                <button class="bg-white shadow border rounded px-2 py-1 text-xs hover:bg-gray-100" @click.stop="resetViewport">Fit</button>
            </div>
            
            <div class="absolute top-2 left-2 bg-white/90 shadow px-2 py-1 rounded text-xs border">
                <strong>Click</strong> to select, <strong>Drag</strong> to pan.
            </div>
        </div>

        <div v-else class="p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-900">
            Unable to load map data. Please use the list below to edit state issue scores.
        </div>

        <div class="bg-gray-100 border rounded p-4 shadow-sm">
            <div class="flex flex-col md:flex-row gap-4 items-start md:items-end">
                
                <div class="grid grid-cols-2 gap-4 grow w-full md:w-auto">
                    <div>
                        <label class="block text-xs font-bold uppercase text-gray-600 mb-1">Issue Score (-1 to 1)</label>
                        <input type="number" step="0.05" min="-1" max="1" v-model.number="editScore" 
                            class="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="0.00">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-gray-600 mb-1">Weight</label>
                        <input type="number" step="0.1" min="0" v-model.number="editWeight" 
                            class="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="1.0">
                    </div>
                </div>

                <div class="flex gap-2 w-full md:w-auto">
                    <button
                        class="bg-blue-600 text-white px-4 py-2 rounded shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed grow md:grow-0 font-medium transition-colors"
                        :disabled="selectedCount === 0"
                        @click="applyToSelected"
                    >
                        Apply to {{ selectedCount || 0 }} selected
                    </button>
                    
                    <button class="bg-white border text-gray-700 px-3 py-2 rounded hover:bg-gray-50" @click="clearSelection">
                        Clear
                    </button>
                    <button class="bg-white border text-gray-700 px-3 py-2 rounded hover:bg-gray-50" @click="selectAll">
                        All
                    </button>
                </div>
            </div>
            <p v-if="selectedCount > 0" class="text-xs text-gray-500 mt-2">
                Editing: {{ Object.keys(selectedStates).map(pk => states.find(s=>s.pk==pk)?.fields.abbr).join(', ') }}
            </p>
        </div>

        <div class="border rounded divide-y max-h-64 overflow-y-auto bg-white">
            <div
                v-for="state in sortedStateMetrics"
                :key="state.pk"
                class="flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                :class="{'bg-blue-50': selectedStates[state.pk]}"
                @click="toggleStateSelection(state.pk)"
            >
                <div class="flex items-center gap-3">
                    <div class="w-4 h-4 rounded-full border shadow-sm" :style="{backgroundColor: getStateColor(state.pk)}"></div>
                    <div>
                        <span class="font-medium">{{ state.name }}</span>
                        <span class="text-gray-400 text-xs ml-1">({{ state.abbr }})</span>
                    </div>
                </div>
                <div class="text-xs text-gray-600 flex gap-3">
                    <span>Score: <strong>{{ state.score.toFixed(2) }}</strong></span>
                    <span>Wt: <strong>{{ state.weight.toFixed(2) }}</strong></span>
                </div>
            </div>
        </div>
    </div>
    `
});