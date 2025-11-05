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
    <div class="mx-auto bg-white rounded-lg shadow-sm p-4">
        <div class="flex items-center justify-between mb-4">
            <h1 class="font-bold text-xl">Mapping settings</h1>
            <div class="space-x-2">
                <button v-if="!enabled" class="bg-green-500 text-white px-3 py-2 rounded-sm hover:bg-green-600" v-on:click="toggleEnabled()">
                    Enable custom map
                </button>
                <button v-else class="bg-red-500 text-white px-3 py-2 rounded-sm hover:bg-red-600" v-on:click="toggleEnabled()">
                    Disable custom map
                </button>
            </div>
        </div>

        <div v-if="enabled" class="space-y-6">
            <!-- Map SVG -->
            <details open class="bg-gray-50 rounded-sm border">
                <summary class="px-4 py-2 font-semibold cursor-pointer select-none">Map SVG configuration</summary>
                <div class="p-4 space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1" for="mapSvg">Map SVG:</label>
                        <textarea v-model="mapSvg" name="mapSvg" rows="4" 
                                  class="w-full border border-gray-300 rounded-sm px-2 py-1 font-mono text-sm"
                                  placeholder="Paste your SVG code here..."></textarea>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1" for="electionPk">Election PK:</label>
                        <input @input="onInput($event)" :value="electionPk" name="electionPk" type="number"
                               class="w-full border border-gray-300 rounded-sm px-2 py-1">
                        <p class="text-sm text-gray-600 italic mt-1">
                            NOTE: Set this to the pk of your election so all states have this filled out automatically. 
                            Otherwise you will need to fill it in for each state yourself.
                        </p>
                    </div>

                    <div class="border-t pt-4">
                        <button class="bg-green-500 text-white px-4 py-2 rounded-sm hover:bg-green-600 font-medium" 
                                v-on:click="loadMapFromSVG()">
                            Load map from SVG
                        </button>
                        <p class="text-sm text-gray-600 italic mt-2">
                            <strong>WARNING:</strong> If you click this, all your states and anything referencing your states 
                            will be deleted from your code 2 and replaced from what the tool gets from your SVG. 
                            You should only be doing this once when starting to make the mod.
                        </p>
                    </div>
                </div>
            </details>

            <!-- Map preview section -->
            <details v-if="mapSvg" open class="bg-gray-50 rounded-sm border">
                <summary class="px-4 py-2 font-semibold cursor-pointer select-none">Map preview & dimensions</summary>
                <div class="p-4 space-y-4">
                    <div class="border rounded-sm bg-white p-2">
                        <map-preview :svg="mapSvg" :dx="dx" :dy="dy" :x="x" :y="y"></map-preview>
                    </div>

                    <div class="bg-blue-50 border border-blue-200 rounded-sm p-3">
                        <p class="text-sm text-blue-800 mb-3">
                            Change the x and y values to adjust how the map appears in the preview if it isn't fitting correctly.
                        </p>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Width (x):</label>
                                <input v-model.number="x" type="number" 
                                       class="w-full border border-gray-300 rounded-sm px-2 py-1">
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Height (y):</label>
                                <input v-model.number="y" type="number" 
                                       class="w-full border border-gray-300 rounded-sm px-2 py-1">
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">X Offset (dx):</label>
                                <input v-model.number="dx" type="number" 
                                       class="w-full border border-gray-300 rounded-sm px-2 py-1">
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Y Offset (dy):</label>
                                <input v-model.number="dy" type="number" 
                                       class="w-full border border-gray-300 rounded-sm px-2 py-1">
                            </div>
                        </div>
                    </div>

                    <p class="text-sm text-gray-600 italic">
                        NOTE: Each time you exit this tab your preview will disappear if you don't press "Load map from SVG", 
                        so make sure to do all your mapping in one session.
                    </p>
                </div>
            </details>
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