registerComponent('bulk', {

    data() {
        return {
            answerPk: "",
            candidate: "",
            affectedCandidate: "",
            issuePk: Object.keys(this.$TCT.issues)[0],
            stateIssueScore: "",
            issueWeight: "",
            issueFilter: "",
            bulkCandidatePk: this.$TCT.getAllCandidatePKs()[0],
            stateMultiplier: "",
            multiplier: 1,
            selectedQuestionPk: null,
            selectedAnswerPks: [],
            naturalLanguageEffects: "",
            campaignScriptInput: "",
            campaignScriptWarnings: [],
            campaignScriptFileName: "",
            stateItems: [],
            issueItems: [],
            multiplierItems: []
        };
    },

    template: `
    <div class="mx-auto p-4 bg-white rounded-lg shadow-sm">

        <h2 class="font-bold text-lg mb-3">Bulk Utilities</h2>

        <details class="mb-4">
            <summary class="font-semibold cursor-pointer p-2 bg-gray-50 rounded">Bulk State Answer Score Utility</summary>
            <div class="p-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Answer PK</label>
                        <input v-model="answerPk" name="name" type="number"
                               class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-xs focus:ring-3 focus:ring-blue-400 focus:border-blue-500">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700">Candidate PK</label>
                        <input v-model="candidate" name="name" type="number"
                               class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-xs focus:ring-3 focus:ring-blue-400 focus:border-blue-500">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700">Affected Candidate PK</label>
                        <input v-model="affectedCandidate" name="name" type="number"
                               class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-xs focus:ring-3 focus:ring-blue-400 focus:border-blue-500">
                    </div>
                </div>

                <div class="flex flex-wrap gap-2 mb-3">
                    <button class="bg-gray-200 text-gray-800 px-3 py-2 rounded hover:bg-gray-300" v-on:click="checkAll()">Check All</button>
                    <button class="bg-gray-200 text-gray-800 px-3 py-2 rounded hover:bg-gray-300" v-on:click="invertAll()">Invert All Values</button>
                    <button class="ml-auto bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600" v-on:click="generate()">Generate State Scores</button>
                </div>

                <ul class="divide-y border rounded overflow-hidden">
                    <li v-for="item in stateItems" :key="item.pk" class="flex items-center justify-between p-2">
                        <div class="flex items-center space-x-3">
                            <input type="checkbox" v-model="item.include" class="h-4 w-4">
                            <span class="text-sm text-gray-700">{{ item.name }}</span>
                        </div>
                        <input v-model.number="item.amount" name="amount" type="number" class="ml-4 w-28 p-1 border border-gray-300 rounded-md text-sm">
                    </li>
                </ul>
            </div>
        </details>

        <details class="mb-4">
            <summary class="font-semibold cursor-pointer p-2 bg-gray-50 rounded">Bulk State Issue Score Utility</summary>
            <div class="p-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Issue</label>
                        <select @change="setIssuePk($event)" name="issue" v-model.number="issuePk"
                                class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-xs focus:ring-3 focus:ring-blue-400 focus:border-blue-500">
                            <option v-for="issue in issues" :value="issue.pk" :key="issue.pk">{{issue.pk}} - {{issue.fields.name}}</option>
                        </select>
                    </div>

                    <div class="flex gap-2">
                        <div class="flex-1">
                            <label class="block text-sm font-medium text-gray-700">Bulk issue score</label>
                            <input v-model="stateIssueScore" name="name" type="number" step="0.01"
                                class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-xs focus:ring-3 focus:ring-blue-400 focus:border-blue-500 transition-colors duration-300"
                                :class="getScoreColorClass(stateIssueScore)"
                                placeholder="Value to apply to checked">
                            <p v-if="stateIssueScore !== ''" class="text-[10px] mt-1 transition-colors duration-500" :class="getScoreColorClass(stateIssueScore)">
                                Target Stance: {{ getStanceLabel(stateIssueScore, issuePk) }}
                            </p>
                        </div>

                        <div class="flex-1">
                            <label class="block text-sm font-medium text-gray-700">Bulk issue weight</label>
                            <input v-model="issueWeight" name="name" type="number" step="0.1"
                                class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-xs focus:ring-3 focus:ring-blue-400 focus:border-blue-500"
                                placeholder="Value to apply to checked">
                        </div>
                    </div>
                </div>

                <div class="flex flex-wrap items-center gap-2 mb-3">
                    <button class="bg-gray-200 text-gray-800 px-3 py-1 text-sm rounded hover:bg-gray-300" v-on:click="checkAllIssues()">Check all</button>
                    <button class="bg-gray-200 text-gray-800 px-3 py-1 text-sm rounded hover:bg-gray-300" v-on:click="uncheckAllIssues()">Uncheck all</button>
                    <div class="flex-grow"></div>
                    <input v-model="issueFilter" placeholder="Filter states..." class="p-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 focus:border-blue-500 w-48">
                    <button class="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600" v-on:click="setIssueScores()">Apply bulk updates</button>
                </div>

                <ul class="divide-y border rounded overflow-hidden max-h-96 overflow-y-auto">
                    <li v-for="item in filteredIssueItems" :key="item.pk" class="p-2 hover:bg-gray-50 flex flex-col gap-1 transition-all duration-300">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-3 overflow-hidden">
                                <input type="checkbox" v-model="item.include" class="h-4 w-4 shrink-0">
                                <div class="flex flex-col truncate">
                                    <span class="text-sm font-medium text-gray-700 truncate">{{ item.name }}</span>
                                    <span class="text-[10px] truncate transition-colors duration-500" :class="getScoreColorClass(item.score)">
                                        {{ getStanceLabel(item.score, issuePk) }}
                                    </span>
                                </div>
                            </div>
                            
                            <div class="flex items-center gap-2 shrink-0">
                                <div class="flex flex-col">
                                    <label class="text-[10px] text-gray-400 uppercase leading-none">Score</label>
                                    <input v-model.number="item.score" @change="syncIssueItem(item)" type="number" step="0.001" 
                                        class="w-20 p-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-400 transition-colors duration-300"
                                        :class="getScoreColorClass(item.score)">
                                </div>
                                <div class="flex flex-col">
                                    <label class="text-[10px] text-gray-400 uppercase leading-none">Weight</label>
                                    <input v-model.number="item.weight" @change="syncIssueItem(item)" type="number" step="0.1" 
                                        class="w-16 p-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-400">
                                </div>
                            </div>
                        </div>
                        
                        <div class="flex items-center pl-7 gap-2">
                            <input type="range" v-model.number="item.score" @input="syncIssueItem(item)" min="-1" max="1" step="0.001" 
                                class="flex-grow h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer transition-all duration-300"
                                :class="getSliderAccentClass(item.score)">
                            <span class="text-[10px] font-mono w-10 text-right transition-colors duration-300" :class="getScoreColorClass(item.score)">
                                {{ Number(item.score).toFixed(3) }}
                            </span>
                        </div>
                    </li>
                </ul>
            </div>
        </details>

        <details class="mb-4">
            <summary class="font-semibold cursor-pointer p-2 bg-gray-50 rounded">Bulk Answer Effects Utility</summary>
            <div class="p-4">
                <div class="mb-3">
                    <label class="block text-sm font-medium text-gray-700">Question</label>
                    <select v-model.number="selectedQuestionPk"
                            class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-xs focus:ring-3 focus:ring-blue-400 focus:border-blue-500">
                        <option v-for="q in questionsList" :value="q.pk" :key="q.pk">{{q.pk}} - {{q.fields.description.substring(0, 100)}}...</option>
                    </select>
                </div>

                <div v-if="selectedQuestionPk" class="mb-3">
                    <label class="block text-sm font-medium text-gray-700">Answers</label>
                    <div class="mt-1 border rounded max-h-48 overflow-y-auto bg-white">
                        <label v-for="a in answersForSelectedQuestion" :key="a.pk" class="flex items-center p-2 border-b last:border-0 hover:bg-gray-50 cursor-pointer">
                            <input type="checkbox" :value="a.pk" v-model="selectedAnswerPks" class="h-4 w-4 mr-3">
                            <div class="flex flex-col">
                                <span class="text-xs font-bold text-gray-400">PK {{a.pk}}</span>
                                <span class="text-sm text-gray-700">{{a.fields.description}}</span>
                            </div>
                        </label>
                    </div>
                    <div class="mt-2 flex gap-2">
                        <button @click="selectAllAnswers" class="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300">Select all</button>
                        <button @click="deselectAllAnswers" class="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300">Deselect all</button>
                    </div>
                </div>

                <div class="mb-3">
                    <label class="block text-sm font-medium text-gray-700">Effects</label>
                    <textarea v-model="naturalLanguageEffects" rows="3"
                            placeholder="e.g. (-0.01 Smith, Economy 0.2 Importance 2, Healthcare 0.3 Importance 1)"
                            class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-xs focus:ring-3 focus:ring-blue-400 focus:border-blue-500"></textarea>
                    <p class="text-[12px] text-gray-500 mt-1">
                        Format: (value CandidatePK/Nickname, IssueName Score Importance Score ...)
                        Please separate multiple effects with commas.
                </div>

                <div class="flex justify-end">
                    <button class="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600 shadow-sm transition-all active:transform active:scale-95" 
                            v-on:click="applyBulkAnswerEffects()">
                        Apply to selected answers
                    </button>
                </div>
            </div>
        </details>

        <details>
            <summary class="font-semibold cursor-pointer p-2 bg-gray-50 rounded">Bulk Candidate State Multiplier Utility</summary>
            <div class="p-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Candidate</label>
                        <select @change="setCandidatePk($event)" name="issue" v-model.number="bulkCandidatePk"
                                class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-xs focus:ring-3 focus:ring-blue-400 focus:border-blue-500">
                            <option v-for="candidate in candidates" :value="candidate.pk" :key="candidate.pk">{{candidate.pk}} {{candidate.nickname}}</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700">State Multiplier</label>
                        <input v-model.number="stateMultiplier" name="stateMultiplier" type="number"
                               class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-xs focus:ring-3 focus:ring-blue-400 focus:border-blue-500">
                    </div>
                </div>

                <div class="flex gap-2 mb-3">
                    <button class="bg-gray-200 text-gray-800 px-3 py-2 rounded hover:bg-gray-300" v-on:click="checkAllStates()">Check All</button>
                    <button class="bg-gray-200 text-gray-800 px-3 py-2 rounded hover:bg-gray-300" v-on:click="uncheckAllStates()">Uncheck All</button>
                    <button class="ml-auto bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600" v-on:click="setStateMultipliers()">Set State Multipliers</button>
                </div>

                <ul class="divide-y border rounded overflow-hidden mb-3">
                    <li v-for="item in multiplierItems" :key="item.pk" class="flex items-center justify-between p-2">
                        <div class="flex items-center space-x-3">
                            <input type="checkbox" v-model="item.include" class="h-4 w-4">
                            <span class="text-sm text-gray-700">{{ item.name }}</span>
                        </div>
                    </li>
                </ul>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700">Multiply All Checked State Multipliers By</label>
                        <input v-model.number="multiplier" name="multiplier" type="number"
                               class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-xs focus:ring-3 focus:ring-blue-400 focus:border-blue-500">
                    </div>
                    <div class="flex justify-end">
                        <button class="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600" v-on:click="multiplyStateMultipliers()">Multiply</button>
                    </div>
                </div>
            </div>
        </details>

        <details class="mt-4">
            <summary class="font-semibold cursor-pointer p-2 bg-gray-50 rounded">CampaignScript Import Utility</summary>
            <div class="p-4 space-y-3">
                <p class="text-xs text-gray-700">
                    Created by Decstar, CampaignScript (CS) uses natural language for easier creation of question sets for a mod.<br>Here, you can paste either import or paste CS text and apply it directly to this mod. Supports <span class="font-mono">Question</span>, <span class="font-mono">-</span>, <span class="font-mono">(feedback)</span>, <span class="font-mono">+</span>, <span class="font-mono">+*</span>, and <span class="font-mono">+-</span> syntax.
                </p>

                <div class="flex flex-wrap items-center gap-2">
                    <label class="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300 cursor-pointer">
                        Import file
                        <input type="file" class="hidden" accept=".txt,.cs,.campaignscript,.md" @change="importCampaignScriptFile($event)">
                    </label>
                    <span v-if="campaignScriptFileName" class="text-xs text-gray-500">{{ campaignScriptFileName }}</span>
                    <button class="ml-auto text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300" @click="campaignScriptInput = ''; campaignScriptWarnings = []; campaignScriptFileName = ''">Clear</button>
                </div>

                <textarea v-model="campaignScriptInput" rows="10"
                    placeholder="Question 1: Your question text\n- First answer\n(feedback text)\n+ 101 0.02\n+* 501 101 0.05\n+- 32 0.5 1"
                    class="p-2 block w-full border border-gray-300 rounded-md shadow-xs focus:ring-3 focus:ring-blue-400 focus:border-blue-500 font-mono text-xs"></textarea>

                <div class="flex justify-end">
                    <button class="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600" @click="applyCampaignScript()">Apply CampaignScript</button>
                </div>

                <div v-if="campaignScriptWarnings.length" class="border border-amber-300 bg-amber-50 rounded p-2">
                    <p class="text-xs font-semibold text-amber-700 mb-1">Warnings</p>
                    <ul class="list-disc pl-5 text-xs text-amber-700 space-y-1">
                        <li v-for="(w, idx) in campaignScriptWarnings" :key="'cswarn-' + idx">{{ w }}</li>
                    </ul>
                </div>
            </div>
        </details>

    </div>
    `,

    mounted() {
        this.refreshStateItems();
        this.refreshIssueItems();
        this.refreshMultiplierItems();
    },

    watch: {
        issuePk() {
            this.refreshIssueItems();
        },
        bulkCandidatePk() {
            this.refreshMultiplierItems();
        },
        selectedQuestionPk() {
            this.selectedAnswerPks = [];
        }
    },

    methods: {

        setCandidatePk: function (evt) {
            this.bulkCandidatePk = Number(evt.target.value);
        },

        setIssuePk: function (evt) {
            this.issuePk = Number(evt.target.value);
        },

        getStanceLabel(score, issuePk) {
            const issue = this.$TCT.issues[issuePk];
            if (!issue) return "Unknown issue";

            let stanceIndex = 4;
            if (score <= -0.71) stanceIndex = 1;
            else if (score <= -0.3) stanceIndex = 2;
            else if (score <= -0.125) stanceIndex = 3;
            else if (score <= 0.125) stanceIndex = 4;
            else if (score <= 0.3) stanceIndex = 5;
            else if (score <= 0.71) stanceIndex = 6;
            else stanceIndex = 7;

            return issue.fields["stance_" + stanceIndex] || `Stance ${stanceIndex}`;
        },

        getScoreColorClass(score) {
            if (score <= -0.125) return "text-red-600 font-bold";
            if (score >= 0.125) return "text-green-600 font-bold";
            return "text-gray-500";
        },

        getSliderAccentClass(score) {
            if (score <= -0.125) return "accent-red-500";
            if (score >= 0.125) return "accent-green-500";
            return "accent-blue-500";
        },

        refreshStateItems() {
            this.stateItems = Object.values(this.$TCT.states).map(s => ({
                pk: s.pk,
                name: s.fields.name || `State ${s.pk}`,
                include: false,
                amount: 0
            }));
        },

        refreshIssueItems() {
            const scores = Object.values(this.$TCT.state_issue_scores).filter((x) => x.fields.issue == this.issuePk);
            this.issueItems = scores.map(s => ({
                pk: s.pk,
                name: this.$TCT.states[s.fields.state]?.fields?.name || `State ${s.fields.state}`,
                include: false,
                score: s.fields.state_issue_score,
                weight: s.fields.weight
            }));
        },

        refreshMultiplierItems() {
            const mults = Object.values(this.$TCT.candidate_state_multiplier).filter((x) => x.fields.candidate == this.bulkCandidatePk);
            this.multiplierItems = mults.map(m => ({
                pk: m.pk,
                name: this.$TCT.states[m.fields.state]?.fields?.name || `State ${m.fields.state}`,
                include: false
            }));
        },

        syncIssueItem(item) {
            this.$TCT.state_issue_scores[item.pk].fields.state_issue_score = Number(item.score);
            this.$TCT.state_issue_scores[item.pk].fields.weight = Number(item.weight);
            this.$globalData.dataVersion++;
        },

        generate: function () {
            if (!this.answerPk) {
                alert("Answer PK required.");
                return;
            }
            for (const item of this.stateItems) {
                if (item.include) {
                    const newPk = this.$TCT.getNewPk(); // see js/base.js
                    let x = {
                        "model": "campaign_trail.answer_score_state",
                        "pk": newPk,
                        "fields": {
                            "answer": Number(this.answerPk),
                            "state": item.pk,
                            "candidate": Number(this.candidate) || this.$TCT.getDefaultCandidatePK(),
                            "affected_candidate": Number(this.affectedCandidate) || this.$TCT.getDefaultCandidatePK(),
                            "state_multiplier": item.amount
                        }
                    }
                    this.$TCT.answer_score_state[newPk] = x;
                }
            }
            this.$TCT._invalidateCache('state_score_by_answer');
            this.$globalData.dataVersion++;
            alert("Bulk generated state scores for answer with PK " + this.answerPk + " (do not submit again)");
        },

        setIssueScores: function () {
            for (const item of this.issueItems) {
                if (item.include) {
                    if (this.stateIssueScore !== "" && this.stateIssueScore !== null) {
                        this.$TCT.state_issue_scores[item.pk].fields.state_issue_score = Number(this.stateIssueScore);
                        item.score = Number(this.stateIssueScore);
                    }
                    if (this.issueWeight !== "" && this.issueWeight !== null) {
                        this.$TCT.state_issue_scores[item.pk].fields.weight = Number(this.issueWeight);
                        item.weight = Number(this.issueWeight);
                    }
                }
            }
            this.$globalData.dataVersion++;
            alert("Set issue scores!");
        },

        setStateMultipliers: function () {
            for (const item of this.multiplierItems) {
                if (item.include) {
                    this.$TCT.candidate_state_multiplier[item.pk].fields.state_multiplier = Number(this.stateMultiplier);
                }
            }
            this.$globalData.dataVersion++;
            alert("Set state multipliers!");
        },

        multiplyStateMultipliers: function () {
            for (const item of this.multiplierItems) {
                if (item.include) {
                    this.$TCT.candidate_state_multiplier[item.pk].fields.state_multiplier *= Number(this.multiplier);
                }
            }
            this.$globalData.dataVersion++;
            alert("Multiplied state multipliers!");
        },

        selectAllAnswers: function () {
            this.selectedAnswerPks = this.answersForSelectedQuestion.map(a => a.pk);
        },

        deselectAllAnswers: function () {
            this.selectedAnswerPks = [];
        },

        applyBulkAnswerEffects: function () {
            if (this.selectedAnswerPks.length === 0) {
                alert("Please select at least one answer.");
                return;
            }
            if (!this.naturalLanguageEffects.trim()) {
                alert("Please enter some effects.");
                return;
            }

            const effects = this.parseNaturalLanguageEffects(this.naturalLanguageEffects);
            if (effects.candidates.length === 0 && effects.issues.length === 0) {
                alert("No valid effects found in the input. Ensure nicknames/issue names match exactly (case insensitive).");
                return;
            }

            for (const aPk of this.selectedAnswerPks) {
                const existingGlobalScores = this.$TCT.getGlobalScoreForAnswer(aPk);
                const existingStateScores = this.$TCT.getStateScoreForAnswer(aPk);

                // apply candidate effects
                for (const eff of effects.candidates) {

                    if (eff.statePks && eff.statePks.length > 0) {
                        for (const sPk of eff.statePks) {
                            const existing = existingStateScores.find(s => s.fields.state === sPk && s.fields.affected_candidate === eff.affectedCandidatePk && s.fields.candidate === eff.playerCandidatePk);
                            if (existing) {
                                existing.fields.state_multiplier = eff.amount;
                            } else {
                                const newPk = this.$TCT.getNewPk();
                                this.$TCT.answer_score_state[newPk] = {
                                    "model": "campaign_trail.answer_score_state",
                                    "pk": newPk,
                                    "fields": {
                                        "answer": aPk,
                                        "state": sPk,
                                        "candidate": eff.playerCandidatePk,
                                        "affected_candidate": eff.affectedCandidatePk,
                                        "state_multiplier": eff.amount
                                    }
                                };
                                this.$TCT._invalidateCache('state_score_by_answer');
                            }
                        }
                    } else {
                        const existing = existingGlobalScores.find(s => s.fields.affected_candidate === eff.affectedCandidatePk && s.fields.candidate === eff.playerCandidatePk);
                        if (existing) {
                            existing.fields.global_multiplier = eff.amount;
                        } else {
                            const newPk = this.$TCT.getNewPk();
                            this.$TCT.answer_score_global[newPk] = {
                                "model": "campaign_trail.answer_score_global",
                                "pk": newPk,
                                "fields": {
                                    "answer": aPk,
                                    "candidate": eff.playerCandidatePk,
                                    "affected_candidate": eff.affectedCandidatePk,
                                    "global_multiplier": eff.amount
                                }
                            };
                            this.$TCT._invalidateCache('global_score_by_answer');
                        }
                    }
                }

                // apply issue effects
                const existingIssueScores = this.$TCT.getIssueScoreForAnswer(aPk);
                for (const eff of effects.issues) {
                    const existing = existingIssueScores.find(s => s.fields.issue === eff.issuePk);
                    if (existing) {
                        existing.fields.issue_score = eff.score;
                        existing.fields.issue_importance = eff.importance;
                    } else {
                        const newPk = this.$TCT.getNewPk();
                        this.$TCT.answer_score_issue[newPk] = {
                            "model": "campaign_trail.answer_score_issue",
                            "pk": newPk,
                            "fields": {
                                "answer": aPk,
                                "issue": eff.issuePk,
                                "issue_score": eff.score,
                                "issue_importance": eff.importance
                            }
                        };
                        this.$TCT._invalidateCache('issue_score_by_answer');
                        this.$TCT._invalidateCache('answer_score_issue_by_issue');
                    }
                }
            }

            this.$globalData.dataVersion++;
            alert("Applied effects to " + this.selectedAnswerPks.length + " answers!");
        },

        parseNaturalLanguageEffects: function (input) {
            const results = {
                candidates: [],
                issues: []
            };

            let str = input.trim();
            if (str.startsWith('(') && str.endsWith(')')) {
                str = str.substring(1, str.length - 1);
            }

            const parts = [];
            let currentPart = "";
            let parenDepth = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str[i];
                if (char === '(') parenDepth++;
                else if (char === ')') parenDepth--;

                if (char === ',' && parenDepth === 0) {
                    parts.push(currentPart.trim());
                    currentPart = "";
                } else {
                    currentPart += char;
                }
            }
            if (currentPart.trim()) parts.push(currentPart.trim());

            const nicknameToPk = {};
            if (this.$TCT.jet_data && this.$TCT.jet_data.nicknames) {
                for (const pk in this.$TCT.jet_data.nicknames) {
                    nicknameToPk[this.$TCT.jet_data.nicknames[pk].toLowerCase()] = Number(pk);
                }
            }

            const issueNameToPk = {};
            for (const pk in this.$TCT.issues) {
                const name = this.$TCT.issues[pk].fields.name;
                if (name) {
                    issueNameToPk[name.toLowerCase()] = Number(pk);
                }
            }

            const stateNameToPk = {};
            for (const pk in this.$TCT.states) {
                const name = this.$TCT.states[pk].fields.name;
                if (name) {
                    stateNameToPk[name.toLowerCase()] = Number(pk);
                }
            }

            const resolveCandidate = (text) => {
                const t = text.trim().toLowerCase();
                if (nicknameToPk[t] !== undefined) return nicknameToPk[t];
                const pk = parseInt(t);
                if (!isNaN(pk) && this.$TCT.getAllCandidatePKs().includes(pk)) return pk;
                return null;
            };

            const resolveState = (text) => {
                const t = text.trim().toLowerCase();
                if (stateNameToPk[t] !== undefined) return stateNameToPk[t];
                const pk = parseInt(t);
                if (!isNaN(pk) && this.$TCT.states[pk]) return pk;
                return null;
            };

            for (const part of parts) {
                const importanceMatch = part.match(/Importance\s+([+-]?\d*\.?\d+)/i);
                let importance = 1.0;
                let remainingPart = part;
                if (importanceMatch) {
                    importance = parseFloat(importanceMatch[1]);
                    remainingPart = part.replace(importanceMatch[0], '').trim();
                }

                // check for state list in parentheses at the end
                let statePks = [];
                const stateMatch = remainingPart.match(/\(([^)]+)\)$/);
                if (stateMatch) {
                    const stateNames = stateMatch[1].split(',').map(s => s.trim());
                    for (const name of stateNames) {
                        const sPk = resolveState(name);
                        if (sPk !== null) statePks.push(sPk);
                    }
                    remainingPart = remainingPart.replace(stateMatch[0], '').trim();
                }

                const numbers = remainingPart.match(/[+-]?\d*\.?\d+/g);
                if (!numbers) continue;

                const amount = parseFloat(numbers[0]);
                const text = remainingPart.replace(numbers[0], '').trim().toLowerCase();

                // check for "X to Y" syntax
                const toParts = text.split(/\s+to\s+/);
                if (toParts.length === 2) {
                    const affectedPk = resolveCandidate(toParts[0]);
                    const playerPk = resolveCandidate(toParts[1]);
                    if (affectedPk !== null && playerPk !== null) {
                        results.candidates.push({
                            affectedCandidatePk: affectedPk,
                            playerCandidatePk: playerPk,
                            amount: amount,
                            statePks: statePks
                        });
                        continue;
                    }
                }

                const possiblePk = parseInt(text);

                let issuePk = issueNameToPk[text];
                if (!issuePk && !isNaN(possiblePk) && this.$TCT.issues[possiblePk]) {
                    issuePk = possiblePk;
                }

                if (issuePk || (importanceMatch && text !== "")) {
                    results.issues.push({
                        issuePk: issuePk || 0,
                        score: amount,
                        importance: importance
                    });
                    continue;
                }

                const candidatePk = resolveCandidate(text);
                if (candidatePk !== null) {
                    results.candidates.push({
                        affectedCandidatePk: candidatePk,
                        playerCandidatePk: candidatePk, // default: X to X
                        amount: amount,
                        statePks: statePks
                    });
                }
            }

            return results;
        },

        importCampaignScriptFile: function (evt) {
            const file = evt?.target?.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = () => {
                this.campaignScriptInput = String(reader.result || "");
                this.campaignScriptFileName = file.name;
            };
            reader.onerror = () => {
                alert("Failed to read file.");
            };
            reader.readAsText(file);
        },

        parseCampaignScript: function (input) {
            const rawLines = String(input || "").split(/\r?\n/);
            const initialLines = rawLines
                .map(line => line.split("#")[0].trim())
                .filter(Boolean);

            const { config, aliases, warnings: configWarnings, scriptLines } = this.parseCampaignScriptConfig(initialLines);
            const lines = this.applyCampaignScriptAliases(scriptLines, aliases);

            const warnings = [...configWarnings];
            const parsed = {
                questions: [],
                warnings,
                config
            };

            const nicknameToPk = {};
            if (this.$TCT.jet_data?.nicknames) {
                for (const candidatePk in this.$TCT.jet_data.nicknames) {
                    nicknameToPk[String(this.$TCT.jet_data.nicknames[candidatePk]).toLowerCase()] = Number(candidatePk);
                }
            }

            const allCandidatePks = this.$TCT.getAllCandidatePKs().map(Number);
            const candidatePkSet = new Set(allCandidatePks);

            const issueNameToPk = {};
            for (const issuePk in this.$TCT.issues) {
                const issueName = this.$TCT.issues[issuePk]?.fields?.name;
                if (issueName) {
                    issueNameToPk[String(issueName).toLowerCase()] = Number(issuePk);
                    issueNameToPk[String(issueName).toLowerCase().replace(/\s+/g, "_")] = Number(issuePk);
                }
            }

            const stateNameToPk = {};
            for (const statePk in this.$TCT.states) {
                const stateName = this.$TCT.states[statePk]?.fields?.name;
                if (stateName) {
                    stateNameToPk[String(stateName).toLowerCase()] = Number(statePk);
                    stateNameToPk[String(stateName).toLowerCase().replace(/\s+/g, "_")] = Number(statePk);
                }
            }

            const resolveCandidate = (token) => {
                const value = String(token || "").trim().toLowerCase().replace(/\s+/g, "_");
                if (!value) return null;
                if (value === "self") return this.$TCT.getDefaultCandidatePK();
                const numeric = Number(value);
                if (!isNaN(numeric)) return candidatePkSet.has(numeric) ? numeric : null;
                if (nicknameToPk[value] != null) return nicknameToPk[value];
                return null;
            };

            const resolveState = (token) => {
                const value = String(token || "").trim().toLowerCase().replace(/\s+/g, "_");
                if (!value) return null;
                const numeric = Number(value);
                if (!isNaN(numeric)) return this.$TCT.states[numeric] ? numeric : null;
                return stateNameToPk[value] ?? null;
            };

            const resolveIssue = (token) => {
                const value = String(token || "").trim().toLowerCase().replace(/\s+/g, "_");
                if (!value) return null;
                const numeric = Number(value);
                if (!isNaN(numeric)) return this.$TCT.issues[numeric] ? numeric : null;
                return issueNameToPk[value] ?? null;
            };

            let currentQuestion = null;
            let currentAnswer = null;

            const makeError = (lineNumber, message, lineText) => ({
                error: `Line ${lineNumber}: ${message} (${lineText})`
            });

            for (let index = 0; index < lines.length; index++) {
                const line = lines[index];
                const interpretedLine = index + 1;
                const lower = line.toLowerCase();

                if (lower.startsWith("question")) {
                    const parts = line.split(":");
                    const questionText = parts.slice(1).join(":").trim();
                    currentQuestion = {
                        text: questionText,
                        answers: []
                    };
                    parsed.questions.push(currentQuestion);
                    currentAnswer = null;
                    continue;
                }

                if (line.startsWith("-")) {
                    if (!currentQuestion) return makeError(interpretedLine, "Answer declared before any question", line);
                    if (currentQuestion.answers.length >= 4) return makeError(interpretedLine, "More than 4 answers declared for one question", line);
                    currentAnswer = {
                        text: line.slice(1).trim(),
                        feedback: [],
                        globalEffects: [],
                        stateEffects: [],
                        issueEffects: []
                    };
                    currentQuestion.answers.push(currentAnswer);
                    continue;
                }

                if (line.startsWith("(") && line.endsWith(")")) {
                    if (!currentAnswer) return makeError(interpretedLine, "Feedback declared before any answer", line);
                    const inner = line.slice(1, -1).trim();
                    const match = inner.match(/^for\s+candidate\s+(\d+)\s*:\s*(.*)$/i);
                    if (match) {
                        const feedbackCandidate = Number(match[1]);
                        if (!candidatePkSet.has(feedbackCandidate)) {
                            warnings.push(`Line ${interpretedLine} skipped candidate-specific feedback: unknown candidate ${match[1]}.`);
                            continue;
                        }
                        currentAnswer.feedback.push({
                            candidate: feedbackCandidate,
                            text: match[2].trim()
                        });
                    } else {
                        currentAnswer.feedback.push({
                            candidate: null,
                            text: inner
                        });
                    }
                    continue;
                }

                if (line.startsWith("+-") || lower.startsWith("affects issue")) {
                    if (!currentAnswer) return makeError(interpretedLine, "Issue effect declared before any answer", line);

                    const tokenized = line.startsWith("+-")
                        ? line.slice(2).trim().split(/\s+/)
                        : line.replace(/^affects\s+issue\s+/i, "").trim().split(/\s+/);

                    if (tokenized.length < 3) return makeError(interpretedLine, "Issue effect requires issue, score, and importance", line);

                    const issueToken = tokenized[0];
                    const scoreToken = tokenized[1].toLowerCase() === "by" ? tokenized[2] : tokenized[1];
                    const importanceToken = tokenized[tokenized.length - 1];

                    const issuePk = resolveIssue(issueToken);
                    const issueScore = Number(scoreToken);
                    const issueImportance = Number(importanceToken);

                    if (isNaN(issueScore) || isNaN(issueImportance)) {
                        return makeError(interpretedLine, "Invalid issue effect format", line);
                    }
                    if (issuePk == null) {
                        warnings.push(`Line ${interpretedLine} skipped issue effect: unknown issue '${issueToken}'.`);
                        continue;
                    }

                    currentAnswer.issueEffects.push({
                        issuePk,
                        issueScore,
                        issueImportance
                    });
                    continue;
                }

                if (line.startsWith("+*") || lower.startsWith("affects state")) {
                    if (!currentAnswer) return makeError(interpretedLine, "State effect declared before any answer", line);

                    const tokenized = line.startsWith("+*")
                        ? line.slice(2).trim().split(/\s+/)
                        : line.replace(/^affects\s+state\s+/i, "").trim().split(/\s+/);

                    if (tokenized.length < 3) return makeError(interpretedLine, "State effect requires state, candidate, and multiplier", line);

                    let stateToken = tokenized[0];
                    let candidateToken = tokenized[1];
                    let amountToken = tokenized[2];

                    if (!line.startsWith("+*")) {
                        const byIdx = tokenized.findIndex(t => t.toLowerCase() === "by");
                        const forIdx = tokenized.findIndex(t => t.toLowerCase() === "for");
                        if (byIdx >= 0 && forIdx > byIdx + 1) {
                            stateToken = tokenized[0];
                            amountToken = tokenized[byIdx + 1];
                            candidateToken = tokenized[forIdx + 1];
                        }
                    }

                    const statePk = resolveState(stateToken);
                    const affectedCandidate = resolveCandidate(candidateToken);
                    const multiplier = Number(amountToken);

                    if (isNaN(multiplier)) {
                        return makeError(interpretedLine, "Invalid state effect format", line);
                    }
                    if (statePk == null) {
                        warnings.push(`Line ${interpretedLine} skipped state effect: unknown state '${stateToken}'.`);
                        continue;
                    }
                    if (affectedCandidate == null) {
                        warnings.push(`Line ${interpretedLine} skipped state effect: unknown candidate '${candidateToken}'.`);
                        continue;
                    }

                    currentAnswer.stateEffects.push({
                        statePk,
                        affectedCandidate,
                        stateMultiplier: multiplier
                    });
                    continue;
                }

                if ((line.startsWith("+") && !line.startsWith("+*") && !line.startsWith("+-")) || lower.startsWith("affects")) {
                    if (!currentAnswer) return makeError(interpretedLine, "Global effect declared before any answer", line);

                    const tokenized = line.startsWith("+")
                        ? line.slice(1).trim().split(/\s+/)
                        : line.replace(/^affects\s+/i, "").trim().split(/\s+/);

                    if (tokenized.length < 2) return makeError(interpretedLine, "Global effect requires candidate and multiplier", line);

                    let targetToken = tokenized[0];
                    let amountToken = tokenized[1];
                    if (amountToken && amountToken.toLowerCase() === "by") {
                        amountToken = tokenized[2];
                    }

                    const affectedCandidate = resolveCandidate(targetToken);
                    const globalMultiplier = Number(amountToken);
                    if (isNaN(globalMultiplier)) {
                        return makeError(interpretedLine, "Invalid global effect format", line);
                    }
                    if (affectedCandidate == null) {
                        warnings.push(`Line ${interpretedLine} skipped global effect: unknown candidate '${targetToken}'.`);
                        continue;
                    }

                    currentAnswer.globalEffects.push({
                        affectedCandidate,
                        globalMultiplier
                    });
                    continue;
                }

                warnings.push(`Line ${interpretedLine} ignored: ${line}`);
            }

            if (parsed.questions.length === 0) {
                return { error: "No questions found in CampaignScript." };
            }

            return parsed;
        },

        parseCampaignScriptConfig: function (lines) {
            const config = {};
            const aliases = [];
            const warnings = [];
            const scriptLines = [];
            let inConfig = false;

            lines.forEach((line, index) => {
                try {
                    if (index === 0 && line.toLowerCase() === "defaults") {
                        config.defaults = true;
                        return;
                    }

                    if (line.startsWith(";")) {
                        const command = line.slice(1).trim().toLowerCase();
                        inConfig = command.startsWith("config");
                        return;
                    }

                    if (inConfig) {
                        if (line.toLowerCase().startsWith("alias")) {
                            const aliasBody = line.slice(5).trim();
                            const eqIndex = aliasBody.indexOf("=");
                            if (eqIndex === -1) {
                                warnings.push(`Config line ${index + 1} ignored: invalid alias syntax.`);
                                return;
                            }

                            const aliasName = aliasBody.slice(0, eqIndex).trim();
                            const aliasValue = aliasBody.slice(eqIndex + 1).trim();
                            if (!aliasName || !aliasValue) {
                                warnings.push(`Config line ${index + 1} ignored: empty alias name/value.`);
                                return;
                            }

                            const normalizedAlias = aliasName.startsWith("%") ? aliasName : `%${aliasName}`;
                            aliases.push([normalizedAlias, aliasValue]);
                            return;
                        }

                        const eqIndex = line.indexOf("=");
                        if (eqIndex === -1) {
                            config[line.trim()] = true;
                        } else {
                            const key = line.slice(0, eqIndex).trim();
                            const value = line.slice(eqIndex + 1).trim();
                            if (!key) {
                                warnings.push(`Config line ${index + 1} ignored: empty config key.`);
                            } else {
                                config[key] = value;
                            }
                        }
                        return;
                    }

                    scriptLines.push(line);
                } catch (_error) {
                    warnings.push(`Config line ${index + 1} ignored: invalid syntax.`);
                }
            });

            return { config, aliases, warnings, scriptLines };
        },

        applyCampaignScriptAliases: function (lines, aliases) {
            if (!aliases || aliases.length === 0) return lines;
            let content = lines.join("\n");
            for (const [alias, replacement] of aliases) {
                content = content.replaceAll(alias, replacement);
            }
            return content.split("\n");
        },

        applyCampaignScript: function () {
            if (!this.campaignScriptInput.trim()) {
                alert("Please paste or import CampaignScript first.");
                return;
            }

            const parsed = this.parseCampaignScript(this.campaignScriptInput);
            if (parsed.error) {
                alert(parsed.error);
                return;
            }

            let questionCount = 0;
            let answerCount = 0;
            let feedbackCount = 0;
            let globalCount = 0;
            let stateCount = 0;
            let issueCount = 0;
            let firstQuestionPk = null;

            const defaultCandidatePk = this.$TCT.getDefaultCandidatePK();

            for (const parsedQuestion of parsed.questions) {
                const questionPk = this.$TCT.getNewPk();
                if (firstQuestionPk == null) firstQuestionPk = questionPk;
                this.$TCT.questions.set(questionPk, {
                    "model": "campaign_trail.question",
                    "pk": questionPk,
                    "fields": {
                        "description": parsedQuestion.text || ""
                    }
                });
                questionCount++;

                for (const parsedAnswer of parsedQuestion.answers) {
                    const answerPk = this.$TCT.getNewPk();
                    this.$TCT.answers[answerPk] = {
                        "model": "campaign_trail.answer",
                        "pk": answerPk,
                        "fields": {
                            "question": questionPk,
                            "description": parsedAnswer.text || ""
                        }
                    };
                    answerCount++;

                    for (const fb of parsedAnswer.feedback) {
                        const feedbackPk = this.$TCT.getNewPk();
                        this.$TCT.answer_feedback[feedbackPk] = {
                            "model": "campaign_trail.answer_feedback",
                            "pk": feedbackPk,
                            "fields": {
                                "answer": answerPk,
                                "candidate": fb.candidate == null ? defaultCandidatePk : Number(fb.candidate),
                                "answer_feedback": fb.text || ""
                            }
                        };
                        feedbackCount++;
                    }

                    for (const globalEff of parsedAnswer.globalEffects) {
                        const globalPk = this.$TCT.getNewPk();
                        this.$TCT.answer_score_global[globalPk] = {
                            "model": "campaign_trail.answer_score_global",
                            "pk": globalPk,
                            "fields": {
                                "answer": answerPk,
                                "candidate": defaultCandidatePk,
                                "affected_candidate": Number(globalEff.affectedCandidate),
                                "global_multiplier": Number(globalEff.globalMultiplier)
                            }
                        };
                        globalCount++;
                    }

                    for (const stateEff of parsedAnswer.stateEffects) {
                        const statePk = this.$TCT.getNewPk();
                        this.$TCT.answer_score_state[statePk] = {
                            "model": "campaign_trail.answer_score_state",
                            "pk": statePk,
                            "fields": {
                                "answer": answerPk,
                                "state": Number(stateEff.statePk),
                                "candidate": defaultCandidatePk,
                                "affected_candidate": Number(stateEff.affectedCandidate),
                                "state_multiplier": Number(stateEff.stateMultiplier)
                            }
                        };
                        stateCount++;
                    }

                    for (const issueEff of parsedAnswer.issueEffects) {
                        const issuePk = this.$TCT.getNewPk();
                        this.$TCT.answer_score_issue[issuePk] = {
                            "model": "campaign_trail.answer_score_issue",
                            "pk": issuePk,
                            "fields": {
                                "answer": answerPk,
                                "issue": Number(issueEff.issuePk),
                                "issue_score": Number(issueEff.issueScore),
                                "issue_importance": Number(issueEff.issueImportance)
                            }
                        };
                        issueCount++;
                    }
                }
            }

            this.$TCT._invalidateCache('answers_by_question');
            this.$TCT._invalidateCache('feedback_by_answer');
            this.$TCT._invalidateCache('global_score_by_answer');
            this.$TCT._invalidateCache('state_score_by_answer');
            this.$TCT._invalidateCache('issue_score_by_answer');
            this.$TCT._invalidateCache('answer_score_issue_by_issue');

            if (firstQuestionPk != null) {
                this.selectedQuestionPk = firstQuestionPk;
            }

            this.campaignScriptWarnings = parsed.warnings;
            this.$globalData.dataVersion++;
            alert(`CampaignScript imported! Added ${questionCount} questions, ${answerCount} answers, ${feedbackCount} feedbacks, ${globalCount} global effects, ${stateCount} state effects, and ${issueCount} issue effects.`);
        },

        checkAllStates: function () {
            this.multiplierItems.forEach(i => i.include = true);
        },

        uncheckAllStates: function () {
            this.multiplierItems.forEach(i => i.include = false);
        },

        checkAllIssues: function () {
            this.issueItems.forEach(i => i.include = true);
        },

        uncheckAllIssues: function () {
            this.issueItems.forEach(i => i.include = false);
        },

        checkAll: function () {
            this.stateItems.forEach(i => i.include = true);
        },

        invertAll: function () {
            this.stateItems.forEach(i => i.amount = -i.amount);
        }
    },

    computed: {

        candidates: function () {
            return this.$TCT.getAllCandidatePKs().map((x) => {
                let nickname = this.$TCT.getNicknameForCandidate(x);
                if (nickname) nickname = " (" + nickname + ")"
                return {
                    pk: x,
                    nickname: nickname
                }
            });
        },

        issues: function () {
            return Object.values(this.$TCT.issues);
        },

        filteredIssueItems: function () {
            if (!this.issueFilter) return this.issueItems;
            const f = this.issueFilter.toLowerCase();
            return this.issueItems.filter(i => i.name.toLowerCase().includes(f));
        },

        states: function () {
            return Object.values(this.$TCT.states);
        },

        questionsList: function () {
            return Array.from(this.$TCT.questions.values());
        },

        answersForSelectedQuestion: function () {
            if (!this.selectedQuestionPk) return [];
            return this.$TCT.getAnswersForQuestion(this.selectedQuestionPk);
        },

        stateIssueScores: function () {
            return Object.values(this.$TCT.state_issue_scores).filter((x) => x.fields.issue == this.issuePk)
        },

        stateMultipliers: function () {
            return Object.values(this.$TCT.candidate_state_multiplier).filter((x) => x.fields.candidate == this.bulkCandidatePk)
        }
    }
});

registerComponent('bulk-state', {

    data() {
        return {
            include: false,
            amount: 0,
        };
    },

    props: ['pk', 'stateObject'],

    template: `
    <li class="flex items-center justify-between p-2 border-b">
        <div class="flex items-center space-x-3">
            <input type="checkbox" v-model="include" class="h-4 w-4">
            <span class="text-sm text-gray-700">{{stateObject.fields.name}}</span>
        </div>
        <input v-model="amount" name="name" type="number" class="ml-4 w-28 p-1 border border-gray-300 rounded-md text-sm">
    </li>
    `,

    computed: {

    }
});

registerComponent('bulk-issue', {

    data() {
        return {
            include: false,
        };
    },

    props: ['pk', 'issueScoreObject'],

    template: `
    <li class="flex items-center justify-between p-2 border-b">
        <div class="flex items-center space-x-3">
            <input type="checkbox" v-model="include" class="h-4 w-4">
            <span class="text-sm text-gray-700">{{stateName}}</span>
        </div>
    </li>
    `,

    computed: {
        stateName: function () {
            return this.$TCT.states[this.issueScoreObject.fields.state].fields.name;
        }
    }
});


registerComponent('bulk-state-multiplier', {

    data() {
        return {
            include: false,
        };
    },

    props: ['pk', 'stateMultiplierObject'],

    template: `
    <li class="flex items-center justify-between p-2 border-b">
        <div class="flex items-center space-x-3">
            <input type="checkbox" v-model="include" class="h-4 w-4">
            <span class="text-sm text-gray-700">{{stateName}}</span>
        </div>
    </li>
    `,

    computed: {
        stateName: function () {
            return this.$TCT.states[this.stateMultiplierObject.fields.state].fields.name;
        }
    }
});

