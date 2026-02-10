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
                            "candidate": Number(this.candidate) || this.$TCT.getFirstCandidatePK(),
                            "affected_candidate": Number(this.affectedCandidate) || this.$TCT.getFirstCandidatePK(),
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

