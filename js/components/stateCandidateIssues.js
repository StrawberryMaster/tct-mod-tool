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
                    {{ batchMode ? 'Exit Batch Mode' : 'Batch Edit' }}
                </button>
            </div>
        </div>
        
        <!-- Batch Edit Mode -->
        <div v-if="batchMode" class="bg-gray-100 p-3 mb-4 rounded">
            <div class="flex items-center justify-between mb-2">
                <h3 class="font-bold">Batch Edit {{ selectedItems.length }} items</h3>
                <button 
                    v-if="deletable && selectedItems.length" 
                    @click="deleteSelected" 
                    class="bg-red-500 text-white px-3 py-1 rounded-sm hover:bg-red-600 text-sm"
                >{{ deleteLabel || 'Delete Selected' }}</button>
            </div>
            <div v-for="col in columns" :key="col.field" class="mb-2" v-if="col.editable">
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
                <input type="checkbox" @change="toggleSelectAll" :checked="selectedItems.length === filteredItems.length">
            </div>
            <div 
                v-for="col in columns" 
                :key="col.field"
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
            <template v-for="col in columns">
                <div :class="['col-span-' + (col.width || '2')]" :key="col.field">
                    <input 
                        v-if="col.editable"
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
            if (!this.batchMode) {
                this.selectedItems = [];
                this.batchValues = {};
            }
        },

        toggleSelectAll(event) {
            if (event.target.checked) {
                this.selectedItems = this.filteredItems.map(item => item[this.keyField]);
            } else {
                this.selectedItems = [];
            }
        },

        applyBatchEdit(field) {
            if (this.batchValues[field] === undefined) return;

            this.selectedItems.forEach(itemKey => {
                const item = this.items.find(i => i[this.keyField] === itemKey);
                if (item) {
                    this.$emit('update-item', item, field, this.batchValues[field]);
                }
            });
        },
        deleteSelected() {
            this.$emit('delete-items', this.selectedItems.slice());
            this.selectedItems = [];
        }
    },

    computed: {
        filteredItems() {
            let result = this.items;

            // Apply filter
            if (this.filter) {
                const lowerFilter = this.filter.toLowerCase();
                result = result.filter(item => {
                    return this.columns.some(col => {
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

// a focused editor to quickly add, edit, and delete per-state "shift" values.
// used wherever an Answer lists state shifts to make the numbers easy to change.
window.defineComponent('state-shift-editor', {
    props: ['shifts', 'title'],
    data() {
        return {
            newStatePk: null,
            newShiftValue: 0
        };
    },
    computed: {
        // compose the rows with useful context for editing
        items() {
            const states = Vue.prototype.$TCT.states;
            return (this.shifts || []).map(s => {
                const st = states[s.state];
                const fields = st ? st.fields : {};
                return {
                    state: s.state, // keyField
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
            // keys are state PKs because keyField="state"
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
            showMargins: false,
            showMultipliers: false,
            showIssueScores: false,
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
                    Refresh Margins
                </button>
                <button @click="deleteState" class="bg-red-500 text-white px-3 py-1 rounded-sm hover:bg-red-600">
                    Delete State
                </button>
            </div>
        </div>

        <!-- Predicted Margins Section -->
        <div class="border-b p-4 bg-gray-50">
            <h2 class="font-bold text-lg mb-2">Predicted Starting PV</h2>
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
            Vue.prototype.$TCT.deleteState(this.pk);
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
            Vue.prototype.$TCT.states[this.pk].fields[evt.target.name] = value;
            // force recompute of computed properties displaying derived totals
            this.temp *= -1;
        },

        refreshMargins: function () {
            // toggle a reactive flag so margins recompute immediately
            this.temp *= -1;
        },

        updateMultiplier: function (item, field, value) {
            Vue.prototype.$TCT.candidate_state_multiplier[item.pk].fields[field] = value;
            // state shifters affect PV immediately
            this.temp *= -1;
        },

        updateIssueScore: function (item, field, value) {
            Vue.prototype.$TCT.state_issue_scores[item.pk].fields[field] = value;
            // issue weights/scores affect PV immediately
            this.temp *= -1;
        }
    },

    computed: {
        stateName: function () {
            this.temp; // make header reactive to edits
            return Vue.prototype.$TCT.states[this.pk].fields.name;
        },

        abbr: function () {
            this.temp;
            return Vue.prototype.$TCT.states[this.pk].fields.abbr;
        },

        electoralVotes: function () {
            this.temp;
            return Vue.prototype.$TCT.states[this.pk].fields.electoral_votes;
        },

        popularVotes: function () {
            this.temp;
            return Vue.prototype.$TCT.states[this.pk].fields.popular_votes;
        },

        pollClosingTime: function () {
            this.temp;
            return Vue.prototype.$TCT.states[this.pk].fields.poll_closing_time;
        },

        winnerTakeAll: function () {
            this.temp;
            return Vue.prototype.$TCT.states[this.pk].fields.winner_take_all_flg;
        },

        election: function () {
            this.temp;
            return Vue.prototype.$TCT.states[this.pk].fields.election;
        },

        candidateStateMultipliers: function () {
            return Vue.prototype.$TCT.getCandidateStateMultipliersForState(this.pk);
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
            return Vue.prototype.$TCT.getIssueScoreForState(this.pk);
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
            // depend on temp so PV recomputes after any edit
            this.temp;
            return Vue.prototype.$TCT.getPVForState(this.pk);
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
            if (shouldBeSavedAsNumber(value)) {
                value = Number(value);
            }
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
            return Object.values(Vue.prototype.$TCT.states).filter(x => x.pk == statePk)[0].fields.name;
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
                <select 
                    v-if="!hideIssuePK" 
                    @change="onInput($event)" 
                    name="issue" 
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-blue-500 focus:ring-blue-500"
                >
                    <option v-for="issue in issues" :selected="issue.pk == currentIssue" :value="issue.pk" :key="issue.pk">
                        {{issue.pk}} - {{issue.fields.name}}
                    </option>
                </select>
                <div v-else class="py-2 text-gray-700">{{getIssueName(currentIssue)}}</div>
            </div>
            
            <div>
                <label class="block font-medium">Score (-1 to 1):</label>
                <input 
                    @input="onInput($event)" 
                    :value="stateIssueScore" 
                    name="state_issue_score" 
                    type="number" 
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-blue-500 focus:ring-blue-500"
                >
                <p class="text-xs text-gray-500 mt-1">-1.0 = Stance 1, 1.0 = Stance 7</p>
            </div>
            
            <div>
                <label class="block font-medium">Weight:</label>
                <input 
                    @input="onInput($event)" 
                    :value="weight" 
                    name="weight" 
                    type="number" 
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-blue-500 focus:ring-blue-500"
                >
            </div>
        </div>
    </li>
    `,

    methods: {
        onInput: function (evt) {
            let value = evt.target.value;
            if (shouldBeSavedAsNumber(value)) {
                value = Number(value);
            }
            Vue.prototype.$TCT.state_issue_scores[this.pk].fields[evt.target.name] = value;
        },

        getIssueName: function (issuePk) {
            if (!Vue.prototype.$TCT.issues[issuePk]) return 'Unknown Issue';
            return `${issuePk} - ${Vue.prototype.$TCT.issues[issuePk].fields.name}`;
        }
    },

    computed: {
        issues: function () {
            let a = [Vue.prototype.$globalData.filename];
            return Object.values(Vue.prototype.$TCT.issues);
        },

        currentIssue: function () {
            return Vue.prototype.$TCT.state_issue_scores[this.pk].fields.issue;
        },

        stateName: function () {
            const statePK = Vue.prototype.$TCT.state_issue_scores[this.pk].fields.state;
            return Vue.prototype.$TCT.states[statePK].fields.name;
        },

        stateIssueScore: function () {
            return Vue.prototype.$TCT.state_issue_scores[this.pk].fields.state_issue_score;
        },

        weight: function () {
            return Vue.prototype.$TCT.state_issue_scores[this.pk].fields.weight;
        },

        stateAbbr: function () {
            const statePK = Vue.prototype.$TCT.state_issue_scores[this.pk].fields.state;
            const s = Vue.prototype.$TCT.states[statePK];
            return s && s.fields ? s.fields.abbr : null;
        }
    }
})

window.defineComponent('issue', {

    props: ['pk'],

    template: `
    <div class="bg-white rounded-lg shadow-sm">
        <!-- Header -->
        <div class="border-b p-4 flex justify-between items-center">
            <div class="flex items-center space-x-4">
                <h1 class="font-bold text-xl">{{ name || 'Issue' }}</h1>
                <span class="text-gray-500">PK: {{ pk }}</span>
            </div>
            <button class="bg-red-500 text-white px-3 py-1 rounded-sm hover:bg-red-600" v-on:click="deleteIssue()">Delete Issue</button>
        </div>

        <!-- Content -->
        <div class="p-4 space-y-6">
            <!-- Basic Info -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Issue Name</label>
                    <input 
                        @input="onInputUpdatePicker($event)" 
                        :value="name" 
                        name="name" 
                        type="text" 
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-blue-500 focus:ring-blue-500"
                    >
                </div>
                <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700">Issue Description (Optional)</label>
                    <textarea 
                        @input="onInput2($event)" 
                        :value="description" 
                        name="description" 
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-blue-500 focus:ring-blue-500" 
                        rows="3"
                    ></textarea>
                </div>
            </div>

            <!-- Stances -->
            <div>
                <h2 class="font-bold text-lg mb-2">Stances</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <stance v-for="n in 7" :key="n" :pk="pk" :n="n"></stance>
                </div>
            </div>

            <!-- Candidate Issue Scores -->
            <details open class="border rounded-md">
                <summary class="px-4 py-2 font-semibold cursor-pointer select-none">
                    Candidate Issue Scores ({{this.candidateIssueScores.length}})
                </summary>
                <ul class="p-4">
                    <candidate-issue-score isRunning="false" v-for="c in candidateIssueScores" :pk="c.pk" :key="c.pk"></candidate-issue-score>
                </ul>
            </details>

            <!-- Running Mate Issue Scores -->
            <details open class="border rounded-md">
                <summary class="px-4 py-2 font-semibold cursor-pointer select-none">
                    Running Mate Issue Scores ({{this.runningMateIssueScores.length}})
                </summary>
                <ul class="p-4">
                    <candidate-issue-score isRunning="true" v-for="c in runningMateIssueScores" :pk="c.pk" :key="c.pk"></candidate-issue-score>
                </ul>
            </details>

            <!-- State Issue Scores For This Issue -->
            <details open class="border rounded-md">
                <summary class="px-4 py-2 font-semibold cursor-pointer select-none">
                    State Issue Scores For This Issue
                </summary>
                <ul class="p-4">
                    <state-issue-score :hideIssuePK="true" v-for="c in stateIssueScores" :pk="c.pk" :key="c.pk"></state-issue-score>
                </ul>
            </details>
        </div>
    </div>
    `,

    methods: {
        onInput: function (evt) {

            let value = evt.target.value;
            if (shouldBeSavedAsNumber(value)) {
                value = Number(value);
            }

            Vue.prototype.$TCT.issues[this.pk].fields[evt.target.name] = value;
        },

        onInput2: function (evt) {
            Vue.prototype.$TCT.issues[this.pk].fields.description = evt.target.value;
        },

        onInputUpdatePicker: function (evt) {
            Vue.prototype.$TCT.issues[this.pk].fields[evt.target.name] = evt.target.value;
            const temp = Vue.prototype.$globalData.filename;
            Vue.prototype.$globalData.filename = "";
            Vue.prototype.$globalData.filename = temp;
        },

        deleteIssue: function () {

            x = Vue.prototype.$TCT.getCandidateIssueScoreForIssue(this.pk);
            for (let i = 0; i < x.length; i++) {
                delete Vue.prototype.$TCT.candidate_issue_score[x[i].pk];
            }

            x = Vue.prototype.$TCT.getStateIssueScoresForIssue(this.pk);
            for (let i = 0; i < x.length; i++) {
                delete Vue.prototype.$TCT.state_issue_scores[x[i].pk];
            }

            x = Vue.prototype.$TCT.getRunningMateIssueScoreForIssue(this.pk);
            for (let i = 0; i < x.length; i++) {
                delete Vue.prototype.$TCT.running_mate_issue_score[x[i].pk];
            }

            delete Vue.prototype.$TCT.issues[this.pk];

            Vue.prototype.$globalData.issue = firstNonNull(Object.values(Vue.prototype.$TCT.issues)).pk;
            const temp = Vue.prototype.$globalData.filename;
            Vue.prototype.$globalData.filename = "";
            Vue.prototype.$globalData.filename = temp;
        }
    },

    computed: {
        name: function () {
            return Vue.prototype.$TCT.issues[this.pk].fields.name;
        },

        description: function () {
            if (Vue.prototype.$TCT.issues[this.pk].fields.description == null || Vue.prototype.$TCT.issues[this.pk].fields.description == "'") {
                Vue.prototype.$TCT.issues[this.pk].fields.description = "";
            }
            return Vue.prototype.$TCT.issues[this.pk].fields.description;
        },

        candidateIssueScores: function () {
            return Vue.prototype.$TCT.getCandidateIssueScoreForIssue(this.pk);
        },

        runningMateIssueScores: function () {
            return Vue.prototype.$TCT.getRunningMateIssueScoreForIssue(this.pk);
        },

        stateIssueScores: function () {
            return Vue.prototype.$TCT.getStateIssueScoresForIssue(this.pk);
        }
    }
})

window.defineComponent('stance', {

    props: ['pk', 'n'],

    template: `
    <div class="bg-white rounded-sm shadow-sm p-3">
        <label class="block font-medium">Stance {{n}}</label>
        <input 
            @input="onInput($event)" 
            :value="stance" 
            name="stance" 
            type="text" 
            class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-blue-500 focus:ring-blue-500"
        >
        <label class="block font-medium mt-3">Stance {{n}} Description (Optional)</label>
        <textarea 
            @input="onInput2($event)" 
            :value="stance_desc" 
            name="stance_desc" 
            class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-blue-500 focus:ring-blue-500"
            rows="2"
        ></textarea>
    </div>
    `,

    methods: {

        onInput: function (evt) {
            Vue.prototype.$TCT.issues[this.pk].fields["stance_" + this.n] = evt.target.value;
        },

        onInput2: function (evt) {
            Vue.prototype.$TCT.issues[this.pk].fields["stance_desc_" + this.n] = evt.target.value;
        },

    },

    computed: {
        stance: function () {
            return Vue.prototype.$TCT.issues[this.pk].fields["stance_" + this.n];
        },

        stance_desc: function () {
            if (Vue.prototype.$TCT.issues[this.pk].fields["stance_desc_" + this.n] == null || Vue.prototype.$TCT.issues[this.pk].fields["stance_desc_" + this.n] == "'") {
                Vue.prototype.$TCT.issues[this.pk].fields["stance_desc_" + this.n] = "";
            }
            return Vue.prototype.$TCT.issues[this.pk].fields["stance_desc_" + this.n];
        },
    }
})

window.defineComponent('candidate-issue-score', {

    props: ['pk', 'isRunning'],

    template: `
    <li class="bg-white rounded-sm shadow-sm p-3 mb-2">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label class="block font-medium">
                    Candidate PK 
                    <span v-if="nickname" class="text-gray-500 ml-1">({{this.nickname}})</span>
                </label>
                <input 
                    @input="onInput($event)" 
                    :value="candidate" 
                    name="candidate" 
                    type="number"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-blue-500 focus:ring-blue-500"
                >
            </div>
            <div>
                <label class="block font-medium">Issue Score</label>
                <input 
                    @input="onInput($event)" 
                    :value="issueScore" 
                    name="issue_score" 
                    type="number"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-blue-500 focus:ring-blue-500"
                >
                <p class="text-xs text-gray-500 mt-1">(-1.0 = Stance 1, 1.0 = Stance 7)</p>
            </div>
        </div>
    </li>
    `,

    methods: {

        onInput: function (evt) {

            let value = evt.target.value;
            if (shouldBeSavedAsNumber(value)) {
                value = Number(value);
            }

            if (this.isRunning != "true") {
                Vue.prototype.$TCT.candidate_issue_score[this.pk].fields[evt.target.name] = value;
            }
            else {
                Vue.prototype.$TCT.running_mate_issue_score[this.pk].fields[evt.target.name] = value;
            }
        },

    },

    computed: {
        candidate: function () {
            if (this.isRunning != "true") {
                return Vue.prototype.$TCT.candidate_issue_score[this.pk].fields["candidate"];
            }
            else {
                return Vue.prototype.$TCT.running_mate_issue_score[this.pk].fields["candidate"];
            }

        },

        nickname: function () {
            return Vue.prototype.$TCT.getNicknameForCandidate(this.candidate);
        },

        issueScore: function () {
            if (this.isRunning != "true") {
                return Vue.prototype.$TCT.candidate_issue_score[this.pk].fields["issue_score"];
            }
            else {
                return Vue.prototype.$TCT.running_mate_issue_score[this.pk].fields["issue_score"];
            }

        },
    }
})

window.defineComponent('candidate', {

    props: ['pk'],

    data() {
        return {
            temp: [0]
        };
    },

    template: `
    <div class="mx-auto bg-gray-100 p-4">

        <button class="bg-red-500 text-white p-2 my-2 rounded-sm hover:bg-red-600" v-on:click="deleteCandidate()">Delete Candidate</button><br>

        <h1 class="font-bold">Candidate PK {{this.pk}} <span v-if="nickname" class="italic text-gray-400">({{this.nickname}})</span></h1><br>

        <br>
        <p>A nickname will display next to a candidate's pk so you know who they are more easily!</p>
        <label for="nickname">Nickname:</label><br>
        <input @input="onInputNickname($event)" :value="nickname" name="nickname" type="text"><br><br>

        <details open>
        <summary>Candidate State Multipliers ({{this.stateMultipliersForCandidate.length}})</summary>
        <button @click="generateStateMultipliers()" class="bg-green-500 text-white p-2 my-2 rounded-sm hover:bg-green-600" v-if="stateMultipliersForCandidate.length == 0">Generate Missing State Multipliers</button>
        <ul>
            <candidate-state-multiplier v-for="c in stateMultipliersForCandidate" :pk="c.pk" :key="c.pk"></candidate-state-multiplier>
        </ul>
        </details>

    </div>
    `,

    methods: {

        generateStateMultipliers: function () {
            this.temp = [];
            Vue.prototype.$TCT.addStateMultipliersForCandidate(this.pk);
        },

        onInput: function (evt, pk) {

            let value = evt.target.value;
            if (shouldBeSavedAsNumber(value)) {
                value = Number(value);
            }

            Vue.prototype.$TCT.candidate_state_multiplier[pk].fields[evt.target.name] = value;
        },

        onInputNickname: function (evt) {

            if (Vue.prototype.$TCT.jet_data.nicknames == null) {
                Vue.prototype.$TCT.jet_data.nicknames = {}
            }

            Vue.prototype.$TCT.jet_data.nicknames[this.pk] = evt.target.value;

            const temp = Vue.prototype.$globalData.filename;
            Vue.prototype.$globalData.filename = "";
            Vue.prototype.$globalData.filename = temp;
        },

        deleteCandidate: function () {
            Vue.prototype.$TCT.deleteCandidate(this.pk);
            Vue.prototype.$globalData.candidate = Vue.prototype.$TCT.getAllCandidatePKs()[0];

            const temp = Vue.prototype.$globalData.filename;
            Vue.prototype.$globalData.filename = "";
            Vue.prototype.$globalData.filename = temp;
        }

    },

    computed: {

        nickname: function () {
            Vue.prototype.$globalData.filename;
            return Vue.prototype.$TCT.getNicknameForCandidate(this.pk);
        },

        stateMultipliersForCandidate: function () {
            this.temp;
            return Vue.prototype.$TCT.getStateMultiplierForCandidate(this.pk);
        },
    }
})