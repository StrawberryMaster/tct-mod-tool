registerComponent('endings', {

    data() {
        return {
            temp_endings: [],
            showManageModal: false,
            manageTab: 'list', // 'list' | 'reorder'
            orderList: [],       // [{ id, text }]
            dragIndex: null
        };
    },

    template: `
    <div class="mx-auto p-3">

        <h1 class="text-xl font-semibold mb-3">Custom endings</h1>

        <div class="flex flex-wrap gap-2 mb-4">
            <button v-if="!enabled" class="bg-green-500 text-white p-2 rounded-sm hover:bg-green-600" v-on:click="toggleEnabled()">Enable custom endings</button>
            <button v-if="enabled" class="bg-red-500 text-white p-2 rounded-sm hover:bg-red-600" v-on:click="toggleEnabled()">Disable custom endings</button>

            <button v-if="enabled" class="bg-green-500 text-white p-2 rounded-sm hover:bg-green-600" v-on:click="addEnding()">Add custom ending</button>
            <button v-if="enabled && endings.length > 1" class="bg-gray-500 text-white p-2 rounded-sm hover:bg-gray-600" @click="openManageModal('reorder')">
                Manage endings
            </button>
            <button v-if="enabled && endings.length > 1" class="bg-blue-500 text-white p-2 rounded-sm hover:bg-blue-600" @click="autoOrder()">
                Auto order
            </button>
        </div>

        <div v-if="enabled && endings.length > 0" class="space-y-4">
            <ending @deleteEvent="deleteEnding" :id="x.id" :key="x.id" v-for="x in endings"></ending>
        </div>

        <div v-if="enabled && endings.length === 0" class="text-gray-500 italic p-4 text-center">
            No custom endings yet. Click "Add custom ending" to get started.
        </div>

        <!-- Endings Manager Modal -->
        <div v-if="showManageModal" class="fixed inset-0 z-50">
            <div class="absolute inset-0 bg-black/50" @click="closeManageModal()"></div>
            <div class="absolute inset-0 flex items-center justify-center p-4">
                <div class="bg-white rounded-sm shadow-lg w-full max-w-3xl max-h-[80vh] flex flex-col">
                    <div class="p-3 border-b flex justify-between items-center">
                        <div class="flex gap-2">
                            <button class="px-3 py-1 rounded-sm text-sm"
                                    :class="manageTab==='list' ? 'bg-gray-800 text-white' : 'bg-gray-200 hover:bg-gray-300'"
                                    @click="manageTab='list'">List</button>
                            <button class="px-3 py-1 rounded-sm text-sm"
                                    :class="manageTab==='reorder' ? 'bg-gray-800 text-white' : 'bg-gray-200 hover:bg-gray-300'"
                                    @click="manageTab='reorder' || resetOrderFromMap(); manageTab='reorder'">Reorder</button>
                        </div>
                        <button class="text-gray-600 hover:text-black text-xl leading-none" @click="closeManageModal()">✕</button>
                    </div>

                    <div class="p-3 overflow-auto">
                        <!-- List tab -->
                        <div v-if="manageTab==='list'">
                            <ul class="divide-y">
                                <li v-for="ending in endings" :key="ending.id"
                                    class="py-2 px-2 hover:bg-gray-50 flex items-center justify-between">
                                    <span>
                                        <span class="font-mono text-gray-700">#{{ ending.id }}</span>
                                        <span class="text-gray-700"> - {{ endingDescription(ending) }}</span>
                                    </span>
                                    <button class="text-xs bg-red-500 text-white px-2 py-1 rounded-sm hover:bg-red-600" @click="deleteEnding(ending.id)">Delete</button>
                                </li>
                            </ul>
                        </div>

                        <!-- Reorder tab -->
                        <div v-else>
                            <div class="flex justify-between items-center mb-2">
                                <h3 class="font-semibold text-sm">Drag to reorder (top = highest priority)</h3>
                                <div class="flex gap-2">
                                    <button class="bg-gray-200 px-2 py-1 rounded-sm text-sm hover:bg-gray-300" @click="resetOrderFromMap()">Reset</button>
                                    <button class="bg-blue-500 text-white px-2 py-1 rounded-sm text-sm hover:bg-blue-600" @click="autoOrder()">Auto order</button>
                                    <button class="bg-green-500 text-white px-2 py-1 rounded-sm text-sm hover:bg-green-600" @click="applyOrder()">Save order</button>
                                </div>
                            </div>
                            <ul class="divide-y">
                                <li v-for="(item, idx) in orderList"
                                    :key="item.id"
                                    class="py-2 px-2 flex items-center gap-3 hover:bg-gray-50"
                                    draggable="true"
                                    @dragstart="onDragStart(idx)"
                                    @dragover.prevent
                                    @drop="onDrop(idx)"
                                    @dragend="onDragEnd">
                                    <span class="w-6 text-xs text-gray-500">{{ idx + 1 }}</span>
                                    <span class="cursor-move select-none inline-flex items-center text-xs text-gray-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M7 4a1 1 0 100-2 1 1 0 000 2zm6-1a1 1 0 110 2 1 1 0 010-2zM7 9a1 1 0 100-2 1 1 0 000 2zm6-1a1 1 0 110 2 1 1 0 010-2zM7 14a1 1 0 100-2 1 1 0 000 2zm6-1a1 1 0 110 2 1 1 0 010-2z"/>
                                        </svg>
                                        Drag
                                    </span>
                                    <span class="text-sm">
                                        <span class="font-mono text-gray-700">#{{ item.id }}</span>
                                        <span class="text-gray-700">- {{ item.text }}</span>
                                    </span>
                                </li>
                            </ul>
                            <div class="text-xs text-gray-500 mt-2">Tip: Auto order sorts by variable type and amount in descending order. This is to avoid most issues with broken or unobtainable endings.</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    </div>
    `,

    methods: {

        toggleEnabled: function(evt) {
            this.$TCT.jet_data.endings_enabled = !this.$TCT.jet_data.endings_enabled;

            this.$globalData.dataVersion++;
        },

        addEnding: function(evt) {
            let id = Date.now();
            this.$TCT.jet_data.ending_data[id] = {
                'id':id,
                'variable':0,
                'operator':'>',
                'amount':0,
                'endingTitle':'',
                'endingSubtitle':'',
                'endingHideImage':false,
                'endingImage':"",
                'endingText':"Put ending text here, you can and should use <p>HTML tags</p>!",
                'endingSlidesJson':'',
                'audioTitle':'',
                'audioArtist':'',
                'audioCover':'',
                'audioUrl':'',
                'variableConditions':[],
                'variableConditionOperator':'AND',
                'answerConditionType':'ignore',
                'answerConditionAnswer':'',
                'answerConditionAnswers':''
            }
            this.temp_endings = [];
            this.$globalData.dataVersion++;
        },

        deleteEnding: function(id) {
            delete this.$TCT.jet_data.ending_data[id];
            this.temp_endings = [];
            this.$globalData.dataVersion++;
        },

        openManageModal(tab = 'list') {
            this.manageTab = tab;
            if (tab === 'reorder') {
                this.resetOrderFromMap();
            }
            this.showManageModal = true;
        },

        closeManageModal() {
            this.showManageModal = false;
        },

        resetOrderFromMap() {
            const list = this.endings;
            this.orderList = list.map(ending => ({
                id: ending.id,
                text: this.endingDescription(ending)
            }));
        },

        onDragStart(index) {
            this.dragIndex = index;
        },

        onDrop(index) {
            if (this.dragIndex === null || this.dragIndex === index) return;
            const moved = this.orderList.splice(this.dragIndex, 1)[0];
            this.orderList.splice(index, 0, moved);
            this.dragIndex = null;
        },

        onDragEnd() {
            this.dragIndex = null;
        },

        applyOrder() {
            // create ordered array of IDs
            const orderedIds = this.orderList.map(x => {
                const n = Number(x.id);
                return Number.isFinite(n) ? n : x.id;
            });

            try {
                // persist explicit ordering to jet_data.endings_order
                // this avoids relying on object insertion order
                if (!this.$TCT.jet_data) this.$TCT.jet_data = {};
                this.$TCT.jet_data.endings_order = orderedIds;

                // force re-render of the component list by clearing any temp cache
                this.temp_endings = [];

                // autosave if enabled
                if (window.autosaveEnabled) {
                    window.requestAutosaveDebounced?.(0);
                }
            } catch (e) {
                console.error("Failed to reorder endings:", e);
                alert("There was an error applying the new order. See console for details.");
                return;
            }

            // Close modal after saving
            this.showManageModal = false;
        },

        autoOrder() {
            // Sort endings by variable type priority and amount in descending order
            const priorityMap = { 0: 3, 1: 2, 2: 1 }; // EVs=3, Pop%=2, Raw=1
            const sorted = [...this.endings].sort((a, b) => {
                const aPriority = priorityMap[a.variable] || 0;
                const bPriority = priorityMap[b.variable] || 0;
                // First sort by variable type priority
                if (aPriority !== bPriority) {
                    return bPriority - aPriority;
                }
                // Then by amount in descending order
                return (b.amount || 0) - (a.amount || 0);
            });

            this.orderList = sorted.map(ending => ({
                id: ending.id,
                text: this.endingDescription(ending)
            }));

            // apply the new order
            this.applyOrder();
        },

        endingDescription(ending) {
            const varNames = ['Electoral Votes', 'Popular Vote %', 'Raw Vote Total'];
            const varName = varNames[ending.variable] || 'Unknown';
            const operator = ending.operator || '>';
            const amount = ending.amount || 0;
            const previewSource = ending.endingTitle || ending.endingText || '[Ending]';
            const preview = previewSource.substring(0, 50) + (previewSource.length > 50 ? '...' : '');
            const varGate = ending.variableConditionEnabled
                ? ` | var ${ending.variableConditionName || '?'} ${ending.variableConditionOperator || '=='} ${ending.variableConditionValue || ''}`
                : '';
            const answerGate = ending.answerConditionType && ending.answerConditionType !== 'ignore'
                ? ` | answer ${ending.answerConditionType} ${(ending.answerConditionAnswers || ending.answerConditionAnswer || '?')}`
                : '';
            return `${varName} ${operator} ${amount}${varGate}${answerGate} - ${preview}`;
        }

    },

    computed: {

        endings: function() {
            let a = [this.$globalData.dataVersion];
            return this.temp_endings.concat(this.$TCT.getAllEndings());
        },

        enabled: function() {
            if(this.$TCT.jet_data.endings_enabled == null) {
                this.$TCT.jet_data.endings_enabled = false;
            }

            if(this.$TCT.jet_data.ending_data == null) {
                this.$TCT.jet_data.ending_data = {};
            }

            let a = [this.$globalData.dataVersion];

            return this.$TCT.jet_data.endings_enabled;
        }
    }
})

registerComponent('ending', {

    props: ['id'],

    data() {
        return {
            selectedAnswerToAdd: null,
            variableConditionToAdd: {
                variable: '',
                comparator: '>=',
                value: 0
            }
        };
    },

    template: `
    <div class="mx-auto bg-white border border-gray-300 rounded-sm shadow-sm p-4 mb-4">
        <div class="flex justify-between items-start mb-3">
            <h3 class="font-semibold text-sm text-gray-700">Ending #{{ id }}</h3>
            <button @click="deleteEvent()" class="bg-red-500 text-white px-2 py-1 text-xs rounded-sm hover:bg-red-600">
                Delete
            </button>
        </div>
        
        <div class="grid grid-cols-3 gap-2 mb-3">
            <select @change="onChange($event)" :value="getVariable" name="variable" class="border rounded-sm px-2 py-1">
                <option value="0">Player electoral votes (EVs)</option>
                <option value="1">Player popular vote (%)</option>
                <option value="2">Player raw vote total</option>
            </select>

            <select @change="onChange($event)" :value="getOperator" name="operator" class="border rounded-sm px-2 py-1">
                <option value=">">Greater than (&gt;)</option>
                <option value=">=">Greater than or equal (&gt;=)</option>
                <option value="==">Equal to (==)</option>
                <option value="<=">Less than or equal (&lt;=)</option>
                <option value="<">Less than (&lt;)</option>
                <option value="!=">Not equal to (!=)</option>
            </select>

            <input @input="onInput($event)" :value="getAmount" name="amount" type="number" class="border rounded-sm px-2 py-1">
        </div>

        <div class="grid grid-cols-2 gap-2 mb-3 border rounded-sm p-3 bg-gray-50">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Variable conditions (optional):</label>
                
                <div v-if="hasVariableConditions" class="mb-2 flex items-center gap-2">
                    <span class="text-xs text-gray-600">Join with:</span>
                    <select :value="variableConditionOperatorValue" @change="updateVariableConditionOperator($event.target.value)" class="border rounded-sm p-1 text-sm">
                        <option value="AND">AND (all must be true)</option>
                        <option value="OR">OR (any can be true)</option>
                    </select>
                </div>

                <div v-if="hasVariableConditions" class="mb-2 space-y-1">
                    <div v-for="(c, idx) in variableConditionsList" :key="'varcond-'+idx" class="grid grid-cols-4 gap-1 items-center bg-white p-2 rounded-sm border">
                        <select :value="c.variable" @change="updateVariableCondition(idx, 'variable', $event.target.value)" class="border rounded-sm p-1 text-xs col-span-1">
                            <option value="" disabled>Variable...</option>
                            <option v-for="v in cyoaVariableOptions" :key="'var-' + v.id" :value="v.name">{{ v.name }}</option>
                        </select>
                        <select :value="c.comparator" @change="updateVariableCondition(idx, 'comparator', $event.target.value)" class="border rounded-sm p-1 text-xs col-span-1">
                            <option value=">">&gt;</option>
                            <option value=">=">&gt;=</option>
                            <option value="==">==</option>
                            <option value="<=">&lt;=</option>
                            <option value="<">&lt;</option>
                            <option value="!=">!=</option>
                        </select>
                        <input :value="c.value" @input="updateVariableCondition(idx, 'value', Number($event.target.value))" type="number" class="border rounded-sm p-1 text-xs col-span-1">
                        <button type="button" class="text-red-600 hover:text-red-800 text-xs justify-self-end" @click="removeVariableCondition(idx)">✕</button>
                    </div>
                </div>

                <div class="grid grid-cols-4 gap-1 items-center">
                    <select v-model="variableConditionToAdd.variable" class="border rounded-sm p-1 text-sm col-span-1">
                        <option value="" disabled>Variable...</option>
                        <option v-for="v in cyoaVariableOptions" :key="'var-add-' + v.id" :value="v.name">{{ v.name }}</option>
                    </select>
                    <select v-model="variableConditionToAdd.comparator" class="border rounded-sm p-1 text-sm col-span-1">
                        <option value=">">&gt;</option>
                        <option value=">=">&gt;=</option>
                        <option value="==">==</option>
                        <option value="<=">&lt;=</option>
                        <option value="<">&lt;</option>
                        <option value="!=">!=</option>
                    </select>
                    <input v-model.number="variableConditionToAdd.value" type="number" class="border rounded-sm p-1 text-sm col-span-1">
                    <button type="button" class="bg-gray-300 hover:bg-gray-400 px-2 py-1 rounded-sm text-xs col-span-1" @click="addVariableCondition" :disabled="!variableConditionToAdd.variable">Add</button>
                </div>
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Answer condition:</label>
                <select @change="onChange($event)" :value="getAnswerConditionType" name="answerConditionType" class="w-full border rounded-sm px-2 py-1 mb-2">
                    <option value="ignore">Ignore answers</option>
                    <option value="has">Player picked answer(s)</option>
                    <option value="not_has">Player did not pick answer(s)</option>
                </select>
                <div v-if="getAnswerConditionType !== 'ignore'">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Answer IDs:</label>
                    <div class="flex items-center gap-2 mb-2">
                        <select v-model.number="selectedAnswerToAdd" class="w-full border rounded-sm px-2 py-1 text-sm">
                            <option :value="null" disabled>Select answer...</option>
                            <option v-for="a in answerOptions" :key="'ans-opt-' + a.pk" :value="a.pk">
                                {{ a.pk }} - {{ answerDescription(a) }}
                            </option>
                        </select>
                        <button type="button" class="bg-blue-500 text-white px-2 py-1 rounded-sm text-xs hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                @click="addAnswerConditionId()"
                                :disabled="selectedAnswerToAdd == null">
                            Add
                        </button>
                    </div>

                    <div class="flex flex-wrap gap-1" v-if="answerConditionIdList.length > 0">
                        <span v-for="pk in answerConditionIdList" :key="'ans-chip-' + pk"
                              class="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-0.5 rounded-sm text-xs">
                            #{{ pk }}
                            <button type="button" class="ml-1 text-blue-700 hover:text-blue-900" @click="removeAnswerConditionId(pk)">✕</button>
                        </span>
                    </div>
                    <p v-else class="text-xs text-gray-500 italic">No answer IDs selected yet.</p>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-2 gap-2 mb-3">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Slide title (optional):</label>
                <input @input="onInput($event)" :value="getEndingTitle" name="endingTitle" type="text"
                       class="w-full border rounded-sm px-2 py-1" placeholder="Main slide title">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Slide subtitle (optional):</label>
                <input @input="onInput($event)" :value="getEndingSubtitle" name="endingSubtitle" type="text"
                       class="w-full border rounded-sm px-2 py-1" placeholder="Main slide subtitle">
            </div>
        </div>

        <div class="mb-3">
            <label class="block text-sm font-medium text-gray-700 mb-1">Ending text:</label>
            <textarea @input="onInput($event)" :value="getEndingText" name="endingText" rows="4" 
                      class="w-full border rounded-sm px-2 py-1" 
                      placeholder="Put ending text here, you can and should use HTML tags!"></textarea>
        </div>

        <div class="mb-3">
            <label class="block text-sm font-medium text-gray-700 mb-1">Custom ending image (optional):</label>
            <input @input="onInput($event)" :value="endingImage" name="endingImage" type="url" 
                   class="w-full border rounded-sm px-2 py-1" placeholder="Enter image URL">
        </div>

        <div class="mb-3">
            <label class="inline-flex items-center gap-2 text-sm text-gray-700">
                <input @change="onChange($event)" :checked="getEndingHideImage" name="endingHideImage" type="checkbox">
                Hide candidate image on this ending
            </label>
        </div>

        <div class="grid grid-cols-2 gap-2 mb-3">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Audio title (optional):</label>
                <input @input="onInput($event)" :value="getAudioTitle" name="audioTitle" type="text"
                       class="w-full border rounded-sm px-2 py-1" placeholder="Track title">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Audio artist (optional):</label>
                <input @input="onInput($event)" :value="getAudioArtist" name="audioArtist" type="text"
                       class="w-full border rounded-sm px-2 py-1" placeholder="Artist name">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Audio cover URL (optional):</label>
                <input @input="onInput($event)" :value="getAudioCover" name="audioCover" type="url"
                       class="w-full border rounded-sm px-2 py-1" placeholder="Cover image URL">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Audio URL (optional):</label>
                <input @input="onInput($event)" :value="getAudioUrl" name="audioUrl" type="url"
                       class="w-full border rounded-sm px-2 py-1" placeholder="Audio file URL">
            </div>
        </div>

        <div v-if="endingImage" class="mt-3">
            <img :src="endingImage" class="max-w-xs rounded border" alt="Ending preview">
            <p class="text-xs text-gray-500 mt-1">Make sure this image is a multiple of 1100x719</p>
        </div>

    </div>
    `,

    methods: {
        getEndingRow: function() {
            const jet = this.$TCT.jet_data || (this.$TCT.jet_data = {});
            if (!jet.ending_data) {
                jet.ending_data = {};
            }

            if (!jet.ending_data[this.id]) {
                const row = {
                    id: this.id,
                    variable: 0,
                    operator: '>',
                    amount: 0,
                    endingTitle: '',
                    endingSubtitle: '',
                    endingText: '',
                    endingImage: '',
                    endingHideImage: false,
                    audioTitle: '',
                    audioArtist: '',
                    audioCover: '',
                    audioUrl: '',
                    variableConditions: [],
                    variableConditionOperator: 'AND',
                    answerConditionType: 'ignore',
                    answerConditionAnswer: '',
                    answerConditionAnswers: ''
                };

                if (typeof this.$set === 'function') {
                    this.$set(jet.ending_data, this.id, row);
                } else {
                    jet.ending_data[this.id] = row;
                }
            }

            const row = jet.ending_data[this.id];
            const defaults = {
                variable: 0,
                operator: '>',
                amount: 0,
                endingTitle: '',
                endingSubtitle: '',
                endingText: '',
                endingImage: '',
                endingHideImage: false,
                audioTitle: '',
                audioArtist: '',
                audioCover: '',
                audioUrl: '',
                variableConditions: [],
                variableConditionOperator: 'AND',
                answerConditionType: 'ignore',
                answerConditionAnswer: '',
                answerConditionAnswers: ''
            };

            // migrate old single-condition format to new multi-condition format
            if (row.variableConditionEnabled && row.variableConditionName && !Array.isArray(row.variableConditions)) {
                row.variableConditions = [{
                    variable: row.variableConditionName,
                    comparator: row.variableConditionOperator || '==',
                    value: row.variableConditionValue ? Number(row.variableConditionValue) : 0
                }];
                // clean up old fields
                delete row.variableConditionEnabled;
                delete row.variableConditionName;
            }

            for (const [key, value] of Object.entries(defaults)) {
                if (row[key] == null) {
                    if (typeof this.$set === 'function') {
                        this.$set(row, key, value);
                    } else {
                        row[key] = value;
                    }
                }
            }

            return row;
        },

        deleteEvent: function() {
            this.$emit('deleteEvent', this.id)
        },

        setField: function(field, value) {
            const row = this.getEndingRow();
            if (!row) return;

            if (row[field] === value) return;

            if (typeof this.$set === 'function') {
                this.$set(row, field, value);
            } else {
                row[field] = value;
            }

            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        onChange: function(evt) {
            if (evt.target.type === 'checkbox') {
                this.setField(evt.target.name, !!evt.target.checked);
                return;
            }
            this.setField(evt.target.name, evt.target.value);
        },

        onInput: function(evt) {
            this.setField(evt.target.name, evt.target.value);
        },

        parseAnswerIds: function(raw) {
            return String(raw || "")
                .split(/[\s,]+/)
                .map((v) => Number(v))
                .filter((v) => Number.isFinite(v));
        },

        persistAnswerIds: function(ids) {
            const unique = [];
            const seen = new Set();
            for (const id of ids) {
                const n = Number(id);
                if (!Number.isFinite(n) || seen.has(n)) continue;
                seen.add(n);
                unique.push(n);
            }

            const csv = unique.join(", ");
            this.setField('answerConditionAnswers', csv);
            this.setField('answerConditionAnswer', unique.length > 0 ? String(unique[0]) : '');
        },

        addAnswerConditionId: function() {
            const pk = Number(this.selectedAnswerToAdd);
            if (!Number.isFinite(pk)) return;

            const next = [...this.answerConditionIdList, pk];
            this.persistAnswerIds(next);
            this.selectedAnswerToAdd = null;
        },

        removeAnswerConditionId: function(pk) {
            const n = Number(pk);
            const next = this.answerConditionIdList.filter((x) => x !== n);
            this.persistAnswerIds(next);
        },

        answerDescription: function(answer) {
            const s = answer?.fields?.description || '...';
            return s.length > 50 ? (s.slice(0, 50) + '...') : s;
        },

        addVariableCondition: function() {
            const row = this.getEndingRow();
            if (!this.variableConditionToAdd.variable) {
                alert('Please select a variable.');
                return;
            }
            row.variableConditions.push({
                variable: this.variableConditionToAdd.variable,
                comparator: this.variableConditionToAdd.comparator,
                value: Number(this.variableConditionToAdd.value)
            });
            this.variableConditionToAdd = { variable: '', comparator: '>=', value: 0 };
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        removeVariableCondition: function(index) {
            const row = this.getEndingRow();
            if (Array.isArray(row.variableConditions)) {
                row.variableConditions.splice(index, 1);
            }
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        updateVariableCondition: function(index, field, value) {
            const row = this.getEndingRow();
            if (Array.isArray(row.variableConditions) && row.variableConditions[index]) {
                if (field === 'value') {
                    row.variableConditions[index][field] = Number(value);
                } else {
                    row.variableConditions[index][field] = value;
                }
            }
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        updateVariableConditionOperator: function(value) {
            const row = this.getEndingRow();
            row.variableConditionOperator = value;
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        }
    },

    computed: {

        endingImage: function() {
            return this.endingRow.endingImage;
        },

        endingRow: function() {
            this.$globalData.dataVersion;
            return { ...this.getEndingRow() };
        },

        getVariable: function() {
            return this.endingRow.variable;
        },

        getOperator: function() {
            return this.endingRow.operator;
        },

        getAmount: function() {
            return this.endingRow.amount;
        },

        getEndingTitle: function() {
            return this.endingRow.endingTitle || '';
        },

        getEndingSubtitle: function() {
            return this.endingRow.endingSubtitle || '';
        },

        getEndingHideImage: function() {
            return !!this.endingRow.endingHideImage;
        },

        getAudioTitle: function() {
            return this.endingRow.audioTitle || '';
        },

        getAudioArtist: function() {
            return this.endingRow.audioArtist || '';
        },

        getAudioCover: function() {
            return this.endingRow.audioCover || '';
        },

        getAudioUrl: function() {
            return this.endingRow.audioUrl || '';
        },

        getAnswerConditionType: function() {
            return this.endingRow.answerConditionType || 'ignore';
        },

        getAnswerConditionAnswers: function() {
            return this.endingRow.answerConditionAnswers || this.endingRow.answerConditionAnswer || '';
        },

        variableConditionsList: function() {
            this.$globalData.dataVersion;
            const row = this.getEndingRow();
            return Array.isArray(row.variableConditions) ? row.variableConditions : [];
        },

        hasVariableConditions: function() {
            this.$globalData.dataVersion;
            const row = this.getEndingRow();
            return Array.isArray(row.variableConditions) && row.variableConditions.length > 0;
        },

        variableConditionOperatorValue: function() {
            return this.endingRow.variableConditionOperator || 'AND';
        },

        answerConditionIdList: function() {
            this.$globalData.dataVersion;
            return this.parseAnswerIds(this.getAnswerConditionAnswers);
        },

        answerOptions: function() {
            this.$globalData.dataVersion;
            return Object.values(this.$TCT.answers || {});
        },

        getAnswerConditionAnswer: function() {
            return this.endingRow.answerConditionAnswer || '';
        },

        cyoaVariableOptions: function() {
            this.$globalData.dataVersion;
            return this.$TCT.getAllCyoaVariables?.() || [];
        },

        getEndingText: function() {
            return this.endingRow.endingText;
        }
    }
})

