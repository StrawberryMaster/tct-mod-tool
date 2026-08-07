registerComponent('cyoa', {

    data() {
        return {
            temp_events: [],
            campaignPreviewOpen: false,
            campaignPreviewScores: {}
        };
    },

    created() {
        this.initStores();
    },

    template: `
    <div class="mx-auto bg-white rounded-lg shadow-sm p-4">
        <div class="flex items-center justify-between mb-3">
            <h1 class="font-bold text-xl">CYOA toolkit</h1>
            <div class="space-x-2">
                <button v-if="!enabled" class="bg-green-500 text-white px-3 py-2 rounded-sm hover:bg-green-600" @click="toggleEnabled()" aria-label="Enable CYOA">Enable</button>
                <button v-else class="bg-red-500 text-white px-3 py-2 rounded-sm hover:bg-red-600" @click="toggleEnabled()" aria-label="Disable CYOA">Disable</button>
            </div>
        </div>

        <div v-if="enabled" class="space-y-4">
            <!-- Variables section -->
            <details open class="bg-gray-50 rounded-sm border">
                <summary class="px-3 py-2 font-medium cursor-pointer">CYOA variables</summary>
                <p class="px-3 py-2 text-sm text-gray-700 italic">Your variable can be used in conditions and effects, e.g., to track player choices or stats.</p>
                <div class="p-3 space-y-3">
                    <div class="flex items-center gap-2">
                        <button
                            class="bg-blue-500 text-white px-3 py-2 rounded-sm hover:bg-blue-600"
                            @click="addVariable()"
                        >
                            Add variable
                        </button>
                        <span class="text-sm text-gray-600" v-if="cyoaVariables.length">Total: {{ cyoaVariables.length }}</span>
                    </div>
                    <p v-if="cyoaVariables.length === 0" class="text-gray-500 italic">No variables yet. Click "Add Variable" to create one.</p>
                    <div v-else class="space-y-2">
                        <cyoa-variable @deleteVariable="deleteVariable" :id="variable.id" :key="variable.id" v-for="variable in cyoaVariables"></cyoa-variable>
                    </div>
                </div>
            </details>

            <!-- Campaign Data modal section -->
            <details open class="bg-gray-50 rounded-sm border">
                <summary class="px-3 py-2 font-medium cursor-pointer">Campaign Data modal</summary>
                <p class="px-3 py-2 text-sm text-gray-700 italic">Configure tracked variables and score-based flavor text for an in-game Campaign Data popup.</p>
                <div class="p-3 space-y-3">
                    <div class="flex flex-wrap items-center gap-2">
                        <button
                            v-if="!campaignDataEnabled"
                            class="bg-teal-500 text-white px-3 py-2 rounded-sm hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            @click="toggleCampaignDataEnabled"
                            :disabled="!canUseCampaignData"
                        >
                            Enable Campaign Data
                        </button>
                        <button
                            v-else
                            class="bg-rose-500 text-white px-3 py-2 rounded-sm hover:bg-rose-600"
                            @click="toggleCampaignDataEnabled"
                        >
                            Disable Campaign Data
                        </button>
                        <button
                            class="bg-cyan-600 text-white px-3 py-2 rounded-sm hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            @click="addCampaignDataStat"
                            :disabled="!canUseCampaignData"
                        >
                            Add tracked variable
                        </button>
                        <span class="text-sm text-gray-600" v-if="campaignDataStats.length">Tracked: {{ campaignDataStats.length }}</span>
                    </div>

                    <p v-if="!canUseCampaignData" class="text-gray-500 italic">Create at least one CYOA variable first.</p>
                    <p v-else-if="campaignDataStats.length === 0" class="text-gray-500 italic">No tracked variables yet. Click "Add tracked variable" to configure flavor tiers.</p>

                    <div v-else class="space-y-2">
                        <cyoa-campaign-stat
                            v-for="row in campaignDataStats"
                            :id="row.id"
                            :key="row.id"
                            @deleteStat="deleteCampaignDataStat">
                        </cyoa-campaign-stat>
                    </div>

                    <div v-if="campaignDataStats.length > 0" class="border-t pt-3">
                        <div class="flex flex-wrap items-center gap-2 mb-2">
                            <span class="text-sm font-medium text-gray-700">Design &amp; live preview</span>
                            <button
                                class="bg-gray-200 px-2 py-1 rounded-sm text-xs hover:bg-gray-300"
                                @click="toggleCampaignPreview"
                            >
                                {{ campaignPreviewOpen ? 'Hide preview' : 'Show preview' }}
                            </button>
                            <button
                                class="text-xs text-gray-500 underline hover:text-gray-700"
                                title="Clear custom colors and use the current theme defaults"
                                @click="resetCampaignDesign"
                            >
                                Reset design
                            </button>
                        </div>

                        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">Modal title</label>
                                <input :value="campaignRawValue('title')" @input="updateCampaignStyle('title', $event.target.value)" type="text" class="w-full border rounded-sm p-2 text-sm" placeholder="Campaign Data">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">Width (px)</label>
                                <input :value="campaignRawValue('width')" @input="updateCampaignStyle('width', $event.target.value)" type="number" class="w-full border rounded-sm p-2 text-sm" min="160" placeholder="320">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">Corner radius (px)</label>
                                <input :value="campaignRawValue('cornerRadius')" @input="updateCampaignStyle('cornerRadius', $event.target.value)" type="number" class="w-full border rounded-sm p-2 text-sm" min="0" placeholder="2">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">Divider color</label>
                                <input :value="campaignStyle.h3Border" @input="updateCampaignStyle('h3Border', $event.target.value)" type="color" class="w-full border rounded-sm p-1 h-9">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">Modal background</label>
                                <input :value="campaignStyle.bg" @input="updateCampaignStyle('bg', $event.target.value)" type="color" class="w-full border rounded-sm p-1 h-9">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">Border color</label>
                                <input :value="campaignStyle.border" @input="updateCampaignStyle('border', $event.target.value)" type="color" class="w-full border rounded-sm p-1 h-9">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">Text color</label>
                                <input :value="campaignStyle.text" @input="updateCampaignStyle('text', $event.target.value)" type="color" class="w-full border rounded-sm p-1 h-9">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">Low tier color</label>
                                <input :value="campaignStyle.tierLow" @input="updateCampaignStyle('tierLow', $event.target.value)" type="color" class="w-full border rounded-sm p-1 h-9">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">Mid tier color</label>
                                <input :value="campaignStyle.tierMid" @input="updateCampaignStyle('tierMid', $event.target.value)" type="color" class="w-full border rounded-sm p-1 h-9">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">High tier color</label>
                                <input :value="campaignStyle.tierHigh" @input="updateCampaignStyle('tierHigh', $event.target.value)" type="color" class="w-full border rounded-sm p-1 h-9">
                            </div>
                        </div>

                        <div v-if="campaignPreviewOpen" class="mt-3 border rounded-sm p-3">
                            <p class="text-xs text-gray-500 mb-2">Live preview — adjust the sample score per stat to see each tier's text and color.</p>
                            <div class="flex flex-wrap items-center gap-2 mb-3">
                                <label class="text-xs font-medium text-gray-600">Sample scores:</label>
                                <div v-for="row in campaignDataPreview" :key="row.id" class="flex items-center gap-1">
                                    <span class="text-xs text-gray-500">{{ row.label || row.variable }}</span>
                                    <input
                                        type="number"
                                        class="w-14 border rounded-sm p-1 text-xs"
                                        :value="previewScoreFor(row.id)"
                                        @input="updateCampaignPreviewScore(row.id, $event.target.value)"
                                    >
                                </div>
                            </div>
                            <div
                                class="stats-preview"
                                :style="campaignPreviewBoxStyle"
                            >
                                <h3 :style="campaignPreviewTitleStyle">{{ campaignStyle.title }}</h3>
                                <div class="stats-list" v-html="campaignPreviewHtml"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </details>

            <!-- Branching events section -->
            <details open class="bg-gray-50 rounded-sm border">
                <summary class="px-3 py-2 font-medium cursor-pointer">CYOA events (tunneling)</summary>
                <p class="px-3 py-2 text-sm text-gray-700 italic">Also known as tunneling, these events let you immediately jump to specific questions based on player answers/variables.</p>
                <div class="p-3 space-y-3">
                    <div class="flex items-center gap-2">
                        <button
                            class="bg-green-500 text-white px-3 py-2 rounded-sm hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            @click="addCyoaEvent()"
                            :disabled="!canAdd"
                            :title="canAdd ? 'Add a new branching rule' : 'Need at least one question and one answer'"
                        >
                            Add CYOA event
                        </button>
                        <span class="text-sm text-gray-600" v-if="cyoaEvents.length">Total: {{ cyoaEvents.length }}</span>
                    </div>
                    <p v-if="cyoaEvents.length === 0" class="text-gray-500 italic">No CYOA events yet. Click "Add CYOA Event" to create one.</p>
                    <div v-else class="space-y-3">
                        <cyoa-event @deleteEvent="deleteEvent" :id="x.id" :key="x.id" v-for="x in cyoaEvents"></cyoa-event>
                    </div>
                </div>
            </details>

            <!-- Question Swap section -->
            <details open class="bg-gray-50 rounded-sm border">
                <summary class="px-3 py-2 font-medium cursor-pointer">Question swap rules</summary>
                <p class="px-3 py-2 text-sm text-gray-700 italic">Use these rules to swap the positions of questions based on player answers and variable conditions.</p>
                <div class="p-3 space-y-3">
                    <div class="flex items-center gap-2">
                        <button class="bg-indigo-500 text-white px-3 py-2 rounded-sm hover:bg-indigo-600" @click="addQuestionSwapRule">
                            Add question swap rule
                        </button>
                        <span class="text-sm text-gray-600" v-if="cyoaQuestionSwaps.length">Total: {{ cyoaQuestionSwaps.length }}</span>
                    </div>
                    <p v-if="cyoaQuestionSwaps.length === 0" class="text-gray-500 italic">
                        No question swap rules yet. Click "Add question swap rule" to create one.
                    </p>
                    <div v-else class="space-y-2">
                        <cyoa-question-swap
                            v-for="r in cyoaQuestionSwaps"
                            :id="r.id"
                            :key="r.id"
                            @deleteRule="deleteQuestionSwapRule">
                        </cyoa-question-swap>
                    </div>
                </div>
            </details>

            <!-- Answer swap rules -->
            <details open class="bg-gray-50 rounded-sm border">
                <summary class="px-3 py-2 font-medium cursor-pointer">Answer swap rules</summary>
                <p class="px-3 py-2 text-sm text-gray-700 italic">Use these rules to swap the positions of answers based on player answers and variable conditions.</p>
                <div class="p-3 space-y-3">
                    <div class="flex items-center gap-2">
                        <button class="bg-purple-500 text-white px-3 py-2 rounded-sm hover:bg-purple-600" @click="addAnswerSwapRule">
                            Add swap rule
                        </button>
                        <span class="text-sm text-gray-600" v-if="cyoaAnswerSwaps.length">Total: {{ cyoaAnswerSwaps.length }}</span>
                    </div>
                    <p v-if="cyoaAnswerSwaps.length === 0" class="text-gray-500 italic">
                        No swap rules yet. Click "Add Swap Rule" to create one.
                    </p>
                    <div v-else class="space-y-2">
                        <cyoa-answer-swap
                            v-for="r in cyoaAnswerSwaps"
                            :id="r.id"
                            :key="r.id"
                            @deleteRule="deleteAnswerSwapRule">
                        </cyoa-answer-swap>
                    </div>
                </div>
            </details>

            <!-- Candidate switching section -->
            <details open class="bg-gray-50 rounded-sm border">
                <summary class="px-3 py-2 font-medium cursor-pointer">Candidate switching</summary>
                <p class="px-3 py-2 text-sm text-gray-700 italic">Change a candidate's first name, last name, color, and issue scores at runtime based on player answers and variable conditions.</p>
                <div class="p-3 space-y-3">
                    <div class="flex items-center gap-2">
                        <button class="bg-amber-500 text-white px-3 py-2 rounded-sm hover:bg-amber-600" @click="addCandidateSwitchRule">
                            Add candidate switch
                        </button>
                        <span class="text-sm text-gray-600" v-if="cyoaCandidateSwitches.length">Total: {{ cyoaCandidateSwitches.length }}</span>
                    </div>
                    <p v-if="cyoaCandidateSwitches.length === 0" class="text-gray-500 italic">
                        No candidate switches yet. Click "Add candidate switch" to create one.
                    </p>
                    <div v-else class="space-y-2">
                        <cyoa-candidate-switch
                            v-for="r in cyoaCandidateSwitches"
                            :id="r.id"
                            :key="r.id"
                            @deleteRule="deleteCandidateSwitchRule">
                        </cyoa-candidate-switch>
                    </div>
                </div>
            </details>

            <!-- Customizable Bunnyhop section -->
            <details open class="bg-gray-50 rounded-sm border mt-4">
                <summary class="px-3 py-2 font-medium cursor-pointer">Bunnyhop (randomized question pools)</summary>
                <p class="px-3 py-2 text-sm text-gray-700 italic">Configure pools of randomized questions that overwrite structural placeholder questions when the mod loads.</p>
                <div class="p-3 space-y-3">
                    <div class="flex items-center gap-2">
                        <button
                            v-if="!bunnyhopEnabled"
                            class="bg-green-500 text-white px-3 py-2 rounded-sm hover:bg-green-600"
                            @click="toggleBunnyhopEnabled"
                        >
                            Enable Bunnyhop
                        </button>
                        <button
                            v-else
                            class="bg-red-500 text-white px-3 py-2 rounded-sm hover:bg-red-600"
                            @click="toggleBunnyhopEnabled"
                        >
                            Disable Bunnyhop
                        </button>
                        <button
                            v-if="bunnyhopEnabled"
                            class="bg-blue-500 text-white px-3 py-2 rounded-sm hover:bg-blue-600"
                            @click="addBunnyhopPool"
                        >
                            Add Random Pool
                        </button>
                    </div>

                    <div v-if="bunnyhopEnabled" class="space-y-4">
                        <p v-if="bunnyhopPools.length === 0" class="text-gray-500 italic">No pools defined yet.</p>
                        <cyoa-bunnyhop-pool
                            v-for="(pool, idx) in bunnyhopPools"
                            :key="pool.id"
                            :index="idx"
                            :pool-id="pool.id"
                            @deletePool="deleteBunnyhopPool"
                        ></cyoa-bunnyhop-pool>
                    </div>
                </div>
            </details>
        </div>
    </div>
    `,

    methods: {
        initStores() {
            const TCT = this.$TCT;
            const jet = TCT.jet_data || (TCT.jet_data = {});
            let changed = false;

            if (jet.cyoa_enabled == null) { jet.cyoa_enabled = false; changed = true; }
            if (jet.cyoa_data == null) { jet.cyoa_data = {}; changed = true; }
            if (jet.cyoa_variables == null) { jet.cyoa_variables = {}; changed = true; }
            if (jet.cyoa_variable_effects == null) { jet.cyoa_variable_effects = {}; changed = true; }
            if (jet.cyoa_question_swaps == null) { jet.cyoa_question_swaps = {}; changed = true; }
            if (jet.cyoa_answer_swaps == null) { jet.cyoa_answer_swaps = {}; changed = true; }
            if (jet.cyoa_campaign_data_enabled == null) { jet.cyoa_campaign_data_enabled = false; changed = true; }
            if (jet.cyoa_campaign_data_stats == null) { jet.cyoa_campaign_data_stats = {}; changed = true; }
            if (jet.campaign_data_style == null) { jet.campaign_data_style = {}; changed = true; }
            if (jet.cyoa_candidate_switches == null) { jet.cyoa_candidate_switches = {}; changed = true; }
            if (jet.bunnyhop_enabled == null) { jet.bunnyhop_enabled = false; changed = true; }
            if (jet.bunnyhop_pools == null) { jet.bunnyhop_pools = []; changed = true; }

            if (changed) {
                this.$globalData.dataVersion++;
            }
        },

        // simple collision-safe ID generator for all CYOA stores
        generateId(stores = []) {
            let id = Date.now();
            // bump until free in any target store
            while (stores.some(store => {
                if (!store) return false;
                if (Array.isArray(store)) {
                    return store.some(item => Number(item?.id ?? item?.pk) === id);
                }
                return !!store[id];
            })) id++;
            return id;
        },

        toggleEnabled: function (evt) {
            this.$TCT.jet_data.cyoa_enabled = !this.$TCT.jet_data.cyoa_enabled;
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        addCyoaEvent: function (evt) {
            // guard: require at least one Q and one A
            const answers = Object.values(this.$TCT.answers);
            const questions = Array.from(this.$TCT.questions.values());
            if (!answers.length || !questions.length) {
                console.warn("CYOA: cannot add event without at least one answer and one question.");
                return;
            }
            const jet = this.$TCT.jet_data;
            const id = this.generateId([jet.cyoa_data]);
            jet.cyoa_data[id] = {
                'answer': answers[0].pk,
                'question': questions[0].pk,
                'id': id,
                'conditions': [],
                'conditionOperator': 'AND'
            };
            this.temp_events = [];
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        deleteEvent: function (id) {
            delete this.$TCT.jet_data.cyoa_data[id];
            this.temp_events = [];
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        addVariable: function () {
            if (!this.$TCT.jet_data.cyoa_variables) {
                this.$TCT.jet_data.cyoa_variables = {};
            }
            const jet = this.$TCT.jet_data;
            const id = this.generateId([jet.cyoa_variables]);
            jet.cyoa_variables[id] = {
                'id': id,
                'name': `variable${Object.keys(jet.cyoa_variables || {}).length + 1}`,
                'defaultValue': 0
            };
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        deleteVariable: function (id) {
            // capture name before deleting the variable
            const variableObj = this.$TCT.jet_data.cyoa_variables?.[id];
            const variableName = variableObj?.name;

            if (variableName && this.$TCT.jet_data.cyoa_variable_effects) {
                const effects = this.$TCT.getAllCyoaVariableEffects?.() || Object.values(this.$TCT.jet_data.cyoa_variable_effects);
                for (let effect of effects) {
                    if (effect?.variable === variableName) {
                        delete this.$TCT.jet_data.cyoa_variable_effects[effect.id];
                    }
                }
            }

            if (variableName && this.$TCT.jet_data.cyoa_campaign_data_stats) {
                const stats = Object.values(this.$TCT.jet_data.cyoa_campaign_data_stats);
                for (let stat of stats) {
                    if (stat?.variable === variableName) {
                        delete this.$TCT.jet_data.cyoa_campaign_data_stats[stat.id];
                    }
                }
            }

            delete this.$TCT.jet_data.cyoa_variables[id];

            if (Object.keys(this.$TCT.jet_data.cyoa_variables).length === 0) {
                this.$TCT.jet_data.cyoa_campaign_data_enabled = false;
            }

            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        toggleCampaignDataEnabled() {
            if (!this.canUseCampaignData) return;
            this.$TCT.jet_data.cyoa_campaign_data_enabled = !this.$TCT.jet_data.cyoa_campaign_data_enabled;
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        addCampaignDataStat() {
            if (!this.canUseCampaignData) return;
            const jet = this.$TCT.jet_data;
            if (!jet.cyoa_campaign_data_stats) {
                jet.cyoa_campaign_data_stats = {};
            }

            const variables = this.$TCT.getAllCyoaVariables?.() || [];
            if (!variables.length) return;

            const existing = Object.values(jet.cyoa_campaign_data_stats || {});
            const used = new Set(existing.map(x => x.variable));
            const chosenVariable = (variables.find(v => !used.has(v.name)) || variables[0]).name;

            const id = this.generateId([jet.cyoa_campaign_data_stats]);
            jet.cyoa_campaign_data_stats[id] = {
                id,
                variable: chosenVariable,
                label: chosenVariable,
                showLabel: false,
                lowMax: 0,
                midMax: 2,
                lowText: `${chosenVariable} is struggling.`,
                midText: `${chosenVariable} is steady.`,
                highText: `${chosenVariable} is surging.`
            };

            this.$TCT.jet_data.cyoa_campaign_data_enabled = true;
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        deleteCampaignDataStat(id) {
            if (!this.$TCT.jet_data.cyoa_campaign_data_stats) return;
            delete this.$TCT.jet_data.cyoa_campaign_data_stats[id];
            if (Object.keys(this.$TCT.jet_data.cyoa_campaign_data_stats).length === 0) {
                this.$TCT.jet_data.cyoa_campaign_data_enabled = false;
            }
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        getCampaignDataStyle() {
            return window.TCTAnswerSwapHelper.getCampaignDataStyle?.();
        },

        getCampaignDataRows() {
            return window.TCTAnswerSwapHelper.getCampaignDataRows?.() || [];
        },

        updateCampaignStyle(field, value) {
            const jet = this.$TCT.jet_data;
            if (!jet.campaign_data_style) {
                jet.campaign_data_style = {};
            }
            jet.campaign_data_style[field] = value;
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        campaignRawValue(field) {
            return (this.$TCT?.jet_data?.campaign_data_style || {})[field] ?? '';
        },

        resetCampaignDesign() {
            this.$TCT.jet_data.campaign_data_style = {};
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        toggleCampaignPreview() {
            this.campaignPreviewOpen = !this.campaignPreviewOpen;
        },

        updateCampaignPreviewScore(id, value) {
            const n = Number(value);
            this.campaignPreviewScores[id] = Number.isFinite(n) ? n : 0;
        },

        previewScoreFor(id) {
            const s = this.campaignPreviewScores[id];
            return Number.isFinite(Number(s)) ? Number(s) : 0;
        },

        campaignEsc(text) {
            return String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        },

        campaignBold(text, color) {
            return `<span style="color: ${this.campaignEsc(color)}; font-weight: bold">${text}</span>`;
        },

        campaignHighlight(text, color) {
            const parts = String(text || '').split('*');
            if (parts.length <= 1) return this.campaignBold(text || '', color);
            let out = '';
            for (let i = 0; i < parts.length; i++) {
                const seg = parts[i];
                if (!seg) continue;
                out += i % 2 === 1 ? this.campaignBold(this.campaignEsc(seg), color) : this.campaignEsc(seg);
            }
            return out;
        },

        campaignLineHtml(row) {
            const style = this.getCampaignDataStyle();
            const score = this.previewScoreFor(row.id);
            const tiers = row.tiers || [];
            let tier = tiers.find(t => score <= Number(t.max));
            if (!tier) tier = tiers[tiers.length - 1] || { text: '', color: style.tierMid };
            const prefix = row.showLabel && row.label ? this.campaignEsc(row.label) + ': ' : '';
            return '• ' + prefix + this.campaignHighlight(tier.text, tier.color)
                + ' ' + this.campaignBold('(' + score + ')', tier.color);
        },

        // Answer swap rules
        addQuestionSwapRule() {
            if (!this.$TCT.jet_data.cyoa_question_swaps) {
                this.$TCT.jet_data.cyoa_question_swaps = {};
            }
            const jet = this.$TCT.jet_data;
            const id = this.generateId([jet.cyoa_question_swaps]);
            jet.cyoa_question_swaps[id] = {
                id,
                triggers: [],
                conditions: [],
                conditionOperator: 'AND',
                swaps: [{ pk1: null, pk2: null }]
            };
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        deleteQuestionSwapRule(id) {
            if (!this.$TCT.jet_data.cyoa_question_swaps) return;
            delete this.$TCT.jet_data.cyoa_question_swaps[id];
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        addAnswerSwapRule() {
            if (!this.$TCT.jet_data.cyoa_answer_swaps) {
                this.$TCT.jet_data.cyoa_answer_swaps = {};
            }
            const jet = this.$TCT.jet_data;
            const id = this.generateId([jet.cyoa_answer_swaps]);
            jet.cyoa_answer_swaps[id] = {
                id,
                triggers: [],
                conditions: [],
                conditionOperator: 'AND',
                swaps: [{ pk1: null, pk2: null, takeEffects: true }]
            };
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        deleteAnswerSwapRule(id) {
            if (!this.$TCT.jet_data.cyoa_answer_swaps) return;
            delete this.$TCT.jet_data.cyoa_answer_swaps[id];
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        // candidate switching rules
        addCandidateSwitchRule() {
            if (!this.$TCT.jet_data.cyoa_candidate_switches) {
                this.$TCT.jet_data.cyoa_candidate_switches = {};
            }
            const jet = this.$TCT.jet_data;
            const id = this.generateId([jet.cyoa_candidate_switches]);
            jet.cyoa_candidate_switches[id] = {
                id,
                triggers: [],
                conditions: [],
                conditionOperator: 'AND',
                candidate: null,
                first_name: '',
                last_name: '',
                color_hex: '',
                issue_scores: []
            };
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        deleteCandidateSwitchRule(id) {
            if (!this.$TCT.jet_data.cyoa_candidate_switches) return;
            delete this.$TCT.jet_data.cyoa_candidate_switches[id];
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        toggleBunnyhopEnabled() {
            this.$TCT.jet_data.bunnyhop_enabled = !this.$TCT.jet_data.bunnyhop_enabled;
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        addBunnyhopPool() {
            const jet = this.$TCT.jet_data;
            if (!jet.bunnyhop_pools) {
                jet.bunnyhop_pools = [];
            }

            const id = this.generateId([jet.bunnyhop_pools]);
            jet.bunnyhop_pools.push({
                id,
                index: 0,
                spots: 1,
                spotsCond: '',
                spotsAlt: null,
                questions: []
            });
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        deleteBunnyhopPool(id) {
            const jet = this.$TCT.jet_data;
            jet.bunnyhop_pools = (jet.bunnyhop_pools || []).filter(pool => pool.id !== id);
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },
    },

    computed: {

        cyoaEvents: function () {
            this.$globalData.dataVersion;
            return this.$TCT.getAllCyoaEvents();
        },

        cyoaVariables: function () {
            this.$globalData.dataVersion;
            return this.$TCT.getAllCyoaVariables();
        },

        bunnyhopEnabled() {
            return !!this.$TCT.jet_data.bunnyhop_enabled;
        },

        bunnyhopPools() {
            return this.$TCT.jet_data.bunnyhop_pools || [];
        },

        enabled: function () {
            return this.$TCT.jet_data?.cyoa_enabled;
        },

        // disable Add button if we have no data to populate selects
        canAdd: function () {
            const hasAnswers = Object.values(this.$TCT.answers).length > 0;
            const hasQuestions = Array.from(this.$TCT.questions.values()).length > 0;
            return hasAnswers && hasQuestions;
        },

        // expose swaps as a sorted list
        cyoaQuestionSwaps() {
            const src = this.$TCT.jet_data.cyoa_question_swaps || {};
            return Object.values(src).sort((a, b) => a.id - b.id);
        },

        cyoaAnswerSwaps() {
            const src = this.$TCT.jet_data.cyoa_answer_swaps || {};
            return Object.values(src).sort((a, b) => a.id - b.id);
        },

        cyoaCandidateSwitches() {
            const src = this.$TCT.jet_data.cyoa_candidate_switches || {};
            return Object.values(src).sort((a, b) => a.id - b.id);
        },

        campaignDataEnabled() {
            return !!this.$TCT.jet_data.cyoa_campaign_data_enabled;
        },

        campaignDataStats() {
            const src = this.$TCT.jet_data.cyoa_campaign_data_stats || {};
            return Object.values(src).sort((a, b) => a.id - b.id);
        },

        canUseCampaignData() {
            this.$globalData.dataVersion;
            return (this.$TCT.getAllCyoaVariables?.() || []).length > 0;
        },

        campaignStyle() {
            this.$globalData.dataVersion;
            return this.getCampaignDataStyle();
        },

        campaignDataPreview() {
            this.$globalData.dataVersion;
            return this.getCampaignDataRows().map(r => ({
                id: r.id,
                label: r.label,
                variable: r.variable
            }));
        },

        campaignPreviewBoxStyle() {
            this.$globalData.dataVersion;
            const s = this.getCampaignDataStyle();
            return {
                width: s.width + 'px',
                backgroundColor: s.bg,
                border: '2px solid ' + s.border,
                color: s.text,
                borderRadius: s.cornerRadius + 'px',
                padding: '10px 12px',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.4)',
                fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                fontSize: '14px',
                lineHeight: '1.5'
            };
        },

        campaignPreviewTitleStyle() {
            this.$globalData.dataVersion;
            const s = this.getCampaignDataStyle();
            return {
                margin: '0 0 8px',
                fontWeight: 'bold',
                fontSize: '16px',
                borderBottom: '1px solid ' + s.h3Border,
                paddingBottom: '4px'
            };
        },

        campaignPreviewHtml() {
            this.$globalData.dataVersion;
            const rows = this.getCampaignDataRows();
            return rows.map(r => this.campaignLineHtml(r)).join('<br>');
        },

        buildQuestionSwapperFunction() {
            return window.TCTAnswerSwapHelper.buildQuestionSwapperFunction();
        },

        buildAnswerSwapperFunction() {
            return window.TCTAnswerSwapHelper.buildAnswerSwapperFunction();
        },

        buildQuestionSwapBlocks() {
            return window.TCTAnswerSwapHelper.buildQuestionSwapBlocks();
        },

        buildAnswerSwapBlocks() {
            return window.TCTAnswerSwapHelper.buildAnswerSwapBlocks();
        },

        indentBlock(block, indent) {
            return window.TCTAnswerSwapHelper.indentBlock(block, indent);
        },

        insertSwapsInsideCyoAdventure(out, blocks) {
            return window.TCTAnswerSwapHelper.insertSwapsInsideCyoAdventure(out, blocks);
        },

        insertSwapperAfterHelper(out) {
            return window.TCTAnswerSwapHelper.insertSwapperAfterHelper(out);
        },

        injectAnswerSwapIntoCode2(code) {
            return window.TCTAnswerSwapHelper.injectAnswerSwapIntoCode2(code);
        }
    }
})

registerComponent('cyoa-bunnyhop-pool', {
    props: ['poolId', 'index'],

    data() {
        return {
            newQuestionPk: null,
            newQuestionDesc: ""
        };
    },

    template: `
    <div class="bg-white rounded-sm shadow-sm p-4 border-l-4 border-emerald-500 border">
        <div class="flex justify-between items-start mb-3">
            <div>
                <h3 class="font-bold text-sm text-emerald-800 flex items-center gap-1.5">
                    📦 Randomized question pool #{{ index + 1 }}
                </h3>
            </div>
            <button class="text-red-600 hover:text-red-800 text-sm" @click="deletePool">Delete pool</button>
        </div>

        <div v-if="placeholderWarning" class="bg-amber-50 p-2.5 rounded-sm border border-amber-200 text-xs text-amber-950 mb-3 font-medium">
            ⚠️ {{ placeholderWarning }}
        </div>

        <div class="bg-emerald-50 p-2.5 rounded-sm border border-emerald-100 text-xs text-emerald-950 mb-4 space-y-1">
            <p><strong>How this works:</strong> The game will grab a random set of questions from this pool, shuffle them, and insert them into your game starting at the <strong>Start Position</strong>.</p>
            <p class="text-gray-600"><em>Example:</em> If you set <strong>Start Position</strong> to <strong>4</strong> and <strong>How Many to Pick</strong> to <strong>2</strong>, the game will randomly pick 2 questions from this pool to become Question 4 and Question 5.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">Start Position (question #)</label>
                <input :value="pool.index + 1" @input="updateField('index', Number($event.target.value) - 1)" type="number" min="1" class="w-full border rounded-sm p-1.5 text-sm" placeholder="e.g. 4">
                <span class="text-[10px] text-gray-500 block mt-0.5">Which question number starts this random block?</span>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">How Many to Pick</label>
                <input :value="pool.spots" @input="updateField('spots', Number($event.target.value))" type="number" min="1" class="w-full border rounded-sm p-1.5 text-sm" placeholder="e.g. 2">
                <span class="text-[10px] text-gray-500 block mt-0.5">How many questions from this pool are drawn?</span>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">Change count if... <span class="text-gray-400 font-normal">(optional)</span></label>
                <input :value="pool.spotsCond" @input="updateField('spotsCond', $event.target.value)" type="text" placeholder="e.g. qCount <= 25" class="w-full border rounded-sm p-1.5 text-sm font-mono">
                <span class="text-[10px] text-gray-500 block mt-0.5">Condition to change count (e.g. short game).</span>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">New count picked <span class="text-gray-400 font-normal">(optional)</span></label>
                <input :value="pool.spotsAlt" @input="updateField('spotsAlt', $event.target.value !== '' ? Number($event.target.value) : null)" type="number" min="1" class="w-full border rounded-sm p-1.5 text-sm" placeholder="e.g. 1">
                <span class="text-[10px] text-gray-500 block mt-0.5">How many to pick if condition above is true.</span>
            </div>
        </div>

        <div class="border-t pt-3">
            <h4 class="text-xs font-bold text-gray-700 mb-2">Questions inside this Pool (Total: {{ (pool.questions || []).length }})</h4>

            <div class="space-y-2 mb-3">
                <div v-for="(q, qIdx) in pool.questions" :key="qIdx" class="flex gap-2 items-center bg-gray-50 p-2 rounded-sm border">
                    <span class="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">PK {{ q.pk }}</span>
                    <span class="text-xs text-gray-700 flex-1 truncate">{{ q.description }}</span>
                    <button class="text-red-500 hover:text-red-700 text-xs" @click="removeQuestion(qIdx)">✕ Remove</button>
                </div>
            </div>

            <div class="bg-gray-50 p-3 rounded border space-y-3">
                <span class="text-xs font-bold text-gray-700 block">➕ Add question option to pool</span>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                        <label class="block text-[10px] font-bold text-gray-600 mb-0.5">1. Quick import from existing question</label>
                        <select @change="populateFromQuestion($event.target.value)" class="w-full border rounded p-1.5 text-xs">
                            <option value="">-- Click to choose and copy text --</option>
                            <option v-for="q in existingQuestions" :key="q.pk" :value="q.pk">
                                {{ q.pk }} - {{ (q.fields?.description || '').slice(0, 45) }}...
                            </option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-gray-600 mb-0.5">2. Question ID (PK)</label>
                        <input v-model.number="newQuestionPk" type="number" class="w-full border rounded p-1.5 text-xs" placeholder="e.g. 349">
                        <span class="text-[9px] text-gray-400">Must match the PK of the answers you want to show up.</span>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-gray-600 mb-0.5">3. Question description text</label>
                        <input v-model="newQuestionDesc" type="text" class="w-full border rounded p-1.5 text-xs" placeholder="Enter question text...">
                        <span class="text-[9px] text-gray-400">The actual text prompt displayed to the player.</span>
                    </div>
                </div>
                <button class="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded hover:bg-emerald-700 font-medium" @click="addQuestion">
                    Add option to pool
                </button>
            </div>
        </div>
    </div>
    `,

    methods: {
        getPool() {
            const jet = this.$TCT.jet_data;
            return (jet.bunnyhop_pools || []).find(p => p.id === this.poolId) || {};
        },

        updateField(field, value) {
            const pool = this.getPool();
            pool[field] = value;
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        populateFromQuestion(pk) {
            if (!pk) return;
            const q = this.$TCT.questions.get(Number(pk));
            if (q) {
                this.newQuestionPk = q.pk;
                this.newQuestionDesc = q.fields.description || "";
            }
        },

        addQuestion() {
            if (!this.newQuestionPk) {
                alert("Please enter or select a valid question PK.");
                return;
            }

            const pool = this.getPool();
            if (!pool.questions) pool.questions = [];

            pool.questions.push({
                pk: Number(this.newQuestionPk),
                description: this.newQuestionDesc
            });

            this.newQuestionPk = null;
            this.newQuestionDesc = "";
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        removeQuestion(index) {
            const pool = this.getPool();
            pool.questions.splice(index, 1);
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        deletePool() {
            if (confirm("Are you sure you want to delete this randomized pool?")) {
                this.$emit('deletePool', this.poolId);
            }
        }
    },

    computed: {
        pool() {
            this.$globalData.dataVersion;
            return this.getPool();
        },

        existingQuestions() {
            return Array.from(this.$TCT.questions.values());
        },

        placeholderWarning() {
            this.$globalData.dataVersion;
            const pool = this.getPool();
            const index = Number(pool.index);
            const spots = Number(pool.spots);

            if (Number.isNaN(index) || Number.isNaN(spots) || spots <= 0) return null;

            const questionsArray = this.existingQuestions;
            const missingPlaceholderNumbers = [];

            for (let i = 0; i < spots; i++) {
                const targetPos = index + i;
                const qObj = questionsArray[targetPos];

                if (!qObj) {
                    missingPlaceholderNumbers.push(targetPos + 1);
                }
            }

            if (missingPlaceholderNumbers.length > 0) {
                return `Warning: You don't have enough question slots defined in your base mod. Please make sure you have defined questions in the base mod for position(s): ${missingPlaceholderNumbers.join(', ')}.`;
            }

            return null;
        }
    }
});

// global helper object that can be accessed from other components
window.TCTAnswerSwapHelper = {
    getConditionOperand(variableName) {
        const key = String(variableName || '').trim().toLowerCase();
        if (key === '__no_counter__' || key === 'nocounter' || key === 'e.nocounter') {
            return 'e.noCounter';
        }
        return variableName;
    },

    getConditionLabel(variableName) {
        const key = String(variableName || '').trim().toLowerCase();
        if (key === '__no_counter__' || key === 'nocounter' || key === 'e.nocounter') {
            return 'Question number';
        }
        return variableName;
    },

    getConditionTooltip(variableName) {
        const key = String(variableName || '').trim().toLowerCase();
        if (key === '__no_counter__' || key === 'nocounter' || key === 'e.nocounter') {
            return 'Count of questions already answered. Here, a value of N means the condition activates after question N is answered (i.e., before question N+1). For example, a question number of 20 means the condition activates at question 21.';
        }
        return '';
    },

    getCampaignDataStyle() {
        const cfg = (window.TCTThemeConfig && window.getCurrentTheme && window.TCTThemeConfig[window.getCurrentTheme()]) || window.TCTThemeConfig?.light || {};
        const v = cfg.cssVars || {};
        const s = window.$TCT?.jet_data?.campaign_data_style || {};
        const effectiveTitle = s.title === undefined || s.title === null || s.title === ''
            ? 'Campaign Data'
            : String(s.title);
        const num = (val, fallback, min = null) => {
            if (val === undefined || val === null || val === '') return fallback;
            const n = Number(val);
            if (!Number.isFinite(n)) return fallback;
            if (min !== null && n < min) return fallback;
            return n;
        };
        return {
            title: effectiveTitle,
            bg: s.bg || v['--cyoa-popup-bg'] || '#222449',
            border: s.border || v['--cyoa-popup-border'] || '#727C96',
            text: s.text || v['--cyoa-popup-text'] || '#ffffff',
            h3Border: s.h3Border || v['--cyoa-popup-h3-border'] || '#cccccc',
            tierLow: s.tierLow || v['--tier-low'] || '#ff4d4d',
            tierMid: s.tierMid || v['--tier-mid'] || '#e6e6e6',
            tierHigh: s.tierHigh || v['--tier-high'] || '#4dff4d',
            width: num(s.width, 320),
            cornerRadius: num(s.cornerRadius, 2)
        };
    },

    buildQuestionSwapperFunction() {
        return `
function questionSwapper(pk1, pk2) {
    const questionData = campaignTrail_temp.questions_json;

    // find indices of the questions
    const index1 = getQuestionIndexFromPk(pk1);
    const index2 = getQuestionIndexFromPk(pk2);

    // validate both questions exist
    if (index1 === -1 || index2 === -1) {
        console.warn(\`questionSwapper: Could not find question(s) with pk \${pk1} and/or \${pk2}\`);
        return false;
    }

    // swap the entire question objects
    [questionData[index1], questionData[index2]] = [questionData[index2], questionData[index1]];

    // rebuild the index map since positions changed
    _rebuildQuestionIdxMap();

    return true;
}
`.trim();
    },

    buildAnswerSwapperFunction() {
        return `
function answerSwapper(pk1, pk2, takeEffects = true) {
    const answerData = campaignTrail_temp.answers_json;

   // find the indices of the objects with the specified PKs
    const index1 = answerData.findIndex(item => Number(item.pk) === Number(pk1));
    const index2 = answerData.findIndex(item => Number(item.pk) === Number(pk2));

    // check if objects with those PKs exist
    if (index1 === -1 || index2 === -1) return;

    // swap the question assignment
    const tempQuestion = answerData[index1].fields.question;
    answerData[index1].fields.question = answerData[index2].fields.question;
    answerData[index2].fields.question = tempQuestion;

    // if takeEffects is true, answers swap effects also
    if (takeEffects) {
        const otherJsons = [
            campaignTrail_temp.answer_score_global_json,
            campaignTrail_temp.answer_score_issue_json,
            campaignTrail_temp.answer_score_state_json,
            campaignTrail_temp.answer_feedback_json
        ];

        otherJsons.forEach(jsonData => {
            if (!jsonData) return;
            jsonData.forEach(item => {
                const itemAns = Number(item.fields.answer);
                if (itemAns === Number(pk1)) {
                    item.fields.answer = pk2;
                } else if (itemAns === Number(pk2)) {
                    item.fields.answer = pk1;
                }
            });
        });
    }
}
`.trim();
    },

    buildCandidateSwitchFunction() {
      return `
// Candidate switching wahoo - from Moonbeam
function setCandidateIdentity(candidatePk, options) {
    const cand = campaignTrail_temp.candidate_json.find(p => Number(p.pk) === Number(candidatePk));
    if (cand?.fields) {
        if (options.first !== undefined) cand.fields.first_name = options.first;
        if (options.last !== undefined) cand.fields.last_name = options.last;
        if (options.color !== undefined) cand.fields.color_hex = options.color;
    }

    if (Number(campaignTrail_temp.candidate_id) === Number(candidatePk)) {
        if (options.last !== undefined) campaignTrail_temp.candidate_last_name = options.last;
        if (options.first !== undefined) campaignTrail_temp.candidate_first_name = options.first;
    }

    if (options.issueScores && campaignTrail_temp.candidate_issue_score_json) {
        const updateScore = (issueId, score) => {
            let targetScore = campaignTrail_temp.candidate_issue_score_json.find(
                item => Number(item.fields.candidate) === Number(candidatePk) &&
                        Number(item.fields.issue) === Number(issueId)
            );

            if (targetScore?.fields) {
                targetScore.fields.issue_score = Number(score);
            } else {
                campaignTrail_temp.candidate_issue_score_json.push({
                    model: "campaign_trail.candidate_issue_score",
                    fields: {
                        candidate: Number(candidatePk),
                        issue: Number(issueId),
                        issue_score: Number(score)
                    }
                });
            }
        };

        if (!Array.isArray(options.issueScores) && typeof options.issueScores === 'object') {
            Object.entries(options.issueScores).forEach(([issueId, score]) => {
                updateScore(issueId, score);
            });
        }
        else if (Array.isArray(options.issueScores)) {
            options.issueScores.forEach(({ issue, score }) => {
                updateScore(issue, score);
            });
        }
    }
}
`.trim();
    },

    buildQuestionSwapBlocks() {
        const rulesSrc = window.$TCT.jet_data?.cyoa_question_swaps || {};
        const rules = Object.values(rulesSrc);
        if (!rules.length) return '';

        const blocks = rules.map(rule => {
            const triggers = Array.isArray(rule.triggers) ? rule.triggers.filter(x => Number.isFinite(x)) : [];
            const swaps = Array.isArray(rule.swaps) ? rule.swaps.filter(s => Number.isFinite(s?.pk1) && Number.isFinite(s?.pk2)) : [];

            const hasConditions = rule.conditions && Array.isArray(rule.conditions) && rule.conditions.some(c => c && c.variable);
            if (!swaps.length || (!triggers.length && !hasConditions)) return '';

            const swapLines = swaps.map(s => {
                return `questionSwapper(${s.pk1}, ${s.pk2});`;
            }).join('\n    ');

            let conditionStr = '';
            if (hasConditions) {
                const validConditions = rule.conditions.filter(c => c && c.variable && c.comparator && Number.isFinite(Number(c.value)));
                if (validConditions.length > 0) {
                    const conditionParts = validConditions.map(c => {
                        const left = this.getConditionOperand(c.variable);
                        return `${left} ${c.comparator} ${Number(c.value)}`;
                    });
                    const operator = rule.conditionOperator || 'AND';
                    const joinStr = operator === 'OR' ? ' || ' : ' && ';
                    conditionStr = conditionParts.join(joinStr);
                    if (validConditions.length > 1) conditionStr = '(' + conditionStr + ')';
                }
            }

            let triggerStr = '';
            if (triggers.length > 0) {
                triggerStr = triggers.map(pk => `ans == ${pk}`).join(' || ');
                if (triggers.length > 1) triggerStr = '(' + triggerStr + ')';
            }

            let combinedCond = '';
            if (triggerStr && conditionStr) {
                combinedCond = `${triggerStr} && ${conditionStr}`;
            } else {
                combinedCond = triggerStr || conditionStr;
            }

            return `if (${combinedCond}) {\n    ${swapLines}\n}`;
        }).filter(Boolean);

        if (!blocks.length) return '';

        return `// question swap CYOA here\n${blocks.join('\n')}`;
    },

    buildAnswerSwapBlocks() {
        const rulesSrc = window.$TCT.jet_data?.cyoa_answer_swaps || {};
        const rules = Object.values(rulesSrc);
        if (!rules.length) return '';

        const blocks = rules.map(rule => {
            const triggers = Array.isArray(rule.triggers) ? rule.triggers.filter(x => Number.isFinite(x)) : [];
            const swaps = Array.isArray(rule.swaps) ? rule.swaps.filter(s => Number.isFinite(s?.pk1) && Number.isFinite(s?.pk2)) : [];

            const hasConditions = rule.conditions && Array.isArray(rule.conditions) && rule.conditions.some(c => c && c.variable);
            if (!swaps.length || (!triggers.length && !hasConditions)) return '';

            const swapLines = swaps.map(s => {
                const take = (s.takeEffects === false) ? 'false' : 'true';
                return `answerSwapper(${s.pk1}, ${s.pk2}, ${take});`;
            }).join('\n    ');

            let conditionStr = '';
            if (hasConditions) {
                const validConditions = rule.conditions.filter(c => c && c.variable && c.comparator && Number.isFinite(Number(c.value)));
                if (validConditions.length > 0) {
                    const conditionParts = validConditions.map(c => {
                        const left = this.getConditionOperand(c.variable);
                        return `${left} ${c.comparator} ${Number(c.value)}`;
                    });
                    const operator = rule.conditionOperator || 'AND';
                    const joinStr = operator === 'OR' ? ' || ' : ' && ';
                    conditionStr = conditionParts.join(joinStr);
                    if (validConditions.length > 1) conditionStr = '(' + conditionStr + ')';
                }
            }

            let triggerStr = '';
            if (triggers.length > 0) {
                triggerStr = triggers.map(pk => `ans == ${pk}`).join(' || ');
                if (triggers.length > 1) triggerStr = '(' + triggerStr + ')';
            }

            let combinedCond = '';
            if (triggerStr && conditionStr) {
                combinedCond = `${triggerStr} && ${conditionStr}`;
            } else {
                combinedCond = triggerStr || conditionStr;
            }

            return `if (${combinedCond}) {\n    ${swapLines}\n}`;
        }).filter(Boolean);

        if (!blocks.length) return '';

        return `// answer swap CYOA here\n${blocks.join('\n')}`;
    },

    buildCandidateSwitchBlocks() {
        const rulesSrc = window.$TCT.jet_data?.cyoa_candidate_switches || {};
        const rules = Object.values(rulesSrc);
        if (!rules.length) return '';

        const blocks = rules.map(rule => {
            const triggers = Array.isArray(rule.triggers) ? rule.triggers.filter(x => Number.isFinite(x)) : [];
            const hasConditions = rule.conditions && Array.isArray(rule.conditions) && rule.conditions.some(c => c && c.variable);
            if (!triggers.length && !hasConditions) return '';

            const candidatePk = Number(rule.candidate);
            if (!Number.isFinite(candidatePk)) return '';

            const opts = [];
            const firstName = String(rule.first_name ?? '').trim();
            const lastName = String(rule.last_name ?? '').trim();
            const colorHex = String(rule.color_hex ?? '').trim();

            if (firstName) opts.push(`first: ${JSON.stringify(firstName)}`);
            if (lastName) opts.push(`last: ${JSON.stringify(lastName)}`);
            if (colorHex) opts.push(`color: ${JSON.stringify(colorHex)}`);

            const issueScores = (Array.isArray(rule.issue_scores) ? rule.issue_scores : [])
                .filter(s => s && Number.isFinite(Number(s.issue)) && Number.isFinite(Number(s.score)));
            if (issueScores.length) {
                const issuePairs = issueScores.map(s => `{ issue: ${Number(s.issue)}, score: ${Number(s.score)} }`).join(', ');
                opts.push(`issueScores: [${issuePairs}]`);
            }

            if (!opts.length) return '';

            let conditionStr = '';
            if (hasConditions) {
                const validConditions = rule.conditions.filter(c => c && c.variable && c.comparator && Number.isFinite(Number(c.value)));
                if (validConditions.length > 0) {
                    const conditionParts = validConditions.map(c => {
                        const left = this.getConditionOperand(c.variable);
                        return `${left} ${c.comparator} ${Number(c.value)}`;
                    });
                    const operator = rule.conditionOperator || 'AND';
                    const joinStr = operator === 'OR' ? ' || ' : ' && ';
                    conditionStr = conditionParts.join(joinStr);
                    if (validConditions.length > 1) conditionStr = '(' + conditionStr + ')';
                }
            }

            let triggerStr = '';
            if (triggers.length > 0) {
                triggerStr = triggers.map(pk => `ans == ${pk}`).join(' || ');
                if (triggers.length > 1) triggerStr = '(' + triggerStr + ')';
            }

            let combinedCond = '';
            if (triggerStr && conditionStr) {
                combinedCond = `${triggerStr} && ${conditionStr}`;
            } else {
                combinedCond = triggerStr || conditionStr;
            }

            return `if (${combinedCond}) {\n    setCandidateIdentity(${candidatePk}, { ${opts.join(', ')} });\n}`;
        }).filter(Boolean);

        if (!blocks.length) return '';

        return `// candidate switch CYOA here\n${blocks.join('\n')}`;
    },

    indentBlock(block, indent) {
        if (!block) return '';
        return block
            .split('\n')
            .map(line => (line.trim().length ? indent + line : line))
            .join('\n');
    },

    insertSwapsInsideCyoAdventure(out, blocksByType = {}) {
        const cleanBlock = (s) => String(s || '').replace(/\r\n/g, '\n').trim();
        let questionBlock = cleanBlock(blocksByType.question);
        let answerBlock = cleanBlock(blocksByType.answer);
        let candidateBlock = cleanBlock(blocksByType.candidate);
        let combinedForInsert = [questionBlock, answerBlock, candidateBlock].filter(Boolean).join('\n\n');

        if (!combinedForInsert) return out;

        // clean up any legacy BEGIN/END wrapped blocks from older exports
        out = out.replace(/\/\/\s*BEGIN_TCT_ANSWER_SWAP_RULES[\s\S]*?\/\/\s*END_TCT_ANSWER_SWAP_RULES\s*/m, '');

        // find cyoAdventure function (assignment form preferred)
        const reAssign = /cyoAdventure\s*=\s*function\s*\(\s*a\s*\)\s*\{/m;
        let m = reAssign.exec(out);
        let openIdx;

        if (m) {
            openIdx = m.index + m[0].length - 1; // position of '{'
        } else {
            const reNamed = /function\s+cyoAdventure\s*\(\s*a?\s*\)\s*\{/m;
            m = reNamed.exec(out);
            if (!m) {
                // as last resort, just append at end without indentation
                return out + `\n\n${combinedForInsert}\n`;
            }
            openIdx = m.index + m[0].length - 1;
        }

        // find matching closing brace to get function body range
        let i = openIdx;
        let depth = 0;
        let closeIdx = -1;
        for (; i < out.length; i++) {
            const ch = out[i];
            if (ch === '{') depth++;
            else if (ch === '}') {
                depth--;
                if (depth === 0) { closeIdx = i; break; }
            }
        }
        if (closeIdx === -1) {
            // malformed; append at end
            return out + `\n\n${combinedForInsert}\n`;
        }

        const bodyStart = openIdx + 1;
        let body = out.slice(bodyStart, closeIdx);

        // if user already has manual logic under section headers, preserve it
        // and avoid rewriting those sections.
        if (questionBlock) {
            const hasManualQuestionSection = /\/\/\s*question swap CYOA here[\s\S]*?questionSwapper\s*\(/m.test(body);
            if (hasManualQuestionSection) questionBlock = '';
        }
        if (answerBlock) {
            const hasManualAnswerSection = /\/\/\s*answer swap CYOA here[\s\S]*?answerSwapper\s*\(/m.test(body);
            if (hasManualAnswerSection) answerBlock = '';
        }
        if (candidateBlock) {
            const hasManualCandidateSection = /\/\/\s*candidate switch CYOA here[\s\S]*?setCandidateIdentity\s*\(/m.test(body);
            if (hasManualCandidateSection) candidateBlock = '';
        }

        combinedForInsert = [questionBlock, answerBlock, candidateBlock].filter(Boolean).join('\n\n');
        if (!combinedForInsert) return out;

        // prefer to insert after noCounter assignment, otherwise after 'ans ='
        const noCounterRe = /\be\.noCounter\s*=\s*campaignTrail_temp\.player_answers\.length\s*;?/m;
        const ansRe = /\bans\s*=\s*campaignTrail_temp\.player_answers\s*\[\s*campaignTrail_temp\.player_answers\.length\s*-\s*1\s*\]\s*;?/m;
        let insertPosInBody = -1;
        let indentForInsert = '    '; // default to 4 spaces
        const noCounterMatch = noCounterRe.exec(body);
        if (noCounterMatch) {
            insertPosInBody = noCounterMatch.index + noCounterMatch[0].length;
            const lineStart = body.lastIndexOf('\n', noCounterMatch.index) + 1;
            const line = body.slice(lineStart, noCounterMatch.index);
            const leadingSpaces = line.match(/^\s*/)?.[0] || '';
            indentForInsert = leadingSpaces || indentForInsert;
        } else {
            const ansMatch = ansRe.exec(body);
            if (ansMatch) {
                insertPosInBody = ansMatch.index + ansMatch[0].length;
                const lineStart = body.lastIndexOf('\n', ansMatch.index) + 1;
                const line = body.slice(lineStart, ansMatch.index);
                const leadingSpaces = line.match(/^\s*/)?.[0] || '';
                indentForInsert = leadingSpaces || indentForInsert;
            } else {
                const genericAnsRe = /\bans\s*=\s*[^;]+;/m;
                const m2 = genericAnsRe.exec(body);
                if (m2) {
                    insertPosInBody = m2.index + m2[0].length;
                    const lineStart = body.lastIndexOf('\n', m2.index) + 1;
                    const line = body.slice(lineStart, m2.index);
                    const leadingSpaces = line.match(/^\s*/)?.[0] || '';
                    indentForInsert = leadingSpaces || indentForInsert;
                }
            }
        }

        const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const replaceSectionByHeader = (srcBody, headerText, blockText) => {
            if (!blockText) return { body: srcBody, replaced: false };

            const headerRe = new RegExp(`^(\\s*)//\\s*${escapeRegExp(headerText)}.*$`, 'm');
            const headerMatch = headerRe.exec(srcBody);
            if (!headerMatch) return { body: srcBody, replaced: false };

            const headerIndent = headerMatch[1] || '';
            const afterHeader = srcBody.slice(headerMatch.index + headerMatch[0].length);
            const nextOtherCommentRe = new RegExp(`^${escapeRegExp(headerIndent)}//(?!\\s*${escapeRegExp(headerText)}\\b).*`, 'm');
            const nextOther = nextOtherCommentRe.exec(afterHeader);
            const replaceEndInBody = headerMatch.index + headerMatch[0].length + (nextOther ? nextOther.index : afterHeader.length);
            const newSection = this.indentBlock(blockText, headerIndent);
            const nextBody = srcBody.slice(0, headerMatch.index) + newSection + srcBody.slice(replaceEndInBody);
            return { body: nextBody, replaced: true };
        };

        let replacedAny = false;
        if (questionBlock) {
            const resQ = replaceSectionByHeader(body, 'question swap CYOA here', questionBlock);
            body = resQ.body;
            replacedAny = replacedAny || resQ.replaced;
        }
        if (answerBlock) {
            const resA = replaceSectionByHeader(body, 'answer swap CYOA here', answerBlock);
            body = resA.body;
            replacedAny = replacedAny || resA.replaced;
        }
        if (candidateBlock) {
            const resC = replaceSectionByHeader(body, 'candidate switch CYOA here', candidateBlock);
            body = resC.body;
            replacedAny = replacedAny || resC.replaced;
        }

        if (replacedAny) {
            body = body.replace(/\n{3,}/g, '\n\n');
            return out.slice(0, bodyStart) + body + out.slice(closeIdx);
        }

        const indentedPayload = '\n' + this.indentBlock(combinedForInsert, indentForInsert) + '\n';

        if (insertPosInBody >= 0) {
            const newBody = body.slice(0, insertPosInBody) + indentedPayload + body.slice(insertPosInBody);
            return out.slice(0, bodyStart) + newBody + out.slice(closeIdx);
        } else {
            // insert at top of body
            const newBody = '\n' + this.indentBlock(combinedForInsert, indentForInsert) + '\n' + body;
            return out.slice(0, bodyStart) + newBody + out.slice(closeIdx);
        }
    },

    insertSwapperAfterHelper(out) {
        const questionSwapFunc = this.buildQuestionSwapperFunction();
        const answerSwapFunc = this.buildAnswerSwapperFunction();
        const candidateSwitchFunc = this.buildCandidateSwitchFunction();
        const hasQuestionSwapper = /function\s+questionSwapper\s*\(/m.test(out);
        const hasAnswerSwapper = /function\s+answerSwapper\s*\(/m.test(out);
        const hasCandidateSwitch = /function\s+setCandidateIdentity\s*\(/m.test(out);

        if (hasQuestionSwapper && hasAnswerSwapper && hasCandidateSwitch) {
            return out;
        }

        const funcsToInsert = [];
        if (!hasQuestionSwapper) funcsToInsert.push(questionSwapFunc);
        if (!hasAnswerSwapper) funcsToInsert.push(answerSwapFunc);
        if (!hasCandidateSwitch) funcsToInsert.push(candidateSwitchFunc);
        const combinedFuncs = funcsToInsert.join('\n\n');

        // try to find getQuestionNumberFromPk function
        const helperRe = /function\s+getQuestionNumberFromPk[\s\S]*?\n}/m;
        const match = helperRe.exec(out);

        if (match) {
            // insert after the helper function
            const insertPos = match.index + match[0].length;
            return out.slice(0, insertPos) + '\n\n' + combinedFuncs + out.slice(insertPos);
        } else {
            return combinedFuncs + '\n\n' + out;
        }
    },

    stripLegacyAnswerSwapCode(out) {
        out = String(out || '');

        const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const removeExactBlock = (src, block) => {
            const trimmed = String(block || '').trim();
            if (!trimmed) return src;
            const pattern = new RegExp(`\\n?\\s*${escapeRegExp(trimmed)}\\s*\\n?`, 'm');
            return src.replace(pattern, '\n');
        };

        // remove a generated section (header comment + contiguous if-blocks) without
        // accidentally eating adjacent manual branching logic
        const removeGeneratedSection = (src, headerText) => {
            const headerRe = new RegExp(`^\\s*//\\s*${escapeRegExp(headerText)}\\s*\\n?`, 'm');
            const m = headerRe.exec(src);
            if (!m) return src;

            let end = m.index + m[0].length;
            const ifBlockRe = /[ \t]*if\s*\([\s\S]*?\n[ \t]*\}\n?/y;
            ifBlockRe.lastIndex = end;
            let ifMatch;
            while ((ifMatch = ifBlockRe.exec(src)) !== null && ifMatch.index === end) {
                end = ifMatch.index + ifMatch[0].length;
                ifBlockRe.lastIndex = end;
            }

            const after = src.slice(end).replace(/^\n+/, '');
            return src.slice(0, m.index) + after;
        };

        out = removeExactBlock(out, this.buildQuestionSwapperFunction());
        out = removeExactBlock(out, this.buildAnswerSwapperFunction());
        out = removeExactBlock(out, this.buildCandidateSwitchFunction());

        out = out.replace(/^\s*\/\/\s*BEGIN_TCT_ANSWER_SWAP_RULES[\s\S]*?^\s*\/\/\s*END_TCT_ANSWER_SWAP_RULES\s*/gm, '');
        out = removeGeneratedSection(out, 'question swap CYOA here');
        out = removeGeneratedSection(out, 'answer swap CYOA here');
        out = removeGeneratedSection(out, 'candidate switch CYOA here');

        return out;
    },

    injectAnswerSwapIntoCode2(code) {
        let out = String(code || '');

        if (!window.$TCT || !window.$TCT.jet_data) {
            return out;
        }

        out = this.stripLegacyAnswerSwapCode(out);

        if (window.$TCT.jet_data.cyoa_enabled) {
            const questionBlocks = this.buildQuestionSwapBlocks();
            const answerBlocks = this.buildAnswerSwapBlocks();
            const candidateBlocks = this.buildCandidateSwitchBlocks();
            const injectInto = (src) => {
                let next = this.insertSwapperAfterHelper(src);
                next = this.insertSwapsInsideCyoAdventure(next, {
                    question: questionBlocks,
                    answer: answerBlocks,
                    candidate: candidateBlocks
                });
                return next;
            };

            const startMarker = '//#startcode';
            const endMarker = '//#endcode';
            const startIdx = out.indexOf(startMarker);
            const endIdx = out.indexOf(endMarker);

            if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
                const blockStart = startIdx + startMarker.length;
                const before = out.slice(0, blockStart);
                const block = out.slice(blockStart, endIdx);
                const after = out.slice(endIdx);
                out = before + injectInto(block) + after;
            } else {
                out = injectInto(out);
            }
        }

        out = this.injectCampaignDataIntoCode2(out);
        return out;
    },

    getCampaignDataRows() {
        const jet = window.$TCT?.jet_data;
        if (!jet || !jet.cyoa_campaign_data_enabled) return [];

        const rows = Object.values(jet.cyoa_campaign_data_stats || {});
        return rows
            .map((row, index) => {
                if (!row || !row.variable) return null;

                const lowMax = Number(row.lowMax);
                const midMax = Number(row.midMax);
                const lowText = String(row.lowText || '').trim();
                const midText = String(row.midText || '').trim();
                const highText = String(row.highText || '').trim();
                if (!lowText || !midText || !highText) return null;
                if (!Number.isFinite(lowMax) || !Number.isFinite(midMax)) return null;

                const sortedLow = Math.min(lowMax, midMax);
                const sortedMid = Math.max(lowMax, midMax);
                const label = String(row.label || row.variable || '').trim() || row.variable;

                const style = this.getCampaignDataStyle();
                const defLow = style.tierLow;
                const defMid = style.tierMid;
                const defHigh = style.tierHigh;

                return {
                    id: Number(row.id || (Date.now() + index)),
                    variable: String(row.variable).trim(),
                    label,
                    showLabel: !!row.showLabel,
                    tiers: [
                        { max: sortedLow, text: lowText, color: defLow },
                        { max: sortedMid, text: midText, color: defMid },
                        { max: 'Infinity', text: highText, color: defHigh }
                    ]
                };
            })
            .filter(Boolean)
            .sort((a, b) => a.id - b.id);
    },

    buildCampaignDataPopupCode() {
        const rows = this.getCampaignDataRows();
        if (!rows.length) return '';

        const escapeTemplateText = (value) => String(value || '')
            .replaceAll('\\', '\\\\')
            .replaceAll('`', '\\`')
            .replaceAll('${', '\\${');

        const style = this.getCampaignDataStyle();
        const defLow = style.tierLow;
        const defMid = style.tierMid;
        const defHigh = style.tierHigh;
        const cyoaBg = style.bg;
        const cyoaBorder = style.border;
        const cyoaText = style.text;
        const cyoaH3Border = style.h3Border;
        const cyoaWidth = style.width;
        const cyoaRadius = style.cornerRadius;
        const cyoaTitleJson = JSON.stringify(style.title);

        const statsRows = rows.map((row) => {
            const tiers = row.tiers || [];
            const t1 = tiers[0] || { max: 0, text: '', color: defLow };
            const t2 = tiers[1] || { max: 2, text: '', color: defMid };
            const t3 = tiers[2] || { max: 'Infinity', text: '', color: defHigh };
            const max1 = Number.isFinite(Number(t1.max)) ? Number(t1.max) : 0;
            const max2 = Number.isFinite(Number(t2.max)) ? Number(t2.max) : 2;
            const max3 = String(t3.max) === 'Infinity' ? 'Infinity' : (Number.isFinite(Number(t3.max)) ? Number(t3.max) : 'Infinity');

            return `    {
            getValue: () => ${row.variable},
            label: \`${escapeTemplateText(row.label)}\`,
            showLabel: ${row.showLabel},
            tiers: [
                [${max1}, \`${escapeTemplateText(t1.text)}\`, \"${t1.color}\"],
                [${max2}, \`${escapeTemplateText(t2.text)}\`, \"${t2.color}\"],
                [${max3}, \`${escapeTemplateText(t3.text)}\`, \"${t3.color}\"],
            ],
        }`;
        }).join(',\n');

        return `
// [JETS_CYOA_CAMPAIGN_DATA_START]
;(() => {
    const styleEl = document.createElement("style");
    styleEl.textContent = \`
        #gameStatsPopup {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: ${cyoaWidth}px;
            background-color: ${cyoaBg};
            border: 2px solid ${cyoaBorder};
            border-radius: ${cyoaRadius}px;
            padding: 10px 12px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
            z-index: 10000;
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 14px;
            color: ${cyoaText};
            cursor: move;
        }
        #gameStatsContent { pointer-events: none; }
        #gameStatsPopup h3 {
            margin: 0 0 8px;
            font-weight: bold;
            border-bottom: 1px solid ${cyoaH3Border};
            padding-bottom: 4px;
            font-size: 16px;
        }
        .stats-list { line-height: 1.5; }
        #btn_game_stats { margin-left: 1.5em; }
    \`;
    document.head.appendChild(styleEl);

    const cyoaTitle = ${cyoaTitleJson};

    const bold = (text, color) =>
        \`<span style="color: \${color}; font-weight: bold">\${text}</span>\`;

    const escapeHtml = (text) =>
        String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    function matchTier(value, tiers) {
        for (const [max, text, color] of tiers) {
            if (value <= max) return [text, color];
        }
        const fallback = tiers.at(-1);
        return [fallback?.[1] || "", fallback?.[2] || "#e6e6e6"];
    }

    // parts wrapped in asterisks (*word*) are colored, while unmarked parts stay plain
    // if the text has no asterisks, the whole sentence is colored
    function highlight(text, color) {
        const parts = String(text || "").split("*");
        if (parts.length <= 1) return bold(text || "", color);
        let out = "";
        for (let i = 0; i < parts.length; i++) {
            const seg = parts[i];
            if (!seg) continue;
            if (i % 2 === 1) {
                out += bold(seg, color);
            } else {
                out += escapeHtml(seg);
            }
        }
        return out;
    }

    const STATS = [
${statsRows}
    ];

    function updateGameStatsPopup() {
        const content = document.getElementById("gameStatsContent");
        if (!content) return;

        const lines = STATS.map(({ getValue, tiers, label, showLabel }) => {
            const value = Number(getValue?.());
            const score = Number.isFinite(value) ? value : 0;
            const [text, color] = matchTier(score, tiers);
            const prefix = showLabel && label ? escapeHtml(label) + ": " : "";
            return "• " + prefix + highlight(text, color) + " " + bold("(" + score + ")", color);
        });

        content.innerHTML = \`
            <h3>\${cyoaTitle}</h3>
            <div class="stats-list">\${lines.join("<br>")}</div>
        \`;
    }

    function createGameStatsPopup() {
        if (document.getElementById("gameStatsPopup")) return;

        const popup = document.createElement("div");
        popup.id = "gameStatsPopup";
        popup.style.display = "none";
        popup.innerHTML = '<div id="gameStatsContent"></div>';
        document.body.appendChild(popup);

        makePopupDraggable(popup);
        updateGameStatsPopup();
    }

    function makePopupDraggable(el) {
        let offsetX, offsetY;

        function onMouseMove(e) {
            const maxX = window.innerWidth - el.offsetWidth;
            const maxY = window.innerHeight - el.offsetHeight;
            el.style.left   = \`\${Math.max(0, Math.min(e.clientX - offsetX, maxX))}px\`;
            el.style.top    = \`\${Math.max(0, Math.min(e.clientY - offsetY, maxY))}px\`;
            el.style.bottom = "auto";
            el.style.right  = "auto";
        }

        function onMouseUp() {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        }

        el.addEventListener("mousedown", (e) => {
            const rect = el.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        });
    }

    function toggleGameStatsPopup() {
        const popup = document.getElementById("gameStatsPopup");
        if (!popup) return;
        const showing = popup.style.display === "none";
        popup.style.display = showing ? "block" : "none";
        if (showing) updateGameStatsPopup();
    }

    function injectGameStatsButton() {
        if (document.getElementById("btn_game_stats")) return;
        const anchor = document.getElementById("view_electoral_map");
        if (!anchor) return;

        const btn = document.createElement("button");
        btn.id = "btn_game_stats";
        btn.textContent = "Campaign Data";
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            toggleGameStatsPopup();
        });
        anchor.insertAdjacentElement("afterend", btn);
    }

    createGameStatsPopup();

    const gameWindow = document.getElementById("game_window");
    if (gameWindow) {
        new MutationObserver(() => {
            injectGameStatsButton();
            updateGameStatsPopup();
        }).observe(gameWindow, { childList: true, subtree: true });
    }
})();
// [JETS_CYOA_CAMPAIGN_DATA_END]
`.trim();
    },

    injectCampaignDataIntoCode2(code) {
        let out = String(code || '');
        const blockStart = '// [JETS_CYOA_CAMPAIGN_DATA_START]';
        const blockEnd = '// [JETS_CYOA_CAMPAIGN_DATA_END]';
        const existingBlockRe = new RegExp(`\\n?\\s*${blockStart.replace(/\[/g, '\\[').replace(/\]/g, '\\]')}[\\s\\S]*?${blockEnd.replace(/\[/g, '\\[').replace(/\]/g, '\\]')}\\n?`, 'g');
        out = out.replace(existingBlockRe, '\n').replace(/\n{3,}/g, '\n\n');

        const campaignBlock = this.buildCampaignDataPopupCode();
        if (!campaignBlock) return out;

        const endMarker = '//#endcode';
        const endIdx = out.indexOf(endMarker);
        if (endIdx !== -1) {
            return out.slice(0, endIdx).replace(/\n+$/, '') + '\n\n' + campaignBlock + '\n' + out.slice(endIdx);
        }

        return out.replace(/\n+$/, '') + '\n\n' + campaignBlock + '\n';
    }
};

registerComponent('cyoa-event', {

    props: ['id'],

    data() {
        return {
            answerVal: null,
            questionVal: null,
            conditionToAdd: {
                variable: '',
                comparator: '>=',
                value: 0
            }
        };
    },

    template: `
    <div class="bg-white rounded-sm shadow-sm p-4">
        <div class="flex justify-between items-start mb-3">
            <div class="text-sm text-gray-700">
                <div class="font-medium">Branch summary</div>
                <div class="mt-1">
                    If player selects answer <span class="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium bg-blue-100 text-blue-800">#{{ answerVal }}</span>,
                    then immediately jump to question <span class="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium bg-purple-100 text-purple-800">#{{ questionVal }}</span>
                    <span v-if="hasConditions">
                        when
                        <span v-for="(c, idx) in conditionsList" :key="'summary-c-'+idx" class="inline-flex items-center">
                            <span class="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium bg-amber-100 text-amber-900 ml-1" :title="displayConditionTooltip(c.variable)">{{ displayConditionVariable(c.variable) }} {{ c.comparator }} {{ c.value }}</span>
                            <span v-if="idx < conditionsList.length - 1" class="mx-1 text-xs">{{ eventRow.conditionOperator }}</span>
                        </span>
                    </span>
                </div>
            </div>
            <button class="bg-red-500 text-white px-3 py-1 rounded-sm hover:bg-red-600" @click="deleteEvent()">Delete</button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-medium mb-1" for="answer">Answer
                <span class="ml-1 text-xs text-gray-500 italic">(triggers the jump)</span></label>
                <select v-model.number="answerVal" name="answer" class="w-full border rounded-sm p-2">
                    <option v-for="answer in answers" :value="answer.pk" :key="answer.pk">
                        {{answer.pk}} - {{description(answer)}}
                    </option>
                </select>
            </div>

            <div>
                <label class="block text-sm font-medium mb-1" for="answer">Question
                <span class="ml-1 text-xs text-gray-500 italic">(to jump to)</span></label>
                <select v-model.number="questionVal" name="question" class="w-full border rounded-sm p-2">
                    <option v-for="question in questions" :value="question.pk" :key="question.pk">
                        {{question.pk}} - {{description(question)}}
                    </option>
                </select>
            </div>
        </div>

        <div class="mt-4">
            <label class="block text-sm font-medium mb-1">Extra conditions (optional)</label>

            <div v-if="hasConditions" class="mb-2 flex items-center gap-2">
                <span class="text-xs text-gray-600">Join with:</span>
                <select :value="eventRow.conditionOperator" @change="updateConditionOperator($event.target.value)" class="border rounded-sm p-1 text-sm">
                    <option value="AND">AND (all must be true)</option>
                    <option value="OR">OR (any can be true)</option>
                </select>
            </div>

            <div v-if="hasConditions" class="mb-2 space-y-1">
                <div v-for="(c, idx) in conditionsList" :key="'cond-'+idx" class="grid grid-cols-4 gap-1 items-center bg-gray-100 p-2 rounded-sm">
                    <div class="text-xs font-medium" :title="displayConditionTooltip(c.variable)">{{ displayConditionVariable(c.variable) }}</div>
                    <div class="text-xs">{{ c.comparator }}</div>
                    <div class="text-xs">{{ c.value }}</div>
                    <button class="text-red-600 hover:text-red-800 text-xs justify-self-end" @click="removeCondition(idx)">✕</button>
                </div>
            </div>

            <div class="grid grid-cols-4 gap-1 items-center">
                <select v-model="conditionToAdd.variable" class="border rounded-sm p-1 text-sm col-span-1">
                    <option value="" disabled>Target...</option>
                    <option v-for="v in conditionTargets" :key="v.value" :value="v.value">{{ v.label }}</option>
                </select>
                <select v-model="conditionToAdd.comparator" class="border rounded-sm p-1 text-sm col-span-1">
                    <option value=">=">&gt;= (greater than or equal)</option>
                    <option value="<=">&lt;= (less than or equal)</option>
                    <option value=">">&gt; (greater than)</option>
                    <option value="<">&lt; (less than)</option>
                    <option value="==">== (equal)</option>
                    <option value="!=">!= (not equal)</option>
                </select>
                <input v-model.number="conditionToAdd.value" type="number" class="border rounded-sm p-1 text-sm col-span-1">
                <button class="bg-gray-300 hover:bg-gray-400 px-2 py-1 rounded-sm text-xs col-span-1" @click="addCondition" :disabled="!conditionToAdd.variable">Add</button>
            </div>
        </div>
    </div>
    `,

    methods: {
        deleteEvent: function () {
            if (confirm('Delete this CYOA event?')) {
                this.$emit('deleteEvent', this.id);
            }
        },

        description: function (qa) {
            if (!qa || !qa.fields || qa.fields.description == null || qa.fields.description === '') {
                return '...';
            }
            const s = qa.fields.description;
            return s.length > 50 ? (s.slice(0, 50) + "...") : s;
        },

        getEvent: function () {
            if (!this.$TCT.jet_data.cyoa_data) {
                this.$TCT.jet_data.cyoa_data = {};
            }
            if (!this.$TCT.jet_data.cyoa_data[this.id]) {
                this.$TCT.jet_data.cyoa_data[this.id] = {
                    id: this.id,
                    answer: null,
                    question: null,
                    conditions: [],
                    conditionOperator: 'AND'
                };
            }
            if (!Array.isArray(this.$TCT.jet_data.cyoa_data[this.id].conditions)) {
                this.$TCT.jet_data.cyoa_data[this.id].conditions = [];
            }
            if (!this.$TCT.jet_data.cyoa_data[this.id].conditionOperator) {
                this.$TCT.jet_data.cyoa_data[this.id].conditionOperator = 'AND';
            }
            return this.$TCT.jet_data.cyoa_data[this.id];
        },

        addCondition() {
            const row = this.getEvent();
            if (!this.conditionToAdd.variable) {
                alert('Please select a target.');
                return;
            }

            row.conditions.push({
                variable: this.conditionToAdd.variable,
                comparator: this.conditionToAdd.comparator,
                value: Number(this.conditionToAdd.value)
            });

            this.conditionToAdd = { variable: '', comparator: '>=', value: 0 };
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        removeCondition(index) {
            const row = this.getEvent();
            row.conditions.splice(index, 1);
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        updateConditionOperator(value) {
            const row = this.getEvent();
            row.conditionOperator = value;
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        displayConditionVariable(name) {
            return window.TCTAnswerSwapHelper.getConditionLabel(name);
        },

        displayConditionTooltip(name) {
            return window.TCTAnswerSwapHelper.getConditionTooltip(name);
        },

        updateGlobal: function (field, val) {
            if (!this.$TCT.jet_data.cyoa_data[this.id]) return;
            const current = this.$TCT.jet_data.cyoa_data[this.id][field];
            if (current === Number(val)) return;
            this.$TCT.jet_data.cyoa_data[this.id][field] = Number(val);
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        syncFromGlobal: function () {
            const row = this.getEvent();
            // fallbacks in case of missing data
            const answers = Object.values(this.$TCT.answers);
            const questions = Array.from(this.$TCT.questions.values());
            this.answerVal = Number(row.answer ?? (answers[0]?.pk ?? 0));
            this.questionVal = Number(row.question ?? (questions[0]?.pk ?? 0));
        }
    },

    mounted() {
        this.syncFromGlobal();
    },

    watch: {
        id() {
            this.syncFromGlobal();
        },
        answerVal(val) {
            this.updateGlobal('answer', val);
        },
        questionVal(val) {
            this.updateGlobal('question', val);
        }
    },

    computed: {
        currentQuestion: function () {
            const row = this.$TCT.jet_data.cyoa_data[this.id] || {};
            return row.question;
        },

        currentAnswer: function () {
            const row = this.$TCT.jet_data.cyoa_data[this.id] || {};
            return row.answer;
        },

        eventRow() {
            this.$globalData.dataVersion;
            return this.getEvent();
        },

        conditionTargets() {
            const vars = (this.$TCT.getAllCyoaVariables?.() || []).map(v => ({ value: v.name, label: v.name }));
            return [{ value: '__NO_COUNTER__', label: 'Question number (starts at 0)' }, ...vars];
        },

        hasConditions() {
            this.$globalData.dataVersion;
            const row = this.getEvent();
            return Array.isArray(row.conditions) && row.conditions.length > 0;
        },

        conditionsList() {
            this.$globalData.dataVersion;
            const row = this.getEvent();
            return row.conditions || [];
        },

        questions: function () {
            return Array.from(this.$TCT.questions.values());
        },

        answers: function () {
            return Object.values(this.$TCT.answers);
        },
    }
})

registerComponent('cyoa-variable', {

    props: ['id'],

    data() {
        return {
            nameVal: '',
            defaultValueVal: 0
        };
    },

    template: `
    <div class="bg-white rounded-sm shadow-sm p-3 border-l-4 border-blue-400">
        <div class="flex justify-between items-start mb-2">
            <div class="text-sm text-gray-700">
                <div class="font-medium">Variable</div>
            </div>
            <button class="text-red-600 hover:text-red-800 text-sm" @click="deleteVariable()" aria-label="Delete variable">
                ✕
            </button>
        </div>

        <div class="grid grid-cols-2 gap-3">
            <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Variable name:</label>
                <input
                    v-model="nameVal"
                    name="name"
                    type="text"
                    class="w-full border rounded-sm p-2 text-sm"
                    placeholder="e.g. wins, trust">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Starting value:</label>
                <input
                    v-model.number="defaultValueVal"
                    name="defaultValue"
                    type="number"
                    class="w-full border rounded-sm p-2 text-sm">
            </div>
        </div>
    </div>
    `,

    methods: {
        deleteVariable: function () {
            if (confirm('Delete this variable? This will also remove all effects that use this variable.')) {
                this.$emit('deleteVariable', this.id);
            }
        },

        updateGlobal: function (field, val) {
            if (!this.$TCT.jet_data.cyoa_variables[this.id]) return;
            const current = this.$TCT.jet_data.cyoa_variables[this.id][field];
            if (current === val) return;
            this.$TCT.jet_data.cyoa_variables[this.id][field] = val;
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        syncFromGlobal: function () {
            const variable = this.$TCT.jet_data.cyoa_variables[this.id] || {};
            this.nameVal = variable.name || '';
            this.defaultValueVal = variable.defaultValue || 0;
        }
    },

    mounted() {
        this.syncFromGlobal();
    },

    watch: {
        id() {
            this.syncFromGlobal();
        },
        nameVal(val) {
            this.updateGlobal('name', val);
        },
        defaultValueVal(val) {
            this.updateGlobal('defaultValue', val);
        }
    }
})

registerComponent('cyoa-campaign-stat', {
    props: ['id'],

    methods: {
        getRow() {
            if (!this.$TCT.jet_data.cyoa_campaign_data_stats) {
                this.$TCT.jet_data.cyoa_campaign_data_stats = {};
            }
            if (!this.$TCT.jet_data.cyoa_campaign_data_stats[this.id]) {
                const firstVar = (this.$TCT.getAllCyoaVariables?.() || [])[0]?.name || '';
                this.$TCT.jet_data.cyoa_campaign_data_stats[this.id] = {
                    id: this.id,
                    variable: firstVar,
                    label: firstVar,
                    showLabel: false,
                    lowMax: 0,
                    midMax: 2,
                    lowText: `${firstVar} is struggling.`,
                    midText: `${firstVar} is steady.`,
                    highText: `${firstVar} is surging.`
                };
            }
            return this.$TCT.jet_data.cyoa_campaign_data_stats[this.id];
        },

        updateField(field, value) {
            const row = this.getRow();
            row[field] = value;
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        onVariableChanged(value) {
            const row = this.getRow();
            const oldVar = row.variable;
            row.variable = value;
            if (!row.label || row.label === oldVar) {
                row.label = value;
            }
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        }
    },

    computed: {
        row() {
            this.$globalData.dataVersion;
            return this.getRow();
        },

        variableOptions() {
            this.$globalData.dataVersion;
            return this.$TCT.getAllCyoaVariables?.() || [];
        }
    },

    template: `
    <div class="bg-white rounded-sm shadow-sm p-3 border-l-4 border-teal-400">
        <div class="flex justify-between items-start mb-2">
            <div class="text-sm text-gray-700">
                <div class="font-medium">Tracked variable #{{ id }}</div>
                <div class="text-xs text-gray-500">Flavor text is shown based on score thresholds.</div>
            </div>
            <button class="text-red-600 hover:text-red-800 text-sm" @click="$emit('deleteStat', id)" aria-label="Delete tracked variable">✕</button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
            <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Variable</label>
                <select :value="row.variable" @change="onVariableChanged($event.target.value)" class="w-full border rounded-sm p-2 text-sm">
                    <option v-for="v in variableOptions" :key="v.id" :value="v.name">{{ v.name }}</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Display label</label>
                <input :value="row.label" @input="updateField('label', $event.target.value)" type="text" class="w-full border rounded-sm p-2 text-sm" placeholder="Shown in the modal">
            </div>
        </div>

        <div class="flex items-center gap-2 mb-3">
            <input :id="'showLabel-' + id" type="checkbox" :checked="!!row.showLabel" @change="updateField('showLabel', $event.target.checked)" class="h-4 w-4">
            <label :for="'showLabel-' + id" class="text-xs font-medium text-gray-600">Show the label in front of the flavor text</label>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Low tier max (<=)</label>
                <input :value="row.lowMax" @input="updateField('lowMax', Number($event.target.value))" type="number" class="w-full border rounded-sm p-2 text-sm">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Mid tier max (<=)</label>
                <input :value="row.midMax" @input="updateField('midMax', Number($event.target.value))" type="number" class="w-full border rounded-sm p-2 text-sm">
            </div>
        </div>

        <div class="grid grid-cols-1 gap-2">
            <p class="text-xs text-gray-500 italic">Wrap the part you want colored in asterisks, e.g. <code>*strong*</code>. Leave it unmarked to color the whole sentence.</p>
            <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Low tier flavor text</label>
                <input :value="row.lowText" @input="updateField('lowText', $event.target.value)" type="text" class="w-full border rounded-sm p-2 text-sm" placeholder="e.g. *Liberal* is struggling.">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Mid tier flavor text</label>
                <input :value="row.midText" @input="updateField('midText', $event.target.value)" type="text" class="w-full border rounded-sm p-2 text-sm" placeholder="e.g. Bush has *strong* congressional relations.">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">High tier flavor text</label>
                <input :value="row.highText" @input="updateField('highText', $event.target.value)" type="text" class="w-full border rounded-sm p-2 text-sm" placeholder="e.g. Bush is *surging*.">
            </div>
        </div>
    </div>
    `
})

// small global helper to trigger autosave only when enabled
window.requestAutosaveIfEnabled = function () {
    if (window.autosaveEnabled) {
        window.requestAutosaveDebounced?.();
    }
};

// Single Answer Swap Rule editor
registerComponent('cyoa-question-swap', {
    props: ['id'],

    data() {
        return {
            triggerToAdd: null,
            conditionToAdd: {
                variable: '',
                comparator: '>=',
                value: 0
            }
        };
    },

    methods: {
        getRule() {
            if (!this.$TCT.jet_data.cyoa_question_swaps) {
                this.$TCT.jet_data.cyoa_question_swaps = {};
            }
            if (!this.$TCT.jet_data.cyoa_question_swaps[this.id]) {
                this.$TCT.jet_data.cyoa_question_swaps[this.id] = {
                    id: this.id,
                    triggers: [],
                    conditions: [],
                    conditionOperator: 'AND',
                    swaps: []
                };
            }
            if (!this.$TCT.jet_data.cyoa_question_swaps[this.id].conditions) {
                this.$TCT.jet_data.cyoa_question_swaps[this.id].conditions = [];
            }
            if (!this.$TCT.jet_data.cyoa_question_swaps[this.id].conditionOperator) {
                this.$TCT.jet_data.cyoa_question_swaps[this.id].conditionOperator = 'AND';
            }
            return this.$TCT.jet_data.cyoa_question_swaps[this.id];
        },

        addTrigger() {
            const rule = this.getRule();
            const val = Number(this.triggerToAdd);
            if (!val) return;
            if (!rule.triggers.includes(val)) {
                rule.triggers.push(val);
                this.triggerToAdd = null;
                this.$globalData.dataVersion++;
                window.requestAutosaveIfEnabled?.();
            }
        },

        removeTrigger(pk) {
            const rule = this.getRule();
            rule.triggers = rule.triggers.filter(x => x !== pk);
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        addCondition() {
            const rule = this.getRule();
            if (!this.conditionToAdd.variable) {
                alert('Please select a variable.');
                return;
            }

            rule.conditions.push({
                variable: this.conditionToAdd.variable,
                comparator: this.conditionToAdd.comparator,
                value: Number(this.conditionToAdd.value)
            });

            this.conditionToAdd = { variable: '', comparator: '>=', value: 0 };
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        removeCondition(index) {
            const rule = this.getRule();
            if (rule.conditions) {
                rule.conditions.splice(index, 1);
                this.$globalData.dataVersion++;
                window.requestAutosaveIfEnabled?.();
            }
        },

        updateConditionOperator(value) {
            const rule = this.getRule();
            rule.conditionOperator = value;
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        addSwap() {
            const rule = this.getRule();
            rule.swaps.push({ pk1: null, pk2: null });
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        removeSwap(index) {
            const rule = this.getRule();
            rule.swaps.splice(index, 1);
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        updateSwap(index, field, value) {
            const rule = this.getRule();
            if (!rule.swaps[index]) return;

            const newSwap = { ...rule.swaps[index] };
            newSwap[field] = Number(value) || null;

            rule.swaps[index] = newSwap;
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        displayConditionVariable(name) {
            return window.TCTAnswerSwapHelper.getConditionLabel(name);
        },

        displayConditionTooltip(name) {
            return window.TCTAnswerSwapHelper.getConditionTooltip(name);
        }
    },

    computed: {
        rule() {
            this.$globalData.dataVersion;
            return this.getRule();
        },

        tick() {
            return this.$globalData.dataVersion;
        },

        conditionTargets() {
            const vars = (this.$TCT.getAllCyoaVariables?.() || []).map(v => ({ value: v.name, label: v.name }));
            return [{ value: '__NO_COUNTER__', label: 'Question number (starts at 0)' }, ...vars];
        },

        answers() {
            return Object.values(this.$TCT.answers || {});
        },

        questions() {
            return Array.from(this.$TCT.questions?.values() || []);
        },

        hasConditions() {
            this.$globalData.dataVersion;
            const rule = this.getRule();
            return rule.conditions && rule.conditions.length > 0;
        },

        conditionsList() {
            this.$globalData.dataVersion;
            const rule = this.getRule();
            return rule.conditions || [];
        },

        validSwaps() {
            this.$globalData.dataVersion;
            return (this.rule.swaps || []).filter(s => s.pk1 != null && s.pk2 != null);
        }
    },

    template: `
    <div class="bg-white rounded-sm shadow-sm p-3 border-l-4 border-indigo-400">
        <div class="flex justify-between items-start mb-2">
            <div class="text-sm text-gray-700">
                <div class="font-medium">Question swap rule #{{ id }}</div>
                <div class="text-xs text-gray-500">
                    (Question swaps are applied after each answer is recorded, allowing you to dynamically change which questions appear.)
                </div>
            </div>
            <button class="text-red-600 hover:text-red-800 text-sm" @click="$emit('deleteRule', id)" aria-label="Delete rule">✕</button>
        </div>

        <div class="mb-3 p-2 bg-indigo-50 rounded-sm text-sm text-indigo-900 border border-indigo-100">
            <span class="font-bold mr-1">Swap summary:</span>
            <span v-if="rule.triggers.length > 0">
                When answers <span v-for="(pk, idx) in rule.triggers" :key="idx" class="font-mono bg-indigo-200 px-1 rounded mx-0.5">#{{pk}}</span> are selected<span v-if="hasConditions"> and </span><span v-else>, </span>
            </span>
            <span v-if="hasConditions">
                if <span v-for="(c, idx) in conditionsList" :key="idx">
                    <span class="font-mono bg-indigo-200 px-1 rounded mx-0.5" :title="displayConditionTooltip(c.variable)">{{displayConditionVariable(c.variable)}} {{c.comparator}} {{c.value}}</span>
                    <span v-if="idx < conditionsList.length - 1"> {{rule.conditionOperator}} </span>
                </span>,
            </span>
            <span v-if="validSwaps.length > 0">
                swap <span v-for="(s, idx) in validSwaps" :key="idx">
                    <span class="font-mono bg-indigo-200 px-1 rounded mx-0.5">Q#{{s.pk1}} ↔ Q#{{s.pk2}}</span>
                    <span v-if="idx < validSwaps.length - 1"> and </span>
                </span>
            </span>
            <span v-else class="italic text-gray-500">No swaps defined yet.</span>
        </div>

        <!-- Triggers -->
        <div class="mb-3">
            <label class="block text-xs font-medium text-gray-600 mb-1">Trigger answers (optional):</label>
            <div class="flex items-center gap-2">
                <select v-model.number="triggerToAdd" class="border rounded-sm p-1 text-sm">
                    <option :value="null" disabled>Select answer...</option>
                    <option v-for="a in answers" :key="a.pk" :value="a.pk">
                        {{ a.pk }} - {{ (a.fields?.description || '...').slice(0,50) }}
                    </option>
                </select>
                <button class="bg-blue-500 text-white px-2 py-1 rounded-sm text-xs hover:bg-blue-600" @click="addTrigger">Add</button>
            </div>
            <div class="mt-2 flex flex-wrap gap-1">
                <span v-for="pk in rule.triggers" :key="'t-'+pk+'-'+tick" class="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-0.5 rounded-sm text-xs">
                    #{{ pk }}
                    <button class="ml-1 text-blue-700 hover:text-blue-900" @click="removeTrigger(pk)" aria-label="Remove">✕</button>
                </span>
            </div>
        </div>

        <!-- Multiple conditions -->
        <div class="mb-3">
            <label class="block text-xs font-medium text-gray-600 mb-1">Conditions (optional):</label>

            <!-- Condition operator selector (only show if conditions exist) -->
            <div v-if="hasConditions" class="mb-2 flex items-center gap-2">
                <span class="text-xs text-gray-600">Join with:</span>
                <select :value="rule.conditionOperator" @change="updateConditionOperator($event.target.value)" class="border rounded-sm p-1 text-sm">
                    <option value="AND">AND (all must be true)</option>
                    <option value="OR">OR (any can be true)</option>
                </select>
            </div>

            <!-- Existing conditions list -->
            <div v-if="hasConditions" class="mb-2 space-y-1">
                <div v-for="(c, idx) in conditionsList" :key="'c-'+idx+'-'+tick" class="grid grid-cols-4 gap-1 items-center bg-gray-100 p-2 rounded-sm">
                    <div class="text-xs font-medium" :title="displayConditionTooltip(c.variable)">{{ displayConditionVariable(c.variable) }}</div>
                    <div class="text-xs">{{ c.comparator }}</div>
                    <div class="text-xs">{{ c.value }}</div>
                    <button class="text-red-600 hover:text-red-800 text-xs justify-self-end" @click="removeCondition(idx)">✕</button>
                </div>
            </div>

            <!-- Add new condition -->
            <div class="grid grid-cols-4 gap-1 items-center">
                <select v-model="conditionToAdd.variable" class="border rounded-sm p-1 text-sm col-span-1">
                    <option value="" disabled>Target...</option>
                    <option v-for="v in conditionTargets" :key="v.value" :value="v.value">{{ v.label }}</option>
                </select>
                <select v-model="conditionToAdd.comparator" class="border rounded-sm p-1 text-sm col-span-1">
                    <option value=">=">&gt;= (greater than or equal)</option>
                    <option value="<=">&lt;= (less than or equal)</option>
                    <option value=">">&gt; (greater than)</option>
                    <option value="<">&lt; (less than)</option>
                    <option value="==">== (equal)</option>
                    <option value="!=">!= (not equal)</option>
                </select>
                <input v-model.number="conditionToAdd.value" type="number" class="border rounded-sm p-1 text-sm col-span-1">
                <button class="bg-gray-300 hover:bg-gray-400 px-2 py-1 rounded-sm text-xs col-span-1" @click="addCondition" :disabled="!conditionToAdd.variable">Add</button>
            </div>
        </div>

        <!-- Swaps -->
        <div class="mb-1">
            <label class="block text-xs font-medium text-gray-600 mb-1">Question swaps to apply:</label>
            <div v-for="(s,idx) in rule.swaps" :key="'s-'+idx+'-'+tick" class="grid grid-cols-1 md:grid-cols-5 gap-2 items-center mb-2">
                <div class="md:col-span-2">
                    <label class="block text-[10px] text-gray-500 mb-0.5">Question PK 1</label>
                    <select :value="s.pk1" @change="updateSwap(idx,'pk1',$event.target.value)" class="border rounded-sm p-1 text-sm w-full">
                        <option :value="null" disabled>Select question...</option>
                        <option v-for="q in questions" :key="'pk1-'+q.pk" :value="q.pk">
                            {{ q.pk }} - {{ (q.fields?.question || '...').slice(0,40) }}
                        </option>
                    </select>
                </div>
                <div class="md:col-span-2">
                    <label class="block text-[10px] text-gray-500 mb-0.5">Question PK 2</label>
                    <select :value="s.pk2" @change="updateSwap(idx,'pk2',$event.target.value)" class="border rounded-sm p-1 text-sm w-full">
                        <option :value="null" disabled>Select question...</option>
                        <option v-for="q in questions" :key="'pk2-'+q.pk" :value="q.pk">
                            {{ q.pk }} - {{ (q.fields?.question || '...').slice(0,40) }}
                        </option>
                    </select>
                </div>
                <div class="flex items-center gap-2">
                    <button class="text-red-600 hover:text-red-800 text-xs" @click="removeSwap(idx)">✕</button>
                </div>
            </div>
            <button class="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded-sm text-xs" @click="addSwap">Add another swap</button>
        </div>
    </div>
    `
})

registerComponent('cyoa-answer-swap', {
    props: ['id'],

    data() {
        return {
            triggerToAdd: null,
            conditionToAdd: {
                variable: '',
                comparator: '>=',
                value: 0
            }
        };
    },

    methods: {
        getRule() {
            if (!this.$TCT.jet_data.cyoa_answer_swaps) {
                this.$TCT.jet_data.cyoa_answer_swaps = {};
            }
            if (!this.$TCT.jet_data.cyoa_answer_swaps[this.id]) {
                this.$TCT.jet_data.cyoa_answer_swaps[this.id] = {
                    id: this.id,
                    triggers: [],
                    conditions: [],
                    conditionOperator: 'AND',
                    swaps: []
                };
            }
            if (!this.$TCT.jet_data.cyoa_answer_swaps[this.id].conditions) {
                this.$TCT.jet_data.cyoa_answer_swaps[this.id].conditions = [];
            }
            if (!this.$TCT.jet_data.cyoa_answer_swaps[this.id].conditionOperator) {
                this.$TCT.jet_data.cyoa_answer_swaps[this.id].conditionOperator = 'AND';
            }
            return this.$TCT.jet_data.cyoa_answer_swaps[this.id];
        },

        addTrigger() {
            const rule = this.getRule();
            const val = Number(this.triggerToAdd);
            if (!val) return;
            if (!rule.triggers.includes(val)) {
                rule.triggers.push(val);
                this.triggerToAdd = null;
                this.$globalData.dataVersion++;
                window.requestAutosaveIfEnabled?.();
            }
        },

        removeTrigger(pk) {
            const rule = this.getRule();
            rule.triggers = rule.triggers.filter(x => x !== pk);
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        addCondition() {
            const rule = this.getRule();
            if (!this.conditionToAdd.variable) {
                alert('Please select a variable.');
                return;
            }

            rule.conditions.push({
                variable: this.conditionToAdd.variable,
                comparator: this.conditionToAdd.comparator,
                value: Number(this.conditionToAdd.value)
            });

            this.conditionToAdd = { variable: '', comparator: '>=', value: 0 };
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        removeCondition(index) {
            const rule = this.getRule();
            if (rule.conditions) {
                rule.conditions.splice(index, 1);
                this.$globalData.dataVersion++;
                window.requestAutosaveIfEnabled?.();
            }
        },

        updateConditionOperator(value) {
            const rule = this.getRule();
            rule.conditionOperator = value;
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        addSwap() {
            const rule = this.getRule();
            rule.swaps.push({ pk1: null, pk2: null, takeEffects: true });
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        removeSwap(index) {
            const rule = this.getRule();
            rule.swaps.splice(index, 1);
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        updateSwap(index, field, value) {
            const rule = this.getRule();
            if (!rule.swaps[index]) return;

            const newSwap = { ...rule.swaps[index] };

            if (field === 'takeEffects') {
                newSwap.takeEffects = !!value;
            } else {
                newSwap[field] = Number(value) || null;
            }

            rule.swaps[index] = newSwap;
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        displayConditionVariable(name) {
            return window.TCTAnswerSwapHelper.getConditionLabel(name);
        },

        displayConditionTooltip(name) {
            return window.TCTAnswerSwapHelper.getConditionTooltip(name);
        }
    },

    computed: {
        rule() {
            this.$globalData.dataVersion;
            return this.getRule();
        },

        tick() {
            return this.$globalData.dataVersion;
        },

        conditionTargets() {
            const vars = (this.$TCT.getAllCyoaVariables?.() || []).map(v => ({ value: v.name, label: v.name }));
            return [{ value: '__NO_COUNTER__', label: 'Question number (starts at 0)' }, ...vars];
        },

        answers() {
            return Object.values(this.$TCT.answers || {});
        },

        hasConditions() {
            this.$globalData.dataVersion;
            const rule = this.getRule();
            return rule.conditions && rule.conditions.length > 0;
        },

        conditionsList() {
            this.$globalData.dataVersion;
            const rule = this.getRule();
            return rule.conditions || [];
        },

        validSwaps() {
            this.$globalData.dataVersion;
            return (this.rule.swaps || []).filter(s => s.pk1 != null && s.pk2 != null);
        }
    },

    template: `
    <div class="bg-white rounded-sm shadow-sm p-3 border-l-4 border-purple-400">
        <div class="flex justify-between items-start mb-2">
            <div class="text-sm text-gray-700">
                <div class="font-medium">Swap rule #{{ id }}</div>
                <div class="text-xs text-gray-500">
                    (Swaps are applied after each answer is recorded, so swapping answers that have already been given will not retroactively change past answers.)
                </div>
            </div>
            <button class="text-red-600 hover:text-red-800 text-sm" @click="$emit('deleteRule', id)" aria-label="Delete rule">✕</button>
        </div>

        <div class="mb-3 p-2 bg-purple-50 rounded-sm text-sm text-purple-900 border border-purple-100">
            <span class="font-bold mr-1">Swap summary:</span>
            <span v-if="rule.triggers.length > 0">
                When answers <span v-for="(pk, idx) in rule.triggers" :key="idx" class="font-mono bg-purple-200 px-1 rounded mx-0.5">#{{pk}}</span> are selected<span v-if="hasConditions"> and </span><span v-else>, </span>
            </span>
            <span v-if="hasConditions">
                if <span v-for="(c, idx) in conditionsList" :key="idx">
                    <span class="font-mono bg-purple-200 px-1 rounded mx-0.5" :title="displayConditionTooltip(c.variable)">{{displayConditionVariable(c.variable)}} {{c.comparator}} {{c.value}}</span>
                    <span v-if="idx < conditionsList.length - 1"> {{rule.conditionOperator}} </span>
                </span>,
            </span>
            <span v-if="validSwaps.length > 0">
                swap <span v-for="(s, idx) in validSwaps" :key="idx">
                    <span class="font-mono bg-purple-200 px-1 rounded mx-0.5">A#{{s.pk1}} ↔ A#{{s.pk2}}</span>
                    <span v-if="idx < validSwaps.length - 1"> and </span>
                </span>
            </span>
            <span v-else class="italic text-gray-500">No swaps defined yet.</span>
        </div>

        <!-- Triggers -->
        <div class="mb-3">
            <label class="block text-xs font-medium text-gray-600 mb-1">Trigger answers (optional):</label>
            <div class="flex items-center gap-2">
                <select v-model.number="triggerToAdd" class="border rounded-sm p-1 text-sm">
                    <option :value="null" disabled>Select answer...</option>
                    <option v-for="a in answers" :key="a.pk" :value="a.pk">
                        {{ a.pk }} - {{ (a.fields?.description || '...').slice(0,50) }}
                    </option>
                </select>
                <button class="bg-blue-500 text-white px-2 py-1 rounded-sm text-xs hover:bg-blue-600" @click="addTrigger">Add</button>
            </div>
            <div class="mt-2 flex flex-wrap gap-1">
                <span v-for="pk in rule.triggers" :key="'t-'+pk+'-'+tick" class="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-0.5 rounded-sm text-xs">
                    #{{ pk }}
                    <button class="ml-1 text-blue-700 hover:text-blue-900" @click="removeTrigger(pk)" aria-label="Remove">✕</button>
                </span>
            </div>
        </div>

        <!-- Multiple conditions -->
        <div class="mb-3">
            <label class="block text-xs font-medium text-gray-600 mb-1">Conditions (optional):</label>

            <!-- Condition operator selector (only show if conditions exist) -->
            <div v-if="hasConditions" class="mb-2 flex items-center gap-2">
                <span class="text-xs text-gray-600">Join with:</span>
                <select :value="rule.conditionOperator" @change="updateConditionOperator($event.target.value)" class="border rounded-sm p-1 text-sm">
                    <option value="AND">AND (all must be true)</option>
                    <option value="OR">OR (any can be true)</option>
                </select>
            </div>

            <!-- Existing conditions list -->
            <div v-if="hasConditions" class="mb-2 space-y-1">
                <div v-for="(c, idx) in conditionsList" :key="'c-'+idx+'-'+tick" class="grid grid-cols-4 gap-1 items-center bg-gray-100 p-2 rounded-sm">
                    <div class="text-xs font-medium" :title="displayConditionTooltip(c.variable)">{{ displayConditionVariable(c.variable) }}</div>
                    <div class="text-xs">{{ c.comparator }}</div>
                    <div class="text-xs">{{ c.value }}</div>
                    <button class="text-red-600 hover:text-red-800 text-xs justify-self-end" @click="removeCondition(idx)">✕</button>
                </div>
            </div>

            <!-- Add new condition -->
            <div class="grid grid-cols-4 gap-1 items-center">
                <select v-model="conditionToAdd.variable" class="border rounded-sm p-1 text-sm col-span-1">
                    <option value="" disabled>Target...</option>
                    <option v-for="v in conditionTargets" :key="v.value" :value="v.value">{{ v.label }}</option>
                </select>
                <select v-model="conditionToAdd.comparator" class="border rounded-sm p-1 text-sm col-span-1">
                    <option value=">=">&gt;= (greater than or equal)</option>
                    <option value="<=">&lt;= (less than or equal)</option>
                    <option value=">">&gt; (greater than)</option>
                    <option value="<">&lt; (less than)</option>
                    <option value="==">== (equal)</option>
                    <option value="!=">!= (not equal)</option>
                </select>
                <input v-model.number="conditionToAdd.value" type="number" class="border rounded-sm p-1 text-sm col-span-1">
                <button class="bg-gray-300 hover:bg-gray-400 px-2 py-1 rounded-sm text-xs col-span-1" @click="addCondition" :disabled="!conditionToAdd.variable">Add</button>
            </div>
        </div>

        <!-- Swaps -->
        <div class="mb-1">
            <label class="block text-xs font-medium text-gray-600 mb-1">Swaps to apply:</label>
            <div v-for="(s,idx) in rule.swaps" :key="'s-'+idx+'-'+tick" class="grid grid-cols-1 md:grid-cols-5 gap-2 items-center mb-2">
                <div class="md:col-span-2">
                    <label class="block text-[10px] text-gray-500 mb-0.5">Answer PK 1</label>
                    <select :value="s.pk1" @change="updateSwap(idx,'pk1',$event.target.value)" class="border rounded-sm p-1 text-sm w-full">
                        <option :value="null" disabled>Select answer...</option>
                        <option v-for="a in answers" :key="'pk1-'+a.pk" :value="a.pk">
                            {{ a.pk }} - {{ (a.fields?.description || '...').slice(0,40) }}
                        </option>
                    </select>
                </div>
                <div class="md:col-span-2">
                    <label class="block text-[10px] text-gray-500 mb-0.5">Answer PK 2</label>
                    <select :value="s.pk2" @change="updateSwap(idx,'pk2',$event.target.value)" class="border rounded-sm p-1 text-sm w-full">
                        <option :value="null" disabled>Select answer...</option>
                        <option v-for="a in answers" :key="'pk2-'+a.pk" :value="a.pk">
                            {{ a.pk }} - {{ (a.fields?.description || '...').slice(0,40) }}
                        </option>
                    </select>
                </div>
                <div class="flex items-center gap-2">
                    <label class="inline-flex items-center text-xs">
                        <input type="checkbox" :checked="s.takeEffects" @change="updateSwap(idx,'takeEffects',$event.target.checked)" class="mr-1">
                        Take effects
                    </label>
                    <button class="text-red-600 hover:text-red-800 text-xs" @click="removeSwap(idx)">✕</button>
                </div>
            </div>
            <button class="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded-sm text-xs" @click="addSwap">Add another swap</button>
        </div>
    </div>
    `
})

registerComponent('cyoa-candidate-switch', {
    props: ['id'],

    data() {
        return {
            triggerToAdd: null,
            newIssuePk: null,
            conditionToAdd: {
                variable: '',
                comparator: '>=',
                value: 0
            }
        };
    },

    methods: {
        getRule() {
            if (!this.$TCT.jet_data.cyoa_candidate_switches) {
                this.$TCT.jet_data.cyoa_candidate_switches = {};
            }
            if (!this.$TCT.jet_data.cyoa_candidate_switches[this.id]) {
                this.$TCT.jet_data.cyoa_candidate_switches[this.id] = {
                    id: this.id,
                    triggers: [],
                    conditions: [],
                    conditionOperator: 'AND',
                    candidate: null,
                    first_name: '',
                    last_name: '',
                    color_hex: '',
                    issue_scores: []
                };
            }
            const rule = this.$TCT.jet_data.cyoa_candidate_switches[this.id];
            if (!Array.isArray(rule.conditions)) rule.conditions = [];
            if (!rule.conditionOperator) rule.conditionOperator = 'AND';
            if (!Array.isArray(rule.issue_scores)) rule.issue_scores = [];
            return rule;
        },

        addTrigger() {
            const rule = this.getRule();
            const val = Number(this.triggerToAdd);
            if (!val) return;
            if (!rule.triggers.includes(val)) {
                rule.triggers.push(val);
                this.triggerToAdd = null;
                this.$globalData.dataVersion++;
                window.requestAutosaveIfEnabled?.();
            }
        },

        removeTrigger(pk) {
            const rule = this.getRule();
            rule.triggers = rule.triggers.filter(x => x !== pk);
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        addCondition() {
            const rule = this.getRule();
            if (!this.conditionToAdd.variable) {
                alert('Please select a variable.');
                return;
            }

            rule.conditions.push({
                variable: this.conditionToAdd.variable,
                comparator: this.conditionToAdd.comparator,
                value: Number(this.conditionToAdd.value)
            });

            this.conditionToAdd = { variable: '', comparator: '>=', value: 0 };
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        removeCondition(index) {
            const rule = this.getRule();
            if (rule.conditions) {
                rule.conditions.splice(index, 1);
                this.$globalData.dataVersion++;
                window.requestAutosaveIfEnabled?.();
            }
        },

        updateConditionOperator(value) {
            const rule = this.getRule();
            rule.conditionOperator = value;
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        updateField(field, value) {
            const rule = this.getRule();
            rule[field] = value;
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        getCandidateIssueScore(issuePk) {
            const cand = Number(this.rule.candidate);
            if (!Number.isFinite(cand)) return 0;
            const row = Object.values(this.$TCT.candidate_issue_score || {}).find(
                s => Number(s.fields?.candidate) === cand && Number(s.fields?.issue) === Number(issuePk)
            );
            return row ? Number(row.fields.issue_score) : 0;
        },

        addIssueScore() {
            const rule = this.getRule();
            const val = Number(this.newIssuePk);
            if (!val) return;
            if (!rule.issue_scores.some(s => Number(s.issue) === val)) {
                rule.issue_scores.push({
                    issue: val,
                    score: this.getCandidateIssueScore(val)
                });
                this.newIssuePk = null;
                this.$globalData.dataVersion++;
                window.requestAutosaveIfEnabled?.();
            }
        },

        updateIssueScore(index, field, value) {
            const rule = this.getRule();
            if (!rule.issue_scores[index]) return;
            const newRow = { ...rule.issue_scores[index] };
            if (field === 'issue') {
                newRow.issue = Number(value) || null;
            } else {
                newRow.score = Number(value) || 0;
            }
            rule.issue_scores[index] = newRow;
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        removeIssueScore(index) {
            const rule = this.getRule();
            rule.issue_scores.splice(index, 1);
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        displayConditionVariable(name) {
            return window.TCTAnswerSwapHelper.getConditionLabel(name);
        },

        displayConditionTooltip(name) {
            return window.TCTAnswerSwapHelper.getConditionTooltip(name);
        }
    },

    computed: {
        rule() {
            this.$globalData.dataVersion;
            return this.getRule();
        },

        tick() {
            return this.$globalData.dataVersion;
        },

        conditionTargets() {
            const vars = (this.$TCT.getAllCyoaVariables?.() || []).map(v => ({ value: v.name, label: v.name }));
            return [{ value: '__NO_COUNTER__', label: 'Question number (starts at 0)' }, ...vars];
        },

        answers() {
            return Object.values(this.$TCT.answers || {});
        },

        candidates() {
            const pks = new Set();
            Object.values(this.$TCT.candidate_issue_score || {}).forEach(s => {
                if (s?.fields?.candidate != null) pks.add(Number(s.fields.candidate));
            });
            Object.values(this.$TCT.candidate_state_multiplier || {}).forEach(s => {
                if (s?.fields?.candidate != null) pks.add(Number(s.fields.candidate));
            });
            Object.values(this.$TCT.running_mate_issue_score || {}).forEach(s => {
                if (s?.fields?.candidate != null) pks.add(Number(s.fields.candidate));
            });
            return Array.from(pks).sort((a, b) => a - b).map(pk => ({
                pk,
                label: this.$TCT.getNicknameForCandidate(pk) || `Candidate ${pk}`
            }));
        },

        issues() {
            return Object.values(this.$TCT.issues || {});
        },

        hasConditions() {
            this.$globalData.dataVersion;
            const rule = this.getRule();
            return rule.conditions && rule.conditions.length > 0;
        },

        conditionsList() {
            this.$globalData.dataVersion;
            const rule = this.getRule();
            return rule.conditions || [];
        },

        hasChanges() {
            this.$globalData.dataVersion;
            const rule = this.getRule();
            return !!String(rule.first_name || '').trim()
                || !!String(rule.last_name || '').trim()
                || !!String(rule.color_hex || '').trim()
                || (Array.isArray(rule.issue_scores) && rule.issue_scores.length > 0);
        }
    },

    template: `
    <div class="bg-white rounded-sm shadow-sm p-3 border-l-4 border-amber-400">
        <div class="flex justify-between items-start mb-2">
            <div class="text-sm text-gray-700">
                <div class="font-medium">Candidate switch rule #{{ id }}</div>
                <div class="text-xs text-gray-500">
                    (Changes are applied after each answer is recorded, so the selected candidate takes the new name/color/issue scores from that point on.)
                </div>
            </div>
            <button class="text-red-600 hover:text-red-800 text-sm" @click="$emit('deleteRule', id)" aria-label="Delete rule">✕</button>
        </div>

        <div class="mb-3 p-2 bg-amber-50 rounded-sm text-sm text-amber-900 border border-amber-100">
            <span class="font-bold mr-1">Switch summary:</span>
            <span v-if="rule.triggers.length > 0">
                When answers <span v-for="(pk, idx) in rule.triggers" :key="idx" class="font-mono bg-amber-200 px-1 rounded mx-0.5">#{{pk}}</span> are selected<span v-if="hasConditions"> and </span><span v-else>, </span>
            </span>
            <span v-if="hasConditions">
                if <span v-for="(c, idx) in conditionsList" :key="idx">
                    <span class="font-mono bg-amber-200 px-1 rounded mx-0.5" :title="displayConditionTooltip(c.variable)">{{displayConditionVariable(c.variable)}} {{c.comparator}} {{c.value}}</span>
                    <span v-if="idx < conditionsList.length - 1"> {{rule.conditionOperator}} </span>
                </span>,
            </span>
            <span>
                switch candidate <span class="font-mono bg-amber-200 px-1 rounded mx-0.5">#{{ rule.candidate || '?' }}</span>
            </span>
            <span v-if="hasChanges">
                to
                <span v-if="String(rule.first_name || '').trim()" class="font-mono bg-amber-200 px-1 rounded mx-0.5">first "{{ rule.first_name }}"</span>
                <span v-if="String(rule.last_name || '').trim()" class="font-mono bg-amber-200 px-1 rounded mx-0.5">last "{{ rule.last_name }}"</span>
                <span v-if="String(rule.color_hex || '').trim()" class="font-mono bg-amber-200 px-1 rounded mx-0.5">color {{ rule.color_hex }}</span>
                <span v-if="rule.issue_scores.length" v-for="(s, idx) in rule.issue_scores" :key="idx" class="font-mono bg-amber-200 px-1 rounded mx-0.5">#{{ s.issue }} &rarr; {{ s.score }}</span>
            </span>
            <span v-else class="italic text-gray-500">No changes defined yet.</span>
        </div>

        <!-- Triggers -->
        <div class="mb-3">
            <label class="block text-xs font-medium text-gray-600 mb-1">Trigger answers (optional):</label>
            <div class="flex items-center gap-2">
                <select v-model.number="triggerToAdd" class="border rounded-sm p-1 text-sm">
                    <option :value="null" disabled>Select answer...</option>
                    <option v-for="a in answers" :key="a.pk" :value="a.pk">
                        {{ a.pk }} - {{ (a.fields?.description || '...').slice(0,50) }}
                    </option>
                </select>
                <button class="bg-blue-500 text-white px-2 py-1 rounded-sm text-xs hover:bg-blue-600" @click="addTrigger">Add</button>
            </div>
            <div class="mt-2 flex flex-wrap gap-1">
                <span v-for="pk in rule.triggers" :key="'t-'+pk+'-'+tick" class="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-0.5 rounded-sm text-xs">
                    #{{ pk }}
                    <button class="ml-1 text-blue-700 hover:text-blue-900" @click="removeTrigger(pk)" aria-label="Remove">✕</button>
                </span>
            </div>
        </div>

        <!-- Multiple conditions -->
        <div class="mb-3">
            <label class="block text-xs font-medium text-gray-600 mb-1">Conditions (optional):</label>

            <div v-if="hasConditions" class="mb-2 flex items-center gap-2">
                <span class="text-xs text-gray-600">Join with:</span>
                <select :value="rule.conditionOperator" @change="updateConditionOperator($event.target.value)" class="border rounded-sm p-1 text-sm">
                    <option value="AND">AND (all must be true)</option>
                    <option value="OR">OR (any can be true)</option>
                </select>
            </div>

            <div v-if="hasConditions" class="mb-2 space-y-1">
                <div v-for="(c, idx) in conditionsList" :key="'c-'+idx+'-'+tick" class="grid grid-cols-4 gap-1 items-center bg-gray-100 p-2 rounded-sm">
                    <div class="text-xs font-medium" :title="displayConditionTooltip(c.variable)">{{ displayConditionVariable(c.variable) }}</div>
                    <div class="text-xs">{{ c.comparator }}</div>
                    <div class="text-xs">{{ c.value }}</div>
                    <button class="text-red-600 hover:text-red-800 text-xs justify-self-end" @click="removeCondition(idx)">✕</button>
                </div>
            </div>

            <div class="grid grid-cols-4 gap-1 items-center">
                <select v-model="conditionToAdd.variable" class="border rounded-sm p-1 text-sm col-span-1">
                    <option value="" disabled>Target...</option>
                    <option v-for="v in conditionTargets" :key="v.value" :value="v.value">{{ v.label }}</option>
                </select>
                <select v-model="conditionToAdd.comparator" class="border rounded-sm p-1 text-sm col-span-1">
                    <option value=">=">&gt;= (greater than or equal)</option>
                    <option value="<=">&lt;= (less than or equal)</option>
                    <option value=">">&gt; (greater than)</option>
                    <option value="<">&lt; (less than)</option>
                    <option value="==">== (equal)</option>
                    <option value="!=">!= (not equal)</option>
                </select>
                <input v-model.number="conditionToAdd.value" type="number" class="border rounded-sm p-1 text-sm col-span-1">
                <button class="bg-gray-300 hover:bg-gray-400 px-2 py-1 rounded-sm text-xs col-span-1" @click="addCondition" :disabled="!conditionToAdd.variable">Add</button>
            </div>
        </div>

        <!-- Candidate + identity -->
        <div class="mb-3">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Candidate to switch</label>
                    <select :value="rule.candidate" @change="updateField('candidate', $event.target.value)" class="border rounded-sm p-1 text-sm w-full">
                        <option :value="null" disabled>Select candidate...</option>
                        <option v-for="c in candidates" :key="c.pk" :value="c.pk">{{ c.pk }} - {{ c.label }}</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">New color <span class="text-gray-400 font-normal">(optional)</span></label>
                    <div class="flex items-center gap-2">
                        <input type="color" :value="rule.color_hex" @input="updateField('color_hex', $event.target.value)" class="h-8 w-10 border rounded-sm cursor-pointer">
                        <input :value="rule.color_hex" @input="updateField('color_hex', $event.target.value)" type="text" placeholder="#11299e" class="border rounded-sm p-1 text-sm w-full font-mono">
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">New first name <span class="text-gray-400 font-normal">(optional)</span></label>
                    <input :value="rule.first_name" @input="updateField('first_name', $event.target.value)" type="text" placeholder="e.g. Robert" class="border rounded-sm p-1 text-sm w-full">
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">New last name <span class="text-gray-400 font-normal">(optional)</span></label>
                    <input :value="rule.last_name" @input="updateField('last_name', $event.target.value)" type="text" placeholder="e.g. Kennedy" class="border rounded-sm p-1 text-sm w-full">
                </div>
            </div>
        </div>

        <!-- Issue scores -->
        <div class="mb-1">
            <label class="block text-xs font-medium text-gray-600 mb-1">Issue score overrides (optional):</label>
            <div v-for="(s, idx) in rule.issue_scores" :key="'s-'+idx+'-'+tick" class="grid grid-cols-1 md:grid-cols-5 gap-2 items-center mb-2">
                <div class="md:col-span-2">
                    <label class="block text-[10px] text-gray-500 mb-0.5">Issue</label>
                    <select :value="s.issue" @change="updateIssueScore(idx,'issue',$event.target.value)" class="border rounded-sm p-1 text-sm w-full">
                        <option :value="null" disabled>Select issue...</option>
                        <option v-for="iss in issues" :key="'iss-'+iss.pk" :value="iss.pk">
                            {{ iss.pk }} - {{ (iss.fields?.name || '...').slice(0,40) }}
                        </option>
                    </select>
                </div>
                <div class="md:col-span-2">
                    <label class="block text-[10px] text-gray-500 mb-0.5">Score (-1 to 1)</label>
                    <input :value="s.score" @input="updateIssueScore(idx,'score',$event.target.value)" type="number" step="0.01" min="-1" max="1" class="border rounded-sm p-1 text-sm w-full">
                </div>
                <div class="flex items-center gap-2">
                    <button class="text-red-600 hover:text-red-800 text-xs" @click="removeIssueScore(idx)">✕</button>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <select v-model.number="newIssuePk" class="border rounded-sm p-1 text-sm">
                    <option :value="null" disabled>Select issue...</option>
                    <option v-for="iss in issues" :key="'ni-'+iss.pk" :value="iss.pk">
                        {{ iss.pk }} - {{ (iss.fields?.name || '...').slice(0,40) }}
                    </option>
                </select>
                <button class="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded-sm text-xs" @click="addIssueScore">Add issue score</button>
            </div>
        </div>
    </div>
    `
})
