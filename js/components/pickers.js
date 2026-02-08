registerComponent('pk-editor', {
    props: ['type', 'pk', 'cssClass'],
    data() {
        return {
            isEditing: false,
            localValue: this.pk
        };
    },
    template: `
        <span class="inline-block">
            <span v-if="!isEditing" @dblclick="start" :class="cssClass || 'cursor-help hover:text-blue-600'" title="Double click to change PK">{{pk}}</span>
            <input v-else
                   ref="input"
                   type="number"
                   v-model.number="localValue"
                   @blur="save"
                   @keyup.enter="$event.target.blur()"
                   @keyup.esc="cancel"
                   class="border border-blue-500 rounded px-1 py-0 text-black w-24 font-normal h-7 align-middle"
            >
        </span>
    `,
    methods: {
        start() {
            this.localValue = this.pk;
            this.isEditing = true;
            this.$nextTick(() => {
                if (this.$refs.input) {
                    this.$refs.input.focus();
                    this.$refs.input.select();
                }
            });
        },
        save() {
            if (!this.isEditing) return;
            const newVal = Number(this.localValue);
            if (isNaN(newVal) || newVal === Number(this.pk)) {
                this.isEditing = false;
                return;
            }

            if (confirm(`Are you sure you want to change ${this.type} PK ${this.pk} to ${newVal}? This will update every reference in the mod.`)) {
                this.$TCT.changePk(this.type, this.pk, newVal);
                this.$globalData.dataVersion++;

                // update selection if the active item was changed
                const activeItemMap = {
                    'question': 'question',
                    'state': 'state',
                    'issue': 'issue',
                    'candidate': 'candidate'
                };

                const field = activeItemMap[this.type];
                if (field && this.$globalData[field] == this.pk) {
                    this.$globalData[field] = newVal;
                }
            }
            this.isEditing = false;
        },
        cancel() {
            this.isEditing = false;
        }
    }
});

registerComponent('question-picker', {

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
    <div class="mx-auto p-2">

    <label for="questionPicker">Questions <span class="text-gray-700 italic">({{numberOfQuestions}})</span>: <pk-editor type="question" :pk="currentQuestion"></pk-editor></label><br>

    <div class="my-1 flex items-center gap-2">
        <div class="flex-1 min-w-0">
            <select
                class="truncate w-full px-2 py-1 text-sm border rounded bg-white"
                style="min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
                @click="onClick"
                @change="onChange($event)"
                name="questionPicker"
                id="questionPicker"
            >
                <option v-for="question in questions"
                        :value="question.pk"
                        :key="question.pk"
                        :selected="currentQuestion == question.pk">
                    {{question.pk}} - {{questionDescription(question)}}
                </option>
            </select>
        </div>
        <button class="bg-blue-500 text-white px-2 py-1 rounded-sm hover:bg-blue-600 text-sm shrink-0" @click="openManageModal('select')" title="Search for questions">
            Search...
        </button>
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
                                    <span class="font-mono text-gray-700">#<pk-editor type="question" :pk="q.pk"></pk-editor></span>
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
                                    <span class="font-mono text-gray-700">#<pk-editor type="question" :pk="item.pk"></pk-editor></span>
                                    <span class="text-gray-700">- {{ item.text }}</span>
                                </span>
                                <button class="text-red-500 hover:text=red-700 ml-auto"
                                    :aria-label="'Delete question #' + item.pk"  
                                    :title="'Delete question #' + item.pk" 
                                    v-on:click="deleteQuestion(item.pk)"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                    </svg>
                                </button>
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
            this.$globalData.mode = QUESTION;
            this.$globalData.question = pk;
            this.closeManageModal();
        },

        resetOrderFromMap() {
            const list = Array.from(this.$TCT.questions.values());
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
                if (typeof this.$TCT.reorderQuestions === 'function') {
                    this.$TCT.reorderQuestions(orderedPks);
                } else {
                    // fallback: mutate the existing Map in-place
                    const map = this.$TCT.questions;
                    const lookup = new Map(Array.from(map.values()).map(q => [q.pk, q]));
                    const ordered = orderedPks.map(pk => lookup.get(pk)).filter(Boolean);
                    map.clear();
                    ordered.forEach(q => map.set(q.pk, q));
                }
                // force dropdowns to refresh
                this.$globalData.dataVersion++;

                // autosave if enabled
                if (window.autosaveEnabled) {
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

        addQuestion: function () {
            const newPk = this.$TCT.getNewPk();

            let question = {
                "model": "campaign_trail.question",
                "pk": newPk,
                "fields": {
                    "description": "put description here"
                }
            }

            this.$TCT.questions.set(newPk, question);

            this.$globalData.dataVersion++;

            this.$globalData.mode = QUESTION;
            this.$globalData.question = newPk;
        },

        deleteQuestion(pk) {
            if (!confirm(`Are you sure you want to delete question #${pk}?`)) return;

            let referencedAnswers = this.$TCT.getAnswersForQuestion(pk);
            for (let i = 0; i < referencedAnswers.length; i++) {
                this.deleteAnswer(referencedAnswers[i].pk, true);
            }

            this.$TCT.questions.delete(pk);
            this.$globalData.question = Array.from(this.$TCT.questions.values())[0]?.pk || null;

            this.$globalData.dataVersion++;

            this.resetOrderFromMap();
        },

        deleteAnswer: function (pk, suppressConfirm = false) {
            if (!suppressConfirm) {
                if (!confirm(`Are you sure you want to delete answer #${pk}?`)) return;
            }

            let referencedFeedbacks = this.$TCT.getAdvisorFeedbackForAnswer(pk);
            for (let i = 0; i < referencedFeedbacks.length; i++) {
                delete this.$TCT.answer_feedback[referencedFeedbacks[i].pk];
            }
            this.$TCT._invalidateCache('feedback_by_answer');

            let x = this.$TCT.getStateScoreForAnswer(pk);
            for (let i = 0; i < x.length; i++) {
                delete this.$TCT.answer_score_state[x[i].pk];
            }
            this.$TCT._invalidateCache('state_score_by_answer');

            x = this.$TCT.getIssueScoreForAnswer(pk);
            for (let i = 0; i < x.length; i++) {
                delete this.$TCT.answer_score_issue[x[i].pk];
            }
            this.$TCT._invalidateCache('issue_score_by_answer');

            x = this.$TCT.getGlobalScoreForAnswer(pk);
            for (let i = 0; i < x.length; i++) {
                delete this.$TCT.answer_score_global[x[i].pk];
            }
            this.$TCT._invalidateCache('global_score_by_answer');

            delete this.$TCT.answers[pk];
            this.$TCT._invalidateCache('answers_by_question');
            this.$globalData.dataVersion++;
        },

        cloneQuestion: function () {
            const newQuestion = this.$TCT.cloneQuestion(this.$globalData.question);

            this.$globalData.dataVersion++;

            this.$globalData.mode = QUESTION;
            this.$globalData.question = newQuestion.pk;
        },

        questionDescription: function (question) {
            if (!question.fields.description) {
                return "ERR BAD DESCRIPTION";
            }
            return String(question.fields.description).slice(0, 33) + "...";
        },

        onChange: function (evt) {
            this.$globalData.mode = QUESTION;
            this.$globalData.question = evt.target.value;
        },

        onClick: function (evt) {
            if (this.$globalData.mode != QUESTION) {
                this.$globalData.mode = QUESTION;
            }
        }
    },

    computed: {
        questions: function () {
            let a = [this.$globalData.filename, this.$globalData.dataVersion];
            return Array.from(this.$TCT.questions.values());
        },

        currentQuestion: function () {
            return this.$globalData.question;
        },

        numberOfQuestions() {
            return this.questions.length;
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

registerComponent('state-picker', {

    template: `
    <div class="mx-auto p-3">

    <label for="statePicker" class="cursor-help hover:text-blue-600" @dblclick="$promptChangePk('state', currentState)" title="Double click to change PK of currently selected state">States:</label><br>

    <select @click="onClick" @change="onChange($event)" name="statePicker" id="statePicker">
        <option v-for="state in states" :value="state.pk" :selected="currentState == state.pk"  :key="state.pk">{{state.pk}} - {{state.fields.abbr}}</option>
    </select>

    <br>
    <button class="bg-green-500 text-white p-2 my-2 rounded-sm hover:bg-green-600" v-on:click="addState()">Add state</button>

    <p class="text-xs text-gray-700 italic">WARNING: If you add a state with the Add State button the abbreviation will need to exist in your map svg. Also change the election pk to your election. Use only if you know what you're doing.</p>

    </div>
    `,

    methods: {
        onChange: function (evt) {
            this.$globalData.mode = STATE;
            this.$globalData.state = evt.target.value;
        },

        onClick: function (evt) {
            if (this.$globalData.mode != STATE) {
                this.$globalData.mode = STATE;
            }
        },

        addState: function (evt) {

            let newPk = this.$TCT.createNewState();

            this.$globalData.dataVersion++;

            this.$globalData.mode = STATE;
            this.$globalData.state = newPk;

            this.onChange(newPk);
        }
    },

    computed: {
        states: function () {
            let a = [this.$globalData.filename, this.$globalData.dataVersion];
            return Object.values(this.$TCT.states);
        },

        currentState: function () {
            return this.$globalData.state;
        }
    }
})

registerComponent('issue-picker', {

    template: `
    <div class="mx-auto p-3">

    <label for="issuePicker" class="cursor-help hover:text-blue-600" @dblclick="$promptChangePk('issue', currentIssue)" title="Double click to change PK of currently selected issue">Issues:</label><br>

    <select @click="onClick" @change="onChange($event)" name="issuePicker" id="issuePicker">
        <option v-for="issue in issues" :value="issue.pk" :key="issue.pk">{{issue.pk}} - {{issue.fields.name}}</option>
    </select>

    <div class="flex gap-2 my-2">
        <button class="bg-green-500 text-white p-2 rounded-sm hover:bg-green-600" @click="addIssue()">Clone issue</button>
        <button class="bg-red-500 text-white p-2 rounded-sm hover:bg-red-600" @click="deleteCurrentIssue()">Delete issue</button>
    </div>

    </div>
    `,

    methods: {

        onChange: function (evt) {
            this.$globalData.mode = ISSUE;
            this.$globalData.issue = evt.target.value;
        },

        onClick: function (evt) {
            if (this.$globalData.mode != ISSUE) {
                this.$globalData.mode = ISSUE;
            }
        },

        addIssue() {
            const list = this.issues;
            if (!list.length) {
                alert('No issues available to clone from.');
                return;
            }
            const basePk = this.$globalData.issue || list[0].pk;
            try {
                const newIssue = this.$TCT.cloneIssue(basePk);
                this.$globalData.dataVersion++;
                this.$globalData.mode = ISSUE;
                this.$globalData.issue = newIssue.pk;
            } catch (err) {
                alert(err.message || 'Jinkies! Failed to clone issue.');
            }
        },

        deleteCurrentIssue() {
            const current = this.$globalData.issue;
            if (!current) return;
            if (!confirm('Do you really wish to delete this issue?')) return;
            try {
                const next = this.nextIssue(current);
                this.$TCT.removeIssue(current);
                const remaining = this.issues;
                this.$globalData.issue = next ?? (remaining[0]?.pk ?? null);
                this.$globalData.dataVersion++;
            } catch (err) {
                alert(err.message || 'Failed to delete issue.');
            }
        },

        nextIssue(pkcurrent) {
            const list = this.issues;
            const idx = list.findIndex(item => item.pk === pkcurrent);
            if (idx === -1) return null;
            if (idx + 1 < list.length) return list[idx + 1].pk;
            if (idx > 0) return list[idx - 1].pk;
            return null;
        }
    },

    computed: {
        issues: function () {
            let a = [this.$globalData.filename, this.$globalData.dataVersion];
            return Object.values(this.$TCT.issues);
        },

        currentIssue: function () {
            return this.$globalData.issue;
        }
    }
})

registerComponent('candidate-picker', {

    template: `
    <div class="mx-auto p-3">

    <label for="candidatePicker" class="cursor-help hover:text-blue-600" @dblclick="$promptChangePk('candidate', currentCandidate)" title="Double click to change ID of currently selected candidate">Candidates:</label><br>

    <select @click="onClick" @change="onChange($event)" name="candidatePicker" id="candidatePicker">
        <option v-for="c in candidates" :selected="currentCandidate == c[0]" :value="c[0]" :key="c[0]">{{c[1]}}</option>
    </select>
    <br>
    <button class="bg-green-500 text-white p-2 my-2 rounded-sm hover:bg-green-600" v-on:click="addCandidate()">Add candidate</button>

    </div>
    `,

    methods: {

        addCandidate: function () {
            const newCandidatePk = this.$TCT.addCandidate();
            this.$globalData.mode = CANDIDATE;
            this.$globalData.candidate = newCandidatePk;

            this.$globalData.dataVersion++;
        },

        onChange: function (evt) {
            this.$globalData.mode = CANDIDATE;
            this.$globalData.candidate = evt.target.value;
        },

        onClick: function (evt) {
            if (this.$globalData.mode != CANDIDATE) {
                this.$globalData.mode = CANDIDATE;
            }
        }
    },

    computed: {
        currentCandidate: function () {
            return this.$globalData.candidate;
        },
        candidates: function () {
            let a = [this.$globalData.filename, this.$globalData.dataVersion];
            return getListOfCandidates();
        }
    }
})

registerComponent('cyoa-picker', {

    template: `
    <div class="mx-auto py-1 px-3">

    <button class="bg-gray-300 p-2 my-2 rounded-sm hover:bg-gray-500" v-on:click="gotoCyoa()">CYOA</button>

    </div>
    `,

    methods: {
        gotoCyoa: function (evt) {
            this.$globalData.mode = CYOA;
        },
    }
})

registerComponent('banner-picker', {

    template: `
    <div class="mx-auto py-1 px-3">

    <button class="bg-gray-300 p-2 my-2 rounded-sm hover:bg-gray-500" v-on:click="gotoBanner()">Banner settings</button>

    </div>
    `,

    methods: {
        gotoBanner: function (evt) {
            this.$globalData.mode = BANNER;
        },
    }
})

registerComponent('template-picker', {

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
        onChange: function (evt) {
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

registerComponent('ending-picker', {

    template: `
    <div class="mx-auto py-1 px-3">

    <button class="bg-gray-300 p-2 my-2 rounded-sm hover:bg-gray-500" v-on:click="gotoEndings()">Custom Endings</button>

    </div>
    `,

    methods: {
        gotoEndings: function (evt) {
            this.$globalData.mode = ENDINGS;
        },
    }
})

registerComponent('mapping-picker', {

    template: `
    <div class="mx-auto py-1 px-3">

    <button class="bg-gray-300 p-2 my-2 rounded-sm hover:bg-gray-500" v-on:click="gotoMapping()">Custom Map Tools</button>

    </div>
    `,

    methods: {
        gotoMapping: function (evt) {
            this.$globalData.mode = MAPPING;
        },
    }
})

registerComponent('bulk-picker', {

    template: `
    <div class="mx-auto py-1 px-3">

    <button class="bg-gray-300 p-2 my-2 rounded-sm hover:bg-gray-500" v-on:click="gotoBulk()">Bulk Tools</button>

    </div>
    `,

    methods: {
        gotoBulk: function (evt) {
            this.$globalData.mode = BULK;
        },
    }
})

registerComponent('unified-tools-picker', {
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
            <h3 class="font-semibold text-sm">Additional tools</h3>
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
                <h4 class="text-sm font-medium text-gray-700 mb-2">Specialized tools</h4>
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
                        Banner settings
                    </button>
                    
                    <button class="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-2 rounded-sm hover:from-purple-600 hover:to-purple-700 text-sm transition-colors" 
                            v-on:click="gotoEndings()">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Custom endings
                    </button>
                    
                    <button class="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-2 rounded-sm hover:from-orange-600 hover:to-orange-700 text-sm transition-colors" 
                            v-on:click="gotoMapping()">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        Map tools
                    </button>
                    
                    <button class="bg-gradient-to-r from-red-500 to-red-600 text-white p-2 rounded-sm hover:from-red-600 hover:to-red-700 text-sm transition-colors col-span-2" 
                            v-on:click="gotoBulk()">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        Bulk tools
                    </button>
                </div>
            </div>
        </div>
    </div>
    `,

    methods: {
        gotoCyoa() {
            this.$globalData.mode = CYOA;
        },
        gotoBanner() {
            this.$globalData.mode = BANNER;
        },
        gotoEndings() {
            this.$globalData.mode = ENDINGS;
        },
        gotoMapping() {
            this.$globalData.mode = MAPPING;
        },
        gotoBulk() {
            this.$globalData.mode = BULK;
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

registerComponent('unified-data-picker', {
    template: `
    <div class="bg-white shadow-lg rounded-lg mx-4 mb-4 border border-gray-200">
        <!-- Header -->
        <div class="p-3 bg-gradient-to-r from-slate-800 to-blue-600 text-white rounded-t-lg">
            <h3 class="font-semibold text-sm">Data management</h3>
        </div>
        
        <div class="p-1 space-y-4">
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

