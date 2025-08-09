window.defineComponent('cyoa', {

    data() {
        return {
            temp_events: []
        };
    },

    template: `
    <div class="mx-auto bg-gray-100 p-4">

        <h1>CYOA Options</h1>

        <button v-if="!enabled" class="bg-green-500 text-white p-2 my-2 rounded hover:bg-green-600" v-on:click="toggleEnabled()">Enable CYOA</button>
        <button v-if="enabled" class="bg-red-500 text-white p-2 my-2 rounded hover:bg-red-600" v-on:click="toggleEnabled()">Disable CYOA</button><br>

        <button v-if="enabled" class="bg-green-500 text-white p-2 my-2 rounded hover:bg-green-600" v-on:click="addCyoaEvent()">Add CYOA Event</button>

        <details open v-if="enabled">
        <summary>CYOA Events</summary>
        <ul>
            <cyoa-event @deleteEvent="deleteEvent" :id="x.id" :key="x.key" v-for="x in cyoaEvents"></cyoa-event>
        </ul>
        </details>

    </div>
    `,

    methods: {

        toggleEnabled: function(evt) {
            Vue.prototype.$TCT.jet_data.cyoa_enabled = !Vue.prototype.$TCT.jet_data.cyoa_enabled;

            const temp = Vue.prototype.$globalData.filename;
            Vue.prototype.$globalData.filename = "";
            Vue.prototype.$globalData.filename = temp;
        },

        addCyoaEvent: function(evt) {
            let id = Date.now();
            Vue.prototype.$TCT.jet_data.cyoa_data[id] = {'answer':Object.values(Vue.prototype.$TCT.answers)[0].pk, 'question':Array.from(Vue.prototype.$TCT.questions.values())[0].pk, 'id':id}
            this.temp_events = [];
        },

        deleteEvent: function(id) {
            delete Vue.prototype.$TCT.jet_data.cyoa_data[id];
            this.temp_events = [];
        },


    },

    computed: {

        cyoaEvents: function() {
            return this.temp_events.concat(Vue.prototype.$TCT.getAllCyoaEvents());
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
        }
    }
})

window.defineComponent('cyoa-event', {

    props: ['id'],

    template: `
    <div class="mx-auto bg-gray-200 drop-shadow-md p-4 mb-4">
        <p class="text-sm text-gray-700 italic">The PK of the answer that leads to the next question being the below question:</p>
        <label for="answer">Answer:</label><br>
        <select @change="onChange($event)" name="answer">
        <option :selected="currentAnswer == answer.pk" v-for="answer in answers" :value="answer.pk" :key="answer.pk">{{answer.pk}} - {{description(answer)}}</option>
        </select><br>


        <p class="text-sm text-gray-700 italic">The PK of the question that is skipped to after the above answer:</p>
        <label for="question">Question:</label><br>
        <select @change="onChange($event)" name="question">
        <option :selected="currentQuestion == question.pk" v-for="question in questions" :value="question.pk" :key="question.pk">{{question.pk}} - {{description(question)}}</option>
        </select><br>

        <button class="bg-red-500 text-white p-2 my-2 rounded hover:bg-red-600" v-on:click="deleteEvent()">Delete CYOA Event</button>
    </div>
    `,

    methods: {
        deleteEvent: function() {
            this.$emit('deleteEvent', this.id)
        },

        onChange: function(evt) {
            Vue.prototype.$TCT.jet_data.cyoa_data[this.id][evt.target.name] = evt.target.value;
        },

        description:function(qa) {

            if(qa.fields.description == null || qa.fields.description == '') {
                return '...';
            }

            return qa.fields.description.slice(0,50) + "...";
        },
    },

    computed: {
        currentQuestion: function() {
            return Vue.prototype.$TCT.jet_data.cyoa_data[this.id].question;
        },

        currentAnswer: function() {
            return Vue.prototype.$TCT.jet_data.cyoa_data[this.id].answer;
        },

        questions: function() {
            return Array.from(Vue.prototype.$TCT.questions.values());
        },

        answers: function() {
            return Object.values(Vue.prototype.$TCT.answers);
        },
    }
})