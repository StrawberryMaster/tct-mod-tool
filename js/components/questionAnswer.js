function loadDefaultUSMap() {
    console.log("Called function to load default US map...");
    return fetch('js/components/resources/us.svg')
      .then(response => response.text())
      .catch(error => {
        console.error("Error loading default US map:", error);
        return null;
      });
}

Vue.component('question', {
    props: {
        pk: Number
    },

    data() {
        return {
            temp_answers: [],
            activeAnswer: null,
            activeTab: 'feedback',
            savedMessage: 'Saved',
        };
    },

    mounted() {
        window.addEventListener('tct:autosaved', this.onAutosaved);
    },
    beforeDestroy() {
        window.removeEventListener('tct:autosaved', this.onAutosaved);
    },

    template: `
    <div class="mx-auto p-4">
        <!-- Header with actions -->
        <div class="flex justify-between items-center mb-4 bg-white p-3 rounded-lg shadow">
            <h1 class="font-bold text-xl">Question #{{this.pk}}</h1>
            <div class="flex space-x-2 items-center">
                <button class="bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 flex items-center"
                        @click="saveQuestion">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Save
                </button>
                <button class="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 flex items-center" v-on:click="deleteQuestion()">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                </button>
                <span class="ml-2 text-xs text-gray-500">{{ savedMessage }}</span>
            </div>
        </div>

        <!-- Question details card -->
        <div class="bg-white rounded-lg shadow mb-6 p-4">
            <div class="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label for="priority" class="block text-sm font-medium text-gray-700">Priority:</label>
                    <input @input="onInput($event)" :value="priority" name="priority" type="number" 
                        class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                </div>
                <div>
                    <label for="likelihood" class="block text-sm font-medium text-gray-700">Likelihood:</label>
                    <input @input="onInput($event)" :value="likelihood" name="likelihood" type="number" 
                        class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    <div class="text-xs text-gray-500 mt-1">Higher values = more likely to appear</div>
                </div>
            </div>
            
            <div>
                <label for="description" class="block text-sm font-medium text-gray-700">Question Text:</label>
                <textarea
                    :key="'question-desc-' + pk"
                    autocomplete="off"
                    @input="onQuestionDescriptionInput"
                    :value="description"
                    name="question_description"
                    rows="4" 
                    class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"></textarea>
            </div>
        </div>

        <!-- Answer management section -->
        <div class="bg-white rounded-lg shadow mb-6">
            <div class="p-4 border-b flex justify-between items-center">
                <h2 class="font-bold text-lg">Answers ({{this.answers.length}})</h2>
                <button class="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600 flex items-center" v-on:click="addAnswer()">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Answer
                </button>
            </div>
            
            <!-- Answer list and details in split view -->
            <div class="flex flex-col md:flex-row">
                <!-- Left side: Answer list -->
                <div class="md:w-1/2 border-r overflow-y-auto" style="max-height: 600px;">
                    <ul class="divide-y">
                        <li v-for="answer in answers" :key="answer.pk" 
                            :class="{'bg-blue-50': activeAnswer === answer.pk}"
                            class="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                            @click="selectAnswer(answer.pk)">
                            <div class="flex justify-between items-start">
                                <div class="font-medium text-sm">#{{answer.pk}}</div>
                                <div class="flex space-x-1">
                                    <button @click.stop="cloneAnswer(answer.pk)" class="text-blue-500 hover:text-blue-700">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                        </svg>
                                    </button>
                                    <button @click.stop="deleteAnswer(answer.pk)" class="text-red-500 hover:text-red-700">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div class="line-clamp-2 text-sm text-gray-700 mt-1">
                                {{answer.fields.description}}
                            </div>
                            <div class="flex mt-2 space-x-1">
                                <span v-if="hasGlobalScores(answer.pk)" class="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">Global</span>
                                <span v-if="hasFeedback(answer.pk)" class="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">Feedback</span>
                                <span v-if="hasIssueScores(answer.pk)" class="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">Issues</span>
                                <span v-if="hasStateScores(answer.pk)" class="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded-full">States</span>
                            </div>
                        </li>
                    </ul>
                </div>
                
                <!-- Right side: Selected answer details -->
                <div class="md:w-1/2" v-if="activeAnswer">
                    <div class="p-4">
                        <h3 class="font-bold text-md mb-3">Edit Answer #{{activeAnswer}}</h3>
                        <textarea @input="updateAnswerDescription" :value="getAnswerDescription" 
                            class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            rows="4" placeholder="Answer text..."></textarea>
                            
                        <!-- Tabs for different answer settings -->
                        <div class="mt-4 border-b">
                            <nav class="flex -mb-px">
                                <button @click="activeTab = 'feedback'" 
                                    :class="{'border-blue-500 text-blue-600': activeTab === 'feedback', 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300': activeTab !== 'feedback'}"
                                    class="py-2 px-4 font-medium text-sm border-b-2 flex items-center">
                                    <span class="flex items-center">
                                        <span class="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2" v-if="hasFeedback(activeAnswer)"></span>
                                        Feedback
                                    </span>
                                </button>
                                <button @click="activeTab = 'global'" 
                                    :class="{'border-blue-500 text-blue-600': activeTab === 'global', 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300': activeTab !== 'global'}"
                                    class="py-2 px-4 font-medium text-sm border-b-2 flex items-center">
                                    <span class="flex items-center">
                                        <span class="inline-block w-2 h-2 rounded-full bg-purple-500 mr-2" v-if="hasGlobalScores(activeAnswer)"></span>
                                        Global
                                    </span>
                                </button>
                                <button @click="activeTab = 'issues'" 
                                    :class="{'border-blue-500 text-blue-600': activeTab === 'issues', 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300': activeTab !== 'issues'}"
                                    class="py-2 px-4 font-medium text-sm border-b-2 flex items-center">
                                    <span class="flex items-center">
                                        <span class="inline-block w-2 h-2 rounded-full bg-green-500 mr-2" v-if="hasIssueScores(activeAnswer)"></span>
                                        Issues
                                    </span>
                                </button>
                                <button @click="switchToStatesTab()" 
                                :class="{'border-blue-500 text-blue-600': activeTab === 'states', 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300': activeTab !== 'states'}"
                                class="py-2 px-4 font-medium text-sm border-b-2 flex items-center">
                                <span class="flex items-center">
                                    <span class="inline-block w-2 h-2 rounded-full bg-orange-500 mr-2" v-if="hasStateScores(activeAnswer)"></span>
                                    States
                                </span>
                            </button>
                            </nav>
                        </div>
                        
                        <!-- Tab content -->
                        <div class="p-2 mt-2">
                            <!-- Feedback Tab -->
                            <div v-if="activeTab === 'feedback'">
                                <div class="flex justify-between items-center mb-3">
                                    <h4 class="font-medium text-sm">Answer Feedback</h4>
                                    <button @click="addFeedback(activeAnswer)" class="bg-blue-500 text-white px-2 py-1 text-xs rounded hover:bg-blue-600">
                                        Add Feedback
                                    </button>
                                </div>
                                <answer-feedback-card 
                                    v-for="feedback in getFeedbackForAnswer(activeAnswer)" 
                                    :pk="feedback.pk" 
                                    :key="feedback.pk"
                                    @deleteFeedback="deleteFeedback">
                                </answer-feedback-card>
                                <div v-if="!hasFeedback(activeAnswer)" class="text-gray-500 text-sm text-center py-4">
                                    No feedback configured yet
                                </div>
                            </div>
                            
                            <!-- Global Scores Tab -->
                            <div v-if="activeTab === 'global'">
                                <div class="flex justify-between items-center mb-3">
                                    <h4 class="font-medium text-sm">Global Scores</h4>
                                    <button @click="addGlobalScore(activeAnswer)" class="bg-purple-500 text-white px-2 py-1 text-xs rounded hover:bg-purple-600">
                                        Add Global Score
                                    </button>
                                </div>
                                <global-score-card 
                                    v-for="score in getGlobalScoresForAnswer(activeAnswer)" 
                                    :pk="score.pk" 
                                    :key="score.pk"
                                    @deleteGlobalScore="deleteGlobalScore">
                                </global-score-card>
                                <div v-if="!hasGlobalScores(activeAnswer)" class="text-gray-500 text-sm text-center py-4">
                                    No global scores configured yet
                                </div>
                            </div>
                            
                            <!-- Issue Scores Tab -->
                            <div v-if="activeTab === 'issues'">
                                <div class="flex justify-between items-center mb-3">
                                    <h4 class="font-medium text-sm">Issue Scores</h4>
                                    <button @click="addIssueScore(activeAnswer)" class="bg-green-500 text-white px-2 py-1 text-xs rounded hover:bg-green-600">
                                        Add Issue Score
                                    </button>
                                </div>
                                <issue-score-card 
                                    v-for="score in getIssueScoresForAnswer(activeAnswer)" 
                                    :pk="score.pk" 
                                    :key="score.pk"
                                    @deleteIssueScore="deleteIssueScore">
                                </issue-score-card>
                                <div v-if="!hasIssueScores(activeAnswer)" class="text-gray-500 text-sm text-center py-4">
                                    No issue scores configured yet
                                </div>
                            </div>
                            <!-- State Scores Tab -->
                        <div v-if="activeTab === 'states'" class="mt-4">
                            <div v-if="activeAnswer">
                                <integrated-state-effect-visualizer 
                                    ref="stateVisualizer"
                                    :answerId="activeAnswer">
                                </integrated-state-effect-visualizer>
                            </div>
                            <div v-else class="text-gray-500 text-sm text-center py-4">
                                Select an answer to edit state effects
                            </div>
                        </div>
                        </div>
                    </div>
                </div>
                
                <!-- Placeholder when no answer is selected -->
                <div class="md:w-1/2 flex items-center justify-center p-8 text-gray-500" v-if="!activeAnswer">
                    <div class="text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        <p class="mt-2">Select an answer to edit</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,

    methods: {
        markDirty() {
            this.savedMessage = 'Unsaved changes';
        },
        onAutosaved() {
            this.savedMessage = 'Saved just now';
        },
        quickAutosaveIfEnabled() {
            if (localStorage.getItem("autosaveEnabled") === "true") {
                window.requestAutosaveDebounced?.();
                this.savedMessage = 'Saving...';
            }
        },

        selectAnswer(pk) {
            this.activeAnswer = pk;
            // no save here; just selection
        },
        updateAnswerDescription(evt) {
            Vue.prototype.$TCT.answers[this.activeAnswer].fields.description = evt.target.value;
            this.markDirty();
            this.quickAutosaveIfEnabled();
        },

        addAnswer: function() {
            const newPk = Vue.prototype.$TCT.getNewPk();
            let answer = {
                "model": "campaign_trail.answer",
                "pk": newPk,
                "fields": {
                    "question": this.pk,
                    "description": "New answer option"
                }
            };
            this.temp_answers = [];
            Vue.prototype.$TCT.answers[newPk] = answer;
            this.selectAnswer(newPk);
            this.markDirty();
            this.quickAutosaveIfEnabled();
        },

        addFeedback: function(answerPk) {
            const newPk = Vue.prototype.$TCT.getNewPk();
            let feedback = {
                "model": "campaign_trail.answer_feedback",
                "pk": newPk,
                "fields": {
                    "answer": answerPk,
                    "candidate": Vue.prototype.$TCT.getFirstCandidatePK(),
                    "answer_feedback": "Enter feedback text here"
                }
            };
            Vue.prototype.$TCT.answer_feedback[newPk] = feedback;
            this.temp_answers = [];
            this.markDirty();
            this.quickAutosaveIfEnabled();
        },

        addGlobalScore: function(answerPk) {
            const newPk = Vue.prototype.$TCT.getNewPk();
            let x = {
                "model": "campaign_trail.answer_score_global",
                "pk": newPk,
                "fields": {
                    "answer": answerPk,
                    "candidate": Vue.prototype.$TCT.getFirstCandidatePK(),
                    "affected_candidate": Vue.prototype.$TCT.getFirstCandidatePK(),
                    "global_multiplier": 0
                }
            };
            Vue.prototype.$TCT.answer_score_global[newPk] = x;
            this.temp_answers = [];
            this.markDirty();
            this.quickAutosaveIfEnabled();
        },

        addIssueScore: function(answerPk) {
            const newPk = Vue.prototype.$TCT.getNewPk();
            let x = {
                "model": "campaign_trail.answer_score_issue",
                "pk": newPk,
                "fields": {
                    "answer": answerPk,
                    "issue": Vue.prototype.$TCT.getFirstIssuePK(),
                    "issue_score": 0,
                    "issue_importance": 0
                }
            };
            Vue.set(Vue.prototype.$TCT.answer_score_issue, newPk, x);
            this.temp_answers = [];
            this.markDirty();
            this.quickAutosaveIfEnabled();
        },

        addStateScore: function(answerPk) {
            const newPk = Vue.prototype.$TCT.getNewPk();
            let x = {
                "model": "campaign_trail.answer_score_state",
                "pk": newPk,
                "fields": {
                    "answer": answerPk,
                    "state": Vue.prototype.$TCT.getFirstStatePK(),
                    "candidate": Vue.prototype.$TCT.getFirstCandidatePK(),
                    "affected_candidate": Vue.prototype.$TCT.getFirstCandidatePK(),
                    "state_multiplier": 0
                }
            };
            Vue.prototype.$TCT.answer_score_state[newPk] = x;
            this.temp_answers = [];
            this.markDirty();
            this.quickAutosaveIfEnabled();
        },
        switchToStatesTab() {
            this.activeTab = 'states';
            this.$nextTick(() => {
                if (this.$refs.stateVisualizer) {
                    this.$refs.stateVisualizer.loadStateEffects();
                }
            });
        },

        deleteAnswer: function(pk, suppressConfirm = false) {
            if (!suppressConfirm) {
                if (!confirm(`Are you sure you want to delete answer #${pk}?`)) return;
            }

            let referencedFeedbacks = Vue.prototype.$TCT.getAdvisorFeedbackForAnswer(pk);
            for(let i = 0; i < referencedFeedbacks.length; i++) {
                delete Vue.prototype.$TCT.answer_feedback[referencedFeedbacks[i].pk];
            }

            let x = Vue.prototype.$TCT.getStateScoreForAnswer(pk);
            for(let i = 0; i < x.length; i++) {
                delete Vue.prototype.$TCT.answer_score_state[x[i].pk];
            }

            x = Vue.prototype.$TCT.getIssueScoreForAnswer(pk);
            for(let i = 0; i < x.length; i++) {
                delete Vue.prototype.$TCT.answer_score_issue[x[i].pk];
            }

            x = Vue.prototype.$TCT.getGlobalScoreForAnswer(pk);
            for(let i = 0; i < x.length; i++) {
                delete Vue.prototype.$TCT.answer_score_global[x[i].pk];
            }

            this.temp_answers = [];
            delete Vue.prototype.$TCT.answers[pk];
            
            if (this.activeAnswer === pk) {
                this.activeAnswer = null;
            }
            this.markDirty();
            this.quickAutosaveIfEnabled();
        },

        cloneAnswer: function(pk) {
            const thisAnswer = Vue.prototype.$TCT.answers[pk];
            Vue.prototype.$TCT.cloneAnswer(thisAnswer, thisAnswer.fields.question);
            this.temp_answers = [];
            this.markDirty();
            this.quickAutosaveIfEnabled();
        },

        deleteFeedback: function(pk) {
            delete Vue.prototype.$TCT.answer_feedback[pk];
            this.temp_answers = [];
            this.markDirty();
            this.quickAutosaveIfEnabled();
        },

        deleteGlobalScore: function(pk) {
            delete Vue.prototype.$TCT.answer_score_global[pk];
            this.temp_answers = [];
            this.markDirty();
            this.quickAutosaveIfEnabled();
        },

        deleteIssueScore: function(pk) {
            delete Vue.prototype.$TCT.answer_score_issue[pk];
            this.temp_answers = [];
            this.markDirty();
            this.quickAutosaveIfEnabled();
        },

        deleteStateScore: function(pk) {
            delete Vue.prototype.$TCT.answer_score_state[pk];
            this.temp_answers = [];
            this.markDirty();
            this.quickAutosaveIfEnabled();
        },

        onInput: function(evt) {
            let value = evt.target.value;
            if(shouldBeSavedAsNumber(value)) {
                value = Number(value);
            }
            Vue.prototype.$TCT.questions.get(this.pk).fields[evt.target.name] = value;
            this.markDirty();
            this.quickAutosaveIfEnabled();
        },

        onInputUpdatePicker: function(evt) {
            Vue.prototype.$TCT.questions.get(this.pk).fields[evt.target.name] = evt.target.value;
            // const temp = Vue.prototype.$globalData.filename;
            // Vue.prototype.$globalData.filename = "";
            // Vue.prototype.$globalData.filename = temp;
            this.markDirty();
            this.quickAutosaveIfEnabled();
        },

        onQuestionDescriptionInput(evt) {
            Vue.prototype.$TCT.questions.get(this.pk).fields.description = evt.target.value;
            // const temp = Vue.prototype.$globalData.filename;
            // Vue.prototype.$globalData.filename = "";
            // Vue.prototype.$globalData.filename = temp;
            this.markDirty();
            this.quickAutosaveIfEnabled();
        },

        deleteQuestion() {
            if (!confirm(`Are you sure you want to delete question #${this.pk}?`)) return;
            
            let referencedAnswers = Vue.prototype.$TCT.getAnswersForQuestion(this.pk);
            for (let i = 0; i < referencedAnswers.length; i++) {
                this.deleteAnswer(referencedAnswers[i].pk, true);
            }

            Vue.prototype.$TCT.questions.delete(this.pk);
            Vue.prototype.$globalData.question = Array.from(Vue.prototype.$TCT.questions.values())[0]?.pk || null;

            const temp = Vue.prototype.$globalData.filename;
            Vue.prototype.$globalData.filename = "";
            Vue.prototype.$globalData.filename = temp;

            this.markDirty();
            this.quickAutosaveIfEnabled();
        },

        saveQuestion() {
            if (typeof window.requestAutosaveDebounced === 'function') {
                window.requestAutosaveDebounced(0);
            } else if (typeof saveAutosave === 'function') {
                saveAutosave();
            }
            this.savedMessage = 'Saved just now';
        },

        getFeedbackForAnswer(pk) {
            return Vue.prototype.$TCT.getAdvisorFeedbackForAnswer(pk);
        },
        
        getGlobalScoresForAnswer(pk) {
            return Vue.prototype.$TCT.getGlobalScoreForAnswer(pk);
        },
        
        getIssueScoresForAnswer(pk) {
            return Vue.prototype.$TCT.getIssueScoreForAnswer(pk);
        },
        
        getStateScoresForAnswer(pk) {
            return Vue.prototype.$TCT.getStateScoreForAnswer(pk);
        },
        
        hasFeedback(pk) {
            return this.getFeedbackForAnswer(pk).length > 0;
        },
        
        hasGlobalScores(pk) {
            return this.getGlobalScoresForAnswer(pk).length > 0;
        },
        
        hasIssueScores(pk) {
            return this.getIssueScoresForAnswer(pk).length > 0;
        },
        
        hasStateScores(pk) {
            return this.getStateScoresForAnswer(pk).length > 0;
        }
    },

    computed: {
        answers: function() {
            return this.temp_answers.concat(Vue.prototype.$TCT.getAnswersForQuestion(this.pk));
        },
        
        description: function () {
            this.temp_answers;
            return Vue.prototype.$TCT.questions.get(this.pk).fields.description;
        },

        priority: function () {
            this.temp_answers;
            return Vue.prototype.$TCT.questions.get(this.pk).fields.priority;
        },

        likelihood: function () {
            this.temp_answers;
            return Vue.prototype.$TCT.questions.get(this.pk).fields.likelihood;
        },
        
        getAnswerDescription: function() {
            if (!this.activeAnswer) return '';
            return Vue.prototype.$TCT.answers[this.activeAnswer].fields.description;
        }
    }
});

Vue.component('answer', {

    props: ['pk'],

    data() {
        return {
            feedbacks: Vue.prototype.$TCT.getAdvisorFeedbackForAnswer(this.pk),
    
            globalScores: Vue.prototype.$TCT.getGlobalScoreForAnswer(this.pk),
    
            issueScores: Vue.prototype.$TCT.getIssueScoreForAnswer(this.pk),
    
            stateScores: Vue.prototype.$TCT.getStateScoreForAnswer(this.pk),
        };
    },

    template: `
    <li class="mx-auto bg-gray-100 p-4">
        <h1 class="font-bold">ANSWER PK {{this.pk}}</h1><br>
        <label for="description">Description:</label><br>
        <textarea @input="onInput($event)" :value="description" name="description" rows="4" cols="50"></textarea><br>
        
        <button class="bg-red-500 text-white p-2 my-2 rounded hover:bg-red-600" v-on:click="deleteAnswer()">Delete Answer</button>
        <button class="bg-blue-500 text-white p-2 my-2 rounded hover:bg-blue-600" v-on:click="cloneAnswer()">Clone Answer</button>

        <details>
        <summary>Answer Feedback ({{this.feedbacks.length}})</summary>
        <button class="bg-green-500 text-white p-2 my-2 rounded hover:bg-green-600" v-on:click="addFeedback()">Add Feedback</button>
        <ul>
            <answer-feedback @deleteFeedback="deleteFeedback" v-for="feedback in feedbacks" :pk="feedback.pk" :key="feedback.pk"></answer-feedback>
        </ul>
        </details>

        <details>
        <summary>Global Scores ({{this.globalScores.length}})</summary>
        <button class="bg-green-500 text-white p-2 my-2 rounded hover:bg-green-600" v-on:click="addGlobalScore()">Add Global Scores</button>
        <ul>
            <global-score @deleteGlobalScore="deleteGlobalScore" v-for="x in globalScores" :pk="x.pk" :key="x.pk"></global-score>
        </ul>
        </details>

        <details>
        <summary>Issue Scores ({{this.issueScores.length}})</summary>
        <button class="bg-green-500 text-white p-2 my-2 rounded hover:bg-green-600" v-on:click="addIssueScore()">Add Issue Score</button>
        <ul>
            <issue-score @deleteIssueScore="deleteIssueScore" v-for="x in issueScores" :pk="x.pk" :key="x.pk"></issue-score>
        </ul>
        </details>

        <details>
        <summary>State Scores ({{this.stateScores.length}})</summary>
        <button class="bg-green-500 text-white p-2 my-2 rounded hover:bg-green-600" v-on:click="addStateScore()">Add State Score</button>
        <ul>
            <state-score @deleteStateScore="deleteStateScore" v-for="x in stateScores" :pk="x.pk" :key="x.pk"></state-score>
        </ul>
        </details>

    </li>
    `,

    methods: {

        cloneAnswer: function() {
            this.$emit('cloneAnswer', this.pk)
            const thisAnswer = Vue.prototype.$TCT.answers[this.pk];
        },

        addFeedback: function() {
            const newPk =  Vue.prototype.$TCT.getNewPk();
            let feedback = {
                "model": "campaign_trail.answer_feedback",
                "pk": newPk,
                "fields": {
                    "answer": this.pk,
                    "candidate": Vue.prototype.$TCT.getFirstCandidatePK(),
                    "answer_feedback": "put feedback here, don't forget to change candidate"
                }
            }
            this.feedbacks.push(feedback)
            Vue.prototype.$TCT.answer_feedback[newPk] = feedback;
            if (localStorage.getItem("autosaveEnabled") === "true") window.requestAutosaveDebounced?.();
        },

        addGlobalScore: function() {
            const newPk =  Vue.prototype.$TCT.getNewPk();
            let x = {
                "model": "campaign_trail.answer_score_global",
                "pk": newPk,
                "fields": {
                    "answer": this.pk,
                    "candidate": Vue.prototype.$TCT.getFirstCandidatePK(),
                    "affected_candidate": Vue.prototype.$TCT.getFirstCandidatePK(),
                    "global_multiplier": 0
                }
            }
            this.globalScores.push(x)
            Vue.prototype.$TCT.answer_score_global[newPk] = x;
            if (localStorage.getItem("autosaveEnabled") === "true") window.requestAutosaveDebounced?.();
        },

        addIssueScore: function() {
            const newPk =  Vue.prototype.$TCT.getNewPk();
            let x = {
                "model": "campaign_trail.answer_score_issue",
                "pk": newPk,
                "fields": {
                    "answer": this.pk,
                    "issue": Vue.prototype.$TCT.getFirstIssuePK(),
                    "issue_score": 0,
                    "issue_importance": 0
                }
            }
            this.issueScores.push(x)
            Vue.prototype.$TCT.answer_score_issue[newPk] = x;
            if (localStorage.getItem("autosaveEnabled") === "true") window.requestAutosaveDebounced?.();
        },

        addStateScore: function() {
            const newPk =  Vue.prototype.$TCT.getNewPk();
            let x = {
                "model": "campaign_trail.answer_score_state",
                "pk": newPk,
                "fields": {
                    "answer": this.pk,
                    "state": Vue.prototype.$TCT.getFirstStatePK(),
                    "candidate": Vue.prototype.$TCT.getFirstCandidatePK(),
                    "affected_candidate": Vue.prototype.$TCT.getFirstCandidatePK(),
                    "state_multiplier": 0
                }
            }
            this.stateScores.push(x)
            Vue.prototype.$TCT.answer_score_state[newPk] = x;
            if (localStorage.getItem("autosaveEnabled") === "true") window.requestAutosaveDebounced?.();
        },

        deleteAnswer: function() {
            this.$emit('deleteAnswer', this.pk)
        },

        deleteFeedback: function(pk) {
            this.feedbacks = this.feedbacks.filter(a => a.pk != pk);
            delete Vue.prototype.$TCT.answer_feedback[pk];
            if (localStorage.getItem("autosaveEnabled") === "true") window.requestAutosaveDebounced?.();
        },

        deleteGlobalScore: function(pk) {
            this.globalScores = this.globalScores.filter(a => a.pk != pk);
            delete Vue.prototype.$TCT.answer_score_global[pk];
            if (localStorage.getItem("autosaveEnabled") === "true") window.requestAutosaveDebounced?.();
        },

        deleteIssueScore: function(pk) {
            this.issueScores = this.issueScores.filter(a => a.pk != pk);
            delete Vue.prototype.$TCT.answer_score_issue[pk];
            if (localStorage.getItem("autosaveEnabled") === "true") window.requestAutosaveDebounced?.();
        },

        deleteStateScore: function(pk) {
            this.stateScores = this.stateScores.filter(a => a.pk != pk);
            delete Vue.prototype.$TCT.answer_score_state[pk];
            if (localStorage.getItem("autosaveEnabled") === "true") window.requestAutosaveDebounced?.();
        },

        onInput: function(evt) {
            let value = evt.target.value;
            if(shouldBeSavedAsNumber(value)) {
                value = Number(value);
            }

            Vue.prototype.$TCT.answers[this.pk].fields[evt.target.name] = value;
            if (localStorage.getItem("autosaveEnabled") === "true") window.requestAutosaveDebounced?.();
        }
    },

    computed: {
        description: function () {
          this.feedbacks;
          this.globalScores;
          this.issueScores;
          this.stateScores;
          return Vue.prototype.$TCT.answers[this.pk].fields.description;
        },
    }
})

// Feedback Card Component
Vue.component('answer-feedback-card', {
    props: ['pk'],

    template: `
    <div class="bg-gray-50 rounded p-3 mb-3 shadow-sm hover:shadow transition-shadow">
        <div class="flex justify-between">
            <h4 class="text-sm font-medium text-gray-700">Feedback #{{pk}}</h4>
            <button @click="$emit('deleteFeedback', pk)" class="text-red-500 hover:text-red-700">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        </div>
        
        <div class="mt-2">
            <label class="block text-xs font-medium text-gray-700">Candidate:</label>
            <div class="flex items-center mt-1">
                <input @input="onInput($event)" :value="candidate" name="candidate" type="number"
                    class="p-1 text-sm block w-20 border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500">
                <span v-if="candidateNickname" class="ml-2 text-xs text-gray-500">({{candidateNickname}})</span>
            </div>
        </div>
        
        <div class="mt-2">
            <label class="block text-xs font-medium text-gray-700">Feedback Text:</label>
            <textarea @input="onInput($event)" :value="answerFeedback" name="answer_feedback" rows="3"
                class="mt-1 p-2 text-sm block w-full border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500"></textarea>
        </div>
    </div>
    `,

    methods: {
        onInput: function(evt) {
            let value = evt.target.value;
            if(shouldBeSavedAsNumber(value)) {
                value = Number(value);
            }

            Vue.prototype.$TCT.answer_feedback[this.pk].fields[evt.target.name] = value;
            if (localStorage.getItem("autosaveEnabled") === "true") window.requestAutosaveDebounced?.();
        }
    },

    computed: {
        candidate: function () {
            return Vue.prototype.$TCT.answer_feedback[this.pk].fields.candidate;
        },

        candidateNickname: function() {
            return Vue.prototype.$TCT.getNicknameForCandidate(this.candidate);
        },

        answerFeedback: function () {
            return Vue.prototype.$TCT.answer_feedback[this.pk].fields.answer_feedback;
        }
    }
});

// Global Score Card Component
Vue.component('global-score-card', {
    props: ['pk'],

    template: `
    <div class="bg-gray-50 rounded p-3 mb-3 shadow-sm hover:shadow transition-shadow">
        <div class="flex justify-between">
            <h4 class="text-sm font-medium text-gray-700">Global Score #{{pk}}</h4>
            <button @click="$emit('deleteGlobalScore', pk)" class="text-red-500 hover:text-red-700">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            <div>
                <label class="block text-xs font-medium text-gray-700">Candidate:</label>
                <div class="flex items-center mt-1">
                    <input @input="onInput($event)" :value="candidate" name="candidate" type="number"
                        class="p-1 text-sm block w-20 border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    <span v-if="candidateNickname" class="ml-2 text-xs text-gray-500">({{candidateNickname}})</span>
                </div>
            </div>
            
            <div>
                <label class="block text-xs font-medium text-gray-700">Affected Candidate:</label>
                <div class="flex items-center mt-1">
                    <input @input="onInput($event)" :value="affected" name="affected_candidate" type="number"
                        class="p-1 text-sm block w-20 border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    <span v-if="affectedNickname" class="ml-2 text-xs text-gray-500">({{affectedNickname}})</span>
                </div>
            </div>
        </div>
        
        <div class="mt-3">
            <label class="block text-xs font-medium text-gray-700">Global Multiplier:</label>
            <div class="flex items-center mt-1">
                <input @input="onInput($event)" :value="multiplier" name="global_multiplier" type="number" step="0.001"
                    class="p-1 text-sm block w-24 border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500">
                <div class="ml-2 flex-1 h-2 bg-gray-200 rounded">
                    <div class="h-full rounded" 
                        :style="{ width: Math.min(Math.max((multiplier + 0.04) * 1250, 0), 100) + '%', 
                                 backgroundColor: multiplier < 0 ? '#ef4444' : '#22c55e' }">
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,

    methods: {
        onInput: function(evt) {
            let value = evt.target.value;
            if(shouldBeSavedAsNumber(value)) {
                value = Number(value);
            }

            Vue.prototype.$TCT.answer_score_global[this.pk].fields[evt.target.name] = value;
            if (localStorage.getItem("autosaveEnabled") === "true") window.requestAutosaveDebounced?.();
        }
    },

    computed: {
        candidateNickname: function() {
            return Vue.prototype.$TCT.getNicknameForCandidate(this.candidate);
        },

        affectedNickname: function() {
            return Vue.prototype.$TCT.getNicknameForCandidate(this.affected);
        },

        candidate: function () {
            return Vue.prototype.$TCT.answer_score_global[this.pk].fields.candidate;
        },

        affected: function () {
            return Vue.prototype.$TCT.answer_score_global[this.pk].fields.affected_candidate;
        },

        multiplier: function () {
            return Vue.prototype.$TCT.answer_score_global[this.pk].fields.global_multiplier;
        }
    }
});

// Issue Score Card Component
Vue.component('issue-score-card', {
    props: ['pk'],

    template: `
    <div class="bg-gray-50 rounded p-3 mb-3 shadow-sm hover:shadow transition-shadow">
        <div class="flex justify-between">
            <h4 class="text-sm font-medium text-gray-700">Issue Score #{{pk}}</h4>
            <button @click="$emit('deleteIssueScore', pk)" class="text-red-500 hover:text-red-700">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        </div>
        
        <div class="mt-2">
            <label class="block text-xs font-medium text-gray-700">Issue:</label>
            <select @change="onInput($event)" name="issue" 
                class="mt-1 p-1 text-sm block w-full border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500">
                <option v-for="i in issues" :selected="i.pk == issue" :value="i.pk" :key="i.pk">
                    {{i.pk}} - {{i.fields.name}}
                </option>
            </select>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div>
                <label class="block text-xs font-medium text-gray-700">Issue Score:</label>
                <div class="flex items-center mt-1">
                    <input @input="onInput($event)" :value="issueScore" name="issue_score" type="number" step="0.1"
                        class="p-1 text-sm block w-20 border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    <div class="ml-2 flex-1 h-2 bg-gray-200 rounded">
                        <div class="h-full rounded bg-green-500" 
                            :style="{ width: Math.min(Math.max((parseFloat(issueScoreDisplay) + 1) * 50, 0), 100) + '%' }">
                        </div>
                    </div>
                </div>
                <div class="text-xs text-gray-500 mt-1">(-1.0 = Stance 1, 1.0 = Stance 7)</div>
            </div>
            
            <div>
                <label class="block text-xs font-medium text-gray-700">Issue Importance:</label>
                <div class="flex items-center mt-1">
                    <input @input="onInput($event)" :value="issueImportanceDisplay" name="issue_importance" type="number" step="1" min="0"
                        class="p-1 text-sm block w-20 border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    <div class="ml-2 flex-1 h-2 bg-gray-200 rounded">
                        <div class="h-full rounded bg-blue-500" 
                            :style="{ width: Math.min(Math.max(parseFloat(issueImportanceDisplay) * 20, 0), 100) + '%' }">
                        </div>
                    </div>
                </div>
                <div class="text-xs text-gray-500 mt-1">Higher = more important</div>
            </div>
        </div>
    </div>
    `,

    methods: {
        onInput: function(evt) {
            let value = evt.target.value;
            if(shouldBeSavedAsNumber(value)) {
                value = Number(value);
            }

            Vue.prototype.$TCT.answer_score_issue[this.pk].fields[evt.target.name] = value;
            if (localStorage.getItem("autosaveEnabled") === "true") window.requestAutosaveDebounced?.();
        }
    },

    computed: {
        issues: function() {
            return Object.values(Vue.prototype.$TCT.issues);
        },

        issue: function () {
            return Vue.prototype.$TCT.answer_score_issue[this.pk].fields.issue;
        },

        issueScore: function () {
            return Vue.prototype.$TCT.answer_score_issue[this.pk].fields.issue_score;
        },

        issueImportance: function () {
            return Vue.prototype.$TCT.answer_score_issue[this.pk].fields.issue_importance;
        },

        issueScoreDisplay: function () {
            return this.issueScore !== undefined && this.issueScore !== null ? this.issueScore : 0;
        },

        issueImportanceDisplay: function () {
            return this.issueImportance !== undefined && this.issueImportance !== null ? this.issueImportance : 0;
        }
    }
});
// State Score Card Component
Vue.component('state-score-card', {
    props: ['pk'],

    template: `
    <div class="bg-gray-50 rounded p-3 mb-3 shadow-sm hover:shadow transition-shadow">
        <div class="flex justify-between">
            <h4 class="text-sm font-medium text-gray-700">State Score #{{pk}}</h4>
            <button @click="$emit('deleteStateScore', pk)" class="text-red-500 hover:text-red-700">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        </div>
        
        <div class="mt-2">
            <label class="block text-xs font-medium text-gray-700">State:</label>
            <select @change="onInput($event)" name="state" 
                class="mt-1 p-1 text-sm block w-full border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500">
                <option v-for="s in states" :selected="s.pk == state" :value="s.pk" :key="s.pk">
                    {{s.pk}} - {{s.fields.name}} ({{s.fields.abbr}})
                </option>
            </select>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div>
                <label class="block text-xs font-medium text-gray-700">Candidate:</label>
                <div class="flex items-center mt-1">
                    <input @input="onInput($event)" :value="candidate" name="candidate" type="number"
                        class="p-1 text-sm block w-20 border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    <span v-if="candidateNickname" class="ml-2 text-xs text-gray-500">({{candidateNickname}})</span>
                </div>
            </div>
            
            <div>
                <label class="block text-xs font-medium text-gray-700">Affected Candidate:</label>
                <div class="flex items-center mt-1">
                    <input @input="onInput($event)" :value="affected" name="affected_candidate" type="number"
                        class="p-1 text-sm block w-20 border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    <span v-if="affectedNickname" class="ml-2 text-xs text-gray-500">({{affectedNickname}})</span>
                </div>
            </div>
        </div>
        
        <div class="mt-3">
            <label class="block text-xs font-medium text-gray-700">State Multiplier:</label>
            <div class="flex items-center mt-1">
                <input @input="onInput($event)" :value="multiplier" name="state_multiplier" type="number" step="0.001"
                    class="p-1 text-sm block w-24 border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500">
                <div class="ml-2 flex-1 h-2 bg-gray-200 rounded">
                    <div class="h-full rounded" 
                        :style="{ width: Math.min(Math.max((multiplier + 0.04) * 1250, 0), 100) + '%', 
                                 backgroundColor: multiplier < 0 ? '#ef4444' : '#22c55e' }">
                    </div>
                </div>
            </div>
            <div class="text-xs text-gray-500 mt-1">
                <span v-if="multiplier > 0">Helps in this state</span>
                <span v-else-if="multiplier < 0">Hurts in this state</span>
                <span v-else>No effect</span>
            </div>
        </div>
    </div>
    `,

    methods: {
        onInput: function(evt) {
            let value = evt.target.value;
            if(shouldBeSavedAsNumber(value)) {
                value = Number(value);
            }

            Vue.prototype.$TCT.answer_score_state[this.pk].fields[evt.target.name] = value;
            if (localStorage.getItem("autosaveEnabled") === "true") window.requestAutosaveDebounced?.();
        }
    },

    computed: {
        candidateNickname: function() {
            return Vue.prototype.$TCT.getNicknameForCandidate(this.candidate);
        },

        affectedNickname: function() {
            return Vue.prototype.$TCT.getNicknameForCandidate(this.affected);
        },
        
        candidate: function () {
            return Vue.prototype.$TCT.answer_score_state[this.pk].fields.candidate;
        },

        affected: function () {
            return Vue.prototype.$TCT.answer_score_state[this.pk].fields.affected_candidate;
        },

        multiplier: function () {
            return Vue.prototype.$TCT.answer_score_state[this.pk].fields.state_multiplier;
        },

        state: function() {
            return Vue.prototype.$TCT.answer_score_state[this.pk].fields.state;
        },

        states: function() {
            return Object.values(Vue.prototype.$TCT.states);
        }
    }
});

Vue.component('state-effect-presets', {
    props: {
        onSelectPreset: Function,
        selectedStatesCount: Number
    },
    
    data() {
        return {
            showPresets: false,
            presetValue: 0.001
        };
    },

    methods: {
        togglePresets() {
            this.showPresets = !this.showPresets;
        },
        
        selectPreset(category) {
            const states = Object.values(Vue.prototype.$TCT.states);
            let statePks = [];
            
            switch(category) {
                case 'swing':
                    // Common swing states
                    const swingAbbrs = ['FL', 'PA', 'MI', 'WI', 'NC', 'AZ', 'NV', 'GA', 'NH'];
                    statePks = states
                        .filter(state => swingAbbrs.includes(state.fields.abbr))
                        .map(state => state.pk);
                    break;
                    
                case 'south':
                    // Southern states
                    const southAbbrs = ['TX', 'FL', 'GA', 'NC', 'SC', 'VA', 'WV', 'KY', 'TN', 'AL', 'MS', 'AR', 'LA', 'OK'];
                    statePks = states
                        .filter(state => southAbbrs.includes(state.fields.abbr))
                        .map(state => state.pk);
                    break;
                    
                case 'midwest':
                    // Midwest states
                    const midwestAbbrs = ['OH', 'MI', 'IN', 'IL', 'WI', 'MN', 'IA', 'MO', 'ND', 'SD', 'NE', 'KS'];
                    statePks = states
                        .filter(state => midwestAbbrs.includes(state.fields.abbr))
                        .map(state => state.pk);
                    break;
                    
                case 'northeast':
                    // Northeast states
                    const northeastAbbrs = ['ME', 'NH', 'VT', 'MA', 'RI', 'CT', 'NY', 'NJ', 'PA', 'DE', 'MD', 'DC'];
                    statePks = states
                        .filter(state => northeastAbbrs.includes(state.fields.abbr))
                        .map(state => state.pk);
                    break;
                    
                case 'west':
                    // Western states
                    const westAbbrs = ['WA', 'OR', 'CA', 'NV', 'ID', 'MT', 'WY', 'UT', 'CO', 'AZ', 'NM', 'AK', 'HI'];
                    statePks = states
                        .filter(state => westAbbrs.includes(state.fields.abbr))
                        .map(state => state.pk);
                    break;
                    
                case 'blue':
                    // Traditionally blue states
                    const blueAbbrs = ['CA', 'NY', 'IL', 'MA', 'MD', 'HI', 'CT', 'ME', 'RI', 'DE', 'WA', 'OR', 'NJ', 'VT', 'NM', 'CO', 'VA', 'MN'];
                    statePks = states
                        .filter(state => blueAbbrs.includes(state.fields.abbr))
                        .map(state => state.pk);
                    break;
                    
                case 'red':
                    // Traditionally red states
                    const redAbbrs = ['TX', 'TN', 'KY', 'AL', 'MS', 'LA', 'AR', 'OK', 'KS', 'NE', 'SD', 'ND', 'MT', 'ID', 'WY', 'UT', 'AK', 'WV', 'SC', 'IN', 'MO'];
                    statePks = states
                        .filter(state => redAbbrs.includes(state.fields.abbr))
                        .map(state => state.pk);
                    break;
                
                case 'small':
                    // Small population/EV states
                    const smallStates = ['WY', 'VT', 'DC', 'AK', 'ND', 'SD', 'DE', 'MT', 'RI', 'NH', 'ME', 'HI', 'ID', 'WV', 'NE', 'NM'];
                    statePks = states
                        .filter(state => smallStates.includes(state.fields.abbr))
                        .map(state => state.pk);
                    break;
                    
                case 'large':
                    // Large population/EV states
                    const largeStates = ['CA', 'TX', 'FL', 'NY', 'PA', 'IL', 'OH', 'GA', 'NC', 'MI', 'NJ', 'VA', 'WA', 'AZ', 'MA', 'TN', 'IN', 'MO', 'MD', 'WI', 'MN', 'CO'];
                    statePks = states
                        .filter(state => largeStates.includes(state.fields.abbr))
                        .map(state => state.pk);
                    break;
            }
            
            this.onSelectPreset(statePks);
        },
        
        applyPresetValue(value) {
            this.presetValue = value;
            this.$emit('applyValue', value);
        }
    },
    
    template: `
    <div>
        <button @click="togglePresets" class="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            State Presets
        </button>
        
        <div v-if="showPresets" class="mt-2 bg-gray-50 p-3 rounded shadow-sm">
            <h4 class="font-medium text-sm mb-2">Select Region:</h4>
            <div class="grid grid-cols-2 gap-1 mb-2">
                <button @click="selectPreset('swing')" class="bg-purple-100 text-purple-800 px-2 py-1 text-xs rounded hover:bg-purple-200">Swing States</button>
                <button @click="selectPreset('south')" class="bg-red-100 text-red-800 px-2 py-1 text-xs rounded hover:bg-red-200">South</button>
                <button @click="selectPreset('midwest')" class="bg-yellow-100 text-yellow-800 px-2 py-1 text-xs rounded hover:bg-yellow-200">Midwest</button>
                <button @click="selectPreset('northeast')" class="bg-blue-100 text-blue-800 px-2 py-1 text-xs rounded hover:bg-blue-200">Northeast</button>
                <button @click="selectPreset('west')" class="bg-green-100 text-green-800 px-2 py-1 text-xs rounded hover:bg-green-200">West</button>
                <button @click="selectPreset('blue')" class="bg-blue-300 text-blue-800 px-2 py-1 text-xs rounded hover:bg-blue-400">Blue States</button>
                <button @click="selectPreset('red')" class="bg-red-300 text-red-800 px-2 py-1 text-xs rounded hover:bg-red-400">Red States</button>
                <button @click="selectPreset('small')" class="bg-gray-200 text-gray-800 px-2 py-1 text-xs rounded hover:bg-gray-300">Small States</button>
                <button @click="selectPreset('large')" class="bg-gray-300 text-gray-800 px-2 py-1 text-xs rounded hover:bg-gray-400">Large States</button>
            </div>
        </div>
    </div>
    `
});

Vue.component('integrated-state-effect-visualizer', {
    props: ['answerId'],

    watch: {
        answerId(newAnswerId, oldAnswerId) {
            if (newAnswerId !== oldAnswerId) {
                this.loadStateEffects();
            }
        }
    },

    data() {
        return {
            candidateId: Vue.prototype.$TCT.getFirstCandidatePK(),
            affectedCandidateId: Vue.prototype.$TCT.getFirstCandidatePK(),
            selectedStates: {},
            stateEffects: {},
            highlightedState: null,
            editValue: 0,
            colorScale: {
                positive: ['#E3F2FD', '#BBDEFB', '#90CAF9', '#64B5F6', '#42A5F5', '#2196F3', '#1E88E5', '#1976D2', '#1565C0', '#0D47A1'],
                negative: ['#FFEBEE', '#FFCDD2', '#EF9A9A', '#E57373', '#EF5350', '#F44336', '#E53935', '#D32F2F', '#C62828', '#B71C1C'],
                neutral: '#E0E0E0'
            },
            mapData: [],
            mapLoaded: false,
            fallbackViewBox: null,
            usingBasicShapes: false,
            effectListVersion: 0 
        };
    },

    mounted() {
        this.loadStateEffects();
        this.loadMapData();
    },

    methods: {
        loadStateEffects() {
            console.log("loadStateEffects called for answerId:", this.answerId); // Debugging
            const stateScores = Vue.prototype.$TCT.getStateScoreForAnswer(this.answerId);

            const states = Object.values(Vue.prototype.$TCT.states);
            for (const state of states) {
                this.$set(this.stateEffects, state.pk, 0);
            }

            for (const score of stateScores) {
                if ((this.candidateId == null || score.fields.candidate == this.candidateId) &&
                    (this.affectedCandidateId == null || score.fields.affected_candidate == this.affectedCandidateId)) {
                    this.$set(this.stateEffects, score.fields.state, score.fields.state_multiplier);
                    this.$set(this.selectedStates, score.fields.state, true);
                }
            }
        },

        loadMapData() {
            if (Vue.prototype.$TCT.jet_data?.mapping_data?.mapSvg) {
                try {
                    this.mapData = Vue.prototype.$TCT.getMapForPreview(Vue.prototype.$TCT.jet_data.mapping_data.mapSvg);
                    this.mapLoaded = true;
                } catch (error) {
                    console.error("Error loading map data from mapSvg:", error);
                    this.loadDefaultMap();
                }
            }
            else if (Vue.prototype.$TCT.states && Object.values(Vue.prototype.$TCT.states).some(state => state.d)) {
                try {
                    this.mapData = Object.values(Vue.prototype.$TCT.states)
                        .filter(state => state.d)
                        .map(state => [state.fields.abbr, state.d]);
                    this.mapLoaded = true;
                } catch (error) {
                    console.error("Error extracting path data from states:", error);
                    this.loadDefaultMap();
                }
            } else {
                this.loadDefaultMap();
            }
        },

        loadDefaultMap() {
            console.log("Attempting to load default US map...");
            loadDefaultUSMap().then(svgContent => {
                if (svgContent) {
                    this.validateAndUseDefaultMap(svgContent);
                } else {
                    console.log("Default US map not available, falling back to basic shapes");
                    this.createBasicStateShapes();
                }
            });
        },
        validateAndUseDefaultMap(svgContent) {
            console.log("Validating default US map...");
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
            const statePaths = svgDoc.querySelectorAll('[data-name]');

            if (statePaths.length !== 51) {
                console.warn(`Default map does not contain 51 states. Found ${statePaths.length}. Falling back to basic shapes.`);
                this.createBasicStateShapes();
                return;
            }

            const statesData = Object.values(Vue.prototype.$TCT.states);
            let allStatesMatch = true;

            for (const path of statePaths) {
                const dataName = path.getAttribute('data-name').trim();
                const matchingState = statesData.find(state => state.fields.name.trim() === dataName);

                if (!matchingState) {
                    console.warn(`State name "${dataName}" in SVG not found in state data.`);
                    allStatesMatch = false;
                    break;
                }
            }

            if (!allStatesMatch) {
                console.warn("State names in default map do not match the state data. Falling back to basic shapes.");
                this.createBasicStateShapes();
                return;
            }

            console.log("Default US map validated successfully!");
            try {
                console.log("Extracting state paths from validated default map");
                this.mapData = Vue.prototype.$TCT.getMapForPreview(svgContent);
                this.mapLoaded = true;
                this.fallbackViewBox = "0 0 1000 589";
            } catch (error) {
                console.error("Error parsing default US map:", error);
                this.createBasicStateShapes();
            }
        },

        createBasicStateShapes() {
            const states = Object.values(Vue.prototype.$TCT.states);
            const cols = Math.ceil(Math.sqrt(states.length));
            const size = 40;
            const padding = 10;

            this.mapData = [];

            for (let i = 0; i < states.length; i++) {
                const row = Math.floor(i / cols);
                const col = i % cols;
                const x = col * (size + padding) + 50;
                const y = row * (size + padding) + 50;

                const path = `M${x},${y + 5}
                              Q${x},${y} ${x + 5},${y}
                              L${x + size - 5},${y}
                              Q${x + size},${y} ${x + size},${y + 5}
                              L${x + size},${y + size - 5}
                              Q${x + size},${y + size} ${x + size - 5},${y + size}
                              L${x + 5},${y + size}
                              Q${x},${y + size} ${x},${y + size - 5} Z`;

                this.mapData.push([states[i].fields.abbr, path]);
            }

            this.fallbackViewBox = `0 0 ${cols * (size + padding) + 100} ${Math.ceil(states.length / cols) * (size + padding) + 100}`;
            this.usingBasicShapes = true;
            this.mapLoaded = true;
        },

        deleteStateEffect(effectPk) {
            delete Vue.prototype.$TCT.answer_score_state[effectPk];
            this.loadStateEffects(); // Refresh data for map
            this.effectListVersion++; // INCREMENT to force list update
            this.mapLoaded = false; // Trigger watcher to reload map data
            this.$nextTick(() => {
                this.mapLoaded = true; // Re-enable map loading
                this.loadMapData(); // Re-fetch map data just to be sure (optional but safe)
                console.log("DOM updated and map re-rendered after state effect deletion."); // Debugging
            });
        },


        getStateColor(statePk) {
            const value = this.stateEffects[statePk] || 0;
            if (value === 0) return this.colorScale.neutral;
            const scale = value > 0 ? this.colorScale.positive : this.colorScale.negative;
            const absValue = Math.abs(value);
            let index = Math.min(Math.floor(absValue * 10), 9);
            if (index < 0) index = 0;
            return scale[index];
        },

        toggleStateSelection(statePk) {
            this.$set(this.selectedStates, statePk, !this.selectedStates[statePk]);
            if (this.selectedStates[statePk]) {
                this.editValue = this.stateEffects[statePk];
            }
        },

        highlightState(statePk) {
            this.highlightedState = statePk;
        },

        unhighlightState() {
            if (!this.isStateSelected(this.highlightedState)) {
                this.highlightedState = null;
            }
        },

        applyValueToSelectedStates() {
            const selectedStatePks = Object.keys(this.selectedStates)
                .filter(pk => this.selectedStates[pk]);

            if (selectedStatePks.length === 0) return;

            for (const statePk of selectedStatePks) {
                this.$set(this.stateEffects, statePk, parseFloat(this.editValue));
                this.updateOrCreateStateEffect(statePk, parseFloat(this.editValue));
            }

            this.effectListVersion++;
            // autosave after applying changes
            if (localStorage.getItem("autosaveEnabled") === "true") window.requestAutosaveDebounced?.();
        },

        updateOrCreateStateEffect(statePk, value) {
            const stateScores = Vue.prototype.$TCT.getStateScoreForAnswer(this.answerId);
            let existingScorePk = null;

            for (const score of stateScores) {
                if (score.fields.state == statePk &&
                    score.fields.candidate == this.candidateId &&
                    score.fields.affected_candidate == this.affectedCandidateId) {
                    existingScorePk = score.pk;
                    break;
                }
            }

            if (existingScorePk) {
                Vue.prototype.$TCT.answer_score_state[existingScorePk].fields.state_multiplier = value;
            } else if (value !== 0) {
                const newPk = Vue.prototype.$TCT.getNewPk();
                const newEffect = {
                    "model": "campaign_trail.answer_score_state",
                    "pk": newPk,
                    "fields": {
                        "answer": this.answerId,
                        "state": parseInt(statePk),
                        "candidate": this.candidateId,
                        "affected_candidate": this.affectedCandidateId,
                        "state_multiplier": value
                    }
                };
                Vue.prototype.$TCT.answer_score_state[newPk] = newEffect;
            }
        },
        isExtraState(state) {
            const districtRegex = /(?:Maine|Nebraska|ME|NE|M|N|CD|District|Congressional)[-\\s]?(\\d+)/i;
            
            if (state.fields.abbr === 'DC') {
                return true;
            }
        
            if (districtRegex.test(state.fields.name)) {
                return true;
            }
        
            if (state.fields.abbr &&
                ((state.fields.abbr.startsWith("M") || state.fields.abbr.startsWith("N")) &&
                    state.fields.abbr.length === 2 &&
                    !isNaN(state.fields.abbr.charAt(1)))) {
                return true;
            }
        
            return state.fields.name.includes("CD") ||
                state.fields.name.includes("District") ||
                state.fields.name.includes("Congressional");
        },

        selectAll() {
            const states = Object.values(Vue.prototype.$TCT.states);
            for (const state of states) {
                this.$set(this.selectedStates, state.pk, true);
            }
        },

        clearSelection() {
            this.selectedStates = {};
        },

        isStateSelected(statePk) {
            return this.selectedStates[statePk] === true;
        },

        isStateHighlighted(statePk) {
            return this.highlightedState === statePk;
        },

        getStateStyle(statePk) {
            const baseStyle = {
                fill: this.getStateColor(statePk),
                stroke: '#666666',
                'stroke-width': 1,
                cursor: 'pointer'
            };

            if (this.isStateSelected(statePk)) {
                baseStyle.stroke = '#000000';
                baseStyle['stroke-width'] = 2;
            } else if (this.isStateHighlighted(statePk)) {
                baseStyle.stroke = '#000000';
                baseStyle['stroke-width'] = 1.5;
            }

            if (this.fallbackViewBox && Math.abs(this.stateEffects[statePk]) > 0.001) {
                baseStyle.fill = this.getStateColor(statePk);
                if (!this.isStateSelected(statePk) && !this.isStateHighlighted(statePk)) {
                    baseStyle.stroke = '#444444';
                    baseStyle['stroke-width'] = 1.5;
                }
            }
            return baseStyle;
        },

        increaseValue() {
            this.editValue = Math.min(parseFloat(this.editValue) + 0.001, 1).toFixed(3);
        },

        decreaseValue() {
            this.editValue = Math.max(parseFloat(this.editValue) - 0.001, -1).toFixed(3);
        },

        selectPresetStates(statePks) {
            this.clearSelection();
            for (const pk of statePks) {
                this.$set(this.selectedStates, pk, true);
            }
        },

        applyPresetValue(value) {
            this.editValue = value;
        },

        getStateByAbbr(abbr) {
            const normalizedAbbr = abbr.trim().toUpperCase().replaceAll('-', '_');
            return Object.values(Vue.prototype.$TCT.states).find(state => {
                const stateAbbr = state.fields.abbr.trim().toUpperCase().replaceAll('-', '_');
                return stateAbbr === normalizedAbbr;
            });
        },

        getStateTextPosition(state) {
            if (!this.fallbackViewBox) return { x: 0, y: 0 };

            const states = Object.values(Vue.prototype.$TCT.states);
            const index = states.findIndex(s => s.pk === state.pk);
            const cols = Math.ceil(Math.sqrt(states.length));
            const size = 40;
            const padding = 10;

            const row = Math.floor(index / cols);
            const col = index % cols;
            const x = col * (size + padding) + 50 + size / 2;
            const y = row * (size + padding) + 50 + size / 2;

            return { x, y };
        },

        getStatePath(state) {
            const stateData = this.mapData.find(x => {
                if (!state || !state.fields || !state.fields.abbr) {
                    return false;
                }
                const stateAbbr = state.fields.abbr;
                return x[0] === stateAbbr || x[0] === stateAbbr.replaceAll('-', '_');
            });

            if (stateData) {
                return stateData[1];
            }
            return `M0,0 L10,0 L10,10 L0,10 Z`;
        },

        formatDistrictName(stateName) {
            if (stateName.includes("DC")) {
                const parts = stateName.split(" ");
                const stateIndex = parts.findIndex(part => part === "DC" || part === "-");
                if (stateIndex > 0 && parts[stateIndex - 1]) {
                    return `${parts[stateIndex - 1]}-${parts[stateIndex + 1] || ""}`;
                }
            }
            return stateName;
        }
    },

    computed: {
        states() {
            return Object.values(Vue.prototype.$TCT.states);
        },

        selectedStatesList() {
            return this.states.filter(state => this.isStateSelected(state.pk));
        },

        stateCount() {
            return this.states.length;
        },

        selectedStatesCount() {
            return Object.values(this.selectedStates).filter(selected => selected).length;
        },

        isUsingBasicShapes() {
            return this.usingBasicShapes;
        },

        smallStates() {
            // small states are hard to click on
            const smallStateAbbrs = ['CT', 'RI', 'DE', 'NH', 'VT'];
            
            return this.states.filter(state => 
                smallStateAbbrs.includes(state.fields.abbr) && 
                !this.isExtraState(state)
            );
        },

        extraStates() {
            const districtRegex = /(?:Maine|Nebraska|ME|NE|M|N|CD|District|Congressional)[-\\s]?(\\d+)/i;

            return this.states.filter(state => {
                if (state.fields.abbr === 'DC') {
                    return false;
                }

                if (districtRegex.test(state.fields.name)) {
                    return true;
                }

                if (state.fields.abbr &&
                    ((state.fields.abbr.startsWith("M") || state.fields.abbr.startsWith("N")) &&
                        state.fields.abbr.length === 2 &&
                        !isNaN(state.fields.abbr.charAt(1)))) {
                    return true;
                }

                return state.fields.name.includes("CD") ||
                    state.fields.name.includes("District") ||
                    state.fields.name.includes("Congressional");
            });
        },

        candidates() {
            return getListOfCandidates();
        },

        allStateEffectsForAnswer() {

            this.effectListVersion; 
            console.log("allStateEffectsForAnswer computed property recalculated, version:", this.effectListVersion); // Debugging
            const stateScores = Vue.prototype.$TCT.getStateScoreForAnswer(this.answerId);
            return stateScores.map(score => {
                return {
                    pk: score.pk,
                    stateName: Vue.prototype.$TCT.states[score.fields.state].fields.name,
                    candidateNickname: Vue.prototype.$TCT.getNicknameForCandidate(score.fields.candidate),
                    affectedCandidateNickname: Vue.prototype.$TCT.getNicknameForCandidate(score.fields.affected_candidate),
                    multiplier: score.fields.state_multiplier
                };
            });
        }
    },

    template: `
    <div class="bg-white">
        <!-- Candidate Selection -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">
                    Candidate:
                </label>
                <select v-model="candidateId" @change="loadStateEffects"
                    class="p-1 text-sm block w-full border border-gray-300 rounded shadow-sm">
                    <option v-for="candidate in candidates" :key="candidate[0]" :value="candidate[0]">
                        {{ candidate[1] }}
                    </option>
                </select>
            </div>

            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">
                    Affected Candidate:
                </label>
                <select v-model="affectedCandidateId" @change="loadStateEffects"
                    class="p-1 text-sm block w-full border border-gray-300 rounded shadow-sm">
                    <option v-for="candidate in candidates" :key="candidate[0]" :value="candidate[0]">
                        {{ candidate[1] }}
                    </option>
                </select>
            </div>
        </div>

        <!-- Map and Controls in Flex Layout -->
        <div class="flex flex-col md:flex-row gap-4">
            <!-- Map Display -->
            <div class="md:w-3/5">
                <div v-if="usingBasicShapes" class="bg-yellow-100 p-2 mb-2 text-xs rounded">
                    <div class="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>Using basic shapes map (fallback)</span>
                    </div>
                </div>

                <div id="map_container" class="relative border rounded" style="width: 100%; height: auto;">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg"
                        style="background-color:#BFE6FF; display: block; width: 100%; height: auto;"
                        :viewBox="fallbackViewBox || '0 0 1025 595'" preserveAspectRatio="xMidYMid meet">
                        <g v-if="mapLoaded && states.length > 0">
                            <path v-for="state in states"
                                :key="state.pk"
                                :d="getStatePath(state)"
                                :id="state.fields.abbr"
                                @click="toggleStateSelection(state.pk)"
                                @mouseover="highlightState(state.pk)"
                                @mouseout="unhighlightState()"
                                :style="getStateStyle(state.pk)">
                            </path>
                            <!-- State Labels (only on basic shapes) -->
                            <text v-if="usingBasicShapes"
                                v-for="state in states"
                                :key="'text-' + state.pk"
                                :x="getStateTextPosition(state).x"
                                :y="getStateTextPosition(state).y"
                                text-anchor="middle"
                                alignment-baseline="middle"
                                style="fill: black; font-size: 12px; pointer-events: none;">
                                {{ state.fields.abbr }}
                            </text>
                            <!-- Value Labels (only on basic shapes) -->
                            <text v-if="usingBasicShapes && Math.abs(stateEffects[state.pk]) > 0.001"
                                v-for="state in states"
                                :key="'value-' + state.pk"
                                :x="getStateTextPosition(state).x"
                                :y="getStateTextPosition(state).y + 15"
                                text-anchor="middle"
                                alignment-baseline="middle"
                                style="fill: black; font-size: 10px; pointer-events: none;">
                                {{ stateEffects[state.pk].toFixed(2) }}
                            </text>
                        </g>
                        <text v-else x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" class="text-sm">
                            Loading map data...
                        </text>
                    </svg>
                </div>

                <!-- Small States, D.C. and Congressional Districts Buttons -->
                <div class="flex flex-wrap gap-1 mt-2">
                    <button v-if="states.find(s => s.fields.abbr === 'DC')"
                        @click="toggleStateSelection(states.find(s => s.fields.abbr === 'DC').pk)"
                        :class="{'bg-blue-700': isStateSelected(states.find(s => s.fields.abbr === 'DC').pk), 'bg-blue-500': !isStateSelected(states.find(s => s.fields.abbr === 'DC').pk)}"
                        class="text-white px-2 py-1 text-xs rounded hover:bg-blue-600">
                        D.C.
                    </button>
                    
                    <!-- Small States -->
                    <button v-for="state in smallStates"
                        :key="'small-' + state.pk"
                        @click="toggleStateSelection(state.pk)"
                        :class="{'bg-blue-700': isStateSelected(state.pk), 'bg-blue-500': !isStateSelected(state.pk)}"
                        class="text-white px-2 py-1 text-xs rounded hover:bg-blue-600">
                        {{ state.fields.abbr }}
                    </button>
                    
                    <!-- Congressional Districts -->
                    <button v-for="state in extraStates"
                        :key="state.pk"
                        @click="toggleStateSelection(state.pk)"
                        :class="{'bg-blue-700': isStateSelected(state.pk), 'bg-blue-500': !isStateSelected(state.pk)}"
                        class="text-white px-2 py-1 text-xs rounded hover:bg-blue-600">
                        {{ state.fields.abbr || formatDistrictName(state.fields.name) }}
                    </button>
                </div>

                <div class="flex justify-between mt-2">
                    <button @click="selectAll" class="bg-blue-500 text-white px-2 py-1 text-xs rounded hover:bg-blue-600">Select All</button>
                    <button @click="clearSelection" class="bg-red-500 text-white px-2 py-1 text-xs rounded hover:bg-red-600">Clear Selection</button>
                </div>
            </div>

            <!-- Controls Panel -->
            <div class="md:w-2/5">
                <!-- Presets -->
                <div class="mb-4">
                    <state-effect-presets
                        :onSelectPreset="selectPresetStates"
                        @applyValue="applyPresetValue">
                    </state-effect-presets>
                </div>

                <!-- Effect Value Editor -->
                <div class="mb-4">
                    <label class="block text-xs font-medium text-gray-700 mb-1">Effect Value</label>
                    <div class="flex items-center">
                        <button @click="decreaseValue" class="bg-gray-200 px-2 py-1 rounded-l hover:bg-gray-300 text-sm">-</button>
                        <input type="number" v-model="editValue" step="0.001" min="-1" max="1"
                            class="w-20 text-center border-t border-b text-sm p-1">
                        <button @click="increaseValue" class="bg-gray-200 px-2 py-1 rounded-r hover:bg-gray-300 text-sm">+</button>
                    </div>
                    <input type="range" v-model="editValue" min="-1" max="1" step="0.001" class="w-full mt-2">
                </div>

                <!-- Apply Button -->
                <div class="mb-4">
                    <button @click="applyValueToSelectedStates" class="w-full bg-green-500 text-white py-1 rounded hover:bg-green-600">
                        Apply to Selected ({{ selectedStatesCount }})
                    </button>
                </div>

                <!-- Color Scale -->
                <div class="mb-4">
                    <div class="flex justify-center items-center">
                        <div class="w-full h-4 bg-gradient-to-r from-red-700 via-gray-300 to-blue-700 rounded"></div>
                    </div>
                    <div class="flex justify-between text-xs mt-1 text-gray-600">
                        <span>-1.0</span>
                        <span>0</span>
                        <span>1.0</span>
                    </div>
                </div>

                <!-- All State Effects List -->
                <div class="mb-4">
                    <div class="flex justify-between items-center mb-1">
                        <label class="block text-xs font-medium text-gray-700">All State Effects for Question #{{answerId}}</label>
                        </div>
                    <div class="max-h-64 overflow-y-auto bg-gray-50 p-2 rounded border text-xs">
                        <ul class="divide-y divide-gray-200">
                            <li v-for="effect in allStateEffectsForAnswer" :key="effect.pk" class="py-2 flex justify-between items-center">
                                <div>
                                    <span class="font-semibold">{{ effect.stateName }}</span>
                                    <span v-if="effect.candidateNickname" class="text-gray-500"> (Candidate: {{ effect.candidateNickname }})</span>
                                    <span v-if="effect.affectedCandidateNickname" class="text-gray-500"> (Affected: {{ effect.affectedCandidateNickname }})</span>
                                </div>
                                <div class="flex items-center space-x-2">
                                    <span :class="effect.multiplier > 0 ? 'text-blue-600' : effect.multiplier < 0 ? 'text-red-600' : 'text-gray-500'">
                                        {{ effect.multiplier.toFixed(3) }}
                                    </span>
                                    <button @click="deleteStateEffect(effect.pk)" class="text-red-500 hover:text-red-700">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </li>
                            <li v-if="allStateEffectsForAnswer.length === 0" class="py-1 text-gray-500 italic">No state effects configured for this question.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `
});
