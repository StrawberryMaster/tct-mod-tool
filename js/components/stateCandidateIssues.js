registerComponent('data-table', {
    props: ['items', 'columns', 'title', 'keyField', 'deletable', 'deleteLabel', 'pkChangeType'],

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
                    <span
                        v-else-if="col.field === keyField && pkChangeType"
                        class="font-mono"
                    >
                        <pk-editor :type="pkChangeType" :pk="item[col.field]"></pk-editor>
                    </span>
                    <span v-else>{{ formatValue(item[col.field], col) }}</span>
                </div>
            </template>
        </div>
    </div>
    `,

    methods: {
        promptChangePk(oldPk) {
            this.$promptChangePk(this.pkChangeType, oldPk);
        },

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

registerComponent('state-shift-editor', {
    props: ['shifts', 'title'],
    data() {
        return {
            newStatePk: null,
            newShiftValue: 0
        };
    },
    computed: {
        items() {
            const states = this.$TCT.states;
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
            const states = this.$TCT.states || {};
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

registerComponent('state', {
    props: ['pk'],

    data() {
        return {
            temp: 1,
            activeTab: 'details',
            targetPercentages: {},
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
                <span class="text-gray-500">PK: <pk-editor type="state" :pk="pk"></pk-editor></span>
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
                    v-for="tab in ['details', 'multipliers', 'issues', 'margins']"
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
                        <label class="block text-sm font-medium text-gray-700">State name</label>
                        <input @input="onInput($event)" :value="stateName" name="name" type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-blue-500 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Abbreviation</label>
                        <input @input="onInput($event)" :value="abbr" name="abbr" type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-blue-500 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Electoral votes</label>
                        <input @input="onInput($event)" :value="electoralVotes" name="electoral_votes" type="number" class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-blue-500 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Popular votes</label>
                        <input @input="onInput($event)" :value="popularVotes" name="popular_votes" type="number" class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-blue-500 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Poll closing time</label>
                        <input @input="onInput($event)" :value="pollClosingTime" name="poll_closing_time" type="number" class="mt-1 block w-full rounded-md border-gray-300 shadow-xs focus:border-blue-500 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Winner take all? (0 = Disabled/Proportional, 1 = Enabled)</label>
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
                    pkChangeType="candidate_state_multiplier"
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
                    pkChangeType="state_issue_score"
                    @update-item="updateIssueScore"
                ></data-table>
            </div>

            <!-- Starting Margins Tab -->
                        <div v-if="activeTab === 'margins'" class="space-y-6">
                            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

                                <!-- Live Margin Results Sidebar -->
                                <div class="bg-gray-50 p-4 rounded-md border lg:col-span-1 h-fit">
                                    <div class="flex justify-between items-center mb-4">
                                        <h3 class="font-bold text-sm text-gray-700">Approx. starting PV</h3>
                                        <button @click="refreshMargins" class="text-xs text-blue-600 hover:underline">Recalculate</button>
                                    </div>
                                    <div class="space-y-3">
                                        <div v-for="m in currentStructuredMargins" :key="m.candidate" class="p-3 bg-white rounded-sm border border-gray-150 shadow-xs">
                                            <div class="flex justify-between items-center mb-1">
                                                <span class="font-semibold text-xs text-gray-700 truncate max-w-[150px]">{{ m.nickname || 'Candidate ' + m.candidate }}</span>
                                                <span class="text-xs font-bold text-blue-600">{{ (m.percent * 100).toFixed(2) }}%</span>
                                            </div>
                                            <div class="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                                <div class="bg-blue-500 h-full transition-all duration-150" :style="{ width: (m.percent * 100) + '%' }"></div>
                                            </div>
                                            <span class="text-[10px] text-gray-400 mt-1 block">{{ m.votes.toLocaleString() }} starting votes</span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Direct Sliders & Solvers Panel -->
                                <div class="lg:col-span-2 space-y-4">

                                    <!-- Direct Real-time Tweaker -->
                                    <div class="bg-white p-4 rounded-md border">
                                        <div class="flex justify-between items-center mb-3">
                                            <h3 class="font-semibold text-sm">Direct multiplier & stance tweaks</h3>
                                            <span class="text-[10px] text-gray-400">Recalculates margins immediately</span>
                                        </div>

                                        <div class="space-y-4">
                                            <!-- Candidate Multiplier Sliders -->
                                            <div>
                                                <h4 class="text-[11px] font-bold text-gray-500 mb-2">Candidate multipliers</h4>
                                                <div class="space-y-2">
                                                    <div v-for="mult in stateMultipliersWithNames" :key="mult.pk" class="flex items-center gap-3 bg-gray-50 p-2 rounded">
                                                        <span class="w-28 text-xs font-medium truncate">{{ mult.candidateName || 'Candidate ' + mult.candidate }}</span>
                                                        <input type="range" min="0.01" max="5.0" step="0.01"
                                                            class="flex-1 h-1.5 accent-blue-600"
                                                            :value="mult.state_multiplier"
                                                            @input="updateMultiplierDirect(mult, $event.target.value)">
                                                        <input type="number" step="0.01" min="0.01" max="25"
                                                            class="w-16 border rounded-sm px-1 py-0.5 text-xs text-right"
                                                            :value="mult.state_multiplier"
                                                            @input="updateMultiplierDirect(mult, $event.target.value)">
                                                    </div>
                                                </div>
                                            </div>

                                            <!-- Key Issue Sliders -->
                                            <div v-if="topStateIssueScores.length > 0">
                                                <h4 class="text-[11px] font-bold text-gray-500 mb-2">Key state issue scores (top 5 by weight)</h4>
                                                <div class="space-y-2">
                                                    <div v-for="score in topStateIssueScores" :key="score.pk" class="flex flex-col gap-1 bg-gray-50 p-2 rounded">
                                                        <div class="flex justify-between text-[11px] font-medium text-gray-600">
                                                            <span class="truncate max-w-[240px]">{{ score.issueName }}</span>
                                                            <span>Weight: {{ score.weight }}</span>
                                                        </div>
                                                        <div class="flex items-center gap-3">
                                                            <input type="range" min="-1" max="1" step="0.05"
                                                                class="flex-1 h-1.5 accent-green-600"
                                                                :value="score.state_issue_score"
                                                                @input="updateIssueScoreDirect(score, 'state_issue_score', $event.target.value)">
                                                            <input type="number" step="0.05" min="-1" max="1"
                                                                class="w-16 border rounded-sm px-1 py-0.5 text-xs text-right"
                                                                :value="score.state_issue_score"
                                                                @input="updateIssueScoreDirect(score, 'state_issue_score', $event.target.value)">
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Target Margin Solver Tools -->
                                    <div class="bg-gray-50 p-4 rounded-md border">
                                        <h3 class="font-semibold text-sm mb-1">Target margin calculator</h3>
                                        <p class="text-xs text-gray-500 mb-4">Input exact margin percentages to solve for the required multipliers. Experimental!</p>

                                        <div class="space-y-3 mb-4">
                                            <div v-for="c in candidateList" :key="c.pk" class="flex items-center gap-3">
                                                <label class="w-28 text-xs font-medium truncate shrink-0">{{ c.nickname || 'Candidate ' + c.pk }}</label>
                                                <input type="range" min="0" max="100" step="0.1"
                                                    class="flex-1 h-1.5 accent-purple-600"
                                                    :value="targetPct(c.pk)"
                                                    @input="setTargetPct(c.pk, $event.target.value)"
                                                    @change="normalizeTargets">
                                                <input type="number" step="0.1" min="0" max="100"
                                                    class="w-16 border rounded-sm px-1 py-0.5 text-xs text-right"
                                                    :value="targetPct(c.pk)"
                                                    @input="setTargetPct(c.pk, $event.target.value)"
                                                    @blur="normalizeTargets">
                                                <span class="text-xs text-gray-500 w-3">%</span>
                                            </div>
                                        </div>

                                        <div class="flex items-center justify-between border-t pt-3">
                                            <div class="flex items-center gap-2">
                                                <span class="text-xs font-medium text-gray-600">Total:</span>
                                                <span :class="totalTargetPct === 100 ? 'text-green-600 font-bold' : 'text-red-500 font-semibold'" class="text-xs">{{ totalTargetPct }}%</span>
                                            </div>
                                            <div class="flex gap-2">
                                                <button @click="loadCurrentAsTarget" class="bg-white border text-gray-700 px-2.5 py-1 rounded text-xs hover:bg-gray-50 font-medium">
                                                    Load current
                                                </button>
                                                <button @click="applyTargetMargins" :disabled="totalTargetPct !== 100"
                                                    :class="[
                                                        'px-3 py-1 rounded text-xs text-white font-medium',
                                                        totalTargetPct === 100 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
                                                    ]">
                                                    Apply multipliers
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Global Reset Actions -->
                                    <div class="flex justify-end gap-2">
                                        <button @click="resetMultipliersToOne" class="bg-yellow-500 text-black px-3 py-1.5 rounded text-xs hover:bg-yellow-600 font-medium">
                                            Reset multipliers to 1.0
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
    `,

    methods: {
        deleteState: function () {
            this.$TCT.deleteState(Number(this.pk));
            this.$globalData.state = this.$TCT.getFirstStatePK();
            this.$globalData.mode = QUESTION;
            this.$globalData.mode = STATE;
            const temp = this.$globalData.filename;
            this.$globalData.filename = null;
            this.$globalData.filename = temp;
        },

        onInput: function (evt) {
            let value = evt.target.value;
            if (shouldBeSavedAsNumber(value)) {
                value = Number(value);
            }
            this.$TCT.states[Number(this.pk)].fields[evt.target.name] = value;
            this.temp *= -1;
        },

        refreshMargins: function () {
            this.temp *= -1;
        },

        updateMultiplier: function (item, field, value) {
            this.$TCT.candidate_state_multiplier[item.pk].fields[field] = value;
            this.temp *= -1;
            this.$globalData.dataVersion++;
        },

        updateIssueScore: function (item, field, value) {
            this.$TCT.state_issue_scores[item.pk].fields[field] = value;
            this.temp *= -1;
            this.$globalData.dataVersion++;
        },

        // --- Starting Margins methods ---

        targetPct: function (candidatePk) {
            const val = this.targetPercentages[candidatePk];
            return val !== undefined ? val : 0;
        },

        setTargetPct: function (candidatePk, value) {
            const num = parseFloat(value);
            if (value === '' || value === '-' || value === '.') {
                this.targetPercentages[candidatePk] = value;
            } else if (!isNaN(num)) {
                this.targetPercentages[candidatePk] = Math.max(0, Math.min(100, num));
            }
        },

        normalizeTargets: function () {
            const keys = this.candidateList.map(c => c.pk);
            let total = 0;
            const values = {};
            for (const k of keys) {
                const v = parseFloat(this.targetPercentages[k]);
                values[k] = isNaN(v) ? 0 : v;
                total += values[k];
            }
            if (total === 0) {
                const even = Math.round(100 / keys.length * 10) / 10;
                for (const k of keys) {
                    this.targetPercentages[k] = even;
                }
                return;
            }
            if (total === 100) return;
            const remainder = 100 - total;
            const nonZeroKeys = keys.filter(k => values[k] > 0);
            if (nonZeroKeys.length === 0) {
                const even = Math.round(100 / keys.length * 10) / 10;
                for (const k of keys) {
                    this.targetPercentages[k] = even;
                }
                return;
            }
            const nonZeroTotal = nonZeroKeys.reduce((s, k) => s + values[k], 0);
            const newVals = {};
            for (const k of keys) {
                if (values[k] > 0) {
                    const adjusted = values[k] + remainder * (values[k] / nonZeroTotal);
                    newVals[k] = Math.round(adjusted * 10) / 10;
                } else {
                    newVals[k] = 0;
                }
            }
            // fix rounding drift by adjusting the largest entry
            const sum = Object.values(newVals).reduce((s, v) => s + v, 0);
            if (Math.abs(sum - 100) >= 0.1) {
                let maxK = null, maxV = -1;
                for (const k of keys) {
                    if (newVals[k] > maxV) { maxV = newVals[k]; maxK = k; }
                }
                if (maxK != null) newVals[maxK] = Math.round((newVals[maxK] + 100 - sum) * 10) / 10;
            }
            for (const k of keys) {
                this.targetPercentages[k] = newVals[k];
            }
        },

        loadCurrentAsTarget: function () {
            const margins = this.currentStructuredMargins;
            for (const m of margins) {
                this.targetPercentages[m.candidate] = Math.round(m.percent * 1000) / 10;
            }
            this.$nextTick(() => this.normalizeTargets());
        },

        resetMultipliersToOne: function () {
            const entries = this.$TCT.getCandidateStateMultipliersForState(this.statePk);
            for (const entry of entries) {
                this.$TCT.candidate_state_multiplier[entry.pk].fields.state_multiplier = 1;
            }
            this.temp *= -1;
            this.$globalData.dataVersion++;
        },

        applyTargetMargins: function () {
            if (this.totalTargetPct !== 100) return;
            const targets = {};
            for (const c of this.candidateList) {
                targets[c.pk] = parseFloat(this.targetPercentages[c.pk]) || 0;
            }
            this.$TCT.applyTargetMargins(this.statePk, targets);
            this.temp *= -1;
            this.$globalData.dataVersion++;
        },

        // --- Starting Margins methods ---
        updateMultiplierDirect: function (mult, value) {
            const num = parseFloat(value);
            if (!isNaN(num)) {
                this.$TCT.candidate_state_multiplier[mult.pk].fields.state_multiplier = num;
                this.temp *= -1;
                this.$globalData.dataVersion++;
            }
        },

        updateIssueScoreDirect: function (score, field, value) {
            const num = parseFloat(value);
            if (!isNaN(num)) {
                this.$TCT.state_issue_scores[score.pk].fields[field] = num;
                this.temp *= -1;
                this.$globalData.dataVersion++;
            }
        },
    },

    computed: {
        statePk() {
            return Number(this.pk);
        },

        stateName: function () {
            return this.$TCT.states[this.statePk]?.fields.name;
        },

        abbr: function () {
            return this.$TCT.states[this.statePk]?.fields.abbr;
        },

        electoralVotes: function () {
            return this.$TCT.states[this.statePk]?.fields.electoral_votes;
        },

        popularVotes: function () {
            return this.$TCT.states[this.statePk]?.fields.popular_votes;
        },

        pollClosingTime: function () {
            return this.$TCT.states[this.statePk]?.fields.poll_closing_time;
        },

        winnerTakeAll: function () {
            return this.$TCT.states[this.statePk]?.fields.winner_take_all_flg;
        },

        election: function () {
            return this.$TCT.states[this.statePk]?.fields.election;
        },

        candidateStateMultipliers: function () {
            this.temp;
            return this.$TCT.getCandidateStateMultipliersForState(this.statePk);
        },

        stateMultipliersWithNames: function () {
            return this.candidateStateMultipliers.map(multiplier => {
                const candidatePk = multiplier.fields.candidate;
                return {
                    ...multiplier.fields,
                    pk: multiplier.pk,
                    candidateName: this.$TCT.getNicknameForCandidate(candidatePk)
                };
            });
        },

        stateIssueScores: function () {
            this.temp;
            return this.$TCT.getIssueScoreForState(this.statePk) || [];
        },

        stateIssueScoresWithNames: function () {
            return this.stateIssueScores.map(score => {
                const issuePk = score.fields.issue;
                const issue = this.$TCT.issues[issuePk];
                return {
                    ...score.fields,
                    pk: score.pk,
                    issueName: issue ? issue.fields.name : null
                };
            });
        },

        margins: function () {
            this.temp;
            return this.$TCT.getPVForState(this.statePk);
        },

        // --- Starting Margins computed ---

      topStateIssueScores: function () {
                  return [...this.stateIssueScoresWithNames]
                      .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
                      .slice(0, 5);
              },

      candidateList: function () {
            this.$globalData.dataVersion;
            const pks = this.$TCT.getAllCandidatePKs();
            return pks.map(pk => ({
                pk,
                nickname: this.$TCT.getNicknameForCandidate(pk)
            }));
        },

        currentStructuredMargins: function () {
            this.temp;
            this.$globalData.dataVersion;
            return this.$TCT.getStructuredMargins(this.statePk);
        },

        totalTargetPct: function () {
            const keys = this.candidateList.map(c => c.pk);
            let total = 0;
            for (const k of keys) {
                const v = parseFloat(this.targetPercentages[k]);
                if (!isNaN(v)) total += v;
            }
            return Math.round(total * 10) / 10;
        }
    }
});

registerComponent('candidate-state-multiplier', {
    props: ['pk'],
    template: `
    <li class="bg-white rounded-sm shadow-sm p-3 mb-2">
        <div class="flex justify-between items-center">
            <div>
                <span class="text-xs text-gray-400 mr-2">#<pk-editor type="candidate_state_multiplier" :pk="pk"></pk-editor></span>
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
            this.$TCT.candidate_state_multiplier[this.pk].fields[evt.target.name] = value;
            this.$globalData.dataVersion++;
        }
    },
    computed: {
        stateMultiplier: function () {
            return this.$TCT.candidate_state_multiplier[this.pk].fields.state_multiplier;
        },
        candidate: function () {
            return this.$TCT.candidate_state_multiplier[this.pk].fields.candidate;
        },
        nickname: function () {
            this.$globalData.filename;
            return this.$TCT.getNicknameForCandidate(this.candidate);
        },
        stateName: function () {
            const statePk = this.$TCT.candidate_state_multiplier[this.pk].fields.state;
            return this.$TCT.states[statePk]?.fields.name || 'Unknown State';
        }
    }
})

registerComponent('state-issue-score', {
    props: ['pk', 'hideIssuePK'],
    template: `
    <li class="bg-white rounded-sm shadow-sm p-3 mb-2">
        <div class="flex justify-between items-center mb-3">
            <div>
                <span class="text-xs text-gray-400 mr-2">#<pk-editor type="state_issue_score" :pk="pk"></pk-editor></span>
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
            const entry = this.$TCT?.state_issue_scores?.[this.pk];
            if (!entry) return;
            let value = evt.target.value;
            if (shouldBeSavedAsNumber(value)) value = Number(value);
            entry.fields[evt.target.name] = value;
            this.$globalData.dataVersion++;
        },
        getIssueName: function (issuePk) {
            if (!this.$TCT.issues[issuePk]) return 'Unknown Issue';
            return `${issuePk} - ${this.$TCT.issues[issuePk].fields.name}`;
        }
    },
    computed: {
        issues: function () {
            return Object.values(this.$TCT?.issues || {});
        },
        currentIssue: function () {
            return this.$TCT?.state_issue_scores?.[this.pk]?.fields?.issue;
        },
        stateName: function () {
            const statePK = this.$TCT?.state_issue_scores?.[this.pk]?.fields?.state;
            return this.$TCT?.states?.[statePK]?.fields?.name || '';
        },
        stateIssueScore: function () {
            return this.$TCT?.state_issue_scores?.[this.pk]?.fields?.state_issue_score ?? 0;
        },
        weight: function () {
            return this.$TCT?.state_issue_scores?.[this.pk]?.fields?.weight ?? 0;
        },
        stateAbbr: function () {
            const statePK = this.$TCT?.state_issue_scores?.[this.pk]?.fields?.state;
            return this.$TCT?.states?.[statePK]?.fields?.abbr || '';
        }
    }
})

registerComponent('issue', {
    props: ['pk'],
    template: `
    <div class="bg-white rounded-lg shadow-sm">
        <div class="border-b p-4 flex justify-between items-center">
            <div class="flex items-center space-x-4">
                <h1 class="font-bold text-xl">{{ name || 'Issue' }}</h1>
                <span class="text-gray-500">PK: <pk-editor type="issue" :pk="pk"></pk-editor></span>
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
            this.$TCT.issues[this.issuePk].fields[evt.target.name] = value;
        },
        onInput2: function (evt) {
            this.$TCT.issues[this.issuePk].fields.description = evt.target.value;
        },
        onInputUpdatePicker: function (evt) {
            this.$TCT.issues[this.issuePk].fields[evt.target.name] = evt.target.value;
            this.$globalData.dataVersion++;
        },
        deleteIssue: function () {
            try {
                this.$TCT.removeIssue(this.issuePk);
                const remaining = Object.values(this.$TCT.issues);
                this.$globalData.issue = remaining.length ? remaining[0].pk : null;
                this.$globalData.dataVersion++;
            } catch (err) {
                alert(err.message || 'Zoinks! Failed to delete issue.');
            }
        }
    },
    computed: {
        issuePk() { return Number(this.pk); },
        name: function () {
            return this.$TCT?.issues?.[this.issuePk]?.fields?.name || '';
        },
        description: function () {
            const issue = this.$TCT?.issues?.[this.issuePk];
            if (!issue || !issue.fields) return '';
            if (issue.fields.description == null || issue.fields.description == "'") {
                issue.fields.description = "";
            }
            return issue.fields.description;
        },
        candidateIssueScores: function () {
            this.$globalData.dataVersion;
            return this.$TCT?.getCandidateIssueScoreForIssue?.(this.issuePk) || [];
        },
        runningMateIssueScores: function () {
            this.$globalData.dataVersion;
            return this.$TCT?.getRunningMateIssueScoreForIssue?.(this.issuePk) || [];
        },
        stateIssueScores: function () {
            this.$globalData.dataVersion;
            return this.$TCT?.getStateIssueScoresForIssue?.(this.issuePk) || [];
        },
        issueCount() {
            return Object.keys(this.$TCT?.issues || {}).length;
        },
        canDelete() {
            return this.issueCount > 1;
        }
    }
})

registerComponent('stance', {
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
            this.$TCT.issues[Number(this.pk)].fields["stance_" + this.n] = evt.target.value;
        },
        onInput2: function (evt) {
            this.$TCT.issues[Number(this.pk)].fields["stance_desc_" + this.n] = evt.target.value;
        },
    },
    computed: {
        stance: function () {
            return this.$TCT.issues[Number(this.pk)].fields["stance_" + this.n];
        },
        stance_desc: function () {
            const val = this.$TCT.issues[Number(this.pk)].fields["stance_desc_" + this.n];
            return (val == null || val == "'") ? "" : val;
        },
    }
})

registerComponent('candidate-issue-score', {
    props: ['pk', 'isRunning'],
    template: `
    <li class="bg-white rounded-sm shadow-sm p-3 mb-2">
        <div class="mb-2 text-xs text-gray-400 w-fit">#<pk-editor :type="isRunning == 'true' ? 'running_mate_issue_score' : 'candidate_issue_score'" :pk="pk"></pk-editor></div>
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
                this.$TCT.candidate_issue_score[this.pk].fields[evt.target.name] = value;
            } else {
                this.$TCT.running_mate_issue_score[this.pk].fields[evt.target.name] = value;
            }
            this.$globalData.dataVersion++;
        },
    },
    computed: {
        candidate: function () {
            if (this.isRunning != "true") {
                return this.$TCT.candidate_issue_score[this.pk].fields["candidate"];
            } else {
                return this.$TCT.running_mate_issue_score[this.pk].fields["candidate"];
            }
        },
        nickname: function () {
            return this.$TCT.getNicknameForCandidate(this.candidate);
        },
        issueScore: function () {
            if (this.isRunning != "true") {
                return this.$TCT.candidate_issue_score[this.pk].fields["issue_score"];
            } else {
                return this.$TCT.running_mate_issue_score[this.pk].fields["issue_score"];
            }
        },
    }
})

registerComponent('candidate', {
    props: ['pk'],
    data() { return { temp: [0] }; },
    template: `
    <div class="bg-white rounded-lg shadow-sm mx-auto">
        <div class="border-b p-4 flex justify-between items-center">
            <div>
                <h1 class="font-bold text-xl">Candidate PK <pk-editor type="candidate" :pk="pk"></pk-editor> <span v-if="nickname" class="italic text-gray-400">({{ nickname }})</span></h1>
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

                <div class="mt-4 flex items-center">
                    <input type="checkbox" :checked="isPlayerCandidate" @change="togglePlayerCandidate" id="is_player_candidate" class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <label for="is_player_candidate" class="ml-2 block text-sm font-medium">Is player candidate?</label>
                </div>
                <p class="text-xs text-gray-500 mt-1">If checked, this candidate will be the default selected candidate when adding new scores or feedback. Recommended to avoid issues involving broken feedback & global/state scores.</p>
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
            if (typeof this.$TCT?.addStateMultipliersForCandidate !== 'function') return;
            this.temp = [];
            this.$TCT.addStateMultipliersForCandidate(candidatePk);
        },
        onInput: function (evt, pk) {
            let value = evt.target.value;
            if (shouldBeSavedAsNumber(value)) value = Number(value);
            this.$TCT.candidate_state_multiplier[pk].fields[evt.target.name] = value;
        },
        onInputNickname: function (evt) {
            if (this.$TCT.jet_data.nicknames == null) this.$TCT.jet_data.nicknames = {};
            this.$TCT.jet_data.nicknames[Number(this.pk)] = evt.target.value;
            this.$globalData.dataVersion++;
        },
        deleteCandidate: function () {
            this.$TCT.deleteCandidate(Number(this.pk));
            this.$globalData.candidate = this.$TCT.getAllCandidatePKs()[0];
            this.$globalData.dataVersion++;
        },
        togglePlayerCandidate: function(e) {
            if(e.target.checked) {
                this.$TCT.setPlayerCandidate(Number(this.pk));
            } else {
                if(this.$TCT.getPlayerCandidate() == Number(this.pk)) {
                    this.$TCT.setPlayerCandidate(null);
                }
            }
            this.$globalData.dataVersion++;
        }
    },
    computed: {
        isPlayerCandidate: function() {
            this.$globalData.dataVersion;
            return this.$TCT.getPlayerCandidate() === Number(this.pk);
        },
        nickname: function () {
            this.$globalData.dataVersion;
            return this.$TCT.getNicknameForCandidate(Number(this.pk));
        },
        stateMultipliersForCandidate: function () {
            this.temp;
            return this.$TCT.getStateMultiplierForCandidate(Number(this.pk));
        },
    }
})

registerComponent('issue-state-map-editor', {
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
            viewportInitialized: false,
            isExpanded: false
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
            return Object.values(this.$TCT.states || {}).filter(s => s && s.pk != null);
        },
        currentEntries() {
            this.$globalData.dataVersion;
            return this.$TCT.getStateIssueScoresForIssue(this.issuePk) || [];
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
        },
        mapCanvasStyle() {
            return {
                backgroundColor: 'var(--map-bg)'
            };
        }
    },
    mounted() {
        this.loadStateScores();
        this.loadMapData();
        window.addEventListener('resize', this.onResize);
        this._onKeydown = (e) => {
            if (e.key === 'Escape' && this.isExpanded) this.toggleExpand();
        };
        window.addEventListener('keydown', this._onKeydown);
    },
    beforeDestroy() {
        window.removeEventListener('resize', this.onResize);
        window.removeEventListener('keydown', this._onKeydown);
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
                if (metrics[sPk]) {
                    metrics[sPk].score = Number(entry.fields.state_issue_score) || 0;
                    metrics[sPk].weight = Number(entry.fields.weight) || 0;
                }
            });
            this.stateMetrics = metrics;
            this.renderVersion++;
        },

        async loadMapData() {
            try {
                const mapping = this.$TCT.jet_data?.mapping_data;
                if (mapping?.mapSvg) {
                    this.mapData = this.$TCT.getMapForPreview(mapping.mapSvg) || [];
                    if (this.mapData.length) {
                        this.mapAvailable = true;
                        this.initializeViewport(true);
                        return;
                    }
                }
                if (typeof loadDefaultUSMap === 'function') {
                    const svg = await loadDefaultUSMap();
                    if (svg) {
                        this.mapData = this.$TCT.getMapForPreview(svg) || [];
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
                return [state.fields?.abbr || `S${state.pk}`, path, ''];
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
            const mapping = this.$TCT.jet_data?.mapping_data || {};
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
            if (target === this.zoom) return;

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
                const newPk = this.$TCT.getNewPk();
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
                this.$TCT.state_issue_scores[newPk] = entry;
                this.$TCT._invalidateCache('state_issue_scores_by_issue');
                this.$TCT._invalidateCache('state_issue_scores_by_state');
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

            this.$globalData.dataVersion++;
            this.loadStateScores();
        },

        getStateColor(statePk) {
            const score = this.stateMetrics[statePk]?.score ?? 0;
            const themeConfig = (window.getThemeConfig && window.getThemeConfig()) || {};
            const palette = themeConfig.stateMetricPalette || {
                positive: ['#dbeafe', '#93c5fd', '#60a5fa', '#3b82f6', '#1d4ed8'],
                negative: ['#fee2e2', '#fca5a5', '#f87171', '#ef4444', '#b91c1c'],
                neutral: '#f3f4f6'
            };
            if (Math.abs(score) < 0.05) {
                return palette.neutral;
            }

            const intensity = Math.min(1, Math.abs(score));
            const bucket = Math.floor(intensity * 4.99);

            return score > 0 ? palette.positive[bucket] : palette.negative[bucket];
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

        getStateTransform(state) {
            const abbr = state.fields?.abbr;
            if (abbr) {
                let entry = this.mapData.find(item => item[0] === abbr);
                if (entry) return entry[2] || '';
                const normalized = abbr.replaceAll('-', '_');
                entry = this.mapData.find(item => item[0] === normalized);
                if (entry) return entry[2] || '';
            }
            return state.transform || '';
        },

        stateStroke(statePk) {
            const palette = (window.getThemeConfig && window.getThemeConfig())?.stateStroke || {
                selected: '#000000',
                highlighted: '#666666',
                normal: '#a1a1aa'
            };
            if (this.selectedStates[statePk]) return palette.selected;
            if (this.highlightedState == statePk) return palette.highlighted;
            return palette.normal;
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
        },

        toggleExpand() {
            this.isExpanded = !this.isExpanded;
            this.$nextTick(() => {
                this.initializeViewport(true);
            });
        }
    },
    template: `
    <div class="space-y-4">
        <div v-if="mapAvailable" class="relative border rounded overflow-hidden shadow-inner">
            <svg
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                :viewBox="viewBoxString"
                preserveAspectRatio="xMidYMid meet"
                class="w-full h-96 select-none cursor-move"
                :style="mapCanvasStyle"
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
                        :transform="getStateTransform(state) || null"
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

            <div class="absolute bottom-2 right-2 flex flex-col gap-1 z-10">
                <button class="bg-white shadow border rounded px-2 py-1 text-sm font-bold hover:bg-gray-100" @click.stop="zoomIn">+</button>
                <button class="bg-white shadow border rounded px-2 py-1 text-sm font-bold hover:bg-gray-100" @click.stop="zoomOut">-</button>
                <button class="bg-white shadow border rounded px-2 py-1 text-xs hover:bg-gray-100" @click.stop="resetViewport">Fit</button>
                <button class="bg-white shadow border rounded px-2 py-1 text-xs hover:bg-gray-100 font-semibold" @click.stop="toggleExpand">Expand</button>
            </div>

            <div class="absolute top-2 left-2 bg-white/90 shadow px-2 py-1 rounded text-xs border z-10">
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

        <!-- Expandable Map Modal -->
        <div v-if="isExpanded" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/60" @click="toggleExpand" aria-hidden="true"></div>
            <div class="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col z-10 border border-gray-300">
                <!-- Header -->
                <div class="theme-panel-header p-4 border-b flex justify-between items-center rounded-t-lg">
                    <div>
                        <h3 class="font-bold text-lg">Edit state issue scores</h3>
                        <p class="text-xs">Issue #{{ issuePk }} | Selected: {{ selectedCount }} states</p>
                    </div>
                    <button class="text-2xl font-semibold leading-none p-1" @click="toggleExpand" aria-label="Close modal">✕</button>
                </div>

                <!-- Body: Split Layout -->
                <div class="p-6 flex flex-col md:flex-row gap-6 overflow-y-auto min-h-0 flex-1">
                    <!-- Left: Large Map Display -->
                    <div class="md:w-3/5 flex flex-col min-h-0">
                        <div v-if="usingBasicShapes" class="bg-yellow-100 p-2 mb-2 text-xs rounded">
                            Using basic shapes (fallback map)
                        </div>

                        <div class="relative border rounded-lg overflow-hidden flex-1 min-h-[400px] bg-gray-50 flex items-stretch">
                            <svg
                                version="1.1"
                                xmlns="http://www.w3.org/2000/svg"
                                :viewBox="viewBoxString"
                                preserveAspectRatio="xMidYMid meet"
                                class="w-full h-full select-none cursor-move min-h-[400px]"
                                :style="mapCanvasStyle"
                                style="touch-action: none;"
                                @pointerdown="startPan"
                                @pointermove="onPan"
                                @pointerup="endPan"
                                @pointerleave="endPan"
                                @pointercancel="endPan"
                                @wheel.prevent="onWheel"
                                @contextmenu.prevent
                            >
                                <g :key="'modal-' + renderVersion">
                                    <path
                                        v-for="state in states"
                                        :key="'modal-' + state.pk"
                                        :d="getStatePath(state)"
                                        :transform="getStateTransform(state) || null"
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

                            <!-- Zoom Controls Overlay -->
                            <div class="absolute bottom-4 right-4 flex flex-col gap-1 z-10">
                                <button class="bg-white shadow border rounded px-3 py-1.5 text-md font-bold hover:bg-gray-100" @click.stop="zoomIn">+</button>
                                <button class="bg-white shadow border rounded px-3 py-1.5 text-md font-bold hover:bg-gray-100" @click.stop="zoomOut">-</button>
                                <button class="bg-white shadow border rounded px-2.5 py-1 text-xs hover:bg-gray-100 font-semibold" @click.stop="resetViewport">Fit</button>
                                <button class="bg-blue-600 text-white shadow border border-blue-700 rounded px-2 py-1 text-xs hover:bg-blue-700 font-semibold" @click.stop="toggleExpand">Collapse</button>
                            </div>

                            <div class="absolute top-2 left-2 bg-white/90 shadow px-2 py-1 rounded text-xs border z-10">
                                <strong>Click</strong> to select, <strong>Drag</strong> to pan, <strong>Scroll</strong> to zoom.
                            </div>
                        </div>

                        <div class="flex justify-between mt-3">
                            <button @click="selectAll" class="bg-blue-500 text-white px-3 py-1.5 text-xs rounded hover:bg-blue-600 font-medium">Select all</button>
                            <button @click="clearSelection" class="bg-red-500 text-white px-3 py-1.5 text-xs rounded hover:bg-red-600 font-medium">Clear selection</button>
                        </div>
                    </div>

                    <!-- Right: Controls Panel -->
                    <div class="md:w-2/5 flex flex-col overflow-y-auto pr-2">
                        <!-- Score/Weight Inputs -->
                        <div class="bg-gray-50 border rounded-lg p-4 mb-4">
                            <div class="grid grid-cols-2 gap-4 w-full">
                                <div>
                                    <label class="block text-xs font-bold uppercase text-gray-600 mb-1">Issue Score (-1 to 1)</label>
                                    <input type="number" step="0.05" min="-1" max="1" v-model.number="editScore"
                                        class="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                        placeholder="0.00">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold uppercase text-gray-600 mb-1">Weight</label>
                                    <input type="number" step="0.1" min="0" v-model.number="editWeight"
                                        class="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                        placeholder="1.0">
                                </div>
                            </div>

                            <button
                                class="w-full mt-4 bg-blue-600 text-white py-2 rounded shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                                :disabled="selectedCount === 0"
                                @click="applyToSelected"
                            >
                                Apply to {{ selectedCount || 0 }} selected
                            </button>
                            <p v-if="selectedCount > 0" class="text-xs text-gray-500 mt-2 text-center">
                                Editing: {{ Object.keys(selectedStates).map(pk => states.find(s=>s.pk==pk)?.fields.abbr).join(', ') }}
                            </p>
                        </div>

                        <!-- States List -->
                        <div class="border rounded divide-y max-h-96 overflow-y-auto bg-white">
                            <div
                                v-for="state in sortedStateMetrics"
                                :key="'modal-state-' + state.pk"
                                class="flex items-center justify-between px-3 py-2.5 text-sm hover:bg-gray-50 cursor-pointer"
                                :class="{'bg-blue-50': selectedStates[state.pk]}"
                                @click="toggleStateSelection(state.pk)"
                            >
                                <div class="flex items-center gap-3">
                                    <div class="w-4 h-4 rounded-full border shadow-sm" :style="{backgroundColor: getStateColor(state.pk)}"></div>
                                    <div>
                                        <span class="font-medium text-gray-800">{{ state.name }}</span>
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
                </div>
            </div>
        </div>
    </div>
    `
});
