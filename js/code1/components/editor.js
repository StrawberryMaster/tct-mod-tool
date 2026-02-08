registerCode1Component('shadow-wrapper', {
    template: `
    <div ref="shadowHost">
        <Teleport v-if="teleportTarget" :to="teleportTarget">
            <slot></slot>
        </Teleport>
    </div>
    `,
    data() {
        return { teleportTarget: null };
    },
    mounted() {
        const shadow = this.$refs.shadowHost.attachShadow({ mode: 'open' });
        
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'js/code1/preview.css';
        shadow.appendChild(link);
        
        const content = document.createElement('div');
        content.id = 'shadow-root-inner';
        shadow.appendChild(content);
        
        this.teleportTarget = content;
    }
});

registerCode1Component('code1-editor', {
    template: `
    <div class="flex flex-col h-full bg-gray-100 p-4 overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
            <h1 class="text-2xl font-bold">Code 1 Maker</h1>
            <div class="flex gap-2 items-center">
                <div class="mr-4 flex items-center gap-2">
                    <label class="text-sm font-semibold text-gray-600">Template ({{$TCT1.templates.length}}):</label>
                    <select @change="loadTemplate" class="p-1 border rounded text-sm bg-white">
                        <option value="">-- Select Scenario --</option>
                        <option v-for="t in $TCT1.templates" :key="t.pk" :value="t.pk">
                            {{t.fields.display_year || t.fields.year}}
                        </option>
                    </select>
                </div>
                <button @click="copyCode" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">Copy to Clipboard</button>
                <button @click="exportCode" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">Export Code 1</button>
                <button @click="openImport" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition">Import Code 1</button>
                <button @click="toggleWide" class="ml-4 px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium">
                    {{ wideMode ? 'Split View' : 'Wide Preview' }}
                </button>
            </div>
        </div>

        <div :class="wideMode ? 'flex flex-col gap-6' : 'grid grid-cols-1 xl:grid-cols-2 gap-6'">
            <!-- Left Side: Controls -->
            <div class="space-y-6">
                <div class="bg-white p-4 rounded-lg shadow">
                    <h2 class="text-xl font-semibold mb-3">Settings</h2>
                    <div class="space-y-4">
                        <mode-picker></mode-picker>
                        <hr>
                        <div v-if="$globalData1.mode === 'ELECTION'">
                            <election-editor></election-editor>
                        </div>
                        <div v-if="$globalData1.mode === 'CANDIDATE'">
                            <candidate-editor></candidate-editor>
                        </div>
                        <div v-if="$globalData1.mode === 'RUNNING_MATE'">
                            <running-mate-editor></running-mate-editor>
                        </div>
                        <div v-if="$globalData1.mode === 'THEME'">
                            <theme-editor></theme-editor>
                        </div>
                        <div v-if="$globalData1.mode === 'SETTINGS'">
                            <settings-editor></settings-editor>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right Side: Preview -->
            <div :class="wideMode ? '' : 'sticky top-4'">
                <div class="bg-white p-4 rounded-lg shadow">
                    <h2 class="text-xl font-semibold mb-3">Live Preview</h2>
                    <div class="preview-container overflow-x-auto">
                        <shadow-wrapper>
                            <tct-preview :wide="wideMode"></tct-preview>
                        </shadow-wrapper>
                    </div>
                </div>
            </div>
        </div>

        <!-- Import Modal -->
        <div v-if="showImportModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl">
                <h2 class="text-xl font-bold mb-4">Import Code 1</h2>
                <textarea v-model="importText" class="w-full h-64 p-2 border rounded mb-4 font-mono text-sm" placeholder="Paste your Code 1 here..."></textarea>
                <div class="flex justify-end gap-2">
                    <button @click="showImportModal = false" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancel</button>
                    <button @click="doImport" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Import</button>
                </div>
            </div>
        </div>
    </div>
    `,
    data() {
        return {
            showImportModal: false,
            importText: '',
            wideMode: false
        };
    },
    methods: {
        toggleWide() {
            this.wideMode = !this.wideMode;
        },
        async copyCode() {
            const code = this.$TCT1.exportCode1();
            try {
                await navigator.clipboard.writeText(code);
                alert("Code copied to clipboard!");
            } catch (err) {
                console.error("Failed to copy:", err);
                alert("Failed to copy naturally, checking console...");
            }
        },
        async loadTemplate(e) {
            const pk = e.target.value;
            if (!pk) return;
            
            if (confirm("This will overwrite your current work. Continue?")) {
                const success = await this.$TCT1.applyTemplate(pk);
                if (success) {
                    this.$globalData1.dataVersion++;
                    this.$globalData1.selectedCandidate = 0;
                    this.$globalData1.selectedElection = 0;
                    alert("Template loaded!");
                }
            }
        },
        exportCode() {
            const code = this.$TCT1.exportCode1();
            const blob = new Blob([code], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'code1.txt';
            a.click();
            URL.revokeObjectURL(url);
        },
        openImport() {
            this.showImportModal = true;
            this.importText = '';
        },
        doImport() {
            if (this.$TCT1.loadCode1(this.importText)) {
                this.showImportModal = false;
                this.$globalData1.dataVersion++;
                alert("Import successful!");
            } else {
                alert("Import failed. Check the console for details.");
            }
        }
    }
});

registerCode1Component('tct-preview', {
    props: ['wide'],
    template: `
    <div class="base" :style="baseStyle">
        <div class="container" :style="containerStyle">
            <center>
                <img :src="jetData.bannerImageUrl" id="header">
            </center>
            <div class="menu_bar_login"></div>
            <div class="content_box">
                <div class="content_single">
                    <div id="game_window" :style="windowStyle">
                        <div class="game_header" :style="headerStyle">
                            <h2>{{jetData.gameTitle}}</h2>
                            <font v-if="jetData.customQuote" id='wittyquote' size='4' color='white'><em>{{jetData.customQuote}}</em></font>
                        </div>
                        
                        <!-- Election Mode -->
                        <div v-if="previewMode === 'ELECTION'" class="inner_window_w_desc" :style="innerWindowStyle">
                            <div id="election_year_form">
                                <form name="election_year">
                                    <p> </p>
                                    <h3>Please select the election you will run in:</h3>
                                    <select name="election_id" id="election_id">
                                        <option :value="currentElection.pk">{{currentElection.fields.display_year || currentElection.fields.year}}</option>
                                    </select>
                                    <p></p>
                                </form>
                                <div class="election_description_window" id="election_description_window">
                                    <div id="election_image" class="election_image">
                                        <img :src="currentElection.fields.image_url" width="300" height="160">
                                    </div>
                                    <div v-html="currentElection.fields.summary" id="election_summary"></div>
                                </div>
                            </div>
                            <p><button @click="setPreviewMode('CANDIDATE')" id="election_id_button" class="pure-button">Continue</button></p>
                            <p id="credits">This scenario was made by {{credits}}.</p>
                        </div>

                        <!-- Candidate Mode -->
                        <div v-else-if="previewMode === 'CANDIDATE'" class="inner_window_w_desc" :style="innerWindowStyle">
                            <div id="candidate_form">
                                <form name="candidate">
                                    <p> </p>
                                    <h3>Please select your candidate:</h3>
                                    <select @change="onCandidateSelected" name="candidate_id" id="candidate_id">
                                        <option v-for="(cand, idx) in activeCandidates" :key="cand.pk" :value="idx">
                                            {{cand.fields.first_name}} {{cand.fields.last_name}}
                                        </option>
                                    </select>
                                    <p></p>
                                </form>
                            </div>
                            <div v-if="selectedPreviewCandidate" class="person_description_window" id="candidate_description_window">
                                <div class="person_image" id="candidate_image">
                                    <img :src="selectedPreviewCandidate.fields.image_url" width="210" height="250">
                                </div>
                                <div class="person_summary" id="candidate_summary">
                                    <ul>
                                        <li>Name: {{selectedPreviewCandidate.fields.first_name}} {{selectedPreviewCandidate.fields.last_name}}</li>
                                        <li>Party: {{selectedPreviewCandidate.fields.party}}</li>
                                        <li>Home State: {{selectedPreviewCandidate.fields.state}}</li>
                                    </ul>
                                    <div v-html="selectedPreviewCandidate.fields.description"></div>
                                </div>
                            </div>
                            <p>
                                <button @click="setPreviewMode('ELECTION')" class="pure-button" id="candidate_id_back">Back</button>
                                <button @click="setPreviewMode('RUNNING_MATE')" class="pure-button" id="candidate_id_button">Continue</button>
                            </p>
                        </div>

                        <!-- Running Mate Mode -->
                        <div v-else-if="previewMode === 'RUNNING_MATE'" class="inner_window_w_desc" :style="innerWindowStyle">
                            <div id="running_mate_form">
                                <form name="running mate">
                                    <p></p>
                                    <h3>Please select your running mate:</h3>
                                    <select @change="onRunningMateSelected" name="running_mate_id" id="running_mate_id">
                                        <option v-for="(mate, idx) in availableRunningMates" :key="mate.pk" :value="idx">
                                            {{mate.fields.first_name}} {{mate.fields.last_name}}
                                        </option>
                                    </select>
                                    <p></p>
                                </form>
                            </div>
                            <div v-if="selectedPreviewRunningMate" class="person_description_window" id="running_mate_description_window">
                                <div class="person_image" id="running_mate_image">
                                    <img :src="selectedPreviewRunningMate.fields.image_url" width="210" height="250">
                                </div>
                                <div class="person_summary" id="running_mate_summary">
                                    <ul>
                                        <li>Name: {{selectedPreviewRunningMate.fields.first_name}} {{selectedPreviewRunningMate.fields.last_name}}</li>
                                        <li>Party: {{selectedPreviewRunningMate.fields.party}}</li>
                                        <li>Home State: {{selectedPreviewRunningMate.fields.state}}</li>
                                    </ul>
                                    <div v-html="selectedPreviewRunningMate.fields.description_as_running_mate || selectedPreviewRunningMate.fields.description"></div>
                                </div>
                            </div>
                            <p>
                                <button @click="setPreviewMode('CANDIDATE')" class="pure-button" id="running_mate_id_back">Back</button>
                            </p>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    </div>
    `,
    data() {
        return {
            previewMode: 'ELECTION',
            selectedCandIdx: 0,
            selectedMateIdx: 0
        };
    },
    computed: {
        jetData() { return this.$TCT1.jet_data; },
        currentElection() { return this.$TCT1.elections[0]; },
        credits() { return this.$TCT1.credits; },
        activeCandidates() {
            return this.$TCT1.candidates.filter(c => c.fields.is_active === 1 && !c.fields.running_mate);
        },
        selectedPreviewCandidate() {
            return this.activeCandidates[this.selectedCandIdx];
        },
        availableRunningMates() {
            if (!this.selectedPreviewCandidate) return [];
            const rmpks = this.$TCT1.running_mates
                .filter(rm => rm.fields.candidate === this.selectedPreviewCandidate.pk)
                .map(rm => rm.fields.running_mate);
            return this.$TCT1.candidates.filter(c => rmpks.includes(c.pk));
        },
        selectedPreviewRunningMate() {
            return this.availableRunningMates[this.selectedMateIdx];
        },
        baseStyle() {
            return {
                backgroundImage: this.jetData.backgroundImageUrl ? `url('${this.jetData.backgroundImageUrl}')` : 'none',
                backgroundColor: this.jetData.containerColor || '#eee',
                minHeight: '600px',
                backgroundSize: 'cover',
                backgroundAttachment: 'fixed',
                backgroundPosition: 'center',
                padding: '2em 0',
                zoom: '1.0'
            };
        },
        containerStyle() {
            return {
                backgroundColor: this.jetData.containerColor || '#FFF',
                border: '.3em solid #C9C9C9'
            };
        },
        windowStyle() {
            return {
                backgroundColor: this.jetData.windowColor || '#FFF',
                borderColor: '#C9C9C9'
            };
        },
        headerStyle() {
            return {
                backgroundColor: this.jetData.headerColor || '#000',
                borderColor: '#C9C9C9'
            };
        },
        innerWindowStyle() {
            return {
                backgroundColor: this.jetData.innerWindowColor || '#FFF',
                borderColor: '#C9C9C9'
            };
        }
    },
    methods: {
        setPreviewMode(mode) {
            this.previewMode = mode;
            if (mode === 'RUNNING_MATE') {
                this.selectedMateIdx = 0;
            }
        },
        onCandidateSelected(e) {
            this.selectedCandIdx = parseInt(e.target.value);
        },
        onRunningMateSelected(e) {
            this.selectedMateIdx = parseInt(e.target.value);
        }
    }
});

