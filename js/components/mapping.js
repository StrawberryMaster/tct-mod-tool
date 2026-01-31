registerComponent('mapping', {

    data() {
        return {
            mapSvg: this.$TCT.jet_data.mapping_data?.mapSvg ?? "",
            x: this.$TCT.jet_data.mapping_data?.x ?? 925,
            y: this.$TCT.jet_data.mapping_data?.y ?? 925,
            dx: this.$TCT.jet_data.mapping_data?.dx ?? 0,
            dy: this.$TCT.jet_data.mapping_data?.dy ?? 0,
            isDragging: false,
            dragStartX: 0,
            dragStartY: 0,
            dragStartDx: 0,
            dragStartDy: 0,
            zoomLevel: 1,
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
                        <p class="text-sm text-blue-600 font-medium mt-2">
                            💡 The current zoom level ({{ Math.round(zoomLevel * 100) }}%) and pan position will be applied 
                            to the final map dimensions in your mod.
                        </p>
                    </div>
                </div>
            </details>

            <!-- Map preview section -->
            <details v-if="mapSvg" open class="bg-gray-50 rounded-sm border">
                <summary class="px-4 py-2 font-semibold cursor-pointer select-none">Map preview & dimensions</summary>
                <div class="p-4 space-y-4">
                    <div class="border rounded-sm bg-white p-2 select-none">
                        <div class="mb-2 flex items-center gap-3">
                            <span class="text-sm font-medium text-gray-700">Zoom:</span>
                            <button @click="zoomOut" class="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-sm">−</button>
                            <span class="text-sm font-mono">{{ Math.round(zoomLevel * 100) }}%</span>
                            <button @click="zoomIn" class="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-sm">+</button>
                            <button @click="resetZoom" class="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-xs ml-2">Reset</button>
                        </div>
                        <div 
                            @mousedown="startDrag"
                            @mousemove="onDrag"
                            @mouseup="endDrag"
                            @mouseleave="endDrag"
                            @touchstart="startDrag"
                            @touchmove="onDrag"
                            @touchend="endDrag"
                            @wheel="onWheel"
                            style="cursor: grab; touch-action: none;"
                            :style="{ cursor: isDragging ? 'grabbing' : 'grab' }"
                        >
                            <map-preview :svg="mapSvg" :dx="effectiveDx" :dy="effectiveDy" :x="effectiveX" :y="effectiveY"></map-preview>
                        </div>
                        <p class="text-xs text-gray-500 mt-2 italic">💡 Tip: Drag to pan, scroll to zoom, or use the zoom buttons</p>
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

        loadMapFromSVG: function () {

            if (this.$TCT.jet_data.mapping_data == null) {
                this.$TCT.jet_data.mapping_data = {}
            }

            if (this.mapSvg == null) {
                alert("There was an issue getting the SVG from the input field. Go out of this tab and go back in and try again.")
                return;
            }

            this.$TCT.jet_data.mapping_data.mapSvg = this.mapSvg;

            // apply zoom to the actual dimensions that will be used
            this.$TCT.jet_data.mapping_data.x = this.effectiveX;
            this.$TCT.jet_data.mapping_data.y = this.effectiveY;
            this.$TCT.jet_data.mapping_data.dx = this.dx;
            this.$TCT.jet_data.mapping_data.dy = this.dy;

            this.$TCT.loadMap();
            this.$globalData.state = Object.keys(this.$TCT.states)[0];
            alert("Custom map SVG loaded in. If there were any errors they are in the console. Check your states dropdown to confirm it is working.")
            this.$globalData.mode = STATE;
            this.$globalData.dataVersion++;

            // reset zoom after applying to avoid confusion
            this.zoomLevel = 1;
        },

        toggleEnabled: function (evt) {
            this.$TCT.jet_data.mapping_enabled = !this.$TCT.jet_data.mapping_enabled;

            this.$globalData.dataVersion++;
        },

        onInput: function (evt) {
            this.$TCT.jet_data.mapping_data[evt.target.name] = evt.target.value;
        },

        startDrag: function (evt) {
            this.isDragging = true;

            // get the starting position
            if (evt.type === 'touchstart') {
                evt.preventDefault();
                this.dragStartX = evt.touches[0].clientX;
                this.dragStartY = evt.touches[0].clientY;
            } else {
                this.dragStartX = evt.clientX;
                this.dragStartY = evt.clientY;
            }

            // store the initial offset values
            this.dragStartDx = this.dx;
            this.dragStartDy = this.dy;
        },

        onDrag: function (evt) {
            if (!this.isDragging) return;

            let currentX, currentY;

            if (evt.type === 'touchmove') {
                evt.preventDefault();
                currentX = evt.touches[0].clientX;
                currentY = evt.touches[0].clientY;
            } else {
                currentX = evt.clientX;
                currentY = evt.clientY;
            }

            // calculate the distance moved
            const deltaX = currentX - this.dragStartX;
            const deltaY = currentY - this.dragStartY;

            // update offsets (invert deltaX/deltaY because dragging right means moving the viewBox left)
            this.dx = this.dragStartDx - deltaX;
            this.dy = this.dragStartDy - deltaY;
        },

        endDrag: function () {
            if (this.isDragging) {
                this.isDragging = false;

                // save the new offset values to the global data
                this.$TCT.jet_data.mapping_data.dx = this.dx;
                this.$TCT.jet_data.mapping_data.dy = this.dy;
            }
        },

        onWheel: function (evt) {
            evt.preventDefault();

            // zoom in or out based on wheel direction
            const delta = evt.deltaY > 0 ? -0.1 : 0.1;
            this.zoomLevel = Math.max(0.1, Math.min(5, this.zoomLevel + delta));
        },

        zoomIn: function () {
            this.zoomLevel = Math.min(5, this.zoomLevel + 0.25);
        },

        zoomOut: function () {
            this.zoomLevel = Math.max(0.1, this.zoomLevel - 0.25);
        },

        resetZoom: function () {
            this.zoomLevel = 1;
        },

    },

    computed: {

        effectiveX: function () {
            return this.x / this.zoomLevel;
        },

        effectiveY: function () {
            return this.y / this.zoomLevel;
        },

        effectiveDx: function () {
            return this.dx;
        },

        effectiveDy: function () {
            return this.dy;
        },

        electionPk: function () {
            return this.$TCT.jet_data.mapping_data.electionPk;
        },

        enabled: function () {
            if (this.$TCT.jet_data.mapping_enabled == null) {
                this.$TCT.jet_data.mapping_enabled = false;
            }

            if (this.$TCT.jet_data.mapping_data == null) {
                this.$TCT.jet_data.mapping_data = {};
            }

            this.$globalData.dataVersion; // register dependency

            return this.$TCT.jet_data.mapping_enabled;
        }
    }
});

registerComponent('map-preview', {

    props: ['svg', 'x', 'y', 'dx', 'dy'],

    template: `
    <div id="map_container">
        <svg height="400.125" version="1.1" width="722.156" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="background-color:#BFE6FF; overflow: hidden; position: relative; left: -0.895844px; top: -0.552084px;" :viewBox="viewBox" preserveAspectRatio="xMinYMin">    
            <path v-for="x in mapCode" :d="x[1]" :id="x[0]" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);" fill="#ff9494" stroke="#000000" ></path>
        </svg>
    </div>
    `,

    computed: {

        mapCode: function () {
            if (this.svg == null || this.svg == "") {
                console.log("no svg")
                return [];
            }

            return this.$TCT.getMapForPreview(this.svg);
        },

        viewBox: function () {
            return `${this.dx ?? 0} ${this.dy ?? 0} ${this.x ?? 925} ${this.y ?? 595}`
        }
    }

});
