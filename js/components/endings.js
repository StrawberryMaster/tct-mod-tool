window.defineComponent('endings', {

    data() {
        return {
            temp_endings: []
        };
    },

    template: `
    <div class="mx-auto bg-gray-100 p-4">

        <h1>Custom Endings</h1>

        <button v-if="!enabled" class="bg-green-500 text-white p-2 my-2 rounded-sm hover:bg-green-600" v-on:click="toggleEnabled()">Enable Custom Endings</button>
        <button v-if="enabled" class="bg-red-500 text-white p-2 my-2 rounded-sm hover:bg-red-600" v-on:click="toggleEnabled()">Disable Custom Endings</button><br>

        <button v-if="enabled" class="bg-green-500 text-white p-2 my-2 rounded-sm hover:bg-green-600" v-on:click="addEnding()">Add Custom Ending</button>

        <details open v-if="enabled">
        <summary>Custom Endings</summary>
        <ul>
            <ending @deleteEvent="deleteEnding" :id="x.id" :key="x.key" v-for="x in endings"></ending>
        </ul>
        </details>

    </div>
    `,

    methods: {

        toggleEnabled: function(evt) {
            Vue.prototype.$TCT.jet_data.endings_enabled = !Vue.prototype.$TCT.jet_data.endings_enabled;

            const temp = Vue.prototype.$globalData.filename;
            Vue.prototype.$globalData.filename = "";
            Vue.prototype.$globalData.filename = temp;
        },

        addEnding: function(evt) {
            let id = Date.now();
            Vue.prototype.$TCT.jet_data.ending_data[id] = {
                'id':id,
                'variable':0,
                'operator':'>',
                'value':0,
                'endingImage':"",
                'endingText':"Put ending text here, you can and should use <p>HTML tags</p>!"
            }
            this.temp_endings = [];
        },

        deleteEnding: function(id) {
            delete Vue.prototype.$TCT.jet_data.ending_data[id];
            this.temp_endings = [];
        },


    },

    computed: {

        endings: function() {
            return this.temp_endings.concat(Vue.prototype.$TCT.getAllEndings());
        },

        enabled: function() {
            if(Vue.prototype.$TCT.jet_data.endings_enabled == null) {
                Vue.prototype.$TCT.jet_data.endings_enabled = false;
            }

            if(Vue.prototype.$TCT.jet_data.ending_data == null) {
                Vue.prototype.$TCT.jet_data.ending_data = {};
            }

            const temp = Vue.prototype.$globalData.filename;
            Vue.prototype.$globalData.filename = "";
            Vue.prototype.$globalData.filename = temp;

            return Vue.prototype.$TCT.jet_data.endings_enabled;
        }
    }
})

window.defineComponent('ending', {

    props: ['id'],

    template: `
    <div class="mx-auto bg-gray-200 drop-shadow-md p-4 mb-4">
        <select @change="onChange($event)" :value="getVariable" name="variable" id="variable">
            <option value="0">Player Electoral Votes</option>
            <option value="1">Player Popular Vote Percentage</option>
            <option value="2">Player Raw Vote Total</option>
        </select>

        <select @change="onChange($event)" :value="getOperator" name="operator" id="operator">
            <option value=">">Greater Than</option>
            <option value="==">Equal To</option>
            <option value="<">Less Than</option>
        </select>

        <input @input="onInput($event)" :value="getAmount" name="amount" type="number">

        <br>

        <label for="endingText">Ending Text:</label><br>
        <textarea @input="onInput($event)" :value="getEndingText" name="endingText" rows="4" cols="50"></textarea><br>

        <label for="endingImage">Custom Ending Image (Optional):</label><br>
        <input @input="onInput($event)" :value="endingImage" name="endingImage" type="text"><br><br>

        <div v-if="endingImage">
        <img :src="endingImage"></img>
        <p class="text-sm">Make sure this image is a multiple of 1100x719</p><br>
        </div>


    </div>
    `,

    methods: {
        deleteEvent: function() {
            this.$emit('deleteEvent', this.id)
        },

        onChange: function(evt) {
            Vue.prototype.$TCT.jet_data.ending_data[this.id][evt.target.name] = evt.target.value;
        },

        onInput: function(evt) {
            Vue.prototype.$TCT.jet_data.ending_data[this.id][evt.target.name] = evt.target.value;
        },
    },

    computed: {

        endingImage: function() {
            return Vue.prototype.$TCT.jet_data.ending_data[this.id].endingImage;
        },

        getVariable: function() {
            console.log(Vue.prototype.$TCT.jet_data.ending_data)
            return Vue.prototype.$TCT.jet_data.ending_data[this.id].variable;
        },

        getOperator: function() {
            return Vue.prototype.$TCT.jet_data.ending_data[this.id].operator;
        },

        getAmount: function() {
            return Vue.prototype.$TCT.jet_data.ending_data[this.id].amount;
        },

        getEndingText: function() {
            return Vue.prototype.$TCT.jet_data.ending_data[this.id].endingText;
        }
    }
})