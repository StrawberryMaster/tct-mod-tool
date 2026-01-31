function loadDefaultUSMap() {
    console.log("Called function to load default US map...");
    return fetch('js/components/resources/us.svg')
        .then(response => response.text())
        .catch(error => {
            console.error("Error loading default US map:", error);
            return null;
        });
}

window.defineComponent('question', {
    props: {
        pk: Number
    },

    data() {
        return {
            activeAnswer: null,
            activeTab: 'feedback',
            savedMessage: 'Saved',
            localDescription: '',
            localAnswerDescription: '', // local buffer for the selected answer text
            temp_answers: [] // Used to trigger reactivity when data changes
        };
    },

    mounted() {
        window.addEventListener('tct:autosaved', this.onAutosaved);
        this.localDescription = this.description || '';
    },
    beforeDestroy() {
        window.removeEventListener('tct:autosaved', this.onAutosaved);
    },

    watch: {
        // if user switches question, refresh local buffer
        pk() {
            this.localDescription = this.description || '';
        },
        // if store changes from elsewhere (clone, delete, etc.), keep local buffer in sync
        description(newVal) {
            if (newVal !== this.localDescription) {
                this.localDescription = newVal || '';
            }
        },
        // push edits into store and debounce autosave so typing is smooth
        localDescription(newVal) {
            const q = Vue.prototype.$TCT.questions.get(this.pk);
            if (q) {
                q.fields.description = newVal;
                this.markDirty();
                // debounce autosave more aggressively while typing to avoid UI stalls
                if (localStorage.getItem("autosaveEnabled") === "true") {
                    window.requestAutosaveDebounced?.(1200);
                    this.savedMessage = 'Saving...';
                }
            }
        },
        // keep answer input buffer in sync when switching answers
        activeAnswer(newVal) {
            if (!newVal) {
                this.localAnswerDescription = '';
                return;
            }
            const a = Vue.prototype.$TCT.answers[newVal];
            this.localAnswerDescription = a?.fields.description || '';
        },
        // if the underlying store changes externally (clone, delete, etc.)
        getAnswerDescription(newVal) {
            if (this.activeAnswer && newVal !== this.localAnswerDescription) {
                this.localAnswerDescription = newVal || '';
            }
        },
        // push edits into store with debounced autosave like question text
        localAnswerDescription(newVal) {
            if (!this.activeAnswer) return;
            const a = Vue.prototype.$TCT.answers[this.activeAnswer];
            if (a) {
                a.fields.description = newVal;
                this.markDirty();
                if (localStorage.getItem("autosaveEnabled") === "true") {
                    window.requestAutosaveDebounced?.(1200);
                    this.savedMessage = 'Saving...';
                }
            }
        }
    },

    template: `
    <div class="mx-auto p-4">
        <!-- Header with actions -->
        <div class="flex justify-between items-center mb-4 bg-white p-3 rounded-lg shadow-sm">
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
                <span class="ml-2 text-xs text-gray-500" role="status" aria-live="polite">{{ savedMessage }}</span>
            </div>
        </div>

        <!-- Question details card -->
        <div class="bg-white rounded-lg shadow-sm mb-6 p-4">
            <div>
                <label :for="'description-' + pk" class="block text-sm font-medium text-gray-700">Question text:</label>
                <textarea
                    :key="'question-desc-' + pk"
                    autocomplete="off"
                    v-model="localDescription"
                    :id="'description-' + pk"
                    rows="4"
                    class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-xs focus:ring-3 focus:ring-blue-400-blue-500 focus:border-blue-500"></textarea>
            </div>
        </div>

        <!-- Answer management section -->
        <div class="bg-white rounded-lg shadow-sm mb-6">
            <div class="p-4 border-b flex justify-between items-center">
                <h2 class="font-bold text-lg">Answers ({{this.answers.length}})</h2>
                <button class="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600 flex items-center" v-on:click="addAnswer()">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Add answer
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
                            @click="selectAnswer(answer.pk)"
                            role="button"
                            tabindex="0"
                            :aria-selected="activeAnswer === answer.pk ? 'true' : 'false'"
                            @keydown.enter="selectAnswer(answer.pk)"
                            @keydown.space.prevent="selectAnswer(answer.pk)">
                            <div class="flex justify-between items-start">
                                <div class="font-medium text-sm">#{{answer.pk}}</div>
                                <div class="flex space-x-1">
                                    <button
                                        @click.stop="cloneAnswer(answer.pk)"
                                        class="text-blue-500 hover:text-blue-700"
                                        :aria-label="'Clone answer #' + answer.pk"
                                        :title="'Clone answer #' + answer.pk">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                        </svg>
                                    </button>
                                    <button
                                        @click.stop="deleteAnswer(answer.pk)"
                                        class="text-red-500 hover:text-red-700"
                                        :aria-label="'Delete answer #' + answer.pk"
                                        :title="'Delete answer #' + answer.pk">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
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
                                <span v-if="hasVariableEffects(answer.pk)" class="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">Variables</span>
                            </div>
                        </li>
                    </ul>
                </div>

                <!-- Right side: Selected answer details -->
                <div class="md:w-1/2" v-if="activeAnswer">
                    <div class="p-4">
                        <h3 class="font-bold text-md mb-3" :id="'answer-heading-' + activeAnswer">Edit answer #{{activeAnswer}}</h3>
                        <textarea
                            v-model="localAnswerDescription"
                            :id="'answer-desc-' + activeAnswer"
                            :aria-labelledby="'answer-heading-' + activeAnswer"
                            class="w-full p-2 border border-gray-300 rounded-md shadow-xs focus:ring-3 focus:ring-blue-400-blue-500 focus:border-blue-500"
                            rows="4" placeholder="Answer text..."></textarea>

                        <!-- Tabs for different answer settings -->
                        <div class="mt-4 border-b">
                            <nav class="flex -mb-px" role="tablist" aria-label="Answer settings">
                                <button @click="activeTab = 'feedback'"
                                    :class="{'border-blue-500 text-blue-600': activeTab === 'feedback', 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300': activeTab !== 'feedback'}"
                                    class="py-2 px-4 font-medium text-sm border-b-2 flex items-center"
                                    role="tab"
                                    :aria-selected="activeTab === 'feedback' ? 'true' : 'false'">
                                    <span class="flex items-center">
                                        <span class="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2" v-if="hasFeedback(activeAnswer)"></span>
                                        Feedback
                                    </span>
                                </button>
                                <button @click="activeTab = 'global'"
                                    :class="{'border-blue-500 text-blue-600': activeTab === 'global', 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300': activeTab !== 'global'}"
                                    class="py-2 px-4 font-medium text-sm border-b-2 flex items-center"
                                    role="tab"
                                    :aria-selected="activeTab === 'global' ? 'true' : 'false'">
                                    <span class="flex items-center">
                                        <span class="inline-block w-2 h-2 rounded-full bg-purple-500 mr-2" v-if="hasGlobalScores(activeAnswer)"></span>
                                        Global
                                    </span>
                                </button>
                                <button @click="activeTab = 'issues'"
                                    :class="{'border-blue-500 text-blue-600': activeTab === 'issues', 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300': activeTab !== 'issues'}"
                                    class="py-2 px-4 font-medium text-sm border-b-2 flex items-center"
                                    role="tab"
                                    :aria-selected="activeTab === 'issues' ? 'true' : 'false'">
                                    <span class="flex items-center">
                                        <span class="inline-block w-2 h-2 rounded-full bg-green-500 mr-2" v-if="hasIssueScores(activeAnswer)"></span>
                                        Issues
                                    </span>
                                </button>
                                <button @click="switchToStatesTab()"
                                    :class="{'border-blue-500 text-blue-600': activeTab === 'states', 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300': activeTab !== 'states'}"
                                    class="py-2 px-4 font-medium text-sm border-b-2 flex items-center"
                                    role="tab"
                                    :aria-selected="activeTab === 'states' ? 'true' : 'false'">
                                    <span class="flex items-center">
                                        <span class="inline-block w-2 h-2 rounded-full bg-orange-500 mr-2" v-if="hasStateScores(activeAnswer)"></span>
                                        States
                                    </span>
                                </button>
                                <button @click="activeTab = 'variables'"
                                    :class="{'border-blue-500 text-blue-600': activeTab === 'variables', 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300': activeTab !== 'variables'}"
                                    class="py-2 px-4 font-medium text-sm border-b-2 flex items-center"
                                    role="tab"
                                    :aria-selected="activeTab === 'variables' ? 'true' : 'false'">
                                    <span class="flex items-center">
                                        <span class="inline-block w-2 h-2 rounded-full bg-purple-500 mr-2" v-if="hasVariableEffects(activeAnswer)"></span>
                                        Variables
                                    </span>
                                </button>
                            </nav>
                        </div>

                        <!-- Tab content -->
                        <div class="p-2 mt-2">
                            <!-- Feedback Tab -->
                            <div v-if="activeTab === 'feedback'">
                                <div class="flex justify-between items-center mb-3">
                                    <h4 class="font-medium text-sm">Answer feedback</h4>
                                    <button @click="addFeedback(activeAnswer)" class="bg-blue-500 text-white px-2 py-1 text-xs rounded hover:bg-blue-600">
                                        Add feedback
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
                                    <h4 class="font-medium text-sm">Global scores</h4>
                                    <button @click="addGlobalScore(activeAnswer)" class="bg-purple-500 text-white px-2 py-1 text-xs rounded hover:bg-purple-600">
                                        Add global score
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
                                    <h4 class="font-medium text-sm">Issue scores</h4>
                                    <button @click="addIssueScore(activeAnswer)" class="bg-green-500 text-white px-2 py-1 text-xs rounded hover:bg-green-600">
                                        Add issue score
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

                            <!-- Variables Tab -->
                            <div v-if="activeTab === 'variables'">
                                <div class="flex justify-between items-center mb-3">
                                    <h4 class="font-medium text-sm">Variable effects</h4>
                                    <button @click="addVariableEffect(activeAnswer)" class="bg-purple-500 text-white px-2 py-1 text-xs rounded hover:bg-purple-600" :disabled="!hasCyoaVariables">
                                        Add variable effect
                                    </button>
                                </div>
                                <variable-effect-card
                                    v-for="effect in getVariableEffectsForAnswer(activeAnswer)"
                                    :pk="effect.id"
                                    :key="effect.id"
                                    @deleteVariableEffect="deleteVariableEffect">
                                </variable-effect-card>
                                <div v-if="!hasVariableEffects(activeAnswer)" class="text-gray-500 text-sm text-center py-4">
                                    {{ hasCyoaVariables ? 'No variable effects configured yet' : 'Create CYOA variables first to add effects' }}
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
            // guard against selecting deleted/non-existent answers
            if (!Vue.prototype.$TCT.answers[pk]) {
                this.activeAnswer = null;
                this.localAnswerDescription = '';
                return;
            }
            this.activeAnswer = pk;
            this.localAnswerDescription = Vue.prototype.$TCT.answers[pk]?.fields.description || '';
            // no save here; just selection
        },
        updateAnswerDescription(evt) {
            // not used anymore; kept for backwards safety
            this.localAnswerDescription = evt.target.value;
        },

        addAnswer: function () {
            const newPk = Vue.prototype.$TCT.getNewPk();
            let answer = {
                "model": "campaign_trail.answer",
                "pk": newPk,
                "fields": {
                    "question": this.pk,
                    "description": "New answer option"
                }
            };
            this.temp_answers = [Date.now()];
            Vue.prototype.$TCT.answers[newPk] = answer;
            Vue.prototype.$TCT._invalidateCache('answers_by_question');
            Vue.prototype.$globalData.dataVersion++;
            this.selectAnswer(newPk);
            this.markDirty();
            this.quickAutosaveIfEnabled();
        },

        addFeedback: function (answerPk) {
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
            Vue.prototype.$TCT._invalidateCache('feedback_by_answer');
            this.temp_answers = [Date.now()];
            Vue.prototype.$globalData.dataVersion++;
            this.markDirty();
            this.quickAutosaveIfEnabled();
        },

        addGlobalScore: function (answerPk) {
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
            Vue.prototype.$TCT._invalidateCache('global_score_by_answer');
            this.temp_answers = [Date.now()];
            Vue.prototype.$globalData.dataVersion++;
            this.markDirty();
            this.quickAutosaveIfEnabled();
        },

        addIssueScore: function (answerPk) {
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
            Vue.prototype.$TCT.answer_score_issue[newPk] = x;
            Vue.prototype.$TCT._invalidateCache('issue_score_by_answer');
            this.temp_answers = [Date.now()];
            Vue.prototype.$globalData.dataVersion++;
            this.markDirty();
            this.quickAutosaveIfEnabled();
        },

        addStateScore: function (answerPk) {
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
            Vue.prototype.$TCT._invalidateCache('state_score_by_answer');
            this.temp_answers = [Date.now()];
            Vue.prototype.$globalData.dataVersion++;
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

        deleteAnswer: function (pk, suppressConfirm = false) {
            if (!suppressConfirm) {
                if (!confirm(`Are you sure you want to delete answer #${pk}?`)) return;
            }

            let referencedFeedbacks = Vue.prototype.$TCT.getAdvisorFeedbackForAnswer(pk);
            for (let i = 0; i < referencedFeedbacks.length; i++) {
                delete Vue.prototype.$TCT.answer_feedback[referencedFeedbacks[i].pk];
            }
            Vue.prototype.$TCT._invalidateCache('feedback_by_answer');

            let x = Vue.prototype.$TCT.getStateScoreForAnswer(pk);
            for (let i = 0; i < x.length; i++) {
                delete Vue.prototype.$TCT.answer_score_state[x[i].pk];
            }
            Vue.prototype.$TCT._invalidateCache('state_score_by_answer');

            x = Vue.prototype.$TCT.getIssueScoreForAnswer(pk);
            for (let i = 0; i < x.length; i++) {
                delete Vue.prototype.$TCT.answer_score_issue[x[i].pk];
            }
            Vue.prototype.$TCT._invalidateCache('issue_score_by_answer');

            x = Vue.prototype.$TCT.getGlobalScoreForAnswer(pk);
            for (let i = 0; i < x.length; i++) {
                delete Vue.prototype.$TCT.answer_score_global[x[i].pk];
            }
            Vue.prototype.$TCT._invalidateCache('global_score_by_answer');

            this.temp_answers = [Date.now()];
            delete Vue.prototype.$TCT.answers[pk];
            Vue.prototype.$TCT._invalidateCache('answers_by_question');
            Vue.prototype.$globalData.dataVersion++;

            if (this.activeAnswer === pk) {
                this.activeAnswer = null;
                this.localAnswerDescription = '';
            }
            this.markDirty();
            this.quickAutosaveIfEnabled();
        },

        cloneAnswer: function (pk) {
            const thisAnswer = Vue.prototype.$TCT.answers[pk];
            // try to get the new PK and select it; still refresh the list even if undefined
            const clonedPk = Vue.prototype.$TCT.cloneAnswer?.(thisAnswer, thisAnswer.fields.question);
            this.temp_answers = [Date.now()]; // trigger reactivity
            Vue.prototype.$globalData.dataVersion++;
            if (clonedPk) {
                this.selectAnswer(clonedPk);
            }
            this.markDirty();
            this.quickAutosaveIfEnabled();
        },

        deleteFeedback: function (pk) {
            delete Vue.prototype.$TCT.answer_feedback[pk];
            Vue.prototype.$TCT._invalidateCache('feedback_by_answer');
            this.temp_answers = [Date.now()];
            Vue.prototype.$globalData.dataVersion++;
            this.markDirty();
            this.quickAutosaveIfEnabled();
        },

        deleteGlobalScore: function (pk) {
            delete Vue.prototype.$TCT.answer_score_global[pk];
            Vue.prototype.$TCT._invalidateCache('global_score_by_answer');
            this.temp_answers = [Date.now()];
            Vue.prototype.$globalData.dataVersion++;
            this.markDirty();
            this.quickAutosaveIfEnabled();
        },

        deleteIssueScore: function (pk) {
            delete Vue.prototype.$TCT.answer_score_issue[pk];
            Vue.prototype.$TCT._invalidateCache('issue_score_by_answer');
            this.temp_answers = [Date.now()];
            Vue.prototype.$globalData.dataVersion++;
            this.markDirty();
            this.quickAutosaveIfEnabled();
        },

        deleteStateScore: function (pk) {
            delete Vue.prototype.$TCT.answer_score_state[pk];
            Vue.prototype.$TCT._invalidateCache('state_score_by_answer');
            this.temp_answers = [Date.now()];
            Vue.prototype.$globalData.dataVersion++;
            this.markDirty();
            this.quickAutosaveIfEnabled();
        },

        onInput: function (evt) {
            let value = evt.target.value;
            if (shouldBeSavedAsNumber(value)) {
                value = Number(value);
            }
            Vue.prototype.$TCT.questions.get(this.pk).fields[evt.target.name] = value;
            Vue.prototype.$globalData.dataVersion++;
            this.markDirty();
            this.quickAutosaveIfEnabled();
        },

        onInputUpdatePicker: function (evt) {
            Vue.prototype.$TCT.questions.get(this.pk).fields[evt.target.name] = evt.target.value;
            Vue.prototype.$globalData.dataVersion++;
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

            Vue.prototype.$globalData.dataVersion++;

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
            Vue.prototype.$globalData.dataVersion;
            return Vue.prototype.$TCT.getAdvisorFeedbackForAnswer(pk);
        },

        getGlobalScoresForAnswer(pk) {
            Vue.prototype.$globalData.dataVersion;
            return Vue.prototype.$TCT.getGlobalScoreForAnswer(pk);
        },

        getIssueScoresForAnswer(pk) {
            Vue.prototype.$globalData.dataVersion;
            return Vue.prototype.$TCT.getIssueScoreForAnswer(pk);
        },

        getStateScoresForAnswer(pk) {
            Vue.prototype.$globalData.dataVersion;
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
        },

        getVariableEffectsForAnswer(pk) {
            Vue.prototype.$globalData.dataVersion;
            if (!Vue.prototype.$TCT.jet_data.cyoa_variable_effects) return [];
            return Object.values(Vue.prototype.$TCT.jet_data.cyoa_variable_effects).filter(effect => effect.answer === pk);
        },

        hasVariableEffects(pk) {
            return this.getVariableEffectsForAnswer(pk).length > 0;
        },

        addVariableEffect(answerPk) {
            if (!Vue.prototype.$TCT.jet_data.cyoa_variable_effects) {
                Vue.prototype.$TCT.jet_data.cyoa_variable_effects = {};
            }

            const variables = Vue.prototype.$TCT.getAllCyoaVariables();
            if (variables.length === 0) return; // No variables to affect

            const newPk = Vue.prototype.$TCT.getNewPk();
            Vue.prototype.$TCT.jet_data.cyoa_variable_effects[newPk] = {
                id: newPk,
                answer: answerPk,
                variable: variables[0].name,
                operation: 'add',
                amount: 1
            };
            this.temp_answers = [Date.now()];
            Vue.prototype.$globalData.dataVersion++;
            this.markDirty();
            this.quickAutosaveIfEnabled();
        },

        deleteVariableEffect(pk) {
            delete Vue.prototype.$TCT.jet_data.cyoa_variable_effects[pk];
            this.temp_answers = [Date.now()];
            Vue.prototype.$globalData.dataVersion++;
            this.markDirty();
            this.quickAutosaveIfEnabled();
        }
    },

    computed: {
        answers: function () {
            this.temp_answers;
            return Vue.prototype.$TCT.getAnswersForQuestion(this.pk);
        },

        description: function () {
            return Vue.prototype.$TCT.questions.get(this.pk)?.fields.description;
        },

        hasCyoaVariables: function () {
            return Vue.prototype.$TCT.getAllCyoaVariables().length > 0;
        },

        getAnswerDescription: function () {
            if (!this.activeAnswer) return '';
            const ans = Vue.prototype.$TCT.answers[this.activeAnswer];
            return ans ? ans.fields.description : '';
        }
    }
});

window.defineComponent('answer', {

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
        
        <button class="bg-red-500 text-white p-2 my-2 rounded hover:bg-red-600" v-on:click="deleteAnswer()">Delete answer</button>
        <button class="bg-blue-500 text-white p-2 my-2 rounded hover:bg-blue-600" v-on:click="cloneAnswer()">Clone answer</button>

        <details>
        <summary>Answer feedback ({{this.feedbacks.length}})</summary>
        <button class="bg-green-500 text-white p-2 my-2 rounded hover:bg-green-600" v-on:click="addFeedback()">Add feedback</button>
        <ul>
            <answer-feedback @deleteFeedback="deleteFeedback" v-for="feedback in feedbacks" :pk="feedback.pk" :key="feedback.pk"></answer-feedback>
        </ul>
        </details>

        <details>
        <summary>Global scores ({{this.globalScores.length}})</summary>
        <button class="bg-green-500 text-white p-2 my-2 rounded hover:bg-green-600" v-on:click="addGlobalScore()">Add global scores</button>
        <ul>
            <global-score @deleteGlobalScore="deleteGlobalScore" v-for="x in globalScores" :pk="x.pk" :key="x.pk"></global-score>
        </ul>
        </details>

        <details>
        <summary>Issue scores ({{this.issueScores.length}})</summary>
        <button class="bg-green-500 text-white p-2 my-2 rounded hover:bg-green-600" v-on:click="addIssueScore()">Add issue score</button>
        <ul>
            <issue-score @deleteIssueScore="deleteIssueScore" v-for="x in issueScores" :pk="x.pk" :key="x.pk"></issue-score>
        </ul>
        </details>

        <details>
        <summary>State scores ({{this.stateScores.length}})</summary>
        <button class="bg-green-500 text-white p-2 my-2 rounded hover:bg-green-600" v-on:click="addStateScore()">Add state score</button>
        <ul>
            <state-score @deleteStateScore="deleteStateScore" v-for="x in stateScores" :pk="x.pk" :key="x.pk"></state-score>
        </ul>
        </details>

    </li>
    `,

    methods: {

        cloneAnswer: function () {
            this.$emit('cloneAnswer', this.pk)
            const thisAnswer = Vue.prototype.$TCT.answers[this.pk];
        },

        addFeedback: function () {
            const newPk = Vue.prototype.$TCT.getNewPk();
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
            Vue.prototype.$TCT._invalidateCache('feedback_by_answer');
            Vue.prototype.$globalData.dataVersion++;
            if (localStorage.getItem("autosaveEnabled") === "true") window.requestAutosaveDebounced?.();
        },

        addGlobalScore: function () {
            const newPk = Vue.prototype.$TCT.getNewPk();
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
            Vue.prototype.$TCT._invalidateCache('global_score_by_answer');
            Vue.prototype.$globalData.dataVersion++;
            if (localStorage.getItem("autosaveEnabled") === "true") window.requestAutosaveDebounced?.();
        },

        addIssueScore: function () {
            const newPk = Vue.prototype.$TCT.getNewPk();
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
            Vue.prototype.$TCT._invalidateCache('issue_score_by_answer');
            Vue.prototype.$globalData.dataVersion++;
            if (localStorage.getItem("autosaveEnabled") === "true") window.requestAutosaveDebounced?.();
        },

        addStateScore: function () {
            const newPk = Vue.prototype.$TCT.getNewPk();
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
            Vue.prototype.$TCT._invalidateCache('state_score_by_answer');
            Vue.prototype.$globalData.dataVersion++;
            if (localStorage.getItem("autosaveEnabled") === "true") window.requestAutosaveDebounced?.();
        },

        deleteAnswer: function () {
            this.$emit('deleteAnswer', this.pk)
        },

        deleteFeedback: function (pk) {
            this.feedbacks = this.feedbacks.filter(a => a.pk != pk);
            delete Vue.prototype.$TCT.answer_feedback[pk];
            Vue.prototype.$TCT._invalidateCache('feedback_by_answer');
            Vue.prototype.$globalData.dataVersion++;
            if (localStorage.getItem("autosaveEnabled") === "true") window.requestAutosaveDebounced?.();
        },

        deleteGlobalScore: function (pk) {
            this.globalScores = this.globalScores.filter(a => a.pk != pk);
            delete Vue.prototype.$TCT.answer_score_global[pk];
            Vue.prototype.$TCT._invalidateCache('global_score_by_answer');
            Vue.prototype.$globalData.dataVersion++;
            if (localStorage.getItem("autosaveEnabled") === "true") window.requestAutosaveDebounced?.();
        },

        deleteIssueScore: function (pk) {
            this.issueScores = this.issueScores.filter(a => a.pk != pk);
            delete Vue.prototype.$TCT.answer_score_issue[pk];
            Vue.prototype.$TCT._invalidateCache('issue_score_by_answer');
            Vue.prototype.$globalData.dataVersion++;
            if (localStorage.getItem("autosaveEnabled") === "true") window.requestAutosaveDebounced?.();
        },

        deleteStateScore: function (pk) {
            this.stateScores = this.stateScores.filter(a => a.pk != pk);
            delete Vue.prototype.$TCT.answer_score_state[pk];
            Vue.prototype.$TCT._invalidateCache('state_score_by_answer');
            Vue.prototype.$globalData.dataVersion++;
            if (localStorage.getItem("autosaveEnabled") === "true") window.requestAutosaveDebounced?.();
        },

        onInput: function (evt) {
            let value = evt.target.value;
            if (shouldBeSavedAsNumber(value)) {
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
window.defineComponent('answer-feedback-card', {
    props: ['pk'],

    template: `
    <div class="bg-gray-50 rounded p-3 mb-3 shadow-xs hover:shadow transition-shadow">
        <div class="flex justify-between">
            <h4 class="text-sm font-medium text-gray-700">Feedback #{{pk}}</h4>
            <button @click="$emit('deleteFeedback', pk)" class="text-red-500 hover:text-red-700" :aria-label="'Delete feedback #' + pk" :title="'Delete feedback #' + pk">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        </div>

        <div class="mt-2">
            <label class="block text-xs font-medium text-gray-700" :for="'af-candidate-' + pk">Candidate:</label>
            <div class="flex items-center mt-1">
                <select @change="onInput($event)" :value="candidate" name="candidate" :id="'af-candidate-' + pk"
                    class="p-1 text-sm block w-full border border-gray-300 rounded shadow-xs focus:ring-3 focus:ring-blue-400-blue-500 focus:border-blue-500">
                    <option v-for="c in candidates" :key="c[0]" :value="c[0]">{{ c[1] }}</option>
                </select>
            </div>
        </div>

        <div class="mt-2">
            <label class="block text-xs font-medium text-gray-700" :for="'af-text-' + pk">Feedback text:</label>
            <textarea @input="onInput($event)" :value="answerFeedback" name="answer_feedback" rows="3" :id="'af-text-' + pk"
                class="mt-1 p-2 text-sm block w-full border border-gray-300 rounded shadow-xs focus:ring-3 focus:ring-blue-400-blue-500 focus:border-blue-500"></textarea>
        </div>
    </div>
    `,

    methods: {
        onInput: function (evt) {
            let value = evt.target.value;
            if (shouldBeSavedAsNumber(value)) {
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

        candidateNickname: function () {
            return Vue.prototype.$TCT.getNicknameForCandidate(this.candidate);
        },

        candidates() {
            return getListOfCandidates();
        },

        answerFeedback: function () {
            return Vue.prototype.$TCT.answer_feedback[this.pk].fields.answer_feedback;
        }
    }
});

// Global Score Card Component
window.defineComponent('global-score-card', {
    props: ['pk'],

    template: `
    <div class="bg-gray-50 rounded p-3 mb-3 shadow-xs hover:shadow transition-shadow">
        <div class="flex justify-between">
            <h4 class="text-sm font-medium text-gray-700">Global score #{{pk}}</h4>
            <button @click="$emit('deleteGlobalScore', pk)" class="text-red-500 hover:text-red-700" :aria-label="'Delete global score #' + pk" :title="'Delete global score #' + pk">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            <div>
                <label class="block text-xs font-medium text-gray-700" :for="'gsc-candidate-' + pk">Candidate:</label>
                <div class="flex items-center mt-1">
                    <select @change="onInput($event)" :value="candidate" name="candidate" :id="'gsc-candidate-' + pk"
                        class="p-1 text-sm block w-full border border-gray-300 rounded shadow-xs focus:ring-3 focus:ring-blue-400-blue-500 focus:border-blue-500">
                        <option v-for="c in candidates" :key="c[0]" :value="c[0]">{{ c[1] }}</option>
                    </select>
                </div>
            </div>

            <div>
                <label class="block text-xs font-medium text-gray-700" :for="'gsc-affected-' + pk">Affected candidate:</label>
                <div class="flex items-center mt-1">
                    <select @change="onInput($event)" :value="affected" name="affected_candidate" :id="'gsc-affected-' + pk"
                        class="p-1 text-sm block w-full border border-gray-300 rounded shadow-xs focus:ring-3 focus:ring-blue-400-blue-500 focus:border-blue-500">
                        <option v-for="c in candidates" :key="'aff-'+c[0]" :value="c[0]">{{ c[1] }}</option>
                    </select>
                </div>
            </div>
        </div>

        <div class="mt-3">
            <label class="block text-xs font-medium text-gray-700" :for="'gsc-mult-' + pk">Global multiplier:</label>
            <div class="flex items-center mt-1">
                <input @input="onInput($event)" :value="multiplier" name="global_multiplier" type="number" step="0.001" :id="'gsc-mult-' + pk"
                    class="p-1 text-sm block w-24 border border-gray-300 rounded shadow-xs focus:ring-3 focus:ring-blue-400-blue-500 focus:border-blue-500">
                <div class="ml-2 flex-1 h-2 bg-gray-200 rounded" aria-hidden="true">
                    <div class="h-full rounded transition-all duration-200"
                        :style="{ width: Math.min(Math.max((multiplier + 0.04) * 1250, 0), 100) + '%',
                                 backgroundColor: multiplier < 0 ? '#ef4444' : '#22c55e' }">
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,

    methods: {
        onInput: function (evt) {
            let value = evt.target.value;
            if (shouldBeSavedAsNumber(value)) {
                value = Number(value);
            }

            Vue.prototype.$TCT.answer_score_global[this.pk].fields[evt.target.name] = value;
            if (localStorage.getItem("autosaveEnabled") === "true") window.requestAutosaveDebounced?.();
            Vue.prototype.$globalData.dataVersion++;
        }
    },

    computed: {
        candidates() {
            return getListOfCandidates();
        },

        candidateNickname: function () {
            return Vue.prototype.$TCT.getNicknameForCandidate(this.candidate);
        },

        affectedNickname: function () {
            return Vue.prototype.$TCT.getNicknameForCandidate(this.affected);
        },

        candidate: function () {
            Vue.prototype.$globalData.dataVersion;
            return Vue.prototype.$TCT.answer_score_global[this.pk].fields.candidate;
        },

        affected: function () {
            Vue.prototype.$globalData.dataVersion;
            return Vue.prototype.$TCT.answer_score_global[this.pk].fields.affected_candidate;
        },

        multiplier: function () {
            Vue.prototype.$globalData.dataVersion;
            return Vue.prototype.$TCT.answer_score_global[this.pk].fields.global_multiplier;
        }
    }
});

// Issue Score Card Component
window.defineComponent('issue-score-card', {
    props: ['pk'],

    template: `
    <div class="bg-gray-50 rounded p-3 mb-3 shadow-xs hover:shadow transition-shadow">
        <div class="flex justify-between">
            <h4 class="text-sm font-medium text-gray-700">Issue score #{{pk}}</h4>
            <button @click="$emit('deleteIssueScore', pk)" class="text-red-500 hover:text-red-700" :aria-label="'Delete issue score #' + pk" :title="'Delete issue score #' + pk">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        </div>

        <div class="mt-2">
            <label class="block text-xs font-medium text-gray-700" :for="'isc-issue-' + pk">Issue:</label>
            <select @change="onInput($event)" name="issue" :id="'isc-issue-' + pk"
                class="mt-1 p-1 text-sm block w-full border border-gray-300 rounded shadow-xs focus:ring-3 focus:ring-blue-400-blue-500 focus:border-blue-500">
                <option v-for="i in issues" :selected="i.pk == issue" :value="i.pk" :key="i.pk">
                    {{i.pk}} - {{i.fields.name}}
                </option>
            </select>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div>
                <label class="block text-xs font-medium text-gray-700" :for="'isc-score-' + pk">Issue score:</label>
                <div class="flex items-center mt-1">
                    <input @input="onInput($event)" :value="issueScore" name="issue_score" type="number" step="0.1" :id="'isc-score-' + pk"
                        class="p-1 text-sm block w-20 border border-gray-300 rounded shadow-xs focus:ring-3 focus:ring-blue-400-blue-500 focus:border-blue-500">
                    <div class="ml-2 flex-1 h-2 bg-gray-200 rounded" aria-hidden="true">
                        <div class="h-full rounded transition-all duration-200"
                            :style="{ width: Math.min(Math.max((parseFloat(issueScore) + 1) * 50, 0), 100) + '%',
                                     backgroundColor: issueScore < 0 ? '#ef4444' : '#22c55e' }">
                        </div>
                    </div>
                </div>
                <div class="text-xs text-gray-500 mt-1">(-1.0 = Stance 1, 1.0 = Stance 7)</div>
            </div>

            <div>
                <label class="block text-xs font-medium text-gray-700" :for="'isc-importance-' + pk">Issue importance:</label>
                <div class="flex items-center mt-1">
                    <input @input="onInput($event)" :value="issueImportance" name="issue_importance" type="number" step="1" min="0" :id="'isc-importance-' + pk"
                        class="p-1 text-sm block w-20 border border-gray-300 rounded shadow-xs focus:ring-3 focus:ring-blue-400-blue-500 focus:border-blue-500">
                    <div class="ml-2 flex-1 h-2 bg-gray-200 rounded" aria-hidden="true">
                        <div class="h-full rounded bg-blue-500 transition-all duration-200"
                            :style="{ width: Math.min(Math.max(parseFloat(issueImportance) * 20, 0), 100) + '%' }">
                        </div>
                    </div>
                </div>
                <div class="text-xs text-gray-500 mt-1">Higher = more important</div>
            </div>
        </div>
    </div>
    `,

    methods: {
        onInput: function (evt) {
            let value = evt.target.value;
            if (shouldBeSavedAsNumber(value)) {
                value = Number(value);
            }

            Vue.prototype.$TCT.answer_score_issue[this.pk].fields[evt.target.name] = value;
            if (localStorage.getItem("autosaveEnabled") === "true") window.requestAutosaveDebounced?.();
            Vue.prototype.$globalData.dataVersion++;
        }
    },

    computed: {
        issues: function () {
            Vue.prototype.$globalData.dataVersion;
            return Object.values(Vue.prototype.$TCT.issues);
        },

        issue: function () {
            Vue.prototype.$globalData.dataVersion;
            return Vue.prototype.$TCT.answer_score_issue[this.pk].fields.issue;
        },

        issueScore: function () {
            Vue.prototype.$globalData.dataVersion;
            return Vue.prototype.$TCT.answer_score_issue[this.pk].fields.issue_score;
        },

        issueImportance: function () {
            Vue.prototype.$globalData.dataVersion;
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
window.defineComponent('state-score-card', {
    props: ['pk'],

    template: `
    <div class="bg-gray-50 rounded p-3 mb-3 shadow-xs hover:shadow transition-shadow">
        <div class="flex justify-between">
            <h4 class="text-sm font-medium text-gray-700">State Score #{{pk}}</h4>
            <button @click="$emit('deleteStateScore', pk)" class="text-red-500 hover:text-red-700" :aria-label="'Delete state score #' + pk" :title="'Delete state score #' + pk">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        </div>

        <div class="mt-2">
            <label class="block text-xs font-medium text-gray-700" :for="'ssc-state-' + pk">State:</label>
            <select @change="onInput($event)" name="state" :id="'ssc-state-' + pk"
                class="mt-1 p-1 text-sm block w-full border border-gray-300 rounded shadow-xs focus:ring-3 focus:ring-blue-400-blue-500 focus:border-blue-500">
                <option v-for="s in states" :selected="s.pk == state" :value="s.pk" :key="s.pk">
                    {{s.pk}} - {{s.fields.name}} ({{s.fields.abbr}})
                </option>
            </select>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div>
                <label class="block text-xs font-medium text-gray-700" :for="'ssc-candidate-' + pk">Candidate:</label>
                <div class="flex items-center mt-1">
                    <input @input="onInput($event)" :value="candidate" name="candidate" type="number" :id="'ssc-candidate-' + pk"
                        class="p-1 text-sm block w-20 border border-gray-300 rounded shadow-xs focus:ring-3 focus:ring-blue-400-blue-500 focus:border-blue-500">
                    <span v-if="candidateNickname" class="ml-2 text-xs text-gray-500">({{candidateNickname}})</span>
                </div>
            </div>

            <div>
                <label class="block text-xs font-medium text-gray-700" :for="'ssc-affected-' + pk">Affected candidate:</label>
                <div class="flex items-center mt-1">
                    <input @input="onInput($event)" :value="affected" name="affected_candidate" type="number" :id="'ssc-affected-' + pk"
                        class="p-1 text-sm block w-20 border border-gray-300 rounded shadow-xs focus:ring-3 focus:ring-blue-400-blue-500 focus:border-blue-500">
                    <span v-if="affectedNickname" class="ml-2 text-xs text-gray-500">({{affectedNickname}})</span>
                </div>
            </div>
        </div>

        <div class="mt-3">
            <label class="block text-xs font-medium text-gray-700" :for="'ssc-mult-' + pk">State multiplier:</label>
            <div class="flex items-center mt-1">
                <input @input="onInput($event)" :value="multiplier" name="state_multiplier" type="number" step="0.001" :id="'ssc-mult-' + pk"
                    class="p-1 text-sm block w-24 border border-gray-300 rounded shadow-xs focus:ring-3 focus:ring-blue-400-blue-500 focus:border-blue-500">
                <div class="ml-2 flex-1 h-2 bg-gray-200 rounded" aria-hidden="true">
                    <div class="h-full rounded transition-all duration-200"
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
        onInput: function (evt) {
            let value = evt.target.value;
            if (shouldBeSavedAsNumber(value)) {
                value = Number(value);
            }

            Vue.prototype.$TCT.answer_score_state[this.pk].fields[evt.target.name] = value;
            if (localStorage.getItem("autosaveEnabled") === "true") window.requestAutosaveDebounced?.();
            Vue.prototype.$globalData.dataVersion++;
        }
    },

    computed: {
        candidateNickname: function () {
            return Vue.prototype.$TCT.getNicknameForCandidate(this.candidate);
        },

        affectedNickname: function () {
            return Vue.prototype.$TCT.getNicknameForCandidate(this.affected);
        },

        candidate: function () {
            Vue.prototype.$globalData.dataVersion;
            return Vue.prototype.$TCT.answer_score_state[this.pk].fields.candidate;
        },

        affected: function () {
            Vue.prototype.$globalData.dataVersion;
            return Vue.prototype.$TCT.answer_score_state[this.pk].fields.affected_candidate;
        },

        multiplier: function () {
            Vue.prototype.$globalData.dataVersion;
            return Vue.prototype.$TCT.answer_score_state[this.pk].fields.state_multiplier;
        },

        state: function () {
            Vue.prototype.$globalData.dataVersion;
            return Vue.prototype.$TCT.answer_score_state[this.pk].fields.state;
        },

        states: function () {
            Vue.prototype.$globalData.dataVersion;
            return Object.values(Vue.prototype.$TCT.states);
        }
    }
});

window.defineComponent('state-effect-presets', {
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

            switch (category) {
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
        <button @click="togglePresets" class="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 flex items-center"
                :aria-expanded="showPresets" aria-controls="state-presets-panel">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            State presets
        </button>

        <div v-if="showPresets" id="state-presets-panel" class="mt-2 bg-gray-50 p-3 rounded shadow-xs">
            <h4 class="font-medium text-sm mb-2">Select Region:</h4>
            <div class="grid grid-cols-2 gap-1 mb-2">
                <button @click="selectPreset('swing')" class="bg-purple-100 text-purple-800 px-2 py-1 text-xs rounded hover:bg-purple-200">Swing states</button>
                <button @click="selectPreset('south')" class="bg-red-100 text-red-800 px-2 py-1 text-xs rounded hover:bg-red-200">South</button>
                <button @click="selectPreset('midwest')" class="bg-yellow-100 text-yellow-800 px-2 py-1 text-xs rounded hover:bg-yellow-200">Midwest</button>
                <button @click="selectPreset('northeast')" class="bg-blue-100 text-blue-800 px-2 py-1 text-xs rounded hover:bg-blue-200">Northeast</button>
                <button @click="selectPreset('west')" class="bg-green-100 text-green-800 px-2 py-1 text-xs rounded hover:bg-green-200">West</button>
                <button @click="selectPreset('blue')" class="bg-blue-300 text-blue-800 px-2 py-1 text-xs rounded hover:bg-blue-400">Blue states</button>
                <button @click="selectPreset('red')" class="bg-red-300 text-red-800 px-2 py-1 text-xs rounded hover:bg-red-400">Red states</button>
                <button @click="selectPreset('small')" class="bg-gray-200 text-gray-800 px-2 py-1 text-xs rounded hover:bg-gray-300">Small states</button>
                <button @click="selectPreset('large')" class="bg-gray-300 text-gray-800 px-2 py-1 text-xs rounded hover:bg-gray-400">Large states</button>
            </div>
        </div>
    </div>
    `
});

window.defineComponent('integrated-state-effect-visualizer', {
    props: ['answerId'],

    watch: {
        answerId: {
            immediate: true,
            handler(newAnswerId) {
                this.loadStateEffects();
            }
        },
        '$globalData.dataVersion': {
            handler() {
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
            effectListVersion: 0,
            useListEditor: false,
            stateDropdownPk: null,

            // pan and zoom state
            zoom: 1,
            minZoom: 0.25,
            maxZoom: 4,
            baseWidth: 1025,
            baseHeight: 595,
            panX: 0,
            panY: 0,
            isPanning: false,
            dragMoved: false,
            lastPointer: null,
            svgBounds: null,
            viewportInitialized: false
        };
    },

    mounted() {
        this.loadStateEffects();
        this.loadMapData();
    },

    computed: {
        candidates() {
            return typeof getListOfCandidates === 'function'
                ? getListOfCandidates()
                : Object.values(Vue.prototype.$TCT.candidates || {}).map(c => [c.pk, c.fields?.name || `Candidate ${c.pk}`]);
        },

        states() {
            return Object.values(Vue.prototype.$TCT.states || {}).filter(
                s => s && s.pk != null && s.fields && s.fields.abbr && s.fields.name
            );
        },

        selectedStatesCount() {
            return Object.values(this.selectedStates).filter(selected => selected).length;
        },

        smallStates() {
            const targets = ['DC', 'VT', 'NH', 'MA', 'RI', 'CT', 'NJ', 'DE', 'MD', 'HI'];
            return this.states.filter(s => targets.includes(s.fields?.abbr));
        },

        districtStates() {
            const districtRegex = /(?:Maine|Nebraska|ME|NE|M|N|CD|District|Congressional)[-\s]?(\d+)/i;
            return this.states.filter(state => {
                if (!state?.fields) return false;
                if (state.fields.abbr === 'DC') return false;
                if (districtRegex.test(state.fields.name || '')) return true;
                if (state.fields.abbr && /^[MN]\d$/.test(state.fields.abbr)) return true;
                return (state.fields.name || '').includes("CD") ||
                    (state.fields.name || '').includes("District");
            });
        },

        allStateEffectsForAnswer() {
            this.effectListVersion;
            Vue.prototype.$globalData.dataVersion;
            const stateScores = (typeof Vue.prototype.$TCT.getStateScoreForAnswer === 'function')
                ? Vue.prototype.$TCT.getStateScoreForAnswer(this.answerId) || []
                : [];

            if (!Array.isArray(stateScores) || stateScores.length === 0) return [];

            return stateScores
                .map(score => {
                    try {
                        const stateObj = Vue.prototype.$TCT.states?.[score.fields.state];
                        const stateName = stateObj?.fields?.name || `State ${score.fields.state}`;
                        const candidateNick = Vue.prototype.$TCT.getNicknameForCandidate?.(score.fields.candidate) || null;
                        const affectedNick = Vue.prototype.$TCT.getNicknameForCandidate?.(score.fields.affected_candidate) || null;
                        const multiplier = Number(score.fields.state_multiplier) || 0;
                        return {
                            pk: score.pk,
                            stateName,
                            candidateNickname: candidateNick,
                            affectedCandidateNickname: affectedNick,
                            multiplier
                        };
                    } catch (err) {
                        return null;
                    }
                })
                .filter(Boolean);
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

    methods: {
        loadStateEffects() {
            const stateScores = Vue.prototype.$TCT.getStateScoreForAnswer(this.answerId);
            const states = Object.values(Vue.prototype.$TCT.states);

            this.stateEffects = {};
            for (const state of states) {
                this.stateEffects[state.pk] = 0;
            }
            this.selectedStates = {};

            for (const score of stateScores) {
                if ((this.candidateId == null || score.fields.candidate == this.candidateId) &&
                    (this.affectedCandidateId == null || score.fields.affected_candidate == this.affectedCandidateId)) {
                    this.stateEffects[score.fields.state] = score.fields.state_multiplier;
                    this.selectedStates[score.fields.state] = true;
                }
            }
        },

        async loadMapData() {
            try {
                const mapping = Vue.prototype.$TCT.jet_data?.mapping_data;
                if (mapping?.mapSvg) {
                    this.mapData = Vue.prototype.$TCT.getMapForPreview(mapping.mapSvg) || [];
                    if (this.mapData.length) {
                        this.mapLoaded = true;
                        this.initializeViewport(true);
                        return;
                    }
                }

                const statesWithPath = this.states.filter(s => s?.d);
                if (statesWithPath.length) {
                    this.mapData = statesWithPath.map(s => [s.fields.abbr, s.d]);
                    this.mapLoaded = true;
                    this.initializeViewport(true);
                    return;
                }

                if (typeof loadDefaultUSMap === 'function') {
                    const svg = await loadDefaultUSMap();
                    if (svg) {
                        this.mapData = Vue.prototype.$TCT.getMapForPreview(svg) || [];
                        if (this.mapData.length) {
                            this.mapLoaded = true;
                            this.fallbackViewBox = '0 0 1000 589';
                            this.initializeViewport(true);
                            return;
                        }
                    }
                }
            } catch (err) {
                console.warn('Map load failed, falling back to grid:', err);
            }

            this.createBasicStateShapes();
        },

        createBasicStateShapes() {
            const states = this.states;
            if (!states.length) {
                this.enableListEditor();
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
            this.mapLoaded = true;
            this.fallbackViewBox = `0 0 ${cols * (size + padding) + 100} ${Math.ceil(states.length / cols) * (size + padding) + 100}`;
            this.initializeViewport(true);
        },

        enableListEditor() {
            this.useListEditor = true;
            this.mapLoaded = false;
        },

        initializeViewport(force = false) {
            const dims = this.resolveBaseDimensions();
            this.baseWidth = dims.width;
            this.baseHeight = dims.height;
            if (!this.viewportInitialized || force) {
                this.viewportInitialized = true;
                this.resetViewport();
            } else {
                this.clampPan();
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
            return { width: 1025, height: 595 };
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
            this.clampPan();
        },

        clampPan() {
            if (!this.viewportInitialized) return;
            const viewWidth = this.baseWidth / this.zoom;
            const viewHeight = this.baseHeight / this.zoom;
            const maxX = Math.max(0, this.baseWidth - viewWidth);
            const maxY = Math.max(0, this.baseHeight - viewHeight);
            this.panX = Math.min(Math.max(this.panX, 0), maxX);
            this.panY = Math.min(Math.max(this.panY, 0), maxY);
        },

        setZoom(next) {
            const target = Math.min(this.maxZoom, Math.max(this.minZoom, next));
            if (!this.viewportInitialized) {
                this.zoom = target;
                this.clampPan();
                return;
            }
            const prevWidth = this.baseWidth / this.zoom;
            const prevHeight = this.baseHeight / this.zoom;
            const centerX = this.panX + prevWidth / 2;
            const centerY = this.panY + prevHeight / 2;

            this.zoom = target;

            const newWidth = this.baseWidth / this.zoom;
            const newHeight = this.baseHeight / this.zoom;
            this.panX = centerX - newWidth / 2;
            this.panY = centerY - newHeight / 2;
            this.clampPan();
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
        },

        onPan(evt) {
            if (!this.isPanning || !this.svgBounds) return;
            const dx = evt.clientX - this.lastPointer.x;
            const dy = evt.clientY - this.lastPointer.y;
            if (!this.dragMoved && (Math.abs(dx) > 1 || Math.abs(dy) > 1)) {
                this.dragMoved = true;
            }
            const scaleX = (this.baseWidth / this.zoom) / this.svgBounds.width;
            const scaleY = (this.baseHeight / this.zoom) / this.svgBounds.height;
            this.panX -= dx * scaleX;
            this.panY -= dy * scaleY;
            this.lastPointer = { x: evt.clientX, y: evt.clientY };
            this.clampPan();
        },

        endPan(evt) {
            if (!this.isPanning) return;
            this.isPanning = false;
            this.lastPointer = null;
            this.svgBounds = null;
            if (evt?.pointerId !== undefined && evt.currentTarget?.releasePointerCapture) {
                try { evt.currentTarget.releasePointerCapture(evt.pointerId); } catch (e) { }
            }
        },

        handleStateClick(statePk) {
            if (this.dragMoved) {
                this.dragMoved = false;
                return;
            }
            this.toggleStateSelection(statePk);
        },

        isStateSelected(statePk) {
            return !!this.selectedStates[statePk];
        },

        toggleStateSelection(statePk) {
            if (this.selectedStates[statePk]) {
                delete this.selectedStates[statePk];
            } else {
                this.selectedStates[statePk] = true;
                this.editValue = this.stateEffects[statePk] || 0;
            }
        },

        highlightState(statePk) {
            this.highlightedState = statePk;
        },

        unhighlightState() {
            this.highlightedState = null;
        },

        selectStateFromDropdown() {
            if (this.stateDropdownPk) {
                this.toggleStateSelection(this.stateDropdownPk);
                this.stateDropdownPk = null;
            }
        },

        selectAll() {
            this.states.forEach(state => {
                this.selectedStates[state.pk] = true;
            });
        },

        clearSelection() {
            this.selectedStates = {};
        },

        getStatePath(state) {
            const abbr = state.fields?.abbr;
            if (!abbr && !state.d) return 'M0,0 h20 v20 h-20 Z';

            let entry = this.mapData.find(item => item[0] === abbr);
            if (!entry && abbr) {
                const normalized = abbr.replaceAll('-', '_');
                entry = this.mapData.find(item => item[0] === normalized);
            }

            if (!entry && state.d) return state.d;
            return entry ? entry[1] : 'M0,0 h20 v20 h-20 Z';
        },

        getStateColor(statePk) {
            const value = this.stateEffects[statePk] || 0;
            if (Math.abs(value) < 0.0001) return this.colorScale.neutral;
            const scale = value > 0 ? this.colorScale.positive : this.colorScale.negative;
            const absValue = Math.abs(value);
            let index = Math.min(Math.floor(absValue * 10), 9);
            return scale[index];
        },

        getStateStroke(statePk) {
            if (this.isStateSelected(statePk)) return '#000000';
            if (this.highlightedState === statePk) return '#333333';
            return '#666666';
        },

        getStateStrokeWidth(statePk) {
            if (this.isStateSelected(statePk)) return 2;
            if (this.highlightedState === statePk) return 1.5;
            return 1;
        },

        increaseValue() {
            this.editValue = Math.min(parseFloat(this.editValue) + 0.001, 1).toFixed(3);
        },

        decreaseValue() {
            this.editValue = Math.max(parseFloat(this.editValue) - 0.001, -1).toFixed(3);
        },

        applyValueToSelectedStates() {
            const selectedPks = Object.keys(this.selectedStates).filter(pk => this.selectedStates[pk]);
            if (!selectedPks.length) return;

            const val = parseFloat(this.editValue);
            selectedPks.forEach(pk => {
                this.stateEffects[pk] = val;
                this.updateOrCreateStateEffect(pk, val);
            });

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
            Vue.prototype.$TCT._invalidateCache('state_score_by_answer');
            Vue.prototype.$globalData.dataVersion++;
        },

        deleteStateEffect(effectPk) {
            delete Vue.prototype.$TCT.answer_score_state[effectPk];
            Vue.prototype.$TCT._invalidateCache('state_score_by_answer');
            this.loadStateEffects();
            this.effectListVersion++;
            Vue.prototype.$globalData.dataVersion++;
        },

        selectPresetStates(statePks) {
            this.clearSelection();
            statePks.forEach(pk => {
                this.selectedStates[pk] = true;
            });
        },

        applyPresetValue(value) {
            this.editValue = value;
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
                    class="p-1 text-sm block w-full border border-gray-300 rounded shadow-xs">
                    <option v-for="candidate in candidates" :key="candidate[0]" :value="candidate[0]">
                        {{ candidate[1] }}
                    </option>
                </select>
            </div>

            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">
                    Affected candidate:
                </label>
                <select v-model="affectedCandidateId" @change="loadStateEffects"
                    class="p-1 text-sm block w-full border border-gray-300 rounded shadow-xs">
                    <option v-for="candidate in candidates" :key="candidate[0]" :value="candidate[0]">
                        {{ candidate[1] }}
                    </option>
                </select>
            </div>
        </div>

        <!-- Map and Controls in Flex Layout -->
        <div class="flex flex-col md:flex-row gap-4">
            <!-- Map Display -->
            <div class="md:w-3/5" v-if="!useListEditor">
                <div v-if="usingBasicShapes" class="bg-yellow-100 p-2 mb-2 text-xs rounded">
                    Using basic shapes (fallback map)
                </div>

                <div class="relative border rounded overflow-hidden">
                    <svg
                        version="1.1"
                        xmlns="http://www.w3.org/2000/svg"
                        :viewBox="viewBoxString"
                        preserveAspectRatio="xMidYMid meet"
                        class="w-full h-auto bg-slate-100 select-none"
                        style="touch-action: none;"
                        @pointerdown="startPan"
                        @pointermove="onPan"
                        @pointerup="endPan"
                        @pointerleave="endPan"
                        @pointercancel="endPan"
                        @wheel.prevent="onWheel"
                        @contextmenu.prevent
                    >
                        <g v-if="mapLoaded">
                            <path
                                v-for="state in states"
                                :key="state.pk"
                                :d="getStatePath(state)"
                                :style="{
                                    fill: getStateColor(state.pk),
                                    stroke: getStateStroke(state.pk),
                                    'stroke-width': getStateStrokeWidth(state.pk),
                                    cursor: isPanning ? 'grabbing' : 'pointer'
                                }"
                                :aria-checked="isStateSelected(state.pk) ? 'true' : 'false'"
                                @click="handleStateClick(state.pk)"
                                @mouseenter="highlightState(state.pk)"
                                @mouseleave="unhighlightState"
                            />
                        </g>
                        <text v-else x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" class="text-sm">
                            Loading map data...
                        </text>
                    </svg>
                    
                    <!-- Zoom Controls Overlay -->
                    <div class="absolute top-2 right-2 flex flex-col gap-2">
                        <button class="bg-black/60 text-white rounded px-2 py-1 text-xs hover:bg-black/80" @pointerdown.stop @click.stop="zoomIn">+</button>
                        <button class="bg-black/60 text-white rounded px-2 py-1 text-xs hover:bg-black/80" @pointerdown.stop @click.stop="zoomOut">−</button>
                        <button class="bg-black/60 text-white rounded px-2 py-1 text-xs hover:bg-black/80" @pointerdown.stop @click.stop="resetViewport">Reset</button>
                    </div>
                </div>

                <!-- Small States, D.C. and Congressional Districts Buttons -->
                <div class="flex flex-wrap gap-1 mt-2" v-if="smallStates.length > 0 || districtStates.length > 0">
                    <button v-for="state in smallStates"
                        :key="'small-' + state.pk"
                        @click="toggleStateSelection(state.pk)"
                        :class="{'bg-blue-700': isStateSelected(state.pk), 'bg-blue-500': !isStateSelected(state.pk)}"
                        class="text-white px-2 py-1 text-xs rounded hover:bg-blue-600">
                        {{ state.fields.abbr }}
                    </button>
                    <button v-for="state in districtStates"
                        :key="'dist-' + state.pk"
                        @click="toggleStateSelection(state.pk)"
                        :class="{'bg-blue-700': isStateSelected(state.pk), 'bg-blue-500': !isStateSelected(state.pk)}"
                        class="text-white px-2 py-1 text-xs rounded hover:bg-blue-600">
                        {{ state.fields.abbr || state.fields.name.replace(/[^0-9]/g, '') }}
                    </button>
                </div>

                <div class="flex justify-between mt-2">
                    <button @click="selectAll" class="bg-blue-500 text-white px-2 py-1 text-xs rounded hover:bg-blue-600">Select all</button>
                    <button @click="clearSelection" class="bg-red-500 text-white px-2 py-1 text-xs rounded hover:bg-red-600">Clear selection</button>
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

                <!-- Fallback State Dropdown -->
                <div class="mb-4">
                    <label class="block text-xs font-medium text-gray-700 mb-1">Select state</label>
                    <div class="flex items-center gap-2">
                        <select v-model="stateDropdownPk"
                                class="p-1 text-sm block w-full border border-gray-300 rounded shadow-xs">
                            <option :value="null" disabled>Select a state...</option>
                            <option v-for="s in states" :key="'dd-' + s.pk" :value="s.pk">
                                {{ s.fields.abbr }} - {{ s.fields.name }}
                            </option>
                        </select>
                        <button @click="selectStateFromDropdown"
                                class="bg-blue-500 text-white px-2 py-1 text-xs rounded hover:bg-blue-600">
                            Toggle
                        </button>
                    </div>
                </div>

                <!-- Effect Value Editor -->
                <div class="mb-4">
                    <label class="block text-xs font-medium text-gray-700 mb-1">Effect value</label>
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
                    <button @click="applyValueToSelectedStates"
                            class="w-full bg-green-500 text-white py-1 rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            :disabled="selectedStatesCount === 0"
                            :aria-disabled="selectedStatesCount === 0 ? 'true' : 'false'">
                        Apply to selected ({{ selectedStatesCount }})
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
                        <label class="block text-xs font-medium text-gray-700">All state effects</label>
                    </div>
                    <div class="max-h-64 overflow-y-auto bg-gray-50 p-2 rounded border text-xs">
                        <ul class="divide-y divide-gray-200">
                            <li v-for="effect in allStateEffectsForAnswer" :key="effect.pk" class="py-2 flex justify-between items-center">
                                <div>
                                    <span class="font-semibold">{{ effect.stateName }}</span>
                                    <div class="text-xs text-gray-500">
                                        <span v-if="effect.candidateNickname">(Candidate: {{ effect.candidateNickname }})</span>
                                        <span v-if="effect.affectedCandidateNickname"> (Affected: {{ effect.affectedCandidateNickname }})</span>
                                    </div>
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
                            <li v-if="allStateEffectsForAnswer.length === 0" class="py-1 text-gray-500 italic">No state effects configured.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `
});

// Variable Effect Card Component
window.defineComponent('variable-effect-card', {
    props: ['pk'],

    template: `
    <div class="bg-gray-50 rounded p-3 mb-3 shadow-xs hover:shadow transition-shadow">
        <div class="flex justify-between">
            <h4 class="text-sm font-medium text-gray-700">Variable effect #{{pk}}</h4>
            <button @click="$emit('deleteVariableEffect', pk)" class="text-red-500 hover:text-red-700" :aria-label="'Delete variable effect #' + pk" :title="'Delete variable effect #' + pk">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        </div>

        <div class="grid grid-cols-3 gap-3 mt-3">
            <div>
                <label class="block text-xs font-medium text-gray-700" :for="'ve-variable-' + pk">Variable:</label>
                <select @change="onInput($event)" :value="variable" name="variable" :id="'ve-variable-' + pk"
                    class="mt-1 p-1 text-sm block w-full border border-gray-300 rounded shadow-xs focus:ring-3 focus:ring-blue-400-purple-500 focus:border-purple-500">
                    <option v-for="variable in availableVariables" :key="variable.name" :value="variable.name">{{ variable.name }}</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700" :for="'ve-operation-' + pk">Operation:</label>
                <select @change="onInput($event)" :value="operation" name="operation" :id="'ve-operation-' + pk"
                    class="mt-1 p-1 text-sm block w-full border border-gray-300 rounded shadow-xs focus:ring-3 focus:ring-blue-400-purple-500 focus:border-purple-500">
                    <option value="add">Add (+)</option>
                    <option value="subtract">Subtract (-)</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700" :for="'ve-amount-' + pk">Amount:</label>
                <input @input="onInput($event)" :value="amount" name="amount" type="number" min="1" :id="'ve-amount-' + pk"
                    class="mt-1 p-1 text-sm block w-full border border-gray-300 rounded shadow-xs focus:ring-3 focus:ring-blue-400-purple-500 focus:border-purple-500">
            </div>
        </div>
        
        <div class="mt-2 text-xs text-gray-500">
            Effect: <span class="font-medium">{{ variable }} {{ operation === 'add' ? '+' : '-' }}= {{ amount }}</span>
        </div>
    </div>
    `,

    methods: {
        onInput(evt) {
            const effectsRoot = Vue.prototype.$TCT.jet_data.cyoa_variable_effects || (Vue.prototype.$TCT.jet_data.cyoa_variable_effects = {});
            if (!effectsRoot[this.pk]) return;

            const val = evt.target.name === 'amount' ? Number(evt.target.value) : evt.target.value;
            effectsRoot[this.pk][evt.target.name] = val;

            if (localStorage.getItem("autosaveEnabled") === "true") window.requestAutosaveDebounced?.();
            Vue.prototype.$globalData.dataVersion++;
        }
    },

    computed: {
        availableVariables() {
            return Vue.prototype.$TCT.getAllCyoaVariables();
        },

        variable: function () {
            return Vue.prototype.$TCT.jet_data.cyoa_variable_effects[this.pk]?.variable || '';
        },

        operation: function () {
            return Vue.prototype.$TCT.jet_data.cyoa_variable_effects[this.pk]?.operation || 'add';
        },

        amount: function () {
            return Vue.prototype.$TCT.jet_data.cyoa_variable_effects[this.pk]?.amount || 1;
        }
    }
});
