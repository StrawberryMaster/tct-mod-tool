window.defineComponent('banner-settings', {
    data() {
        return {
            previewQuestion: 1,
            previewTotal: 30,
            previewTick: 0,
            canImageLoading: false,
            canImageFailed: false,
            runImageLoading: false,
            runImageFailed: false,
            // NEW: local reactive form fields
            formCanName: '',
            formCanImage: '',
            formRunName: '',
            formRunImage: ''
        };
    },

    template: `
    <div class="mx-auto bg-white rounded-lg shadow p-4">
        <div class="flex items-center justify-between mb-4">
            <h1 class="font-bold text-xl">Banner Settings</h1>
            <div class="space-x-2">
                <button v-if="!enabled"
                        class="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600"
                        @click="toggleEnabled">
                    Enable
                </button>
                <button v-else
                        class="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600"
                        @click="toggleEnabled">
                    Disable
                </button>
            </div>
        </div>

        <div v-if="enabled" class="space-y-6">
            <details open class="bg-gray-50 rounded border">
                <summary class="px-3 py-2 font-medium cursor-pointer">Configuration</summary>
                <div class="p-4 space-y-6">
                    <div class="grid gap-6 md:grid-cols-2">
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium mb-1" for="canName">Candidate Last Name</label>
                                <input id="canName" v-model="formCanName" type="text"
                                       class="w-full border rounded p-2 focus:outline-none focus:ring focus:border-blue-400"
                                       placeholder="e.g. Johnson">
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-1" for="canImage">Candidate Image URL</label>
                                <input id="canImage" v-model="formCanImage" type="text"
                                       class="w-full border rounded p-2 focus:outline-none focus:ring focus:border-blue-400"
                                       placeholder="https://...">
                                <p class="text-xs text-gray-500 mt-1">Recommended size: multiple of 210x240.</p>
                            </div>
                            <div class="relative border rounded p-2 bg-white flex items-center justify-center h-48 overflow-hidden">
                                <template v-if="formCanImage">
                                    <img
                                        v-if="!canImageFailed"
                                        :key="canImageKey"
                                        :src="previewCanImageSrc"
                                        class="object-cover h-full w-auto transition-opacity duration-200"
                                        :class="canImageLoading ? 'opacity-0' : 'opacity-100'"
                                        :alt="'Candidate '+formCanName"
                                        @load="onImgLoad('can')"
                                        @error="onImgError('can')"
                                    />
                                    <div v-else class="w-full h-full flex items-center justify-center text-gray-400 text-sm bg-gray-100">
                                        Failed to load Candidate Image
                                    </div>
                                    <div v-if="canImageLoading" class="absolute inset-0 flex items-center justify-center text-gray-500 text-sm bg-white/60">
                                        Loading...
                                    </div>
                                </template>
                                <div v-else class="w-full h-full flex items-center justify-center text-gray-400 text-sm bg-gray-100">
                                    No Candidate Image
                                </div>
                            </div>
                        </div>

                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium mb-1" for="runName">Running Mate Last Name</label>
                                <input id="runName" v-model="formRunName" type="text"
                                       class="w-full border rounded p-2 focus:outline-none focus:ring focus:border-blue-400"
                                       placeholder="e.g. Smith">
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-1" for="runImage">Running Mate Image URL</label>
                                <input id="runImage" v-model="formRunImage" type="text"
                                       class="w-full border rounded p-2 focus:outline-none focus:ring focus:border-blue-400"
                                       placeholder="https://...">
                                <p class="text-xs text-gray-500 mt-1">Recommended size: multiple of 210x240.</p>
                            </div>
                            <div class="relative border rounded p-2 bg-white flex items-center justify-center h-48 overflow-hidden">
                                <template v-if="formRunImage">
                                    <img
                                        v-if="!runImageFailed"
                                        :key="runImageKey"
                                        :src="previewRunImageSrc"
                                        class="object-cover h-full w-auto transition-opacity duration-200"
                                        :class="runImageLoading ? 'opacity-0' : 'opacity-100'"
                                        :alt="'Running Mate '+formRunName"
                                        @load="onImgLoad('run')"
                                        @error="onImgError('run')"
                                    />
                                    <div v-else class="w-full h-full flex items-center justify-center text-gray-400 text-sm bg-gray-100">
                                        Failed to load Running Mate Image
                                    </div>
                                    <div v-if="runImageLoading" class="absolute inset-0 flex items-center justify-center text-gray-500 text-sm bg-white/60">
                                        Loading...
                                    </div>
                                </template>
                                <div v-else class="w-full h-full flex items-center justify-center text-gray-400 text-sm bg-gray-100">
                                    No Running Mate Image
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="border-t pt-4">
                        <h2 class="font-semibold mb-2 text-sm uppercase tracking-wide text-gray-600">Preview Controls</h2>
                        <div class="flex flex-wrap gap-4 items-center">
                            <label class="text-sm flex items-center gap-2">
                                Question #
                                <input type="number" min="1" v-model.number="previewQuestion"
                                       class="w-20 border rounded p-1 focus:outline-none focus:ring focus:border-blue-400">
                            </label>
                            <label class="text-sm flex items-center gap-2">
                                Total
                                <input type="number" min="1" v-model.number="previewTotal"
                                       class="w-20 border rounded p-1 focus:outline-none focus:ring focus:border-blue-400">
                            </label>
                            <button type="button"
                                    class="ml-auto bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600"
                                    @click="refreshPreview">
                                Refresh Preview
                            </button>
                        </div>
                    </div>
                </div>
            </details>

            <details open class="bg-gray-50 rounded border">
                <summary class="px-3 py-2 font-medium cursor-pointer">Live Preview</summary>
                <div class="p-4">
                    <div class="flex items-stretch justify-center gap-4 bg-orange-50 p-4 rounded border relative overflow-hidden">

                        <div class="w-40 h-48 bg-gray-200 flex items-center justify-center overflow-hidden rounded shadow-inner relative">
                            <template v-if="formCanImage">
                                <img v-if="!canImageFailed"
                                     :key="'live-'+canImageKey"
                                     :src="previewCanImageSrc"
                                     class="object-cover h-full"
                                     :alt="'Candidate '+formCanName"
                                     @load="onImgLoad('can')"
                                     @error="onImgError('can')">
                                <span v-else class="text-gray-500 text-xs">Candidate Image Failed</span>
                            </template>
                            <span v-else class="text-gray-500 text-xs">Candidate Image</span>
                        </div>

                        <div class="flex flex-col items-center justify-center px-6">
                            <div class="text-sm font-semibold mb-2">Question {{ safePreviewQuestion }} of {{ safePreviewTotal }}</div>
                            <div class="border-4 border-yellow-400 rounded-sm px-6 py-4 bg-[#75948F] text-white font-bold text-center leading-tight">
                                <div class="text-3xl tracking-wide">{{ formCanName || 'Candidate' }}</div>
                                <div v-if="formRunName" class="text-xl font-medium mt-1 opacity-90">{{ formRunName }}</div>
                            </div>
                        </div>

                        <div class="w-40 h-48 bg-gray-200 flex items-center justify-center overflow-hidden rounded shadow-inner relative">
                            <template v-if="formRunImage">
                                <img v-if="!runImageFailed"
                                     :key="'live-'+runImageKey"
                                     :src="previewRunImageSrc"
                                     class="object-cover h-full"
                                     :alt="'Running Mate '+formRunName"
                                     @load="onImgLoad('run')"
                                     @error="onImgError('run')">
                                <span v-else class="text-gray-500 text-xs">Running Mate Image Failed</span>
                            </template>
                            <span v-else class="text-gray-500 text-xs">Running Mate Image</span>
                        </div>
                    </div>
                    <p class="text-xs text-gray-500 mt-3">This is a visual approximation intended for layout reference.</p>
                </div>
            </details>

        </div>
    </div>
    `,

    methods: {
        toggleEnabled() {
            Vue.prototype.$TCT.jet_data.banner_enabled = !Vue.prototype.$TCT.jet_data.banner_enabled;
            this.pingGlobal();
        },
        pingGlobal() {
            const temp = Vue.prototype.$globalData.filename;
            Vue.prototype.$globalData.filename = "";
            Vue.prototype.$globalData.filename = temp;
        },
        // ensure reactive keys exist on the banner_data object
        ensureReactiveBannerData() {
            if (Vue.prototype.$TCT.jet_data.banner_data == null) {
                Vue.prototype.$TCT.jet_data.banner_data = {};
            }
            const obj = Vue.prototype.$TCT.jet_data.banner_data;
            if (!Object.prototype.hasOwnProperty.call(obj, 'canName')) obj.canName = '';
            if (!Object.prototype.hasOwnProperty.call(obj, 'canImage')) obj.canImage = '';
            if (!Object.prototype.hasOwnProperty.call(obj, 'runName')) obj.runName = '';
            if (!Object.prototype.hasOwnProperty.call(obj, 'runImage')) obj.runImage = '';
            // keep globals stable; don't reset local values here
        },
        refreshPreview() {
            this.previewTick++;
            this.resetImageState('can');
            this.resetImageState('run');
        },
        onImgLoad(which) {
            if (which === 'can') this.canImageLoading = false;
            if (which === 'run') this.runImageLoading = false;
        },
        onImgError(which) {
            if (which === 'can') { this.canImageLoading = false; this.canImageFailed = true; }
            if (which === 'run') { this.runImageLoading = false; this.runImageFailed = true; }
        },
        resetImageState(which) {
            if (which === 'can') {
                this.canImageFailed = false;
                this.canImageLoading = !!this.formCanImage;
            }
            if (which === 'run') {
                this.runImageFailed = false;
                this.runImageLoading = !!this.formRunImage;
            }
        }
    },

    computed: {
        enabled() {
            if (Vue.prototype.$TCT.jet_data.banner_enabled == null) {
                Vue.prototype.$TCT.jet_data.banner_enabled = false;
            }
            if (Vue.prototype.$TCT.jet_data.banner_data == null) {
                Vue.prototype.$TCT.jet_data.banner_data = {};
            }
            this.ensureReactiveBannerData();
            // sync local fields when enabling
            if (Vue.prototype.$TCT.jet_data.banner_enabled) {
                const d = Vue.prototype.$TCT.jet_data.banner_data;
                this.formCanName = d.canName || '';
                this.formCanImage = d.canImage || '';
                this.formRunName = d.runName || '';
                this.formRunImage = d.runImage || '';
                this.resetImageState('can');
                this.resetImageState('run');
            }
            this.pingGlobal();
            return Vue.prototype.$TCT.jet_data.banner_enabled;
        },

        // cache-busted preview src + keys to force re-render (use local fields)
        canImageKey() { return (this.formCanImage || '') + ':' + this.previewTick; },
        runImageKey() { return (this.formRunImage || '') + ':' + this.previewTick; },
        previewCanImageSrc() {
            if (!this.formCanImage) return '';
            const sep = this.formCanImage.includes('?') ? '&' : '?';
            return this.formCanImage + sep + '_p=' + this.previewTick;
        },
        previewRunImageSrc() {
            if (!this.formRunImage) return '';
            const sep = this.formRunImage.includes('?') ? '&' : '?';
            return this.formRunImage + sep + '_p=' + this.previewTick;
        },

        safePreviewQuestion() {
            return Math.max(1, this.previewQuestion || 1);
        },
        safePreviewTotal() {
            return Math.max(this.safePreviewQuestion, this.previewTotal || this.safePreviewQuestion);
        }
    },

    watch: {
        // push local changes to global and refresh preview
        formCanName(val) {
            this.ensureReactiveBannerData();
            Vue.prototype.$TCT.jet_data.banner_data.canName = val;
            this.pingGlobal();
        },
        formRunName(val) {
            this.ensureReactiveBannerData();
            Vue.prototype.$TCT.jet_data.banner_data.runName = val;
            this.pingGlobal();
        },
        formCanImage(val) {
            this.ensureReactiveBannerData();
            Vue.prototype.$TCT.jet_data.banner_data.canImage = val;
            this.resetImageState('can');
            this.previewTick++;
            this.pingGlobal();
        },
        formRunImage(val) {
            this.ensureReactiveBannerData();
            Vue.prototype.$TCT.jet_data.banner_data.runImage = val;
            this.resetImageState('run');
            this.previewTick++;
            this.pingGlobal();
        }
    },

    mounted() {
        // initialize from global into local, then set image states
        this.ensureReactiveBannerData();
        const d = Vue.prototype.$TCT.jet_data.banner_data;
        this.formCanName = d.canName || '';
        this.formCanImage = d.canImage || '';
        this.formRunName = d.runName || '';
        this.formRunImage = d.runImage || '';
        this.resetImageState('can');
        this.resetImageState('run');
    },

    created() {
        this.ensureReactiveBannerData();
    }
})