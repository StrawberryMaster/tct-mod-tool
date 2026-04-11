registerComponent('endings', {

    data() {
        return {
            temp_endings: [],
            showManageModal: false,
            manageTab: 'list', // 'list' | 'reorder'
            orderList: [],       // [{ id, text }]
            dragIndex: null,
            slideDrafts: {}
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
                'endingAccentColor':'#11299e',
                'endingBackgroundColor':'#ffffff',
                'endingTextColor':'#000000',
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
            const varCount = Array.isArray(ending.variableConditions) ? ending.variableConditions.length : 0;
            const varGate = varCount > 0
                ? ` | var ${varCount} ${ending.variableConditionOperator || 'AND'}`
                : '';
            const answerIds = String(ending.answerConditionAnswers || ending.answerConditionAnswer || '').trim();
            const answerGate = ending.answerConditionType && ending.answerConditionType !== 'ignore' && answerIds
                ? ` | answer ${ending.answerConditionType} ${answerIds}`
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
        return {};
    },

    template: `
    <div class="mx-auto p-3">
        <div class="border rounded-sm bg-gray-50 p-3 mb-3">
            <h2 class="text-sm font-semibold text-gray-700 mb-2">Slide Colors (applies to all slides in this ending)</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Accent color</label>
                    <input :value="endingRow.endingAccentColor" @input="updateEndingColor('endingAccentColor', $event.target.value)" type="color" class="w-full border rounded-sm h-9 px-1">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Background color</label>
                    <input :value="endingRow.endingBackgroundColor" @input="updateEndingColor('endingBackgroundColor', $event.target.value)" type="color" class="w-full border rounded-sm h-9 px-1">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Text color</label>
                    <input :value="endingRow.endingTextColor" @input="updateEndingColor('endingTextColor', $event.target.value)" type="color" class="w-full border rounded-sm h-9 px-1">
                </div>
            </div>
        </div>

        <div class="space-y-3 mb-3">
            <div class="flex items-center justify-between gap-3">
                <h2 class="text-sm font-semibold text-gray-700">Slides</h2>
                <div class="flex items-center gap-2">
                    <button type="button" class="bg-blue-500 text-white px-2 py-1 rounded-sm text-xs hover:bg-blue-600" @click="addSlideGroup()">
                        Add slide card
                    </button>
                    <button @click.stop="deleteEvent()" class="bg-red-500 text-white px-2 py-1 text-xs rounded-sm hover:bg-red-600 shrink-0">
                        Delete ending
                    </button>
                </div>
            </div>

            <details v-for="(group, groupIndex) in slideGroups" :key="'slide-group-' + group.key" class="border rounded-sm bg-gray-50" open>
                <summary class="cursor-pointer list-none px-3 py-2 flex items-center justify-between gap-3">
                    <div class="min-w-0">
                        <div class="text-sm font-medium text-gray-700 truncate">
                            {{ group.label }}
                        </div>
                        <div class="text-xs text-gray-500 mt-1 truncate">
                            {{ group.slides.length }} case{{ group.slides.length === 1 ? '' : 's' }}
                        </div>
                    </div>
                    <button v-if="groupIndex > 0" type="button" class="text-red-600 hover:text-red-800 text-xs" @click.stop="removeSlideGroup(groupIndex)">Delete card</button>
                </summary>

                <div class="p-3 space-y-3">
                    <div class="flex items-center gap-2">
                        <button type="button" class="bg-blue-500 text-white px-2 py-1 rounded-sm text-xs hover:bg-blue-600" @click="addSlideCase(groupIndex)">
                            Add case
                        </button>
                    </div>

                    <div v-if="group.slides.length === 0" class="text-xs text-gray-500 italic">No cases in this card yet.</div>

                    <details v-for="(slide, slideIndex) in group.slides" :key="group.key + '-case-' + slideIndex" class="bg-white border rounded-sm shadow-sm" open>
                        <summary class="cursor-pointer list-none px-3 py-2 flex items-center justify-between gap-3">
                            <div class="min-w-0">
                                <div class="text-sm font-medium text-gray-700 truncate">
                                    Case {{ slideIndex + 1 }}<span v-if="slide.title"> - {{ slide.title }}</span>
                                </div>
                                <div class="text-xs text-gray-500 mt-1 truncate">{{ slideConditionSummary(slide) }}</div>
                            </div>
                            <button v-if="!(groupIndex === 0 && group.slides.length === 1)" type="button" class="text-red-600 hover:text-red-800 text-xs" @click.stop="removeSlideCase(groupIndex, slideIndex)">Delete</button>
                        </summary>

                        <div class="p-3 space-y-3">
                            <div class="border rounded-sm p-3 bg-gray-50 space-y-4">
                                <div class="space-y-2">
                                    <div class="flex items-center justify-between gap-3">
                                        <label class="block text-sm font-medium text-gray-700">Player stat threshold</label>
                                        <span class="text-xs text-gray-500">This case becomes eligible only when the threshold is met.</span>
                                    </div>

                                    <div class="grid grid-cols-3 gap-2">
                                        <select :value="slide.variable" @change="updateSlideCaseField(groupIndex, slideIndex, 'variable', Number($event.target.value))" class="border rounded-sm px-2 py-1 text-sm">
                                            <option value="0">Player electoral votes (EVs)</option>
                                            <option value="1">Player popular vote (%)</option>
                                            <option value="2">Player raw vote total</option>
                                        </select>

                                        <select :value="slide.operator" @change="updateSlideCaseField(groupIndex, slideIndex, 'operator', $event.target.value)" class="border rounded-sm px-2 py-1 text-sm">
                                            <option value=">">Greater than (&gt;)</option>
                                            <option value=">=">Greater than or equal (&gt;=)</option>
                                            <option value="==">Equal to (==)</option>
                                            <option value="<=">Less than or equal (&lt;=)</option>
                                            <option value="<">Less than (&lt;)</option>
                                            <option value="!=">Not equal to (!=)</option>
                                        </select>

                                        <input :value="slide.amount" @input="updateSlideCaseField(groupIndex, slideIndex, 'amount', Number($event.target.value))" type="number" class="border rounded-sm px-2 py-1 text-sm">
                                    </div>
                                </div>

                                <div class="space-y-2">
                                    <div class="flex items-center justify-between gap-3">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700">Variable conditions (optional)</label>
                                            <p class="text-xs text-gray-500">Add one or more variable checks that must also be true for this case.</p>
                                        </div>
                                        <select :value="slide.variableConditionOperator || 'AND'" @change="updateSlideConditionOperator(groupIndex, slideIndex, $event.target.value)" class="border rounded-sm p-1 text-sm">
                                            <option value="AND">AND (all must be true)</option>
                                            <option value="OR">OR (any can be true)</option>
                                        </select>
                                    </div>

                                    <div v-if="Array.isArray(slide.variableConditions) && slide.variableConditions.length > 0" class="space-y-1">
                                        <div class="text-xs font-medium uppercase tracking-wide text-gray-500">Selected variable conditions</div>
                                        <div v-for="(c, condIndex) in slide.variableConditions" :key="group.key + '-case-' + slideIndex + '-cond-' + condIndex" class="grid grid-cols-12 gap-1 items-center bg-white p-2 rounded-sm border">
                                            <select :value="c.variable" @change="updateSlideCondition(groupIndex, slideIndex, condIndex, 'variable', $event.target.value)" class="border rounded-sm p-1 text-xs col-span-4">
                                                <option value="" disabled>Variable...</option>
                                                <option v-for="v in cyoaVariableOptions" :key="'var-' + v.id" :value="v.name">{{ v.name }}</option>
                                            </select>
                                            <select :value="c.comparator" @change="updateSlideCondition(groupIndex, slideIndex, condIndex, 'comparator', $event.target.value)" class="border rounded-sm p-1 text-xs col-span-3">
                                                <option value=">">&gt;</option>
                                                <option value=">=">&gt;=</option>
                                                <option value="==">==</option>
                                                <option value="<=">&lt;=</option>
                                                <option value="<">&lt;</option>
                                                <option value="!=">!=</option>
                                            </select>
                                            <input :value="c.value" @input="updateSlideCondition(groupIndex, slideIndex, condIndex, 'value', Number($event.target.value))" type="number" class="border rounded-sm p-1 text-xs col-span-4">
                                            <button type="button" class="text-red-600 hover:text-red-800 text-xs justify-self-end col-span-1" @click="removeSlideCondition(groupIndex, slideIndex, condIndex)">✕</button>
                                        </div>
                                    </div>

                                    <div class="grid grid-cols-12 gap-1 items-end">
                                        <div class="col-span-4">
                                            <label class="block text-xs font-medium text-gray-600 mb-1">Variable</label>
                                            <select :value="slide.draft.variable" @change="updateSlideDraftField(groupIndex, slideIndex, 'variable', $event.target.value)" class="border rounded-sm p-1 text-sm w-full">
                                                <option value="">Select variable...</option>
                                                <option v-for="v in cyoaVariableOptions" :key="'var-add-' + v.id" :value="v.name">{{ v.name }}</option>
                                            </select>
                                        </div>
                                        <div class="col-span-3">
                                            <label class="block text-xs font-medium text-gray-600 mb-1">Comparator</label>
                                            <select :value="slide.draft.comparator" @change="updateSlideDraftField(groupIndex, slideIndex, 'comparator', $event.target.value)" class="border rounded-sm p-1 text-sm w-full">
                                                <option value=">">&gt;</option>
                                                <option value=">=">&gt;=</option>
                                                <option value="==">==</option>
                                                <option value="<=">&lt;=</option>
                                                <option value="<">&lt;</option>
                                                <option value="!=">!=</option>
                                            </select>
                                        </div>
                                        <div class="col-span-3">
                                            <label class="block text-xs font-medium text-gray-600 mb-1">Value</label>
                                            <input :value="slide.draft.value" @input="updateSlideDraftField(groupIndex, slideIndex, 'value', Number($event.target.value))" type="number" class="border rounded-sm p-1 text-sm w-full">
                                        </div>
                                        <button type="button" class="bg-gray-300 hover:bg-gray-400 px-2 py-1 rounded-sm text-xs col-span-2" @click="addSlideCondition(groupIndex, slideIndex)" :disabled="!slide.draft.variable">Add variable condition</button>
                                    </div>
                                </div>

                                <div class="space-y-2">
                                    <div class="flex items-center justify-between gap-3">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700">Answer conditions (optional)</label>
                                            <p class="text-xs text-gray-500">Use this to show the case only when the player picked or did not pick specific answers.</p>
                                        </div>
                                        <select :value="slide.answerConditionType || 'ignore'" @change="updateSlideAnswerConditionType(groupIndex, slideIndex, $event.target.value)" class="border rounded-sm p-1 text-sm">
                                            <option value="ignore">No answer condition</option>
                                            <option value="has">Player picked answer(s)</option>
                                            <option value="not_has">Player did not pick answer(s)</option>
                                        </select>
                                    </div>

                                    <div v-if="(slide.answerConditionType || 'ignore') !== 'ignore'" class="space-y-2">
                                        <div class="grid grid-cols-12 gap-1 items-end">
                                            <div class="col-span-10">
                                                <label class="block text-xs font-medium text-gray-600 mb-1">Answer</label>
                                                <select :value="slide.draft.answerId" @change="updateSlideDraftField(groupIndex, slideIndex, 'answerId', $event.target.value)" class="border rounded-sm p-1 text-sm w-full">
                                                    <option value="">Select answer...</option>
                                                    <option v-for="answer in answerOptions" :key="'answer-add-' + answer.pk" :value="String(answer.pk)">
                                                        #{{ answer.pk }} - {{ answerDescription(answer) }}
                                                    </option>
                                                </select>
                                            </div>
                                            <button type="button" class="bg-gray-300 hover:bg-gray-400 px-2 py-1 rounded-sm text-xs col-span-2" @click="addSlideAnswerCondition(groupIndex, slideIndex)" :disabled="!slide.draft.answerId">Add answer</button>
                                        </div>

                                        <div v-if="slideAnswerConditionIds(slide).length > 0" class="space-y-1">
                                            <div class="text-xs font-medium uppercase tracking-wide text-gray-500">Selected answers</div>
                                            <div class="flex flex-wrap gap-1">
                                                <button v-for="answerId in slideAnswerConditionIds(slide)" :key="group.key + '-case-' + slideIndex + '-answer-' + answerId" type="button" class="inline-flex items-center gap-1 rounded-full border bg-white px-2 py-1 text-xs hover:bg-red-50 hover:border-red-300" @click="removeSlideAnswerCondition(groupIndex, slideIndex, answerId)">
                                                    <span>{{ answerLabelById(answerId) }}</span>
                                                    <span class="text-red-500">✕</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-2">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Slide title (optional):</label>
                                    <input :value="slide.title" @input="updateSlideCaseField(groupIndex, slideIndex, 'title', $event.target.value)" type="text"
                                           class="w-full border rounded-sm px-2 py-1" placeholder="Slide title">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Slide subtitle (optional):</label>
                                    <input :value="slide.subtitle" @input="updateSlideCaseField(groupIndex, slideIndex, 'subtitle', $event.target.value)" type="text"
                                           class="w-full border rounded-sm px-2 py-1" placeholder="Slide subtitle">
                                </div>
                            </div>

                            <div class="mb-1">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Ending text:</label>
                                <textarea :value="slide.content" @input="updateSlideCaseField(groupIndex, slideIndex, 'content', $event.target.value)" rows="4"
                                          class="w-full border rounded-sm px-2 py-1"
                                          placeholder="Put ending text here, you can and should use HTML tags!"></textarea>
                            </div>

                            <div class="grid grid-cols-2 gap-2">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Custom ending image (optional):</label>
                                    <input :value="slide.image === false ? '' : slide.image" @input="updateSlideCaseField(groupIndex, slideIndex, 'image', $event.target.value)" type="url"
                                           class="w-full border rounded-sm px-2 py-1" placeholder="Enter image URL">
                                </div>
                                <div class="flex items-end">
                                    <label class="inline-flex items-center gap-2 text-sm text-gray-700">
                                        <input type="checkbox" :checked="slide.hideImage" @change="updateSlideCaseField(groupIndex, slideIndex, 'hideImage', !!$event.target.checked)">
                                        Hide candidate image on this slide
                                    </label>
                                </div>
                            </div>

                            <div v-if="!slide.hideImage && slide.image" class="rounded-sm border bg-white p-2">
                                <img :src="slide.image" class="max-w-xs rounded border" alt="Case slide preview">
                                <p class="text-xs text-gray-500 mt-1">Make sure this image is a multiple of 1100x719</p>
                            </div>

                            <div class="grid grid-cols-2 gap-2">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Audio title (optional):</label>
                                    <input :value="slide.audio?.title || ''" @input="updateSlideCaseAudioField(groupIndex, slideIndex, 'title', $event.target.value)" type="text"
                                           class="w-full border rounded-sm px-2 py-1" placeholder="Track title">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Audio artist (optional):</label>
                                    <input :value="slide.audio?.artist || ''" @input="updateSlideCaseAudioField(groupIndex, slideIndex, 'artist', $event.target.value)" type="text"
                                           class="w-full border rounded-sm px-2 py-1" placeholder="Artist name">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Audio cover URL (optional):</label>
                                    <input :value="slide.audio?.cover || ''" @input="updateSlideCaseAudioField(groupIndex, slideIndex, 'cover', $event.target.value)" type="url"
                                           class="w-full border rounded-sm px-2 py-1" placeholder="Cover image URL">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Audio URL (optional):</label>
                                    <input :value="slide.audio?.url || ''" @input="updateSlideCaseAudioField(groupIndex, slideIndex, 'url', $event.target.value)" type="url"
                                           class="w-full border rounded-sm px-2 py-1" placeholder="Audio file URL">
                                </div>
                            </div>
                        </div>
                    </details>
                </div>
            </details>
        </div>

    </div>
    `,

    methods: {
        parseSlidesJson: function(raw) {
            if (!raw) return [];
            try {
                const parsed = JSON.parse(raw);
                return Array.isArray(parsed) ? parsed : [];
            } catch (_err) {
                return [];
            }
        },

        normalizeSlide: function(slide) {
            const base = slide && typeof slide === 'object' ? slide : {};
            return {
                variable: Number(base.variable ?? 0),
                operator: base.operator || '>',
                amount: Number(base.amount ?? 0),
                title: base.title || '',
                subtitle: base.subtitle || '',
                content: base.content || '',
                image: base.image === false ? false : (base.image || ''),
                hideImage: base.hideImage != null ? !!base.hideImage : base.image === false,
                slideGroup: base.slideGroup || 'main',
                variableConditions: Array.isArray(base.variableConditions) ? base.variableConditions : [],
                variableConditionOperator: base.variableConditionOperator || 'AND',
                answerConditionType: base.answerConditionType || 'ignore',
                answerConditionAnswer: base.answerConditionAnswer || '',
                answerConditionAnswers: base.answerConditionAnswers || '',
                audio: base.audio && typeof base.audio === 'object' ? {
                    title: base.audio.title || '',
                    artist: base.audio.artist || '',
                    cover: base.audio.cover || '',
                    url: base.audio.url || ''
                } : undefined,
                conditionDraft: {
                    variable: '',
                    comparator: '>=',
                    value: 0
                }
            };
        },

        createEmptySlide: function() {
            return this.normalizeSlide({
                variable: 0,
                operator: '>',
                amount: 0,
                title: '',
                subtitle: '',
                content: '',
                image: '',
                hideImage: false,
                slideGroup: 'main',
                variableConditions: [],
                variableConditionOperator: 'AND',
                answerConditionType: 'ignore',
                answerConditionAnswer: '',
                answerConditionAnswers: '',
                audio: {
                    title: '',
                    artist: '',
                    cover: '',
                    url: ''
                }
            });
        },

        serializeSlide: function(slide) {
            const normalized = this.normalizeSlide(slide);
            const payload = {
                variable: Number(normalized.variable ?? 0),
                operator: normalized.operator || '>',
                amount: Number(normalized.amount ?? 0),
                title: normalized.title || '',
                subtitle: normalized.subtitle || '',
                content: normalized.content || '',
                image: normalized.hideImage ? false : (normalized.image || ''),
                slideGroup: normalized.slideGroup || 'main',
                variableConditions: Array.isArray(normalized.variableConditions) ? normalized.variableConditions : [],
                variableConditionOperator: normalized.variableConditionOperator || 'AND',
                answerConditionType: normalized.answerConditionType || 'ignore',
                answerConditionAnswer: normalized.answerConditionAnswer || '',
                answerConditionAnswers: normalized.answerConditionAnswers || ''
            };

            if (normalized.audio && (normalized.audio.title || normalized.audio.artist || normalized.audio.cover || normalized.audio.url)) {
                payload.audio = {
                    title: normalized.audio.title || '',
                    artist: normalized.audio.artist || '',
                    cover: normalized.audio.cover || '',
                    url: normalized.audio.url || ''
                };
            }

            return payload;
        },

        groupLabelForIndex: function(index) {
            if (index === 0) return 'Main slides';
            if (index === 1) return 'Secondary slides';
            return `Extra slides #${index + 1}`;
        },

        slidesHaveExplicitGroups: function(slides) {
            return Array.isArray(slides) && slides.some((slide) => slide && slide.slideGroup);
        },

        getSlideDraftKey: function(groupKey, slideIndex) {
            return `${groupKey}:${slideIndex}`;
        },

        getSlideDraft: function(groupKey, slideIndex) {
            const key = this.getSlideDraftKey(groupKey, slideIndex);
            const store = this.slideDrafts || (this.slideDrafts = {});
            if (!Object.prototype.hasOwnProperty.call(store, key)) {
                store[key] = {
                    variable: '',
                    comparator: '>=',
                    value: 0,
                    answerId: ''
                };
            }
            return store[key];
        },

        updateSlideDraftField: function(groupIndex, slideIndex, field, value) {
            const groups = this.getSlideGroups();
            const group = groups[groupIndex];
            if (!group || !group.slides[slideIndex]) return;
            const draft = this.getSlideDraft(group.key, slideIndex);
            draft[field] = field === 'value' ? Number(value) : value;
            this.$globalData.dataVersion++;
        },

        getSlideGroups: function() {
            const row = this.getEndingRow();
            const parsed = this.parseSlidesJson(row.endingSlidesJson).map((slide) => this.normalizeSlide(slide));

            if (parsed.length === 0) {
                return [{
                    key: 'main',
                    label: 'Main slides',
                    slides: [this.createEmptySlide()]
                }];
            }

            if (!this.slidesHaveExplicitGroups(parsed)) {
                return parsed.map((slide, index) => ({
                    key: index === 0 ? 'main' : (index === 1 ? 'secondary' : `extra-${index + 1}`),
                    label: this.groupLabelForIndex(index),
                    slides: [this.normalizeSlide({ ...slide, slideGroup: index === 0 ? 'main' : (index === 1 ? 'secondary' : `extra-${index + 1}`) })]
                }));
            }

            const groupMap = new Map();
            const groupOrder = [];
            parsed.forEach((slide) => {
                const key = slide.slideGroup || 'main';
                if (!groupMap.has(key)) {
                    groupMap.set(key, []);
                    groupOrder.push(key);
                }
                groupMap.get(key).push(slide);
            });

            return groupOrder.map((key, index) => ({
                key,
                label: this.groupLabelForIndex(index),
                slides: groupMap.get(key).map((slide) => this.normalizeSlide({ ...slide, slideGroup: key }))
            }));
        },

        syncSlideGroups: function(groups) {
            const normalizedGroups = Array.isArray(groups) && groups.length > 0
                ? groups.map((group, groupIndex) => ({
                    key: group.key || (groupIndex === 0 ? 'main' : (groupIndex === 1 ? 'secondary' : `extra-${groupIndex + 1}`)),
                    label: group.label || this.groupLabelForIndex(groupIndex),
                    slides: Array.isArray(group.slides) && group.slides.length > 0 ? group.slides : [this.createEmptySlide()]
                }))
                : [{ key: 'main', label: 'Main slides', slides: [this.createEmptySlide()] }];

            const flatSlides = [];
            normalizedGroups.forEach((group, groupIndex) => {
                group.slides.forEach((slide, slideIndex) => {
                    const normalized = this.serializeSlide({
                        ...slide,
                        slideGroup: group.key || (groupIndex === 0 ? 'main' : (groupIndex === 1 ? 'secondary' : `extra-${groupIndex + 1}`))
                    });
                    flatSlides.push(normalized);
                });
            });

            const mainSlide = flatSlides.find((slide) => (slide.slideGroup || 'main') === 'main') || flatSlides[0] || this.serializeSlide(this.createEmptySlide());
            const row = this.getEndingRow();
            row.endingTitle = mainSlide.title || '';
            row.endingSubtitle = mainSlide.subtitle || '';
            row.endingText = mainSlide.content || '';
            row.endingHideImage = mainSlide.image === false;
            row.endingImage = mainSlide.image === false ? '' : (mainSlide.image || '');
            row.audioTitle = mainSlide.audio?.title || '';
            row.audioArtist = mainSlide.audio?.artist || '';
            row.audioCover = mainSlide.audio?.cover || '';
            row.audioUrl = mainSlide.audio?.url || '';
            row.endingSlidesJson = JSON.stringify(flatSlides, null, 2);

            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        addSlideGroup: function() {
            const groups = this.getSlideGroups();
            const nextIndex = groups.length;
            groups.push({
                key: nextIndex === 0 ? 'main' : (nextIndex === 1 ? 'secondary' : `extra-${nextIndex + 1}`),
                label: this.groupLabelForIndex(nextIndex),
                slides: [this.createEmptySlide()]
            });
            this.syncSlideGroups(groups);
        },

        removeSlideGroup: function(groupIndex) {
            if (groupIndex <= 0) return;
            const groups = this.getSlideGroups();
            if (!groups[groupIndex]) return;
            groups.splice(groupIndex, 1);
            this.syncSlideGroups(groups);
        },

        addSlideCase: function(groupIndex) {
            const groups = this.getSlideGroups();
            if (!groups[groupIndex]) return;
            groups[groupIndex].slides.push(this.createEmptySlide());
            this.syncSlideGroups(groups);
        },

        removeSlideCase: function(groupIndex, slideIndex) {
            const groups = this.getSlideGroups();
            if (!groups[groupIndex] || !groups[groupIndex].slides[slideIndex]) return;
            if (groupIndex === 0 && groups[groupIndex].slides.length === 1) return;
            groups[groupIndex].slides.splice(slideIndex, 1);
            if (groups[groupIndex].slides.length === 0) {
                groups.splice(groupIndex, 1);
            }
            this.syncSlideGroups(groups);
        },

        updateSlideCaseField: function(groupIndex, slideIndex, field, value) {
            const groups = this.getSlideGroups();
            const slide = groups[groupIndex]?.slides?.[slideIndex];
            if (!slide) return;

            if (field === 'hideImage') {
                slide.hideImage = !!value;
                if (slide.hideImage) slide.image = '';
            } else if (field === 'image') {
                slide.image = value;
                slide.hideImage = value === false;
            } else {
                slide[field] = value;
            }

            this.syncSlideGroups(groups);
        },

        updateSlideCaseAudioField: function(groupIndex, slideIndex, field, value) {
            const groups = this.getSlideGroups();
            const slide = groups[groupIndex]?.slides?.[slideIndex];
            if (!slide) return;
            if (!slide.audio || typeof slide.audio !== 'object') {
                slide.audio = { title: '', artist: '', cover: '', url: '' };
            }
            slide.audio[field] = value;
            this.syncSlideGroups(groups);
        },

        addSlideCondition: function(groupIndex, slideIndex) {
            const groups = this.getSlideGroups();
            const slide = groups[groupIndex]?.slides?.[slideIndex];
            const draft = slide ? this.getSlideDraft(groups[groupIndex].key, slideIndex) : null;
            if (!slide || !draft || !draft.variable) return;
            if (!Array.isArray(slide.variableConditions)) slide.variableConditions = [];
            slide.variableConditions.push({
                variable: draft.variable,
                comparator: draft.comparator,
                value: Number(draft.value)
            });
            draft.variable = '';
            draft.comparator = '>=';
            draft.value = 0;
            this.syncSlideGroups(groups);
        },

        removeSlideCondition: function(groupIndex, slideIndex, conditionIndex) {
            const groups = this.getSlideGroups();
            const slide = groups[groupIndex]?.slides?.[slideIndex];
            if (!slide || !Array.isArray(slide.variableConditions)) return;
            slide.variableConditions.splice(conditionIndex, 1);
            this.syncSlideGroups(groups);
        },

        updateSlideCondition: function(groupIndex, slideIndex, conditionIndex, field, value) {
            const groups = this.getSlideGroups();
            const slide = groups[groupIndex]?.slides?.[slideIndex];
            const condition = slide?.variableConditions?.[conditionIndex];
            if (!condition) return;
            condition[field] = field === 'value' ? Number(value) : value;
            this.syncSlideGroups(groups);
        },

        updateSlideConditionOperator: function(groupIndex, slideIndex, value) {
            const groups = this.getSlideGroups();
            const slide = groups[groupIndex]?.slides?.[slideIndex];
            if (!slide) return;
            slide.variableConditionOperator = value;
            this.syncSlideGroups(groups);
        },

        slideAnswerConditionIds: function(slide) {
            return this.parseAnswerIds(slide?.answerConditionAnswers || slide?.answerConditionAnswer || '');
        },

        updateSlideAnswerConditionType: function(groupIndex, slideIndex, value) {
            const groups = this.getSlideGroups();
            const slide = groups[groupIndex]?.slides?.[slideIndex];
            if (!slide) return;
            slide.answerConditionType = value;
            this.syncSlideGroups(groups);
        },

        addSlideAnswerCondition: function(groupIndex, slideIndex) {
            const groups = this.getSlideGroups();
            const slide = groups[groupIndex]?.slides?.[slideIndex];
            if (!slide) return;

            const draft = this.getSlideDraft(groups[groupIndex].key, slideIndex);
            const pk = Number(draft.answerId);
            if (!Number.isFinite(pk)) return;

            const nextIds = this.slideAnswerConditionIds(slide);
            if (!nextIds.includes(pk)) {
                nextIds.push(pk);
            }

            slide.answerConditionType = slide.answerConditionType && slide.answerConditionType !== 'ignore' ? slide.answerConditionType : 'has';
            slide.answerConditionAnswers = nextIds.join(', ');
            slide.answerConditionAnswer = nextIds.length > 0 ? String(nextIds[0]) : '';
            draft.answerId = '';
            this.syncSlideGroups(groups);
        },

        removeSlideAnswerCondition: function(groupIndex, slideIndex, answerId) {
            const groups = this.getSlideGroups();
            const slide = groups[groupIndex]?.slides?.[slideIndex];
            if (!slide) return;

            const pk = Number(answerId);
            if (!Number.isFinite(pk)) return;

            const nextIds = this.slideAnswerConditionIds(slide).filter((id) => id !== pk);
            slide.answerConditionAnswers = nextIds.join(', ');
            slide.answerConditionAnswer = nextIds.length > 0 ? String(nextIds[0]) : '';
            if (nextIds.length === 0 && slide.answerConditionType !== 'ignore') {
                slide.answerConditionType = 'ignore';
            }
            this.syncSlideGroups(groups);
        },

        answerLabelById: function(answerId) {
            const pk = Number(answerId);
            const answer = Number.isFinite(pk) ? this.$TCT.answers?.[pk] : null;
            if (!answer) return `#${answerId}`;
            return `#${answer.pk} - ${this.answerDescription(answer)}`;
        },

        slideConditionSummary: function(slide) {
            const count = Array.isArray(slide.variableConditions) ? slide.variableConditions.length : 0;
            const varNames = ['Electoral Votes', 'Popular Vote %', 'Raw Vote Total'];
            const varName = varNames[Number(slide.variable) || 0] || 'Unknown';
            const amount = slide.amount ?? 0;
            const base = `Threshold: ${varName} ${slide.operator || '>'} ${amount}`;
            const variableSummary = count === 0
                ? ''
                : ` · ${count} variable condition${count === 1 ? '' : 's'} (${slide.variableConditionOperator || 'AND'})`;
            const answerIds = this.slideAnswerConditionIds(slide);
            const answerSummary = (slide.answerConditionType && slide.answerConditionType !== 'ignore' && answerIds.length > 0)
                ? ` · ${slide.answerConditionType === 'has' ? 'answers picked' : 'answers not picked'} (${answerIds.length})`
                : '';
            return `${base}${variableSummary}${answerSummary}`;
        },

        updateEndingColor: function(field, value) {
            const row = this.getEndingRow();
            row[field] = value;
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

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
                    endingAccentColor: '#11299e',
                    endingBackgroundColor: '#ffffff',
                    endingTextColor: '#000000',
                    audioTitle: '',
                    audioArtist: '',
                    audioCover: '',
                    endingSlidesJson: '',


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
                endingAccentColor: '#11299e',
                endingBackgroundColor: '#ffffff',
                endingTextColor: '#000000',
                audioTitle: '',
                audioArtist: '',
                audioCover: '',
                audioUrl: '',
                endingSlidesJson: '',
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

        parseAnswerIds: function(raw) {
            const text = String(raw || "").trim();
            if (!text) return [];
            return text
                .split(/[\s,]+/)
                .filter((v) => v.length > 0)
                .map((v) => Number(v))
                .filter((v) => Number.isFinite(v));
        },

        answerDescription: function(answer) {
            const s = answer?.fields?.description || '...';
            return s.length > 50 ? (s.slice(0, 50) + '...') : s;
        },

    },

    computed: {

        endingRow: function() {
            this.$globalData.dataVersion;
            return this.getEndingRow();
        },

        slideGroups: function() {
            this.$globalData.dataVersion;
            return this.getSlideGroups().map((group) => ({
                ...group,
                slides: group.slides.map((slide, slideIndex) => ({
                    ...slide,
                    draft: this.getSlideDraft(group.key, slideIndex)
                }))
            }));
        },

        answerOptions: function() {
            this.$globalData.dataVersion;
            return Object.values(this.$TCT.answers || {});
        },

        cyoaVariableOptions: function() {
            this.$globalData.dataVersion;
            return this.$TCT.getAllCyoaVariables?.() || [];
        }
    }
})

