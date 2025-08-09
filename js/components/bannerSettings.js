window.defineComponent('banner-settings', {

    template: `
    <div class="mx-auto bg-gray-100 p-4">

        <h1>Banner Settings</h1>

        <button v-if="!enabled" class="bg-green-500 text-white p-2 my-2 rounded hover:bg-green-600" v-on:click="toggleEnabled()">Enable Banner Settings</button>
        <button v-if="enabled" class="bg-red-500 text-white p-2 my-2 rounded hover:bg-red-600" v-on:click="toggleEnabled()">Disable Banner Settings</button><br>

        <div v-if="enabled">

            <label for="canName">Candidate Last Name:</label><br>
            <input @input="onInput($event)" :value="getCanName" name="canName" type="text"><br><br>

            <label for="canImage">Candidate Image URL:</label><br>
            <input @input="onInput($event)" :value="getCanImage" name="canImage" type="text"><br><br>

            <div v-if="getCanImage">
            <img :src="getCanImage"></img>
            <p class="text-sm">Make sure this image is a multiple of 210x240</p><br>
            </div>

            <label for="runName">Running Mate Last Name:</label><br>
            <input @input="onInput($event)" :value="getRunName" name="runName" type="text"><br><br>

            <label for="runImage">Running Mate Image URL:</label><br>
            <input @input="onInput($event)" :value="getRunImage" name="runImage" type="text"><br><br>

            <div v-if="getRunImage">
            <img :src="getRunImage"></img>
            <p class="text-sm">Make sure this image is a multiple of 210x240</p><br>
            </div>

            
        </div>

    </div>
    `,

    methods: {

        toggleEnabled: function(evt) {
            Vue.prototype.$TCT.jet_data.banner_enabled = !Vue.prototype.$TCT.jet_data.banner_enabled;

            const temp = Vue.prototype.$globalData.filename;
            Vue.prototype.$globalData.filename = "";
            Vue.prototype.$globalData.filename = temp;
        },

        onInput: function(evt) {
            Vue.prototype.$TCT.jet_data.banner_data[evt.target.name] = evt.target.value;
        },

    },

    computed: {
        enabled: function() {
            if(Vue.prototype.$TCT.jet_data.banner_enabled == null) {
                Vue.prototype.$TCT.jet_data.banner_enabled = false;
            }

            if(Vue.prototype.$TCT.jet_data.banner_data == null) {
                Vue.prototype.$TCT.jet_data.banner_data = {};
            }

            const temp = Vue.prototype.$globalData.filename;
            Vue.prototype.$globalData.filename = "";
            Vue.prototype.$globalData.filename = temp;

            return Vue.prototype.$TCT.jet_data.banner_enabled;
        },

        getCanImage: function() {
            return Vue.prototype.$TCT.jet_data.banner_data.canImage;
        },

        getRunImage: function() {
            return Vue.prototype.$TCT.jet_data.banner_data.runImage;
        },

        getCanName: function() {
            return Vue.prototype.$TCT.jet_data.banner_data.canName;
        },

        getRunName: function() {
            return Vue.prototype.$TCT.jet_data.banner_data.runName;
        },
    }
})