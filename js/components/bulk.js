window.defineComponent('bulk', {

    data() {
        return {
            answerPk : "",
            candidate: "",
            affectedCandidate: "",
            issuePk: Object.keys(Vue.prototype.$TCT.issues)[0],
            stateIssueScore : "",
            issueWeight : "",
            bulkCandidatePk : Vue.prototype.$TCT.getAllCandidatePKs()[0],
            stateMultiplier : "",
            multiplier: 1,
            stateItems: [],
            issueItems: [],
            multiplierItems: []
        };
    },

    template: `
    <div class="mx-auto bg-gray-100 p-4">

    <details>
    <summary class="font-bold">Bulk State Answer Score Utility</summary>

        <label for="name">Answer PK:</label><br>
        <input v-model="answerPk" name="name" type="number"><br><br>

        <label for="name">Candidate PK:</label><br>
        <input v-model="candidate" name="name" type="number"><br><br>

        <label for="name">Affected Candidate PK:</label><br>
        <input v-model="affectedCandidate" name="name" type="number"><br><br>

        <button class="bg-gray-300 p-2 my-2 rounded-sm hover:bg-gray-500" v-on:click="checkAll()">Check All</button>
        <br>
        <button class="bg-gray-300 p-2 my-2 rounded-sm hover:bg-gray-500" v-on:click="invertAll()">Invert All Values</button>
        <br>
        
        <ul>
            <li v-for="item in stateItems" :key="item.pk" class="bulkStateScore">
                <input type="checkbox" v-model="item.include"> {{ item.name }}
                <input v-model.number="item.amount" name="amount" type="number" class="ml-2 w-24">
            </li>
        </ul>

        <button class="bg-green-500 text-white p-2 my-2 rounded-sm hover:bg-green-600" v-on:click="generate()">Generate State Scores</button>

    </details>

    <details>
    <summary class="font-bold">Bulk State Issue Score Utility</summary>

        <label for="issue">Issue:</label><br>
        <select @change="setIssuePk($event)" name="issue" v-model.number="issuePk">
            <option v-for="issue in issues" :value="issue.pk" :key="issue.pk">{{issue.pk}} - {{issue.fields.name}}</option>
        </select><br>

        <label for="name">State Issue Score:</label><br>
        <input v-model.number="stateIssueScore" name="name" type="number"><br><br>

        <label for="name">Issue Weight:</label><br>
        <input v-model.number="issueWeight" name="name" type="number"><br><br>

        <button class="bg-gray-300 p-2 my-2 rounded-sm hover:bg-gray-500" v-on:click="checkAllIssues()">Check All</button>
        <button class="bg-gray-300 p-2 my-2 rounded-sm hover:bg-gray-500" v-on:click="uncheckAllIssues()">Uncheck All</button>
        <br>
        
        <ul>
            <li v-for="item in issueItems" :key="item.pk" class="bulkStateIssue">
                <input type="checkbox" v-model="item.include"> {{ item.name }}
            </li>
        </ul>

        <button class="bg-green-500 text-white p-2 my-2 rounded-sm hover:bg-green-600" v-on:click="setIssueScores()">Set Issue Scores</button>

    </details>

    <details>
    <summary class="font-bold">Bulk Candidate State Multiplier Utility</summary>

        <label for="bulkCandidatePk">Candidate PK:</label><br>
        <select @change="setCandidatePk($event)" name="issue" v-model.number="bulkCandidatePk">
            <option v-for="candidate in candidates" :value="candidate.pk" :key="candidate.pk">{{candidate.pk}} {{candidate.nickname}}</option>
        </select><br>

        <label for="stateMultiplier">State Multiplier:</label><br>
        <input v-model.number="stateMultiplier" name="stateMultiplier" type="number"><br><br>

        <button class="bg-gray-300 p-2 my-2 rounded-sm hover:bg-gray-500" v-on:click="checkAllStates()">Check All</button>
        <button class="bg-gray-300 p-2 my-2 rounded-sm hover:bg-gray-500" v-on:click="uncheckAllStates()">Uncheck All</button>
        <br>
        
        <ul>
            <li v-for="item in multiplierItems" :key="item.pk" class="bulkStateMultiplier">
                <input type="checkbox" v-model="item.include"> {{ item.name }}
            </li>
        </ul>

        <button class="bg-green-500 text-white p-2 my-2 rounded-sm hover:bg-green-600" v-on:click="setStateMultipliers()">Set State Multipliers</button>

        <br>
        <br>
        <label for="multiplier">Multiply All Checked State Multipliers By:</label><br>
        <input v-model.number="multiplier" name="multiplier" type="number"><br>
        <button class="bg-green-500 text-white p-2 my-2 rounded-sm hover:bg-green-600" v-on:click="multiplyStateMultipliers()">Multiply State Multipliers</button>

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

        setCandidatePk: function(evt) {
            this.bulkCandidatePk = Number(evt.target.value);
        },

        setIssuePk: function(evt) {
            this.issuePk = Number(evt.target.value);
        },

        refreshStateItems() {
            this.stateItems = Object.values(Vue.prototype.$TCT.states).map(s => ({
                pk: s.pk,
                name: s.fields.name || `State ${s.pk}`,
                include: false,
                amount: 0
            }));
        },

        refreshIssueItems() {
            const scores = Object.values(Vue.prototype.$TCT.state_issue_scores).filter((x) => x.fields.issue == this.issuePk);
            this.issueItems = scores.map(s => ({
                pk: s.pk,
                name: Vue.prototype.$TCT.states[s.fields.state]?.fields?.name || `State ${s.fields.state}`,
                include: false
            }));
        },

        refreshMultiplierItems() {
            const mults = Object.values(Vue.prototype.$TCT.candidate_state_multiplier).filter((x) => x.fields.candidate == this.bulkCandidatePk);
            this.multiplierItems = mults.map(m => ({
                pk: m.pk,
                name: Vue.prototype.$TCT.states[m.fields.state]?.fields?.name || `State ${m.fields.state}`,
                include: false
            }));
        },

        generate: function() {
            if (!this.answerPk) {
                alert("Answer PK required.");
                return;
            }
            for(const item of this.stateItems) {
                if(item.include) {
                    const newPk = Vue.prototype.$TCT.getNewPk(); // see js/base.js
                    let x = {
                        "model": "campaign_trail.answer_score_state",
                        "pk": newPk,
                        "fields": {
                            "answer": Number(this.answerPk),
                            "state": item.pk,
                            "candidate": Number(this.candidate) || Vue.prototype.$TCT.getFirstCandidatePK(),
                            "affected_candidate": Number(this.affectedCandidate) || Vue.prototype.$TCT.getFirstCandidatePK(),
                            "state_multiplier": item.amount
                        }
                    }
                    Vue.prototype.$TCT.answer_score_state[newPk] = x;
                }
            }

            alert("Bulk generated state scores for answer with PK " + this.answerPk + " (do not submit again)");
        },

        setIssueScores: function() {
            for(const item of this.issueItems) {
                if(item.include) {
                    Vue.prototype.$TCT.state_issue_scores[item.pk].fields.state_issue_score = Number(this.stateIssueScore);
                    Vue.prototype.$TCT.state_issue_scores[item.pk].fields.weight = Number(this.issueWeight);
                }
            }

            alert("Set issue scores!");
        },

        setStateMultipliers: function() {
            for(const item of this.multiplierItems) {
                if(item.include) {
                    Vue.prototype.$TCT.candidate_state_multiplier[item.pk].fields.state_multiplier = Number(this.stateMultiplier);
                }
            }
            alert("Set state multipliers!");
        },

        multiplyStateMultipliers: function() {
            for(const item of this.multiplierItems) {
                if(item.include) {
                    Vue.prototype.$TCT.candidate_state_multiplier[item.pk].fields.state_multiplier *= Number(this.multiplier);
                }
            }
            alert("Multiplied state multipliers!");
        },

        checkAllStates: function() {
            this.multiplierItems.forEach(i => i.include = true);
        },

        uncheckAllStates: function() {
            this.multiplierItems.forEach(i => i.include = false);
        },

        checkAllIssues: function() {
            this.issueItems.forEach(i => i.include = true);
        },

        uncheckAllIssues: function() {
            this.issueItems.forEach(i => i.include = false);
        },

        checkAll: function() {
            this.stateItems.forEach(i => i.include = true);
        },

        invertAll: function() {
            this.stateItems.forEach(i => i.amount = -i.amount);
        }
    },

    computed: {

        candidates: function() {
            return Vue.prototype.$TCT.getAllCandidatePKs().map((x) => {
                let nickname = Vue.prototype.$TCT.getNicknameForCandidate(x);
                if(nickname) nickname = " (" + nickname + ")"
                return {
                    pk: x,
                    nickname: nickname
                }
            });
        },

        issues: function () {
            return Object.values(Vue.prototype.$TCT.issues);
        },

        states: function () {
            return Object.values(Vue.prototype.$TCT.states);
        },

        stateIssueScores: function() {
            return Object.values(Vue.prototype.$TCT.state_issue_scores).filter((x) => x.fields.issue == this.issuePk)
        },

        stateMultipliers: function() {
            return Object.values(Vue.prototype.$TCT.candidate_state_multiplier).filter((x) => x.fields.candidate == this.bulkCandidatePk)
        }
    }
});

window.defineComponent('bulk-state', {

    data() {
        return {
            include : false,
            amount : 0,
        };
    },

    props: ['pk', 'stateObject'],

    template: `
    <li class="bulkStateScore">
    <input type="checkbox" v-model="include">
    {{stateObject.fields.name}}
    <input v-model="amount" name="name" type="number"><br><br>
    </li>
    `,

    computed: {

    }
});

window.defineComponent('bulk-issue', {

    data() {
        return {
            include : false,
        };
    },

    props: ['pk', 'issueScoreObject'],

    template: `
    <li class="bulkStateIssue">
    <input type="checkbox" v-model="include">
    {{stateName}}
    </li>
    `,

    computed: {
        stateName: function() {
            return Vue.prototype.$TCT.states[this.issueScoreObject.fields.state].fields.name;
        }
    }
});


window.defineComponent('bulk-state-multiplier', {

    data() {
        return {
            include : false,
        };
    },

    props: ['pk', 'stateMultiplierObject'],

    template: `
    <li class="bulkStateMultiplier">
    <input type="checkbox" v-model="include">
    {{stateName}}
    </li>
    `,

    computed: {
        stateName: function() {
            return Vue.prototype.$TCT.states[this.stateMultiplierObject.fields.state].fields.name;
        }
    }
});