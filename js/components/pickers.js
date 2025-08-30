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