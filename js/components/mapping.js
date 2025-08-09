window.defineComponent('mapping', {

    data() {
        return {
            mapSvg : Vue.prototype.$TCT.jet_data.mapping_data?.mapSvg ?? "",
            x : Vue.prototype.$TCT.jet_data.mapping_data?.x ?? 925,
            y : Vue.prototype.$TCT.jet_data.mapping_data?.y ?? 925,
            dx : Vue.prototype.$TCT.jet_data.mapping_data?.dx ?? 0,
            dy : Vue.prototype.$TCT.jet_data.mapping_data?.dy ?? 0,
        };
    },

    template: `
    <div class="mx-auto bg-gray-100 p-4">

        <h1>Mapping Settings</h1>

        <button v-if="!enabled" class="bg-green-500 text-white p-2 my-2 rounded hover:bg-green-600" v-on:click="toggleEnabled()">Enable Custom Map</button>
        <button v-if="enabled" class="bg-red-500 text-white p-2 my-2 rounded hover:bg-red-600" v-on:click="toggleEnabled()">Disable Custom Map</button><br>

        <div v-if="enabled">

            <label for="mapSvg">Map SVG:</label><br>
            <textarea v-model="mapSvg" name="mapSvg" rows="4" cols="50"></textarea><br>

            <label for="electionPk">Election PK:</label><br>
            <input @input="onInput($event)" :value="electionPk" name="electionPk" type="number"><br>
            <p class="text-sm text-gray-700 italic">NOTE: Set this to the pk of your election so all states have this filled out automatically. Otherwise you will need to fill it in for each state yourself.</p>

            <button class="bg-green-500 text-white p-2 my-2 rounded hover:bg-green-600" v-on:click="loadMapFromSVG()">Load Map From SVG</button><br>
            <p class="text-sm text-gray-700 italic">WARNING: If you click this all your states and anything referencing your states will be deleted from your code 2 and replaced from what the tool gets from your SVG. You should only be doing this once when starting to make the mod.</p>

            <div v-if="mapSvg">
                <map-preview :svg="mapSvg" :dx="dx" :dy="dy" :x="x" :y="y"></map-preview>

                <p class="text-sm text-gray-700 italic">Change the x and y values to change how big the map appears in the preview if the map isn't fitting currently.</p>

                <label>x:</label><br>
                <input v-model="x" type="number"><br>

                <label>x offset:</label><br>
                <input v-model="dx" type="number"><br>

                <label>y:</label><br>
                <input v-model="y" type="number"><br>

                <label>y offset:</label><br>
                <input v-model="dy" type="number"><br>

                <p class="text-sm text-gray-700 italic">NOTE: Each time you exit this tab your preview will disappear if you don't press Load Map From SVG, so make sure to do all your mapping in one fell swoop.</p>
                <br>
            </div>
        </div>

    </div>
    `,

    methods: {

        loadMapFromSVG: function() {

            if(Vue.prototype.$TCT.jet_data.mapping_data == null) {
                Vue.prototype.$TCT.jet_data.mapping_data = {}
            }

            if(this.mapSvg == null) {
                alert("There was an issue getting the SVG from the input field. Go out of this tab and go back in and try again.")
                return;
            }

            Vue.prototype.$TCT.jet_data.mapping_data.mapSvg = this.mapSvg;
            Vue.prototype.$TCT.jet_data.mapping_data.x = this.x;
            Vue.prototype.$TCT.jet_data.mapping_data.y = this.y;
            Vue.prototype.$TCT.jet_data.mapping_data.dx = this.dx;
            Vue.prototype.$TCT.jet_data.mapping_data.dy = this.dy;

            Vue.prototype.$TCT.loadMap();
            Vue.prototype.$globalData.state = Object.keys(Vue.prototype.$TCT.states)[0];
            alert("Custom map SVG loaded in. If there were any errors they are in the console. Check your states dropdown to confirm it is working.")
            Vue.prototype.$globalData.mode = STATE;
            const temp = Vue.prototype.$globalData.filename;
            Vue.prototype.$globalData.filename = "";
            Vue.prototype.$globalData.filename = temp;
        },

        toggleEnabled: function(evt) {
            Vue.prototype.$TCT.jet_data.mapping_enabled = !Vue.prototype.$TCT.jet_data.mapping_enabled;

            const temp = Vue.prototype.$globalData.filename;
            Vue.prototype.$globalData.filename = "";
            Vue.prototype.$globalData.filename = temp;
        },

        onInput: function(evt) {
            Vue.prototype.$TCT.jet_data.mapping_data[evt.target.name] = evt.target.value;
        },
        
    },

    computed: {

        electionPk: function() {
            return Vue.prototype.$TCT.jet_data.mapping_data.electionPk;
        },

        enabled: function() {
            if(Vue.prototype.$TCT.jet_data.mapping_enabled == null) {
                Vue.prototype.$TCT.jet_data.mapping_enabled = false;
            }

            if(Vue.prototype.$TCT.jet_data.mapping_data == null) {
                Vue.prototype.$TCT.jet_data.mapping_data = {};
            }

            const temp = Vue.prototype.$globalData.filename;
            Vue.prototype.$globalData.filename = "";
            Vue.prototype.$globalData.filename = temp;

            return Vue.prototype.$TCT.jet_data.mapping_enabled;
        }
    }
});

window.defineComponent('map-preview', {

    props: ['svg', 'x', 'y', 'dx', 'dy'],

    template: `
    <div id="map_container">
        <svg height="400.125" version="1.1" width="722.156" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="background-color:#BFE6FF; overflow: hidden; position: relative; left: -0.895844px; top: -0.552084px;" :viewBox="viewBox" preserveAspectRatio="xMinYMin">    
            <path v-for="x in mapCode" :d="x[1]" :id="x[0]" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);" fill="#ff9494" stroke="#000000" ></path>
        </svg>
    </div>
    `,

    computed: {

        mapCode: function() {
            if(this.svg == null || this.svg == "") {
                console.log("no svg")
                return [];
            }

            return Vue.prototype.$TCT.getMapForPreview(this.svg);
        },

        viewBox: function() {
            return `${this.dx ?? 0} ${this.dy ?? 0} ${this.x ?? 925} ${this.y ?? 595}`
        }
    }

});