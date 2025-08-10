window.defineComponent('cyoa', {

    data() {
        return {
            temp_events: [],
            tick: 0
        };
    },

    template: `
    <div class="mx-auto bg-white rounded-lg shadow p-4">
        <div class="flex items-center justify-between mb-3">
            <h1 class="font-bold text-xl">CYOA Options</h1>
            <div class="space-x-2">
                <button v-if="!enabled" class="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600" v-on:click="toggleEnabled()" aria-label="Enable CYOA">Enable</button>
                <button v-else class="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600" v-on:click="toggleEnabled()" aria-label="Disable CYOA">Disable</button>
            </div>
        </div>

        <div v-if="enabled" class="mb-2 flex items-center gap-2">
            <button 
                class="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed" 
                v-on:click="addCyoaEvent()" 
                :disabled="!canAdd"
                :title="canAdd ? 'Add a new branching rule' : 'Need at least one question and one answer'"
            >
                Add CYOA Event
            </button>
            <span class="text-sm text-gray-600" v-if="cyoaEvents.length">Total: {{ cyoaEvents.length }}</span>
        </div>

        <div v-if="enabled">
            <details open class="bg-gray-50 rounded border">
                <summary class="px-3 py-2 font-medium cursor-pointer">CYOA Events</summary>
                <div class="p-3">
                    <p v-if="cyoaEvents.length === 0" class="text-gray-500 italic">No CYOA events yet. Click "Add CYOA Event" to create one.</p>
                    <ul v-else class="space-y-3">
                        <cyoa-event @deleteEvent="deleteEvent" :id="x.id" :key="x.id" v-for="x in cyoaEvents"></cyoa-event>
                    </ul>
                </div>
            </details>
        </div>
    </div>
    `,

    methods: {

        toggleEnabled: function(evt) {
            Vue.prototype.$TCT.jet_data.cyoa_enabled = !Vue.prototype.$TCT.jet_data.cyoa_enabled;
            const temp = Vue.prototype.$globalData.filename;
            Vue.prototype.$globalData.filename = "";
            Vue.prototype.$globalData.filename = temp;
            this.tick++;
        },

        addCyoaEvent: function(evt) {
            // guard: require at least one Q and one A
            const answers = Object.values(Vue.prototype.$TCT.answers);
            const questions = Array.from(Vue.prototype.$TCT.questions.values());
            if (!answers.length || !questions.length) {
                console.warn("CYOA: cannot add event without at least one answer and one question.");
                return;
            }
            let id = Date.now();
            Vue.prototype.$TCT.jet_data.cyoa_data[id] = {
                'answer': answers[0].pk,
                'question': questions[0].pk,
                'id': id
            };
            this.temp_events = [];
            this.tick++;
        },

        deleteEvent: function(id) {
            delete Vue.prototype.$TCT.jet_data.cyoa_data[id];
            this.temp_events = [];
            this.tick++;
        },
    },

    computed: {

        cyoaEvents: function() {
            this.tick;
            return Vue.prototype.$TCT.getAllCyoaEvents();
        },

        enabled: function() {
            if(Vue.prototype.$TCT.jet_data.cyoa_enabled == null) {
                Vue.prototype.$TCT.jet_data.cyoa_enabled = false;
            }

            if(Vue.prototype.$TCT.jet_data.cyoa_data == null) {
                Vue.prototype.$TCT.jet_data.cyoa_data = {};
            }

            const temp = Vue.prototype.$globalData.filename;
            Vue.prototype.$globalData.filename = "";
            Vue.prototype.$globalData.filename = temp;

            return Vue.prototype.$TCT.jet_data.cyoa_enabled;
        },

        // disable Add button if we have no data to populate selects
        canAdd: function() {
            const hasAnswers = Object.values(Vue.prototype.$TCT.answers).length > 0;
            const hasQuestions = Array.from(Vue.prototype.$TCT.questions.values()).length > 0;
            return hasAnswers && hasQuestions;
        }
    }
})

window.defineComponent('cyoa-event', {

    props: ['id'],

    data() {
        return {
            answerVal: null,
            questionVal: null
        };
    },

    template: `
    <div class="bg-white rounded shadow p-4">
        <div class="flex justify-between items-start mb-3">
            <div class="text-sm text-gray-700">
                <div class="font-medium">Branch Summary</div>
                <div class="mt-1">
                    If Answer <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">#{{ answerVal }}</span>
                    then jump to Question <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">#{{ questionVal }}</span>
                </div>
            </div>
            <button class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600" v-on:click="deleteEvent()">Delete</button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <p class="text-sm text-gray-700 italic mb-1">Answer that triggers the jump:</p>
                <label class="block text-sm font-medium mb-1" for="answer">Answer</label>
                <select v-model.number="answerVal" name="answer" class="w-full border rounded p-2">
                    <option v-for="answer in answers" :value="answer.pk" :key="answer.pk">
                        {{answer.pk}} - {{description(answer)}}
                    </option>
                </select>
            </div>

            <div>
                <p class="text-sm text-gray-700 italic mb-1">Question to jump to:</p>
                <label class="block text-sm font-medium mb-1" for="question">Question</label>
                <select v-model.number="questionVal" name="question" class="w-full border rounded p-2">
                    <option v-for="question in questions" :value="question.pk" :key="question.pk">
                        {{question.pk}} - {{description(question)}}
                    </option>
                </select>
            </div>
        </div>
    </div>
    `,

    methods: {
        deleteEvent: function() {
            if (confirm('Delete this CYOA event?')) {
                this.$emit('deleteEvent', this.id);
            }
        },

        onChange: function(evt) {
            const val = Number(evt.target.value);
            Vue.prototype.$TCT.jet_data.cyoa_data[this.id][evt.target.name] = val;
        },

        description:function(qa) {
            if(!qa || !qa.fields || qa.fields.description == null || qa.fields.description === '') {
                return '...';
            }
            const s = qa.fields.description;
            return s.length > 50 ? (s.slice(0, 50) + "...") : s;
        },

        updateGlobal: function(field, val) {
            if (!Vue.prototype.$TCT.jet_data.cyoa_data[this.id]) return;
            Vue.prototype.$TCT.jet_data.cyoa_data[this.id][field] = Number(val);
        },

        syncFromGlobal: function() {
            const row = Vue.prototype.$TCT.jet_data.cyoa_data[this.id] || {};
            // fallbacks in case of missing data
            const answers = Object.values(Vue.prototype.$TCT.answers);
            const questions = Array.from(Vue.prototype.$TCT.questions.values());
            this.answerVal = Number(row.answer ?? (answers[0]?.pk ?? 0));
            this.questionVal = Number(row.question ?? (questions[0]?.pk ?? 0));
        }
    },

    mounted() {
        this.syncFromGlobal();
    },

    watch: {
        id() {
            this.syncFromGlobal();
        },
        answerVal(val) {
            this.updateGlobal('answer', val);
        },
        questionVal(val) {
            this.updateGlobal('question', val);
        }
    },

    computed: {
        currentQuestion: function() {
            const row = Vue.prototype.$TCT.jet_data.cyoa_data[this.id] || {};
            return row.question;
        },

        currentAnswer: function() {
            const row = Vue.prototype.$TCT.jet_data.cyoa_data[this.id] || {};
            return row.answer;
        },

        questions: function() {
            return Array.from(Vue.prototype.$TCT.questions.values());
        },

        answers: function() {
            return Object.values(Vue.prototype.$TCT.answers);
        },
    }
})