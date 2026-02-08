registerComponent('bulk', {

    data() {
        return {
            answerPk: "",
            candidate: "",
            affectedCandidate: "",
            issuePk: Object.keys(this.$TCT.issues)[0],
            stateIssueScore: "",
            issueWeight: "",
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

                    <div>
                        <label class="block text-sm font-medium text-gray-700">State Issue Score</label>
                        <input v-model.number="stateIssueScore" name="name" type="number"
                               class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-xs focus:ring-3 focus:ring-blue-400 focus:border-blue-500">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700">Issue Weight</label>
                        <input v-model.number="issueWeight" name="name" type="number"
                               class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-xs focus:ring-3 focus:ring-blue-400 focus:border-blue-500">
                    </div>
                </div>

                <div class="flex gap-2 mb-3">
                    <button class="bg-gray-200 text-gray-800 px-3 py-2 rounded hover:bg-gray-300" v-on:click="checkAllIssues()">Check All</button>
                    <button class="bg-gray-200 text-gray-800 px-3 py-2 rounded hover:bg-gray-300" v-on:click="uncheckAllIssues()">Uncheck All</button>
                    <button class="ml-auto bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600" v-on:click="setIssueScores()">Set Issue Scores</button>
                </div>

                <ul class="divide-y border rounded overflow-hidden">
                    <li v-for="item in issueItems" :key="item.pk" class="flex items-center justify-between p-2">
                        <div class="flex items-center space-x-3">
                            <input type="checkbox" v-model="item.include" class="h-4 w-4">
                            <span class="text-sm text-gray-700">{{ item.name }}</span>
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
                include: false
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
                    this.$TCT.state_issue_scores[item.pk].fields.state_issue_score = Number(this.stateIssueScore);
                    this.$TCT.state_issue_scores[item.pk].fields.weight = Number(this.issueWeight);
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

