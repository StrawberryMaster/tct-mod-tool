window.defineComponent('toolbar', {

    data() {
        return {
            localAutosaveEnabled: autosaveEnabled,
            showModPresets: false,
            modPresets: [],
            newPresetName: '',
            newPresetDescription: '',
            showAddPreset: false,
            editingPreset: null,
            editPresetName: '',
            editPresetDescription: '',
            isMinimized: false
        };
    },

    created() {
        this.ensureLoadPresets().catch(err => {
                console.warn('Failed to load mod presets on created():', err);
        });
    },

    template: `
    <div class="bg-white shadow-lg rounded-lg mx-4 mb-4 border border-gray-200">
        <!-- Toolbar header with toggle -->
        <div class="flex justify-between items-center p-3 bg-gradient-to-r from-slate-800 to-blue-600 text-white rounded-t-lg">
            <h3 class="font-semibold text-sm">Mod tools</h3>
            <button @click="isMinimized = !isMinimized" 
                    class="text-white hover:text-gray-200 transition-colors"
                    :aria-label="isMinimized ? 'Expand toolbar' : 'Minimize toolbar'">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transition-transform" 
                     :class="isMinimized ? 'rotate-180' : ''" 
                     fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
        </div>
        
        <!-- Collapsible content -->
        <div v-show="!isMinimized" class="p-4">
            <div class="flex flex-wrap gap-2">
                <input type="file" id="file" style="display:none;" @change="fileUploaded($event)"></input>
                <button class="bg-gray-300 p-2 rounded-sm hover:bg-gray-500 text-sm transition-colors" v-on:click="importCode2()">Import Code 2</button>
                <button class="bg-gray-300 p-2 rounded-sm hover:bg-gray-500 text-sm transition-colors" v-on:click="exportCode2()">Export Code 2</button>
                <button class="bg-gray-300 p-2 rounded-sm hover:bg-gray-500 text-sm transition-colors" v-on:click="clipboardCode2()">Copy to Clipboard</button>
                <button class="bg-blue-500 text-white p-2 rounded-sm hover:bg-blue-600 text-sm transition-colors" v-on:click="toggleModPresets()">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                    </svg>
                    Mod presets
                </button>
                <button class="bg-gray-300 p-2 rounded-sm hover:bg-gray-500 text-sm transition-colors" v-on:click="toggleAutosave()">{{localAutosaveEnabled ? "Disable Autosave" : "Enable Autosave"}}</button>
                <a href="https://jetsimon.com/jets-code-one-tool/" class="bg-gray-300 p-2 rounded-sm hover:bg-gray-500 text-sm transition-colors">Code 1 Tool Here</a>
            </div>
        </div>
        
        <!-- Mod presets panel -->
        <div v-if="showModPresets" class="fixed inset-0 z-50">
            <div class="absolute inset-0 bg-black/50" @click="closeModPresets()" aria-hidden="true"></div>
            <div class="absolute inset-0 flex items-center justify-center p-4">
                <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 flex flex-col" role="dialog" aria-modal="true" aria-label="Mod presets">
                    <div class="p-4 border-b flex justify-between items-center">
                        <h2 class="text-lg font-semibold">Mod presets</h2>
                        <button class="text-gray-600 hover:text-black text-xl leading-none" @click="closeModPresets()" aria-label="Close">✕</button>
                    </div>
                    
                    <div class="p-4 flex-1 overflow-y-auto">
                        <!-- Save current mod section -->
                        <div class="mb-6">
                            <div class="flex justify-between items-center mb-2">
                                <h3 class="font-medium">Save current mod</h3>
                                <button @click="showAddPreset = !showAddPreset" 
                                        class="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                                    </svg>
                                    Save current
                                </button>
                            </div>
                            
                            <!-- Add New Preset Form -->
                            <div v-if="showAddPreset" class="mb-4 p-3 bg-gray-50 rounded border">
                                <div class="space-y-2">
                                    <input v-model="newPresetName" 
                                           placeholder="Enter preset name..." 
                                           class="w-full px-3 py-2 border rounded"
                                           @keyup.enter="saveCurrentAsPreset"
                                           maxlength="50">
                                    <textarea v-model="newPresetDescription" 
                                              placeholder="Enter optional description..." 
                                              class="w-full px-3 py-2 border rounded"
                                              rows="2"
                                              maxlength="200"></textarea>
                                    <div class="flex gap-2">
                                        <button @click="saveCurrentAsPreset" 
                                                class="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">
                                            Save Preset
                                        </button>
                                        <button @click="cancelAddPreset" 
                                                class="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600">
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Saved presets list -->
                        <div>
                            <h3 class="font-medium mb-2">Saved presets ({{ modPresets.length }})</h3>
                            
                            <div v-if="modPresets.length === 0" class="text-gray-500 italic text-center py-4">
                                No mod presets saved yet. Import or create a mod, then save it as a preset.
                            </div>
                            
                            <div v-else class="space-y-2">
                                <div v-for="preset in modPresets" :key="preset.id" 
                                     class="border rounded p-3 hover:bg-gray-50">
                                    <div v-if="editingPreset !== preset.id">
                                        <div class="flex justify-between items-start">
                                            <div class="flex-1">
                                                <h4 class="font-medium text-blue-600 hover:text-blue-800 cursor-pointer" 
                                                    @click="loadModPreset(preset)">
                                                    {{ preset.name }}
                                                </h4>
                                                <p v-if="preset.description" class="text-sm text-gray-600 mt-1">
                                                    {{ preset.description }}
                                                </p>
                                                <p class="text-xs text-gray-500 mt-1">
                                                    Created: {{ formatDate(preset.created) }}
                                                </p>
                                            </div>
                                            <div class="flex gap-1 ml-2">
                                                <button @click="startEditPreset(preset)" 
                                                        class="text-gray-400 hover:text-blue-600 text-sm"
                                                        title="Edit preset">
                                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button @click="deleteModPreset(preset.id)" 
                                                        class="text-gray-400 hover:text-red-600 text-sm"
                                                        title="Delete preset">
                                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div v-else class="space-y-2">
                                        <input v-model="editPresetName" 
                                               class="w-full px-2 py-1 border rounded"
                                               @keyup.enter="savePresetEdit"
                                               @keyup.escape="cancelEditPreset"
                                               maxlength="50">
                                        <textarea v-model="editPresetDescription" 
                                                  class="w-full px-2 py-1 border rounded"
                                                  rows="2"
                                                  @keyup.escape="cancelEditPreset"
                                                  maxlength="200"></textarea>
                                        <div class="flex gap-2">
                                            <button @click="savePresetEdit" 
                                                    class="bg-green-500 text-white px-2 py-1 text-sm rounded hover:bg-green-600">
                                                Save
                                            </button>
                                            <button @click="cancelEditPreset" 
                                                    class="bg-gray-500 text-white px-2 py-1 text-sm rounded hover:bg-gray-600">
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,

    methods: {

        toggleAutosave: function (evt) {
            if (!autosaveEnabled) {
                localStorage.setItem("autosaveEnabled", "true");
                if (typeof startAutosave === 'function') startAutosave();
                // request an immediate save
                if (typeof requestAutosaveDebounced === 'function') requestAutosaveDebounced(0);
            } else {
                localStorage.setItem("autosaveEnabled", "false");
                // stop the interval if it exists
                try {
                    if (typeof autosaveInterval !== 'undefined' && autosaveInterval) {
                        clearInterval(autosaveInterval);
                        autosaveInterval = null;
                    }
                } catch (e) {
                    console.warn("Failed to clear autosave interval:", e);
                }
            }

            autosaveEnabled = localStorage.getItem("autosaveEnabled") == "true";
            // keep global mirror in sync
            window.autosaveEnabled = autosaveEnabled;

            this.localAutosaveEnabled = autosaveEnabled;
        },

        fileUploaded: function (evt) {
            const file = evt.target.files[0];

            if (file) {
                var reader = new FileReader();
                reader.readAsText(file, "UTF-8");

                // remove JS-style comments but preserve strings
                // this lets mods such as the original Obamanation display here
                const stripJsonComments = (input) => {
                    let out = '';
                    let i = 0;
                    let inString = false;
                    let stringChar = '';
                    let escape = false;
                    let inSingleLine = false;
                    let inMultiLine = false;

                    while (i < input.length) {
                        const ch = input[i];
                        const chNext = input[i + 1];

                        if (inSingleLine) {
                            if (ch === '\n' || ch === '\r') {
                                inSingleLine = false;
                                out += ch;
                            }
                            // otherwise skip
                            i++;
                            continue;
                        }

                        if (inMultiLine) {
                            if (ch === '*' && chNext === '/') {
                                inMultiLine = false;
                                i += 2;
                                continue;
                            }
                            i++;
                            continue;
                        }

                        if (inString) {
                            out += ch;
                            if (!escape && ch === stringChar) {
                                inString = false;
                                stringChar = '';
                            }
                            escape = (!escape && ch === '\\') ? true : false;
                            i++;
                            continue;
                        }

                        // not in string/comment
                        if (ch === '"' || ch === "'") {
                            inString = true;
                            stringChar = ch;
                            out += ch;
                            i++;
                            continue;
                        }

                        // single-line comment
                        if (ch === '/' && chNext === '/') {
                            inSingleLine = true;
                            i += 2;
                            continue;
                        }

                        // multi-line comment
                        if (ch === '/' && chNext === '*') {
                            inMultiLine = true;
                            i += 2;
                            continue;
                        }

                        out += ch;
                        i++;
                    }

                    return out;
                };

                reader.onload = (evt) => {
                    try {
                        const raw = evt.target.result;
                        // preserve original (with comments) for export
                        Vue.prototype.$TCT_raw = raw;

                        // strip comments before handing to loader
                        const stripped = stripJsonComments(raw);

                        // parse!
                        Vue.prototype.$TCT = loadDataFromFile(stripped);
                        Vue.prototype.$globalData.question = Array.from(Vue.prototype.$TCT.questions.values())[0].pk;
                        Vue.prototype.$globalData.state = Object.values(Vue.prototype.$TCT.states)[0].pk;
                        Vue.prototype.$globalData.issue = Object.values(Vue.prototype.$TCT.issues)[0].pk;
                        Vue.prototype.$globalData.candidate = getListOfCandidates()[0][0];
                        Vue.prototype.$globalData.filename = file.name;
                    } catch (e) {
                        alert("Error parsing uploaded file: " + e)
                    }

                }
                reader.onerror = function (evt) {
                    alert("Error reading uploaded file!")
                }
            }


        },

        importCode2: function () {
            const input = document.getElementById("file");
            input.click();
        },



        exportCode2: function () {
            let f = Vue.prototype.$TCT.exportCode2();
            if (window.TCTAnswerSwapHelper) {
                f = window.TCTAnswerSwapHelper.injectAnswerSwapIntoCode2(f);
            }

            let element = document.createElement('a');
            element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(f));
            element.setAttribute('download', Vue.prototype.$globalData.filename);

            element.style.display = 'none';
            document.body.appendChild(element);

            element.click();

            document.body.removeChild(element);
        },

        clipboardCode2: function () {
            let f = Vue.prototype.$TCT.exportCode2();
            // inject Answer Swapper code
            if (window.TCTAnswerSwapHelper) {
                f = window.TCTAnswerSwapHelper.injectAnswerSwapIntoCode2(f);
            }
            navigator.clipboard.writeText(f);
        },

        // IndexedDB helpers
        openPresetDB() {
            return new Promise((resolve, reject) => {
                try {
                    const req = indexedDB.open('tct_mod_presets_db', 1);
                    req.onupgradeneeded = (e) => {
                        const db = e.target.result;
                        if (!db.objectStoreNames.contains('presets')) {
                            db.createObjectStore('presets', { keyPath: 'id' });
                        }
                    };
                    req.onsuccess = (e) => resolve(e.target.result);
                    req.onerror = (e) => reject(e.target.error || new Error('IndexedDB open error'));
                } catch (err) {
                    reject(err);
                }
            });
        },

        getAllPresetsFromDB() {
            return new Promise(async (resolve, reject) => {
                try {
                    const db = await this.openPresetDB();
                    const tx = db.transaction('presets', 'readonly');
                    const store = tx.objectStore('presets');
                    const req = store.getAll();
                    req.onsuccess = () => resolve(req.result || []);
                    req.onerror = () => reject(req.error || new Error('getAll failed'));
                } catch (err) {
                    reject(err);
                }
            });
        },

        clearPresetStore() {
            return new Promise(async (resolve, reject) => {
                try {
                    const db = await this.openPresetDB();
                    const tx = db.transaction('presets', 'readwrite');
                    const store = tx.objectStore('presets');
                    const req = store.clear();
                    req.onsuccess = () => resolve();
                    req.onerror = () => reject(req.error || new Error('clear failed'));
                } catch (err) {
                    reject(err);
                }
            });
        },

        safeStringify(obj) {
            try {
                const seen = new WeakSet();
                return JSON.stringify(obj, function (key, value) {
                    if (typeof value === 'object' && value !== null) {
                        if (seen.has(value)) return '[Circular]';
                        seen.add(value);
                    }
                    if (typeof value === 'function') return `[Function:${value.name || 'anonymous'}]`;
                    return value;
                });
            } catch (err) {
                try {
                    return String(obj);
                } catch (e) {
                    return '[Unserializable]';
                }
            }
        },

        putPresetToDB(preset) {
            return new Promise(async (resolve, reject) => {
                try {
                    const safePreset = {
                        id: preset.id,
                        name: preset.name,
                        description: preset.description,
                        created: preset.created,
                        modData: null
                    };

                    if (typeof preset.modData === 'string') {
                        safePreset.modData = preset.modData;
                    } else {
                        safePreset.modData = this.safeStringify(preset.modData);
                    }

                    const db = await this.openPresetDB();
                    const tx = db.transaction('presets', 'readwrite');
                    const store = tx.objectStore('presets');
                    const req = store.put(safePreset);
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => reject(req.error || new Error('put failed'));
                } catch (err) {
                    reject(err);
                }
            });
        },

        async saveModPresets() {
            try {
                await this.clearPresetStore();
                for (const p of this.modPresets) {
                    if (!p.id) p.id = Date.now().toString() + Math.random().toString(36).slice(2,8);
                    if (!p.created) p.created = new Date().toISOString();

                    await this.putPresetToDB(p).catch(err => {
                        console.warn('putPresetToDB failed for preset', p.id, err);
                        const fallback = {
                            id: p.id,
                            name: p.name,
                            description: p.description,
                            created: p.created,
                            modData: typeof p.modData === 'string' ? p.modData : '[Unserializable]'
                        };
                        return this.putPresetToDB(fallback).catch(e => {
                            console.error('fallback save also failed', e);
                        });
                    });
                }
            } catch (error) {
                console.warn('Failed to save mod presets:', error);
                alert('Failed to save mod presets. Storage may be full or unavailable.');
            }
        },

        getCurrentModData() {
            // get the current mod data by exporting it
            return Vue.prototype.$TCT.exportCode2();
        },

        async saveCurrentAsPreset() {
            if (!this.newPresetName.trim()) {
                alert('Please enter a preset name');
                return;
            }

            const modData = this.getCurrentModData();
            if (!modData) {
                alert('No mod data to save. Please import or create a mod first.');
                return;
            }

            const newPreset = {
                id: Date.now().toString(),
                name: this.newPresetName.trim(),
                description: this.newPresetDescription.trim(),
                modData: modData,
                created: new Date().toISOString()
            };

            this.modPresets.push(newPreset);
            await this.saveModPresets();
            this.cancelAddPreset();
            alert(`Mod preset "${newPreset.name}" saved successfully!`);
        },

        loadModPreset(preset) {
            if (!preset.modData) {
                alert('Invalid preset data');
                return;
            }

            if (!confirm(`Load mod preset "${preset.name}"? This will replace your current mod.`)) {
                return;
            }

            try {
                // load the preset mod data
                Vue.prototype.$TCT = loadDataFromFile(preset.modData);
                
                // reset the interface to first items
                Vue.prototype.$globalData.question = Array.from(Vue.prototype.$TCT.questions.values())[0]?.pk || null;
                Vue.prototype.$globalData.state = Object.values(Vue.prototype.$TCT.states)[0]?.pk || null;
                Vue.prototype.$globalData.issue = Object.values(Vue.prototype.$TCT.issues)[0]?.pk || null;
                Vue.prototype.$globalData.candidate = getListOfCandidates()[0]?.[0] || null;
                Vue.prototype.$globalData.filename = `${preset.name}.txt`;
                Vue.prototype.$globalData.mode = QUESTION;

                this.closeModPresets();
                alert(`Mod preset "${preset.name}" loaded successfully!`);
            } catch (error) {
                console.error('Error loading mod preset:', error);
                alert('Failed to load mod preset: ' + error.message);
            }
        },

        async deleteModPreset(presetId) {
            const preset = this.modPresets.find(p => p.id === presetId);
            if (!preset) return;

            if (confirm(`Are you sure you want to delete the mod preset "${preset.name}"?`)) {
                this.modPresets = this.modPresets.filter(p => p.id !== presetId);
                try {
                    await this.deletePresetFromDB(presetId);
                } catch (err) {
                    await this.saveModPresets().catch(e => console.warn('fallback save failed', e));
                }
            }
        },

        startEditPreset(preset) {
            this.editingPreset = preset.id;
            this.editPresetName = preset.name;
            this.editPresetDescription = preset.description || '';
        },

        async savePresetEdit() {
            if (!this.editPresetName.trim()) {
                alert('Please enter a preset name');
                return;
            }

            const preset = this.modPresets.find(p => p.id === this.editingPreset);
            if (preset) {
                preset.name = this.editPresetName.trim();
                preset.description = this.editPresetDescription.trim();
                await this.saveModPresets();
            }
            this.cancelEditPreset();
        },

        cancelEditPreset() {
            this.editingPreset = null;
            this.editPresetName = '';
            this.editPresetDescription = '';
        },

        cancelAddPreset() {
            this.showAddPreset = false;
            this.newPresetName = '';
            this.newPresetDescription = '';
        },

        formatDate(isoString) {
            try {
                return new Date(isoString).toLocaleDateString();
            } catch (error) {
                return 'Unknown';
            }
        },

        async toggleModPresets() {
            this.showModPresets = !this.showModPresets;
            if (this.showModPresets) {
                await this.ensureLoadPresets();
            }
        },

        closeModPresets() {
            this.showModPresets = false;
            this.cancelAddPreset();
            this.cancelEditPreset();
        },

        deletePresetFromDB(presetId) {
            return new Promise(async (resolve, reject) => {
                try {
                    const db = await this.openPresetDB();
                    const tx = db.transaction('presets', 'readwrite');
                    const store = tx.objectStore('presets');
                    const req = store.delete(presetId);
                    req.onsuccess = () => resolve();
                    req.onerror = () => reject(req.error || new Error('delete failed'));
                } catch (err) {
                    reject(err);
                }
            });
        },

        async migrateFromLocalStorage() {
            try {
                const saved = localStorage.getItem('tct-mod-presets');
                if (saved) {
                    const arr = JSON.parse(saved);
                    if (Array.isArray(arr) && arr.length > 0) {
                        await this.clearPresetStore();
                        for (const p of arr) {
                            if (!p.id) p.id = Date.now().toString() + Math.random().toString(36).slice(2,8);
                            if (typeof p.modData !== 'string') {
                                try {
                                    p.modData = this.safeStringify ? this.safeStringify(p.modData) : JSON.stringify(p.modData);
                                } catch (e) {
                                    p.modData = String(p.modData || '[Unserializable]');
                                }
                            }
                            await this.putPresetToDB(p).catch(err => {
                                console.warn('migrate: putPresetToDB failed for', p.id, err);
                            });
                        }
                    }
                    localStorage.removeItem('tct-mod-presets');
                }
            } catch (err) {
                console.warn('Failed to migrate presets from localStorage:', err);
            }
        },

        async ensureLoadPresets() {
            try {
                if (typeof this.loadModPresets === 'function') {
                    return await this.loadModPresets();
                }

                await this.migrateFromLocalStorage();
                const presets = await this.getAllPresetsFromDB();
                presets.sort((a, b) => {
                    if (a.created && b.created) return new Date(b.created) - new Date(a.created);
                    return 0;
                });
                this.modPresets = presets;
                return presets;
            } catch (err) {
                console.warn('ensureLoadPresets failed:', err);
                this.modPresets = [];
                return [];
            }
        },
    }
})

window.defineComponent('editor', {
    template: `
    <div class="mx-auto bg-gray-100 p-4">

        <question v-if="currentMode == 'QUESTION'" :pk="parseInt(question)"></question>
        <state v-if="currentMode == 'STATE'" :pk="state"></state>
        <issue v-if="currentMode == 'ISSUE'" :pk="issue"></issue>
        <candidate v-if="currentMode == 'CANDIDATE'" :pk="candidate"></candidate>
        <cyoa v-if="currentMode == 'CYOA'"></cyoa>
        <endings v-if="currentMode == 'ENDINGS'"></endings>
        <mapping v-if="currentMode == 'MAPPING'"></mapping>
        <banner-settings v-if="currentMode == 'BANNER'"></banner-settings>
        <bulk v-if="currentMode == 'BULK'"></bulk>
    </div>
    `,

    computed: {

        currentMode: function () {
            return Vue.prototype.$globalData.mode;
        },

        question: function () {
            return Vue.prototype.$globalData.question;
        },

        state: function () {
            return Vue.prototype.$globalData.state;
        },

        issue: function () {
            return Vue.prototype.$globalData.issue;
        },

        candidate: function () {
            return Vue.prototype.$globalData.candidate;
        },
    }
})