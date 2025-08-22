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
            stateMultiplier : ""
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
            <bulk-state v-for="state in states" :pk="state.pk" :key="state.pk" :stateObject="state"></bulk-state>
        </ul>

        <button class="bg-green-500 text-white p-2 my-2 rounded-sm hover:bg-green-600" v-on:click="generate()">Generate State Scores</button>

    </details>

    <details>
    <summary class="font-bold">Bulk State Issue Score Utility</summary>

        <label for="issue">Issue:</label><br>
        <select @change="setIssuePk($event)" name="issue">
            <option v-for="issue in issues" :selected="issue.pk == issuePk" :value="issue.pk" :key="issue.pk">{{issue.pk}} - {{issue.fields.name}}</option>
        </select><br>

        <label for="name">State Issue Score:</label><br>
        <input v-model="stateIssueScore" name="name" type="number"><br><br>

        <label for="name">Issue Weight:</label><br>
        <input v-model="issueWeight" name="name" type="number"><br><br>

        <button class="bg-gray-300 p-2 my-2 rounded-sm hover:bg-gray-500" v-on:click="checkAllIssues()">Check All</button>
        <button class="bg-gray-300 p-2 my-2 rounded-sm hover:bg-gray-500" v-on:click="uncheckAllIssues()">Uncheck All</button>
        <br>
        
        <ul>
            <bulk-issue v-for="stateIssueScore in stateIssueScores" :pk="stateIssueScore.pk" :key="stateIssueScore.pk" :issueScoreObject="stateIssueScore"></bulk-issue>
        </ul>

        <button class="bg-green-500 text-white p-2 my-2 rounded-sm hover:bg-green-600" v-on:click="setIssueScores()">Set Issue Scores</button>

    </details>

    <details>
    <summary class="font-bold">Bulk Candidate State Multiplier Utility</summary>

        <label for="bulkCandidatePk">Candidate PK:</label><br>
        <select @change="setCandidatePk($event)" name="issue">
            <option v-for="candidate in candidates" :selected="candidate.pk == bulkCandidatePk" :value="candidate.pk" :key="candidate.pk">{{candidate.pk}} {{candidate.nickname}}</option>
        </select><br>

        <label for="stateMultiplier">State Multiplier:</label><br>
        <input v-model="stateMultiplier" name="stateMultiplier" type="number"><br><br>

        <button class="bg-gray-300 p-2 my-2 rounded-sm hover:bg-gray-500" v-on:click="checkAllStates()">Check All</button>
        <button class="bg-gray-300 p-2 my-2 rounded-sm hover:bg-gray-500" v-on:click="uncheckAllStates()">Uncheck All</button>
        <br>
        
        <ul>
            <bulk-state-multiplier v-for="stateMultiplier in stateMultipliers" :pk="stateMultiplier.pk" :key="stateMultiplier.pk" :stateMultiplierObject="stateMultiplier"></bulk-state-multiplier>
        </ul>

        <button class="bg-green-500 text-white p-2 my-2 rounded-sm hover:bg-green-600" v-on:click="setStateMultipliers()">Set State Multipliers</button>

        <br>
        <br>
        <label for="multiplier">Multiply All Checked State Multipliers By:</label><br>
        <input v-model="multiplier" name="multiplier" type="number"><br>
        <button class="bg-green-500 text-white p-2 my-2 rounded-sm hover:bg-green-600" v-on:click="multiplyStateMultipliers()">Multiply State Multipliers</button>

    </details>

    </div>
    `,

    methods: {

        setCandidatePk: function(evt) {
            this.bulkCandidatePk = evt.target.value;
        },

        setIssuePk: function(evt) {
            this.issuePk = evt.target.value;
        },
        onInput: function(evt) {

            let value = evt.target.value;
            if(shouldBeSavedAsNumber(value)) {
                value = Number(value);
            }

            Vue.prototype.$TCT.states[this.pk].fields[evt.target.name] = value;
        },

        generate: function() {
            const stateScores = document.getElementsByClassName("bulkStateScore");
            for(let i = 0; i < stateScores.length; i++) {
                const score = stateScores[i];
                const data = score.__vue__._data;

                const pk = Number(score.__vue__._props.pk);
                const amount = Number(data.amount);
                const include = data.include;

                if(include) {
                    const newPk =  Vue.prototype.$TCT.getNewPk();
                    let x = {
                        "model": "campaign_trail.answer_score_state",
                        "pk": newPk,
                        "fields": {
                            "answer": Number(this.answerPk),
                            "state": pk,
                            "candidate": this.candidate,
                            "affected_candidate": this.affectedCandidate,
                            "state_multiplier": amount
                        }
                    }
                    Vue.prototype.$TCT.answer_score_state[newPk] = x;
                }
                        
            }

            alert("Bulk generated state scores for answer with PK " + this.answerPk + " (do not submit again)");
        },

        setIssueScores: function() {
            const issueScores = document.getElementsByClassName("bulkStateIssue");
            for(let i = 0; i < issueScores.length; i++) {
                const score = issueScores[i];
                const data = score.__vue__._data;

                const pk = Number(score.__vue__._props.pk);
                const include = data.include;

                if(include) {
                    Vue.prototype.$TCT.state_issue_scores[pk].fields.state_issue_score = Number(this.stateIssueScore);
                    Vue.prototype.$TCT.state_issue_scores[pk].fields.weight = Number(this.issueWeight);
                }
                        
            }

            alert("Set issue scores!")
        },

        setStateMultipliers: function() {
            const stateMultipliers = document.getElementsByClassName("bulkStateMultiplier");
            for(let i = 0; i < stateMultipliers.length; i++) {
                const score = stateMultipliers[i];
                const data = score.__vue__._data;

                const pk = Number(score.__vue__._props.pk);
                const include = data.include;

                if(include) {
                    Vue.prototype.$TCT.candidate_state_multiplier[pk].fields.state_multiplier = Number(this.stateMultiplier);
                }
                        
            }

            alert("Set state multipliers!")
        },

        multiplyStateMultipliers: function() {
            const stateMultipliers = document.getElementsByClassName("bulkStateMultiplier");
            for(let i = 0; i < stateMultipliers.length; i++) {
                const score = stateMultipliers[i];
                const data = score.__vue__._data;

                const pk = Number(score.__vue__._props.pk);
                const include = data.include;

                if(include) {
                    Vue.prototype.$TCT.candidate_state_multiplier[pk].fields.state_multiplier *= Number(this.multiplier);
                }
                        
            }

            alert("Multiplied state multipliers!")
        },

        checkAllStates: function() {
            const issueScores = document.getElementsByClassName("bulkStateMultiplier");
            for(let i = 0; i < issueScores.length; i++) {
                const score = issueScores[i];
                const data = score.__vue__._data;
                data.include = true;
            }
        },

        uncheckAllStates: function() {
            const issueScores = document.getElementsByClassName("bulkStateMultiplier");
            for(let i = 0; i < issueScores.length; i++) {
                const score = issueScores[i];
                const data = score.__vue__._data;
                data.include = false;
            }
        },

        checkAllIssues: function() {
            const issueScores = document.getElementsByClassName("bulkStateIssue");
            for(let i = 0; i < issueScores.length; i++) {
                const score = issueScores[i];
                const data = score.__vue__._data;
                data.include = true;
            }
        },

        uncheckAllIssues: function() {
            const issueScores = document.getElementsByClassName("bulkStateIssue");
            for(let i = 0; i < issueScores.length; i++) {
                const score = issueScores[i];
                const data = score.__vue__._data;
                data.include = false;
            }
        },

        checkAll: function() {
            const stateScores = document.getElementsByClassName("bulkStateScore");
            for(let i = 0; i < stateScores.length; i++) {
                const score = stateScores[i];
                const data = score.__vue__._data;
                data.include = true;
            }
        },

        
        invertAll: function() {
            const stateScores = document.getElementsByClassName("bulkStateScore");
            for(let i = 0; i < stateScores.length; i++) {
                const score = stateScores[i];
                const data = score.__vue__._data;
                data.amount *= -1;
            }
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