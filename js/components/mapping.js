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
                <button v-if="!enabled" class="bg-green-500 text-white px-3 py-2 rounded-sm hover:bg-green-600" @click="toggleEnabled()">
                    Enable custom map
                </button>
                <button v-else class="bg-red-500 text-white px-3 py-2 rounded-sm hover:bg-red-600" @click="toggleEnabled()">
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
                        <div v-if="viewportReport && viewportReport.outside.length > 0" class="mb-3 rounded-sm border border-red-300 bg-red-50 p-3">
                            <p class="text-sm font-semibold text-red-800">
                                {{ viewportReport.outside.length }} of {{ viewportReport.total }} states are outside the current view and will be cut off in the game viewer{{ viewportReport.outside.length <= 10 ? ':' : '.' }}
                                <span v-if="viewportReport.outside.length <= 10">{{ viewportReport.outside.join(', ') }}</span>
                            </p>
                            <p class="text-xs text-red-700 mt-1">
                                Click "Fit map to view" below (then "Load map from SVG") so every state is inside the exported dimensions.
                            </p>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <button class="bg-green-500 text-white px-4 py-2 rounded-sm hover:bg-green-600 font-medium"
                                     @click="loadMapFromSVG()">
                                 Load map from SVG
                             </button>
                            <button class="bg-blue-500 text-white px-4 py-2 rounded-sm hover:bg-blue-600 font-medium"
                                     @click="fitMapToView()">
                                 Fit map to view
                             </button>
                        </div>
                        <p class="text-sm text-gray-600 italic mt-2">
                            <strong>WARNING:</strong> If you click this, all your states and anything referencing your states
                            will be deleted from your code 2 and replaced from what the tool gets from your SVG.
                            You should only be doing this once when starting to make the mod.
                        </p>
                        <p class="text-sm text-blue-600 font-medium mt-2">
                            💡 The current zoom level ({{ Math.round(zoomLevel * 100) }}%) and pan position will be applied
                            to the final map dimensions in your mod.
                        </p>

                        <div v-if="importWarnings.length > 0" class="mt-3 rounded-sm border border-amber-300 bg-amber-50 p-3">
                            <p class="text-sm font-semibold text-amber-800">Import warnings ({{ importWarnings.length }})</p>
                            <ul class="mt-2 list-disc pl-5 text-xs text-amber-900 max-h-40 overflow-auto">
                                <li v-for="(warning, idx) in importWarnings" :key="idx">{{ warning }}</li>
                            </ul>
                        </div>
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
                            style="cursor: grab; touch-action: none; overscroll-behavior: contain;"
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
            const warnings = this.importWarnings;
            if (warnings.length > 0) {
                console.warn(`Map import had ${warnings.length} warning(s):`);
                for (let i = 0; i < warnings.length; i++) {
                    console.warn(warnings[i]);
                }
            }

            alert(`Custom map SVG loaded in with ${warnings.length} warning(s). Check the warning list and console for skipped regions.`)
            this.$globalData.mode = STATE;
            this.$globalData.dataVersion++;

            // reset zoom after applying to avoid confusion
            this.zoomLevel = 1;
        },

        toggleEnabled: function (evt) {
            this.$TCT.jet_data.mapping_enabled = !this.$TCT.jet_data.mapping_enabled;

            this.$globalData.dataVersion++;
        },

        fitMapToView: function () {
            if (!this.mapSvg) {
                alert("Paste your SVG code first, then click Fit map to view.");
                return;
            }

            const bbox = this.$TCT.getMapBbox(this.mapSvg);
            if (!bbox) {
                alert("Could not compute the map bounds. Make sure every shape has an id (or data-id) and valid geometry.");
                return;
            }

            const padX = Math.max(bbox.width * 0.05, 1);
            const padY = Math.max(bbox.height * 0.05, 1);
            this.zoomLevel = 1;
            this.dx = Math.floor((bbox.minX - padX) * 100) / 100;
            this.dy = Math.floor((bbox.minY - padY) * 100) / 100;
            this.x = Math.ceil((bbox.width + padX * 2) * 100) / 100;
            this.y = Math.ceil((bbox.height + padY * 2) * 100) / 100;

            if (this.$TCT.jet_data.mapping_data == null) {
                this.$TCT.jet_data.mapping_data = {};
            }
            this.$TCT.jet_data.mapping_data.dx = this.dx;
            this.$TCT.jet_data.mapping_data.dy = this.dy;
            this.$TCT.jet_data.mapping_data.x = this.x;
            this.$TCT.jet_data.mapping_data.y = this.y;

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

        importWarnings: function () {
            return this.$TCT.jet_data.mapping_data?.lastImportWarnings ?? [];
        },

        viewportReport: function () {
            try {
                if (!this.mapSvg) return null;
                return this.$TCT.getMapOutOfView(this.mapSvg, this.effectiveDx, this.effectiveDy, this.effectiveX, this.effectiveY);
            } catch (e) {
                return null;
            }
        },

        enabled: function () {
            if (this.$TCT.jet_data.mapping_enabled == null) {
                this.$TCT.jet_data.mapping_enabled = false;
            }

            if (this.$TCT.jet_data.mapping_data == null) {
                this.$TCT.jet_data.mapping_data = {};
            }

            return this.$TCT.jet_data.mapping_enabled;
        }
    }
});

registerComponent('map-preview', {

    props: ['svg', 'x', 'y', 'dx', 'dy'],

    template: `
    <div id="map_container" class="w-full" style="background-color: var(--map-bg); overflow: hidden; position: relative;">
        <div ref="host" style="width: 100%; height: 400px;"></div>
    </div>
    `,

    data() {
        return { entries: [] };
    },

    watch: {
        svg: { immediate: true, handler() { this.rebuild(); } },
        x() { this.updateBox(); },
        y() { this.updateBox(); },
        dx() { this.updateBox(); },
        dy() { this.updateBox(); }
    },

    mounted() {
        this.mountPreview();
        this.rebuild();
        this.updateBox();
    },

    beforeUnmount() {
        this.view?.destroy();
        this.view = null;
    },

    methods: {
        mountPreview() {
            if (this.view || !this.$refs.host) return;
            const view = new window.TCTMapView.MapView(null, {
                maxZoom: 1,
                minZoom: 1,
                buildBudgetMs: 12
            });
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            svg.setAttribute('data-map-preview', 'true');
            svg.style.width = '100%';
            svg.style.height = '100%';
            svg.style.display = 'block';
            // the preview is not interactive; gestures belong to the parent's
            // drag-to-pan handler, so let them through untouched
            svg.style.pointerEvents = 'none';
            view.setSvg(svg);
            view.providers = {
                fill: () => 'var(--map-fill)',
                stroke: () => 'var(--map-stroke)',
                width: () => 1
            };
            this.$refs.host.appendChild(svg);
            this.view = view;
        },

        rebuild() {
            this.mountPreview();
            if (!this.view) return;
            const entries = (this.svg == null || this.svg === '')
                ? []
                : (this.$TCT.getMapForPreview(this.svg) || []);
            this.items = entries.map((entry, index) => ({ pk: index }));
            this.entries = entries;
            this.view.setData(this.items, (item) => entries[item.pk]);
            this.updateBox();
        },

        updateBox() {
            if (!this.view) return;
            const w = Number(this.x);
            const h = Number(this.y);
            const boxX = Number(this.dx) || 0;
            const boxY = Number(this.dy) || 0;
            this.view.setBaseBox(boxX, boxY, w > 0 ? w : 925, h > 0 ? h : 595);
            this.view.setViewport(boxX, boxY, 1);
        }
    }

});
