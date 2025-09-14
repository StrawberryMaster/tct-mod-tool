window.defineComponent('question-picker', {

    data() {
        return {
            showReorder: false,
            orderList: [],       // [{ pk, text }]
            dragIndex: null,
            showManageModal: false,
            manageTab: 'reorder', // 'reorder' | 'select'
            searchSelect: ''
        };
    },

    template: `
    <div class="mx-auto p-3">

    <label for="questionPicker">Questions <span class="text-gray-700 italic">({{numberOfQuestions}})</span>:</label><br>

    <!-- For small sets use the classic dropdown, for large sets show a button that opens the modal -->
    <select v-if="!useModalSelect" @click="onClick" @change="onChange($event)" name="questionPicker" id="questionPicker">
        <option v-for="question in questions" :value="question.pk" :key="question.pk" :selected="currentQuestion == question.pk">{{question.pk}} - {{questionDescription(question)}}</option>
    </select>
    <div v-else class="my-1 flex items-center gap-2">
        <button class="bg-blue-500 text-white p-2 rounded-sm hover:bg-blue-600" @click="openManageModal('select')">Select question...</button>
        <span class="text-xs text-gray-600">Using modal due to many questions ({{numberOfQuestions}})</span>
    </div>
    <br>

    <div class="flex flex-wrap gap-2">
        <button class="bg-green-500 text-white p-2 my-2 rounded-sm hover:bg-green-600" v-on:click="addQuestion()">Add question</button>
        <button class="bg-blue-500 text-white p-2 my-2 rounded-sm hover:bg-blue-600" v-on:click="cloneQuestion()">Clone question</button>
        <button class="bg-gray-500 text-white p-2 my-2 rounded-sm hover:bg-gray-600" @click="openManageModal('reorder')">
            Manage questions
        </button>
    </div>

    <!-- Question Manager (left rail) -->
    <div v-if="showManageModal" class="fixed inset-0 z-50">
        <div class="absolute inset-0 bg-black/50" @click="closeManageModal()" aria-hidden="true"></div>
        <div class="absolute inset-0 flex">
            <div class="bg-white h-full w-full sm:max-w-lg shadow-xl flex flex-col" role="dialog" aria-modal="true" aria-label="Manage questions">
                <div class="p-3 border-b flex justify-between items-center">
                    <div class="flex gap-2">
                        <button class="px-3 py-1 rounded-sm text-sm"
                                :class="manageTab==='select' ? 'bg-gray-800 text-white' : 'bg-gray-200 hover:bg-gray-300'"
                                @click="manageTab='select'">Select</button>
                        <button class="px-3 py-1 rounded-sm text-sm"
                                :class="manageTab==='reorder' ? 'bg-gray-800 text-white' : 'bg-gray-200 hover:bg-gray-300'"
                                @click="manageTab==='reorder' || resetOrderFromMap(); manageTab='reorder'">Reorder</button>
                    </div>
                    <button class="text-gray-600 hover:text-black text-xl leading-none" @click="closeManageModal()" aria-label="Close">✕</button>
                </div>

                <div class="p-3 overflow-y-auto flex-1">
                    <!-- Select tab (unchanged content) -->
                    <div v-if="manageTab==='select'">
                        <div class="flex items-center gap-2 mb-2">
                            <input class="border rounded-sm px-2 py-1 w-full" v-model="searchSelect" placeholder="Search by #pk or description...">
                        </div>
                        <ul class="divide-y">
                            <li v-for="q in filteredQuestions" :key="q.pk"
                                class="py-2 px-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                                @click="gotoSelect(q.pk)">
                                <span>
                                    <span class="font-mono text-gray-700">#{{ q.pk }}</span>
                                    <span class="text-gray-700"> - {{ questionDescription(q) }}</span>
                                </span>
                                <button class="text-xs bg-blue-500 text-white px-2 py-1 rounded-sm hover:bg-blue-600" @click.stop="gotoSelect(q.pk)">Open</button>
                            </li>
                        </ul>
                    </div>

                    <!-- Reorder tab (unchanged content) -->
                    <div v-else>
                        <div class="flex justify-between items-center mb-2">
                            <h3 class="font-semibold text-sm">Drag to reorder (top = asked first)</h3>
                            <div class="flex gap-2">
                                <button class="bg-gray-200 px-2 py-1 rounded-sm text-sm hover:bg-gray-300" @click="resetOrderFromMap()">Reset</button>
                                <button class="bg-green-500 text-white px-2 py-1 rounded-sm text-sm hover:bg-green-600" @click="applyOrder()">Save order</button>
                            </div>
                        </div>
                        <ul class="divide-y">
                            <li v-for="(item, idx) in orderList"
                                :key="item.pk"
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
                                    <span class="font-mono text-gray-700">#{{ item.pk }}</span>
                                    <span class="text-gray-700">- {{ item.text }}</span>
                                </span>
                            </li>
                        </ul>
                        <div class="text-xs text-gray-500 mt-2">Tip: You can also use Save Order to immediately autosave the new order.</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <p class="text-xs text-gray-700 italic mt-2">WARNING: When adding and deleting questions, remember that your code 1 needs to have the same number of questions as in your code 2!</p>

    </div>
    `,

    // enable Esc-to-close for the drawer
    mounted() {
        this._onKeydown = (e) => {
            if (e.key === 'Escape' && this.showManageModal) this.closeManageModal();
        };
        window.addEventListener('keydown', this._onKeydown);
    },
    beforeDestroy() {
        window.removeEventListener('keydown', this._onKeydown);
    },

    methods: {

        // Replace old inline toggle with modal opener
        toggleReorder() {
            this.openManageModal('reorder');
        },

        openManageModal(tab = 'reorder') {
            this.manageTab = tab;
            if (tab === 'reorder') {
                this.resetOrderFromMap();
            }
            this.showManageModal = true;
        },

        closeManageModal() {
            this.showManageModal = false;
        },

        gotoSelect(pk) {
            Vue.prototype.$globalData.mode = QUESTION;
            Vue.prototype.$globalData.question = pk;
            this.closeManageModal();
        },

        resetOrderFromMap() {
            const list = Array.from(Vue.prototype.$TCT.questions.values());
            this.orderList = list.map(q => ({
                pk: q.pk,
                text: this.questionDescription(q)
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
            // create ordered array of PKs
            const orderedPks = this.orderList.map(x => x.pk);
            try {
                // reorder the internal map
                if (typeof Vue.prototype.$TCT.reorderQuestions === 'function') {
                    Vue.prototype.$TCT.reorderQuestions(orderedPks);
                } else {
                    // fallback: mutate the existing Map in-place
                    const map = Vue.prototype.$TCT.questions;
                    const lookup = new Map(Array.from(map.values()).map(q => [q.pk, q]));
                    const ordered = orderedPks.map(pk => lookup.get(pk)).filter(Boolean);
                    map.clear();
                    ordered.forEach(q => map.set(q.pk, q));
                }
                // force dropdowns to refresh
                const temp = Vue.prototype.$globalData.filename;
                Vue.prototype.$globalData.filename = "";
                Vue.prototype.$globalData.filename = temp;

                // autosave if enabled
                if (localStorage.getItem("autosaveEnabled") === "true") {
                    window.requestAutosaveDebounced?.(0);
                }
            } catch (e) {
                console.error("Failed to reorder questions:", e);
                alert("There was an error applying the new order. See console for details.");
                return;
            }

            // Close modal after saving
            this.showManageModal = false;
        },

        addQuestion: function() {
            const newPk =  Vue.prototype.$TCT.getNewPk();

            let question = {
                "model": "campaign_trail.question",
                "pk": newPk,
                "fields": {
                    "priority": 0,
                    "description": "put description here",
                    "likelihood": 1.0
                }
            }

            Vue.prototype.$TCT.questions.set(newPk, question);
            
            const temp = Vue.prototype.$globalData.filename;
            Vue.prototype.$globalData.filename = "";
            Vue.prototype.$globalData.filename = temp;

            Vue.prototype.$globalData.mode = QUESTION;
            Vue.prototype.$globalData.question = newPk;
        },

        cloneQuestion: function() {
            const newQuestion = Vue.prototype.$TCT.cloneQuestion(Vue.prototype.$globalData.question);
            
            const temp = Vue.prototype.$globalData.filename;
            Vue.prototype.$globalData.filename = "";
            Vue.prototype.$globalData.filename = temp;

            Vue.prototype.$globalData.mode = QUESTION;
            Vue.prototype.$globalData.question = newQuestion.pk;
        },

        questionDescription:function(question) {
            if(!question.fields.description) {
                return "ERR BAD DESCRIPTION";
            }
            return String(question.fields.description).slice(0,33) + "...";
        },

        onChange:function(evt) {
            Vue.prototype.$globalData.mode = QUESTION;
            Vue.prototype.$globalData.question = evt.target.value;
        },

        onClick:function(evt) {
            if(Vue.prototype.$globalData.mode != QUESTION) {
                Vue.prototype.$globalData.mode = QUESTION;
            }
        }
    },

    computed: {
        questions: function () {
          let a = [Vue.prototype.$globalData.filename];
          return Array.from(Vue.prototype.$TCT.questions.values());
        },

        currentQuestion: function() {
            return Vue.prototype.$globalData.question;
        },

        numberOfQuestions() {
            return this.questions.length;
        },

        // use modal selector when too many questions
        useModalSelect() {
            return this.numberOfQuestions > 30;
        },

        // filter list for the Select tab in the modal
        filteredQuestions() {
            const q = (this.searchSelect || '').toLowerCase().trim();
            if (!q) return this.questions;
            return this.questions.filter(item => {
                const pkStr = String(item.pk).toLowerCase();
                const desc = this.questionDescription(item).toLowerCase();
                return pkStr.includes(q) || desc.includes(q);
            });
        }
    }
})

window.defineComponent('state-picker', {

    template: `
    <div class="mx-auto p-3">

    <label for="statePicker">States:</label><br>

    <select @click="onClick" @change="onChange($event)" name="statePicker" id="statePicker">
        <option v-for="state in states" :value="state.pk" :selected="currentState == state.pk"  :key="state.pk">{{state.pk}} - {{state.fields.abbr}}</option>
    </select>

    <br>
    <button class="bg-green-500 text-white p-2 my-2 rounded-sm hover:bg-green-600" v-on:click="addState()">Add state</button>

    <p class="text-xs text-gray-700 italic">WARNING: If you add a state with the Add State button the abbreviation will need to exist in your map svg. Also change the election pk to your election. Use only if you know what you're doing.</p>

    </div>
    `,

    methods: {
        onChange:function(evt) {
            Vue.prototype.$globalData.mode = STATE;
            Vue.prototype.$globalData.state = evt.target.value;
        },

        onClick:function(evt) {
            if(Vue.prototype.$globalData.mode != STATE) {
                Vue.prototype.$globalData.mode = STATE;
            }
        },

        addState:function(evt) {

            let newPk = Vue.prototype.$TCT.createNewState();
           
            const temp = Vue.prototype.$globalData.filename;
            Vue.prototype.$globalData.filename = "";
            Vue.prototype.$globalData.filename = temp;

            Vue.prototype.$globalData.mode = STATE;
            Vue.prototype.$globalData.state = newPk;

            this.onChange(newPk);
        }
    },

    computed: {
        states: function () {
          let a = [Vue.prototype.$globalData.filename];
          return Object.values(Vue.prototype.$TCT.states);
        },

        currentState: function() {
            return Vue.prototype.$globalData.state;
        }
    }
})

window.defineComponent('issue-picker', {

    template: `
    <div class="mx-auto p-3">

    <label for="issuePicker">Issues:</label><br>

    <select @click="onClick" @change="onChange($event)" name="issuePicker" id="issuePicker">
        <option v-for="issue in issues" :value="issue.pk" :key="issue.pk">{{issue.pk}} - {{issue.fields.name}}</option>
    </select>

    </div>
    `,

    methods: {

        onChange:function(evt) {
            Vue.prototype.$globalData.mode = ISSUE;
            Vue.prototype.$globalData.issue = evt.target.value;
        },

        onClick:function(evt) {
            if(Vue.prototype.$globalData.mode != ISSUE) {
                Vue.prototype.$globalData.mode = ISSUE;
            }
        }
    },

    computed: {
        issues: function () {
          let a = [Vue.prototype.$globalData.filename];
          return Object.values(Vue.prototype.$TCT.issues);
        }
    }
})

window.defineComponent('candidate-picker', {

    template: `
    <div class="mx-auto p-3">

    <label for="candidatePicker">Candidates:</label><br>

    <select @click="onClick" @change="onChange($event)" name="candidatePicker" id="candidatePicker">
        <option v-for="c in candidates" :selected="currentCandidate == c[0]" :value="c[0]" :key="c[0]">{{c[1]}}</option>
    </select>
    <br>
    <button class="bg-green-500 text-white p-2 my-2 rounded-sm hover:bg-green-600" v-on:click="addCandidate()">Add candidate</button>

    </div>
    `,

    methods: {

        addCandidate: function() {
            const newCandidatePk = Vue.prototype.$TCT.addCandidate();
            Vue.prototype.$globalData.mode = CANDIDATE;
            Vue.prototype.$globalData.candidate = newCandidatePk;

            const temp = Vue.prototype.$globalData.filename;
            Vue.prototype.$globalData.filename = "";
            Vue.prototype.$globalData.filename = temp;
        },

        onChange:function(evt) {
            Vue.prototype.$globalData.mode = CANDIDATE;
            Vue.prototype.$globalData.candidate = evt.target.value;
        },

        onClick:function(evt) {
            if(Vue.prototype.$globalData.mode != CANDIDATE) {
                Vue.prototype.$globalData.mode = CANDIDATE;
            }
        }
    },

    computed: {
        currentCandidate: function () {
            return Vue.prototype.$globalData.candidate;
        },
        candidates: function () {
          let a = [Vue.prototype.$globalData.filename];
          return getListOfCandidates();
        }
    }
})

window.defineComponent('cyoa-picker', {

    template: `
    <div class="mx-auto py-1 px-3">

    <button class="bg-gray-300 p-2 my-2 rounded-sm hover:bg-gray-500" v-on:click="gotoCyoa()">CYOA</button>

    </div>
    `,

    methods: {
        gotoCyoa:function(evt) {
            Vue.prototype.$globalData.mode = CYOA;
        },
    }
})

window.defineComponent('banner-picker', {

    template: `
    <div class="mx-auto py-1 px-3">

    <button class="bg-gray-300 p-2 my-2 rounded-sm hover:bg-gray-500" v-on:click="gotoBanner()">Banner settings</button>

    </div>
    `,

    methods: {
        gotoBanner:function(evt) {
            Vue.prototype.$globalData.mode = BANNER;
        },
    }
})

window.defineComponent('template-picker', {

    template: `
    <div class="mx-auto py-1 px-3">

    <label for="templatePicker">Choose a template:</label><br>

    <select @change="onChange" name="templatePicker" id="templatePicker">
        <option v-for="template in templates" :value="template">{{trimmedName(template)}}</option>
    </select>

    <p class="text-sm text-gray-700 italic">WARNING: Choosing a new template will erase all existing progress!</p>

    </div>
    `,

    methods: {
        onChange:function(evt) {
            loadData(evt.target.value);
        },

        trimmedName(f) {
            return f.replace(".txt", "")
        }
    },

    computed: {
        templates: function () {
          return TEMPLATE_NAMES;
        }
    }
})

window.defineComponent('ending-picker', {

    template: `
    <div class="mx-auto py-1 px-3">

    <button class="bg-gray-300 p-2 my-2 rounded-sm hover:bg-gray-500" v-on:click="gotoEndings()">Custom Endings</button>

    </div>
    `,

    methods: {
        gotoEndings:function(evt) {
            Vue.prototype.$globalData.mode = ENDINGS;
        },
    }
})

window.defineComponent('mapping-picker', {

    template: `
    <div class="mx-auto py-1 px-3">

    <button class="bg-gray-300 p-2 my-2 rounded-sm hover:bg-gray-500" v-on:click="gotoMapping()">Custom Map Tools</button>

    </div>
    `,

    methods: {
        gotoMapping:function(evt) {
            Vue.prototype.$globalData.mode = MAPPING;
        },
    }
})

window.defineComponent('bulk-picker', {

    template: `
    <div class="mx-auto py-1 px-3">

    <button class="bg-gray-300 p-2 my-2 rounded-sm hover:bg-gray-500" v-on:click="gotoBulk()">Bulk Tools</button>

    </div>
    `,

    methods: {
        gotoBulk:function(evt) {
            Vue.prototype.$globalData.mode = BULK;
        },
    }
})

window.defineComponent('unified-tools-picker', {
    data() {
        return {
            showDropdown: false,
            selectedTemplate: ''
        };
    },

    template: `
    <div class="bg-white shadow-lg rounded-lg mx-4 mb-4 border border-gray-200">
        <!-- Header -->
        <div class="p-3 bg-gradient-to-r from-slate-800 to-blue-600 text-white rounded-t-lg">
            <h3 class="font-semibold text-sm">Additional Tools</h3>
        </div>
        
        <div class="p-4 space-y-4">
            <!-- Template Selection -->
            <div>
                <label for="templatePicker" class="block text-sm font-medium text-gray-700 mb-1">Choose a template:</label>
                <select @change="onChange" name="templatePicker" id="templatePicker" 
                        class="w-full p-2 border border-gray-300 rounded-sm text-sm bg-gray-50">
                    <option v-for="template in templates" :value="template">{{trimmedName(template)}}</option>
                </select>
                <p class="text-xs text-red-600 italic mt-1">WARNING: Choosing a new template will erase all existing progress!</p>
            </div>

            <!-- Tool Buttons Grid -->
            <div>
                <h4 class="text-sm font-medium text-gray-700 mb-2">Specialized Tools</h4>
                <div class="grid grid-cols-2 gap-2">
                    <button class="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-2 rounded-sm hover:from-blue-600 hover:to-blue-700 text-sm transition-colors" 
                            v-on:click="gotoCyoa()">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        CYOA
                    </button>
                    
                    <button class="bg-gradient-to-r from-green-500 to-green-600 text-white p-2 rounded-sm hover:from-green-600 hover:to-green-700 text-sm transition-colors" 
                            v-on:click="gotoBanner()">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Banner Settings
                    </button>
                    
                    <button class="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-2 rounded-sm hover:from-purple-600 hover:to-purple-700 text-sm transition-colors" 
                            v-on:click="gotoEndings()">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Custom Endings
                    </button>
                    
                    <button class="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-2 rounded-sm hover:from-orange-600 hover:to-orange-700 text-sm transition-colors" 
                            v-on:click="gotoMapping()">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        Map Tools
                    </button>
                    
                    <button class="bg-gradient-to-r from-red-500 to-red-600 text-white p-2 rounded-sm hover:from-red-600 hover:to-red-700 text-sm transition-colors col-span-2" 
                            v-on:click="gotoBulk()">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        Bulk Tools
                    </button>
                </div>
            </div>
        </div>
    </div>
    `,

    methods: {
        gotoCyoa() {
            Vue.prototype.$globalData.mode = CYOA;
        },
        gotoBanner() {
            Vue.prototype.$globalData.mode = BANNER;
        },
        gotoEndings() {
            Vue.prototype.$globalData.mode = ENDINGS;
        },
        gotoMapping() {
            Vue.prototype.$globalData.mode = MAPPING;
        },
        gotoBulk() {
            Vue.prototype.$globalData.mode = BULK;
        },
        onChange(evt) {
            if (confirm("This will overwrite your existing data. Are you sure?")) {
                loadData(evt.target.value);
            } else {
                evt.target.value = this.selectedTemplate;
            }
        },
        trimmedName(f) {
            return f.replace(".txt", "")
        }
    },
    computed: {
        templates: function () {
            return TEMPLATE_NAMES;
        }
    }
})

window.defineComponent('unified-data-picker', {
    template: `
    <div class="bg-white shadow-lg rounded-lg mx-4 mb-4 border border-gray-200">
        <!-- Header -->
        <div class="p-3 bg-gradient-to-r from-slate-800 to-blue-600 text-white rounded-t-lg">
            <h3 class="font-semibold text-sm">Data Management</h3>
        </div>
        
        <div class="p-4 space-y-4">
            <!-- Questions -->
            <question-picker></question-picker>
            
            <!-- States -->
            <state-picker></state-picker>
            
            <!-- Issues -->
            <issue-picker></issue-picker>
            
            <!-- Candidates -->
            <candidate-picker></candidate-picker>
        </div>
    </div>
    `
})