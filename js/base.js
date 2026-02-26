"use strict";

// global component registration queue
window.TCTComponentQueue = [];
window.registerComponent = function (name, definition) {
    if (window.TCTApp) {
        window.TCTApp.component(name, definition);
    } else {
        window.TCTComponentQueue.push({ name, definition });
    }
};

const TEMPLATE_NAMES =
    [
        "1844-Clay.txt",
        "1844-Polk.txt",
        "1860-Douglas.txt",
        "1860-Lincoln.txt",
        "1896-Bryan.txt",
        "1896-McKinley.txt",
        "1916-Hughes.txt",
        "1916-Wilson.txt",
        "1948-Dewey.txt",
        "1948-Truman.txt",
        "1960-Kennedy.txt",
        "1960-Nixon.txt",
        "1968-Humphrey.txt",
        "1968-Nixon.txt",
        "1968-Wallace.txt",
        "1976-Carter.txt",
        "1976-Ford.txt",
        "1988-Bush.txt",
        "1988-Dukakis.txt",
        "2000-Bush.txt",
        "2000-Gore.txt",
        "2000-Nader.txt",
        "2012-Obama.txt",
        "2012-Romney.txt",
        "2016-Clinton.txt",
        "2016-Trump.txt",
        "2020-Biden.txt",
        "2020-Trump.txt"
    ]

class TCTData {
    constructor(questions, answers, issues, state_issue_scores, candidate_issue_score, running_mate_issue_score, candidate_state_multiplier, answer_score_global, answer_score_issue, answer_score_state, answer_feedback, states, highest_pk, jet_data) {
        this.highest_pk = highest_pk
        this.questions = questions
        this.answers = answers
        this.issues = issues
        this.state_issue_scores = state_issue_scores
        this.candidate_issue_score = candidate_issue_score
        this.running_mate_issue_score = running_mate_issue_score
        this.candidate_state_multiplier = candidate_state_multiplier
        this.answer_score_global = answer_score_global
        this.answer_score_issue = answer_score_issue
        this.answer_score_state = answer_score_state
        this.answer_feedback = answer_feedback
        this.states = states
        this.jet_data = jet_data
        this._indices = {};

        this.cleanAllData();
    }

    // helper to clear cache when data is modified
    _invalidateCache(key) {
        if (this._indices[key]) {
            this._indices[key] = null;
        }
    }

    // generic index builder to replace o(n) filters
    _getFromIndex(indexName, sourceData, fieldKey, lookupValue) {
        if (!this._indices[indexName]) {
            const index = new Map();
            const values = Object.values(sourceData);
            for (let i = 0; i < values.length; i++) {
                const item = values[i];
                let key = item.fields[fieldKey];

                if (typeof key === 'string' && key.trim() !== '' && !isNaN(key)) {
                    key = Number(key);
                }

                if (!index.has(key)) {
                    index.set(key, []);
                }
                index.get(key).push(item);
            }
            this._indices[indexName] = index;
        }

        let searchKey = lookupValue;
        if (typeof searchKey === 'string' && searchKey.trim() !== '' && !isNaN(searchKey)) {
            searchKey = Number(searchKey);
        }

        return this._indices[indexName].get(searchKey) || [];
    }

    cleanAllData() {
        this.cleanMap(this.questions);
        this.clean(this.answers);
        this.clean(this.issues);
        this.clean(this.state_issue_scores);
        this.clean(this.candidate_issue_score);
        this.clean(this.running_mate_issue_score);
        this.clean(this.candidate_state_multiplier);
        this.clean(this.answer_score_global);
        this.clean(this.answer_score_issue);
        this.clean(this.answer_score_state);
        this.clean(this.answer_feedback);
        this.clean(this.states);
    }

    // guard against nulls in map values
    cleanMap(map) {
        for (let [key, value] of map) {
            if (value && typeof value === 'object') {
                this.clean(value);
            }
        }
    }

    // avoid converting empty strings to 0; handle nulls safely
    clean(obj) {
        if (!obj || typeof obj !== 'object') return;
        for (let key in obj) {
            const val = obj[key];
            if (typeof val === 'string') {
                // checks for integer, float, leading dot, trailing dot
                if (/^-?(\d+(\.\d*)?|\.\d+)$/.test(val)) {
                    obj[key] = Number(val);
                } else {
                    const trimmed = val.trim();
                    if (trimmed !== '' && !isNaN(trimmed)) {
                        obj[key] = Number(trimmed);
                    }
                }
            } else if (val && typeof val === 'object') {
                this.clean(val);
            }
        }
    }

    cloneQuestion(pk) {
        pk = Number(pk);
        let toClone = this.questions.get(pk)
        let answers = this.getAnswersForQuestion(pk);

        let newPk = this.getNewPk();
        let question = {
            "model": "campaign_trail.question",
            "pk": newPk,
            "fields": {
                "description": toClone.fields.description
            }
        }

        // no need to invalidate cache for questions map as it isn't indexed by foreign key
        this.questions.set(newPk, question);

        for (let i = 0; i < answers.length; i++) {
            this.cloneAnswer(answers[i], newPk);
        }

        return question;
    }

    // reorder questions by array of PKs (in desired order)
    reorderQuestions(newOrderPks) {
        try {
            const current = Array.from(this.questions.values());
            if (!Array.isArray(newOrderPks) || newOrderPks.length !== current.length) {
                console.warn("reorderQuestions: new order length mismatch");
            }
            const lookup = new Map();
            for (let i = 0; i < current.length; i++) {
                lookup.set(current[i].pk, current[i]);
            }

            // validate that provided PKs are all present
            for (const pk of newOrderPks) {
                if (!lookup.has(pk)) {
                    console.warn("reorderQuestions: pk not found in current map:", pk);
                }
            }
            // build ordered question objects; keep any missing ones at the end to be safe
            const ordered = [];
            for (const pk of newOrderPks) {
                const q = lookup.get(pk);
                if (q) ordered.push(q);
            }
            // append any stragglers not in newOrderPks
            if (ordered.length < current.length) {
                const missing = current.filter(q => !newOrderPks.includes(q.pk));
                ordered.push(...missing);
            }
            // mutate the existing map in place
            this.questions.clear();
            for (const q of ordered) {
                this.questions.set(q.pk, q);
            }
        } catch (e) {
            console.error("Error in reorderQuestions:", e);
            throw e;
        }
    }

    changePk(type, oldPk, newPk) {
        oldPk = Number(oldPk);
        newPk = Number(newPk);

        if (oldPk === newPk) return false;
        if (isNaN(newPk)) {
            alert("Invalid PK value.");
            return false;
        }

        // collections that use these IDs as PKs
        const collections = {
            'question': this.questions,
            'answer': this.answers,
            'issue': this.issues,
            'state': this.states,
            'feedback': this.answer_feedback,
            'state_issue_score': this.state_issue_scores,
            'candidate_issue_score': this.candidate_issue_score,
            'running_mate_issue_score': this.running_mate_issue_score,
            'candidate_state_multiplier': this.candidate_state_multiplier,
            'answer_score_global': this.answer_score_global,
            'answer_score_issue': this.answer_score_issue,
            'answer_score_state': this.answer_score_state
        };

        const container = collections[type];

        // Check if newPk is already taken in the target collection (if it's a primary PK change)
        if (container) {
            const isTaken = container instanceof Map ? container.has(newPk) : (container[newPk] !== undefined);
            if (isTaken) {
                alert(`PK ${newPk} is already taken in ${type}.`);
                return false;
            }
        }

        // 1. Update the PK in the main collection if applicable
        if (container) {
            let obj = container instanceof Map ? container.get(oldPk) : container[oldPk];
            if (!obj) {
                console.error(`Could not find ${type} with PK ${oldPk}`);
                return false;
            }
            obj.pk = newPk;
            if (container instanceof Map) {
                container.delete(oldPk);
                container.set(newPk, obj);
            } else {
                delete container[oldPk];
                container[newPk] = obj;
            }
        }

        // 2. Update Foreign Key references throughout all data
        const allContainers = [
            this.questions, this.answers, this.states, this.issues, this.answer_feedback,
            this.state_issue_scores, this.candidate_issue_score, this.running_mate_issue_score,
            this.candidate_state_multiplier, this.answer_score_global, this.answer_score_issue,
            this.answer_score_state
        ];

        // Map type to common field names that act as FKs
        const fkFields = {
            'question': ['question'],
            'answer': ['answer'],
            'issue': ['issue'],
            'state': ['state'],
            'candidate': ['candidate', 'affected_candidate', 'running_mate']
        };

        const targetFields = fkFields[type] || [];

        allContainers.forEach(cont => {
            const values = cont instanceof Map ? Array.from(cont.values()) : Object.values(cont);
            values.forEach(item => {
                if (!item || !item.fields) return;
                targetFields.forEach(field => {
                    const val = item.fields[field];
                    if (val === oldPk) {
                        item.fields[field] = newPk;
                    }
                });
            });
        });

        // 3. Special case for Candidate nicknames
        if (type === 'candidate') {
            if (this.jet_data && this.jet_data.nicknames) {
                if (this.jet_data.nicknames[oldPk] !== undefined) {
                    this.jet_data.nicknames[newPk] = this.jet_data.nicknames[oldPk];
                    delete this.jet_data.nicknames[oldPk];
                }
            }
        }

        // 4. Invalidate all indexes
        this._indices = {};

        // 5. Update highest_pk if the new PK exceeds it
        if (newPk > this.highest_pk && newPk < Number.MAX_SAFE_INTEGER) {
            this.highest_pk = Math.ceil(newPk);
        }

        console.log(`Successfully changed ${type} PK ${oldPk} to ${newPk}`);
        return true;
    }

    cloneIssue(sourcePk) {
        const baseIssue = this.issues[sourcePk];
        if (!baseIssue) {
            throw new Error('Issue base not found.');
        }

        const newPk = this.getNewPk();
        const clonedFields = JSON.parse(JSON.stringify(baseIssue.fields || {}));
        clonedFields.name = clonedFields.name ? `${clonedFields.name} (Copy)` : 'New issue';

        const clonedIssue = {
            model: 'campaign_trail.issue',
            pk: newPk,
            fields: clonedFields
        };

        this.issues[newPk] = clonedIssue;

        const candidateScores = this.getCandidateIssueScoreForIssue(sourcePk);
        candidateScores.forEach(score => {
            const newScorePk = this.getNewPk();
            this.candidate_issue_score[newScorePk] = {
                model: score.model,
                pk: newScorePk,
                fields: {
                    ...score.fields,
                    issue: newPk
                }
            };
        });
        this._invalidateCache('candidate_issue_score_by_issue');
        this._invalidateCache('candidate_issue_score_by_candidate');

        const runningMateScores = this.getRunningMateIssueScoreForIssue(sourcePk);
        runningMateScores.forEach(score => {
            const newScorePk = this.getNewPk();
            this.running_mate_issue_score[newScorePk] = {
                model: score.model,
                pk: newScorePk,
                fields: {
                    ...score.fields,
                    issue: newPk
                }
            };
        });
        this._invalidateCache('running_mate_issue_score_by_issue');
        this._invalidateCache('running_mate_issue_score_by_candidate');

        const stateScores = this.getStateIssueScoresForIssue(sourcePk);
        stateScores.forEach(score => {
            const newScorePk = this.getNewPk();
            this.state_issue_scores[newScorePk] = {
                model: score.model,
                pk: newScorePk,
                fields: {
                    ...score.fields,
                    issue: newPk
                }
            };
        });
        this._invalidateCache('state_issue_scores_by_issue');
        this._invalidateCache('state_issue_scores_by_state');

        return clonedIssue;
    }

    removeIssue(pk) {
        if (!this.issues[pk]) {
            throw new Error('Issue not found.');
        }

        if (Object.keys(this.issues).length <= 1) {
            throw new Error('Mods should have at least once issue defined.');
        }

        const candidateScores = this.getCandidateIssueScoreForIssue(pk);
        const runningMateScores = this.getRunningMateIssueScoreForIssue(pk);
        const stateScores = this.getStateIssueScoresForIssue(pk);
        const answerScoreIssues = this._getFromIndex('answer_score_issue_by_issue', this.answer_score_issue, 'issue', pk);

        delete this.issues[pk];

        candidateScores.forEach(score => {
            delete this.candidate_issue_score[score.pk];
        });
        this._invalidateCache('candidate_issue_score_by_issue');
        this._invalidateCache('candidate_issue_score_by_candidate');

        runningMateScores.forEach(score => {
            delete this.running_mate_issue_score[score.pk];
        });
        this._invalidateCache('running_mate_issue_score_by_issue');
        this._invalidateCache('running_mate_issue_score_by_candidate');

        stateScores.forEach(score => {
            delete this.state_issue_scores[score.pk];
        });
        this._invalidateCache('state_issue_scores_by_issue');
        this._invalidateCache('state_issue_scores_by_state');

        answerScoreIssues.forEach(score => {
            delete this.answer_score_issue[score.pk];
        });
        this._invalidateCache('answer_score_issue_by_issue');
        this._invalidateCache('issue_score_by_answer');
    }

    cloneAnswer(toClone, newQuestionPk) {
        let newPk = this.getNewPk();
        let answer = {
            "model": "campaign_trail.answer",
            "pk": newPk,
            "fields": {
                "question": newQuestionPk,
                "description": toClone.fields.description
            }
        }
        this.answers[newPk] = answer;
        this._invalidateCache('answers_by_question');

        const feedbacks = this.getAdvisorFeedbackForAnswer(toClone.pk);
        for (let i = 0; i < feedbacks.length; i++) {
            this.cloneFeedback(feedbacks[i], newPk);
        }

        const globals = this.getGlobalScoreForAnswer(toClone.pk);
        for (let i = 0; i < globals.length; i++) {
            this.cloneGlobalScore(globals[i], newPk);
        }

        const issueScores = this.getIssueScoreForAnswer(toClone.pk);
        for (let i = 0; i < issueScores.length; i++) {
            this.cloneIssueScore(issueScores[i], newPk);
        }

        const stateScores = this.getStateScoreForAnswer(toClone.pk);
        for (let i = 0; i < stateScores.length; i++) {
            this.cloneStateScore(stateScores[i], newPk);
        }

        return newPk; // allow callers to select the cloned answer
    }

    cloneFeedback(toClone, newAnswerPk) {
        let newPk = this.getNewPk();
        const feedback = {
            "model": "campaign_trail.answer_feedback",
            "pk": newPk,
            "fields": {
                "answer": newAnswerPk,
                "candidate": toClone.fields.candidate,
                "answer_feedback": toClone.fields.answer_feedback
            }
        }
        this.answer_feedback[newPk] = feedback;
        this._invalidateCache('feedback_by_answer');
    }

    cloneGlobalScore(toClone, newAnswerPk) {
        let newPk = this.getNewPk();
        const globalScore = {
            "model": "campaign_trail.answer_score_global",
            "pk": newPk,
            "fields": {
                "answer": newAnswerPk,
                "candidate": toClone.fields.candidate,
                "affected_candidate": toClone.fields.affected_candidate,
                "global_multiplier": toClone.fields.global_multiplier
            }
        }
        this.answer_score_global[newPk] = globalScore;
        this._invalidateCache('global_score_by_answer');
    }

    cloneIssueScore(toClone, newAnswerPk) {
        let newPk = this.getNewPk();
        const issueScore = {
            "model": "campaign_trail.answer_score_issue",
            "pk": newPk,
            "fields": {
                "answer": newAnswerPk,
                "issue": toClone.fields.issue,
                "issue_score": toClone.fields.issue_score,
                "issue_importance": toClone.fields.issue_importance
            }
        }
        this.answer_score_issue[newPk] = issueScore;
        this._invalidateCache('issue_score_by_answer');
        this._invalidateCache('answer_score_issue_by_issue');
    }

    cloneStateScore(toClone, newAnswerPk) {
        let newPk = this.getNewPk();
        const stateScore = {
            "model": "campaign_trail.answer_score_state",
            "pk": newPk,
            "fields": {
                "answer": newAnswerPk,
                "state": toClone.fields.state,
                "candidate": toClone.fields.candidate,
                "affected_candidate": toClone.fields.affected_candidate,
                "state_multiplier": toClone.fields.state_multiplier
            }
        }
        this.answer_score_state[newPk] = stateScore;
        this._invalidateCache('state_score_by_answer');
    }

    getNewPk() {
        const pk = this.highest_pk + 1
        this.highest_pk = pk
        return pk
    }

    getAnswersForQuestion(pk) {
        return this._getFromIndex('answers_by_question', this.answers, 'question', pk);
    }

    getAdvisorFeedbackForAnswer(pk) {
        return this._getFromIndex('feedback_by_answer', this.answer_feedback, 'answer', pk);
    }

    getGlobalScoreForAnswer(pk) {
        return this._getFromIndex('global_score_by_answer', this.answer_score_global, 'answer', pk);
    }

    getStateScoreForAnswer(pk) {
        return this._getFromIndex('state_score_by_answer', this.answer_score_state, 'answer', pk);
    }

    getIssueScoreForAnswer(pk) {
        return this._getFromIndex('issue_score_by_answer', this.answer_score_issue, 'answer', pk);
    }

    getIssueScoreForState(pk) {
        return this._getFromIndex('state_issue_scores_by_state', this.state_issue_scores, 'state', pk);
    }

    getStateIssueScoresForIssue(pk) {
        return this._getFromIndex('state_issue_scores_by_issue', this.state_issue_scores, 'issue', pk);
    }

    getIssueScoreForCandidate(pk) {
        return this._getFromIndex('candidate_issue_score_by_candidate', this.candidate_issue_score, 'candidate', pk);
    }

    getStateMultiplierForCandidate(pk) {
        return this._getFromIndex('candidate_state_multiplier_by_candidate', this.candidate_state_multiplier, 'candidate', pk);
    }

    getCandidateIssueScoreForIssue(pk) {
        return this._getFromIndex('candidate_issue_score_by_issue', this.candidate_issue_score, 'issue', pk);
    }

    getRunningMateIssueScoreForIssue(pk) {
        return this._getFromIndex('running_mate_issue_score_by_issue', this.running_mate_issue_score, 'issue', pk);
    }

    getRunningMateIssueScoreForCandidate(pk) {
        return this._getFromIndex('running_mate_issue_score_by_candidate', this.running_mate_issue_score, 'candidate', pk);
    }

    getAnswerScoreIssuesForIssue(pk) {
        return this._getFromIndex('answer_score_issue_by_issue', this.answer_score_issue, 'issue', pk);
    }

    getCandidateStateMultipliersForState(pk) {
        return this._getFromIndex('candidate_state_multiplier_by_state', this.candidate_state_multiplier, 'state', pk);
    }

    getNicknameForCandidate(pk) {
        if (this.jet_data == null || this.jet_data['nicknames'] == null) {
            return "";
        }

        return this.jet_data.nicknames[pk];
    }

    getAllCyoaEvents() {
        if (this.jet_data.cyoa_enabled == null) {
            this.jet_data.cyoa_enabled = false;
        }

        if (this.jet_data.cyoa_data == null) {
            this.jet_data.cyoa_data = {};
        }

        // ensure deterministic ordering
        const out = Object.values(this.jet_data.cyoa_data);
        out.sort((a, b) => (a?.id ?? 0) - (b?.id ?? 0));
        return out;
    }

    getAllCyoaVariables() {
        if (this.jet_data.cyoa_variables == null) {
            this.jet_data.cyoa_variables = {};
        }

        // ensure deterministic ordering
        const out = Object.values(this.jet_data.cyoa_variables);
        out.sort((a, b) => (a?.id ?? 0) - (b?.id ?? 0));
        return out;
    }

    getAllCyoaVariableEffects() {
        if (this.jet_data.cyoa_variable_effects == null) {
            this.jet_data.cyoa_variable_effects = {};
        }

        // ensure deterministic ordering
        const out = Object.values(this.jet_data.cyoa_variable_effects);
        out.sort((a, b) => (a?.id ?? 0) - (b?.id ?? 0));
        return out;
    }

    getAllEndings() {
        if (this.jet_data.endings_enabled == null) {
            this.jet_data.endings_enabled = false;
        }

        if (this.jet_data.ending_data == null) {
            this.jet_data.ending_data = {};
        }

        const data = this.jet_data.ending_data || {};

        // if an explicit order is present, respect it
        const orderedIdsRaw = this.jet_data.endings_order;
        const orderedIds = Array.isArray(orderedIdsRaw) && orderedIdsRaw.length > 0
            ? orderedIdsRaw.map(id => {
                // coerce strings like "123" and numbers to Number if possible
                const n = Number(id);
                return Number.isFinite(n) ? n : id;
            })
            : null;

        if (orderedIds && orderedIds.length > 0) {
            const out = [];
            const seen = new Set();

            // try numeric key, then string key
            for (const id of orderedIds) {
                let entry = data[id];
                if (!entry) {
                    const sKey = String(id);
                    entry = data[sKey];
                }
                if (entry) {
                    out.push(entry);
                    seen.add(Number(entry.id));
                }
            }

            // append any remaining endings that were not in the order array
            for (const entry of Object.values(data)) {
                if (!seen.has(Number(entry.id))) {
                    out.push(entry);
                }
            }

            return out;
        }

        // fallback: sort by numeric id for deterministic behaviour
        const arr = Object.values(data);
        arr.sort((a, b) => (a?.id ?? 0) - (b?.id ?? 0));
        return arr;
    }

    // reorder endings by array of IDs (in desired order)
    reorderEndings(newOrderIds) {
        try {
            if (this.jet_data.ending_data == null) {
                this.jet_data.ending_data = {};
                return;
            }

            const current = Object.values(this.jet_data.ending_data);
            if (!Array.isArray(newOrderIds) || newOrderIds.length !== current.length) {
                console.warn("reorderEndings: new order length mismatch");
            }

            // validate that provided IDs are all present
            for (const id of newOrderIds) {
                if (!this.jet_data.ending_data[id]) {
                    console.warn("reorderEndings: id not found in current data:", id);
                }
            }

            // rebuild the ending_data object in the new order
            const newEndingData = {};
            for (const id of newOrderIds) {
                const ending = this.jet_data.ending_data[id];
                if (ending) {
                    newEndingData[id] = ending;
                }
            }

            // append any stragglers not in newOrderIds
            for (const ending of current) {
                if (!newOrderIds.includes(ending.id)) {
                    newEndingData[ending.id] = ending;
                }
            }

            this.jet_data.ending_data = newEndingData;
        } catch (e) {
            console.error("Error in reorderEndings:", e);
            throw e;
        }
    }

    getFirstStatePK() {
        const vals = Object.values(this.states);
        return vals.length > 0 ? vals[0].pk : null;
    }

    getFirstCandidatePK() {
        return this.getAllCandidatePKs()[0];
    }

    getPlayerCandidate() {
        if (this.jet_data.player_candidate != null) {
            return this.jet_data.player_candidate;
        }
        return null;
    }

    setPlayerCandidate(pk) {
        this.jet_data.player_candidate = pk;
    }

    getDefaultCandidatePK() {
        const player = this.getPlayerCandidate();
        if (player != null) {
            // validate that the player candidate still exists
            const all = this.getAllCandidatePKs();
            if (all.includes(player)) {
                return player;
            }
        }
        return this.getFirstCandidatePK();
    }

    getFirstIssuePK() {
        return Object.keys(this.issues)[0];
    }

    deleteState(pk) {
        if (!(pk in this.states)) {
            return;
        }

        const answerScores = this._getFromIndex('state_score_by_state', this.answer_score_state, 'state', pk);
        for (let i = 0; i < answerScores.length; i++) {
            delete this.answer_score_state[answerScores[i].pk];
        }
        this._invalidateCache('state_score_by_state');
        this._invalidateCache('state_score_by_answer');

        const stateScores = this._getFromIndex('state_issue_scores_by_state', this.state_issue_scores, 'state', pk);
        for (let i = 0; i < stateScores.length; i++) {
            delete this.state_issue_scores[stateScores[i].pk];
        }
        this._invalidateCache('state_issue_scores_by_state');
        this._invalidateCache('state_issue_scores_by_issue');

        const csm = this._getFromIndex('candidate_state_multiplier_by_state', this.candidate_state_multiplier, 'state', pk);
        for (let i = 0; i < csm.length; i++) {
            delete this.candidate_state_multiplier[csm[i].pk];
        }
        this._invalidateCache('candidate_state_multiplier_by_state');
        this._invalidateCache('candidate_state_multiplier_by_candidate');

        delete this.states[pk];
    }

    // deterministic order of candidates
    getAllCandidatePKs() {
        let cans = new Set();
        const canState = Object.values(this.candidate_state_multiplier);

        for (let i = 0; i < canState.length; i++) {
            cans.add(canState[i].fields.candidate);
        }
        return Array.from(cans).sort((a, b) => a - b);
    }

    getMapForPreview(svg) {
        console.log("getMapForPreview called with SVG length:", svg?.length ?? 0);
        if (!svg || typeof svg !== 'string') {
            console.error("Invalid SVG data: not a string");
            return [];
        }

        // prefer DOM parsing when available
        try {
            if (typeof DOMParser !== 'undefined') {
                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
                const pathElements = svgDoc.querySelectorAll('path');
                console.log(`Found ${pathElements.length} path elements in SVG`);

                const out = [];
                for (let i = 0; i < pathElements.length; i++) {
                    try {
                        const path = pathElements[i];
                        const idAttr = path.getAttribute('id') || path.getAttribute('data-id');
                        const dAttr = path.getAttribute('d');
                        if (!idAttr || !dAttr) {
                            if (i % 25 === 0) console.warn(`Path at index ${i} missing id or d attribute`);
                            continue;
                        }
                        const abbr = idAttr.split(" ")[0].replaceAll("-", "_");
                        out.push([abbr, dAttr]);
                        if (i % 10 === 0) console.log(`Processed state: ${abbr}`);
                    } catch (err) {
                        console.error(`Error processing path at index ${i}:`, err);
                    }
                }
                console.log(`Successfully processed ${out.length} states`);
                return out;
            }
        } catch (e) {
            console.warn("DOMParser not available; falling back to regex parsing.");
        }

        // fallback: regex parsing when DOMParser is not available
        const out = [];
        const pathRegex = /<path\b[^>]*>/gi;
        const attrRegex = /(?:^|[\s"'<])(id|data-id|d)\s*=\s*"([^"]+)"/gi;

        let match;
        while ((match = pathRegex.exec(svg)) !== null) {
            const tag = match[0];
            let id = null, d = null;
            let attrMatch;

            // reset lastIndex for the tag string
            attrRegex.lastIndex = 0;
            while ((attrMatch = attrRegex.exec(tag)) !== null) {
                const name = attrMatch[1];
                const val = attrMatch[2];
                if (name === 'd') d = val;
                else if (!id) id = val; // prioritize first id found
            }

            if (id && d) {
                const abbr = id.split(" ")[0].replaceAll("-", "_");
                out.push([abbr, d]);
            }
        }
        console.log(`Regex fallback processed ${out.length} states`);
        return out;
    }

    deleteCandidate(pk) {
        const stateMultipliers = Object.keys(this.candidate_state_multiplier);
        const issueScores = Object.keys(this.candidate_issue_score);

        for (let i = 0; i < stateMultipliers.length; i++) {
            const sPk = stateMultipliers[i];
            if (this.candidate_state_multiplier[sPk].fields.candidate == pk) {
                delete this.candidate_state_multiplier[sPk];
            }
        }
        this._invalidateCache('candidate_state_multiplier_by_candidate');
        this._invalidateCache('candidate_state_multiplier_by_state');

        for (let i = 0; i < issueScores.length; i++) {
            const iPk = issueScores[i];
            if (this.candidate_issue_score[iPk].fields.candidate == pk) {
                delete this.candidate_issue_score[iPk];
            }
        }
        this._invalidateCache('candidate_issue_score_by_candidate');
        this._invalidateCache('candidate_issue_score_by_issue');
    }

    getPVForState(pk) {
        try {
            return getCurrentVoteResults(this).filter((x) => x.state == pk)[0].result.map(
                (x) => {
                    let nickname = this.getNicknameForCandidate(x.candidate);
                    let canName = nickname != '' && nickname != null ? nickname : x.candidate;
                    return `${canName} - ${(x.percent * 100).toFixed(2)}% (${x.votes} votes)`;
                }
            );
        }
        catch (e) {
            console.error("Pv error:", e);
            return ["Error calculating PV, see console"];
        }
    }

    addStateMultipliersForCandidate(candidatePk) {
        const s = Object.keys(this.states);
        for (let i = 0; i < s.length; i++) {
            const cPk = this.getNewPk();
            // Create candidate state multipliers
            let c = {
                "model": "campaign_trail.candidate_state_multiplier",
                "pk": cPk,
                "fields": {
                    "candidate": candidatePk,
                    "state": Number(s[i]),
                    "state_multiplier": 1
                }
            }
            this.candidate_state_multiplier[cPk] = c;
        }
        this._invalidateCache('candidate_state_multiplier_by_candidate');
        this._invalidateCache('candidate_state_multiplier_by_state');
    }

    addCandidate() {
        const candidatePk = this.getNewPk();

        const s = Object.keys(this.states);
        const issues = Object.keys(this.issues);

        this.addStateMultipliersForCandidate(candidatePk);

        for (let i = 0; i < issues.length; i++) {
            const iPk = this.getNewPk();
            // Create state issue scores
            let iss = {
                "model": "campaign_trail.candidate_issue_score",
                "pk": iPk,
                "fields": {
                    "candidate": candidatePk,
                    "issue": Number(issues[i]),
                    "issue_score": 0
                }
            }
            this.candidate_issue_score[iPk] = iss;
        }
        this._invalidateCache('candidate_issue_score_by_candidate');
        this._invalidateCache('candidate_issue_score_by_issue');

        return candidatePk;
    }

    createNewState() {
        const cans = this.getAllCandidatePKs();
        const issues = Object.keys(this.issues);

        const newPk = this.getNewPk();
        let x = {
            "model": "campaign_trail.state",
            "pk": newPk,
            "fields": {
                "name": "New State",
                "abbr": "NST",
                "electoral_votes": 1,
                "popular_votes": 10,
                "poll_closing_time": 120,
                "winner_take_all_flg": 1,
                "election": -1,
            }
        }
        this.states[newPk] = x;

        for (let i = 0; i < cans.length; i++) {
            const cPk = this.getNewPk();
            // Create candidate state multipliers
            let c = {
                "model": "campaign_trail.candidate_state_multiplier",
                "pk": cPk,
                "fields": {
                    "candidate": cans[i],
                    "state": newPk,
                    "state_multiplier": 1
                }
            }
            this.candidate_state_multiplier[cPk] = c;
        }
        this._invalidateCache('candidate_state_multiplier_by_candidate');
        this._invalidateCache('candidate_state_multiplier_by_state');

        for (let i = 0; i < issues.length; i++) {
            const iPk = this.getNewPk();
            // Create state issue scores
            let iss = {
                "model": "campaign_trail.state_issue_score",
                "pk": iPk,
                "fields": {
                    "state": newPk,
                    "issue": Number(issues[i]),
                    "state_issue_score": 0,
                    "weight": 1.5
                }
            }
            this.state_issue_scores[iPk] = iss;
        }
        this._invalidateCache('state_issue_scores_by_state');

        return newPk;
    }

    loadMap() {
        const cans = this.getAllCandidatePKs();
        const issues = Object.keys(this.issues);

        const existingStateKeys = Object.keys(this.states);
        existingStateKeys.forEach((x) => this.deleteState(x));
        // clear related caches handled by deleteState

        const svg = this.jet_data.mapping_data.mapSvg || "";
        const electionPk = this.jet_data.mapping_data.electionPk ?? -1;

        // DOM parsing approach
        let parsedViaDOM = false;
        try {
            if (typeof DOMParser !== 'undefined') {
                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
                const pathNodes = svgDoc.querySelectorAll('path');

                for (let i = 0; i < pathNodes.length; i++) {
                    const p = pathNodes[i];
                    const idAttr = p.getAttribute('id') || p.getAttribute('data-id');
                    const nameAttr = p.getAttribute('data-name') || idAttr;
                    const dAttr = p.getAttribute('d');
                    if (!idAttr || !dAttr) continue;

                    const abbr = idAttr.split(" ")[0].replaceAll("-", "_");
                    const newPk = this.getNewPk();
                    const state = {
                        "model": "campaign_trail.state",
                        "pk": newPk,
                        "fields": {
                            "name": nameAttr || abbr,
                            "abbr": abbr,
                            "electoral_votes": 1,
                            "popular_votes": 10,
                            "poll_closing_time": 120,
                            "winner_take_all_flg": 1,
                            "election": electionPk,
                        },
                        "d": dAttr
                    };
                    this.states[newPk] = state;

                    for (let j = 0; j < cans.length; j++) {
                        const cPk = this.getNewPk();
                        const c = {
                            "model": "campaign_trail.candidate_state_multiplier",
                            "pk": cPk,
                            "fields": {
                                "candidate": cans[j],
                                "state": newPk,
                                "state_multiplier": 1
                            }
                        };
                        this.candidate_state_multiplier[cPk] = c;
                    }

                    for (let k = 0; k < issues.length; k++) {
                        const iPk = this.getNewPk();
                        const iss = {
                            "model": "campaign_trail.state_issue_score",
                            "pk": iPk,
                            "fields": {
                                "state": newPk,
                                "issue": Number(issues[k]),
                                "state_issue_score": 0,
                                "weight": 1.5
                            }
                        };
                        this.state_issue_scores[iPk] = iss;
                    }
                }
                parsedViaDOM = true;
            }
        } catch (err) {
            console.warn("DOMParser failed in loadMap, falling back to regex:", err);
        }

        if (!parsedViaDOM) {
            // regex fallback with strict attribute matching
            const pathRegex = /<path\b[^>]*>/gi;
            const idReStrict = /(?:^|[\s"'<])id\s*=\s*"([^"]+)"/i;
            const dataIdRe = /(?:^|[\s"'<])data-id\s*=\s*"([^"]+)"/i;
            const dReStrict = /(?:^|[\s"'<])d\s*=\s*"([^"]+)"/i;

            const paths = svg.match(pathRegex) || [];

            for (let i = 0; i < paths.length; i++) {
                const tag = paths[i];
                const idMatch = idReStrict.exec(tag) || dataIdRe.exec(tag);
                const dMatch = dReStrict.exec(tag);
                if (!idMatch || !dMatch) {
                    console.warn(`Skipping path index ${i} due to missing id or d attribute`);
                    continue;
                }

                const id = idMatch[1];
                const d = dMatch[1];
                const abbr = id.split(" ")[0].replaceAll("-", "_");

                const newPk = this.getNewPk();
                const state = {
                    "model": "campaign_trail.state",
                    "pk": newPk,
                    "fields": {
                        "name": id,
                        "abbr": abbr,
                        "electoral_votes": 1,
                        "popular_votes": 10,
                        "poll_closing_time": 120,
                        "winner_take_all_flg": 1,
                        "election": electionPk,
                    },
                    "d": d
                };
                this.states[newPk] = state;

                for (let j = 0; j < cans.length; j++) {
                    const cPk = this.getNewPk();
                    const c = {
                        "model": "campaign_trail.candidate_state_multiplier",
                        "pk": cPk,
                        "fields": {
                            "candidate": cans[j],
                            "state": newPk,
                            "state_multiplier": 1
                        }
                    };
                    this.candidate_state_multiplier[cPk] = c;
                }

                for (let k = 0; k < issues.length; k++) {
                    const iPk = this.getNewPk();
                    const iss = {
                        "model": "campaign_trail.state_issue_score",
                        "pk": iPk,
                        "fields": {
                            "state": newPk,
                            "issue": Number(issues[k]),
                            "state_issue_score": 0,
                            "weight": 1.5
                        }
                    };
                    this.state_issue_scores[iPk] = iss;
                }
            }
        }
        this._invalidateCache('candidate_state_multiplier_by_candidate');
        this._invalidateCache('candidate_state_multiplier_by_state');
        this._invalidateCache('state_issue_scores_by_state');
    }

    getMapCode() {
        const viewboxCode = false ? "this.paper.setViewBox(0,0,c,u,false);" : `this.paper.setViewBox(${this.jet_data.mapping_data.dx}, ${this.jet_data.mapping_data.dy}, ${this.jet_data.mapping_data.x}, ${this.jet_data.mapping_data.y}, false);`;
        return `(function(e,t,n,r,i){function s(e,t,n,r){r=r instanceof Array?r:[];var i={};for(var s=0;s<r.length;s++){i[r[s]]=true}var o=function(e){this.element=e};o.prototype=n;e.fn[t]=function(){var n=arguments;var r=this;this.each(function(){var s=e(this);var u=s.data("plugin-"+t);if(!u){u=new o(s);s.data("plugin-"+t,u);if(u._init){u._init.apply(u,n)}}else if(typeof n[0]=="string"&&n[0].charAt(0)!="_"&&typeof u[n[0]]=="function"){var a=Array.prototype.slice.call(n,1);var f=u[n[0]].apply(u,a);if(n[0]in i){r=f}}});return r}}var o=370,u=215,a=10;var f={stateStyles:{fill:"#333",stroke:"#666","stroke-width":1,"stroke-linejoin":"round",scale:[1,1]},stateHoverStyles:{fill:"#33c",stroke:"#000",scale:[1.1,1.1]},stateSpecificStyles:{},stateSpecificHoverStyles:{},click:null,mouseover:null,mouseout:null,clickState:{},mouseoverState:{},mouseoutState:{},showLabels:true,labelWidth:20,labelHeight:15,labelGap:6,labelRadius:3,labelBackingStyles:{fill:"#333",stroke:"#666","stroke-width":1,"stroke-linejoin":"round",scale:[1,1]},labelBackingHoverStyles:{fill:"#33c",stroke:"#000"},stateSpecificLabelBackingStyles:{},stateSpecificLabelBackingHoverStyles:{},labelTextStyles:{fill:"#fff",stroke:"none","font-weight":300,"stroke-width":0,"font-size":"10px"},labelTextHoverStyles:{},stateSpecificLabelTextStyles:{},stateSpecificLabelTextHoverStyles:{}};var l={_init:function(t){this.options={};e.extend(this.options,f,t);var n=this.element.width();var i=this.element.height();var s=this.element.width()/o;var l=this.element.height()/u;this.scale=Math.min(s,l);this.labelAreaWidth=Math.ceil(a/this.scale);var c=o+Math.max(0,this.labelAreaWidth-a);this.paper=r(this.element.get(0),c,u);this.paper.setSize(n,i);${viewboxCode}this.stateHitAreas={};this.stateShapes={};this.topShape=null;this._initCreateStates();this.labelShapes={};this.labelTexts={};this.labelHitAreas={};if(this.options.showLabels){this._initCreateLabels()}},_initCreateStates:function(){var t=this.options.stateStyles;var n=this.paper;var r={${this.getStateJavascriptForMapping()}};var i={};for(var s in r){i={};if(this.options.stateSpecificStyles[s]){e.extend(i,t,this.options.stateSpecificStyles[s])}else{i=t}this.stateShapes[s]=n.path(r[s]).attr(i);this.topShape=this.stateShapes[s];this.stateHitAreas[s]=n.path(r[s]).attr({fill:"#000","stroke-width":0,opacity:0,cursor:"pointer"});this.stateHitAreas[s].node.dataState=s}this._onClickProxy=e.proxy(this,"_onClick");this._onMouseOverProxy=e.proxy(this,"_onMouseOver"),this._onMouseOutProxy=e.proxy(this,"_onMouseOut");for(var s in this.stateHitAreas){this.stateHitAreas[s].toFront();e(this.stateHitAreas[s].node).bind("mouseout",this._onMouseOutProxy);e(this.stateHitAreas[s].node).bind("click",this._onClickProxy);e(this.stateHitAreas[s].node).bind("mouseover",this._onMouseOverProxy)}},_initCreateLabels:function(){var t=this.paper;var n=[];var r=860;var i=220;var s=this.options.labelWidth;var o=this.options.labelHeight;var u=this.options.labelGap;var a=this.options.labelRadius;var f=s/this.scale;var l=o/this.scale;var c=(s+u)/this.scale;var h=(o+u)/this.scale*.5;var p=a/this.scale;var d=this.options.labelBackingStyles;var v=this.options.labelTextStyles;var m={};for(var g=0,y,b,w;g<n.length;++g){w=n[g];y=(g+1)%2*c+r;b=g*h+i,m={};if(this.options.stateSpecificLabelBackingStyles[w]){e.extend(m,d,this.options.stateSpecificLabelBackingStyles[w])}else{m=d}this.labelShapes[w]=t.rect(y,b,f,l,p).attr(m);m={};if(this.options.stateSpecificLabelTextStyles[w]){e.extend(m,v,this.options.stateSpecificLabelTextStyles[w])}else{e.extend(m,v)}if(m["font-size"]){m["font-size"]=parseInt(m["font-size"])/this.scale+"px"}this.labelTexts[w]=t.text(y+f/2,b+l/2,w).attr(m);this.labelHitAreas[w]=t.rect(y,b,f,l,p).attr({fill:"#000","stroke-width":0,opacity:0,cursor:"pointer"});this.labelHitAreas[w].node.dataState=w}for(var w in this.labelHitAreas){this.labelHitAreas[w].toFront();e(this.labelHitAreas[w].node).bind("mouseout",this._onMouseOutProxy);e(this.labelHitAreas[w].node).bind("click",this._onClickProxy);e(this.labelHitAreas[w].node).bind("mouseover",this._onMouseOverProxy)}},_getStateFromEvent:function(e){var t=e.target&&e.target.dataState||e.dataState;return this._getState(t)},_getState:function(e){var t=this.stateShapes[e];var n=this.stateHitAreas[e];var r=this.labelShapes[e];var i=this.labelTexts[e];var s=this.labelHitAreas[e];return{shape:t,hitArea:n,name:e,labelBacking:r,labelText:i,labelHitArea:s}},_onMouseOut:function(e){var t=this._getStateFromEvent(e);if(!t.hitArea){return}return!this._triggerEvent("mouseout",e,t)},_defaultMouseOutAction:function(t){var n={};if(this.options.stateSpecificStyles[t.name]){e.extend(n,this.options.stateStyles,this.options.stateSpecificStyles[t.name])}else{n=this.options.stateStyles}t.shape.animate(n,this.options.stateHoverAnimation);if(t.labelBacking){var n={};if(this.options.stateSpecificLabelBackingStyles[t.name]){e.extend(n,this.options.labelBackingStyles,this.options.stateSpecificLabelBackingStyles[t.name])}else{n=this.options.labelBackingStyles}t.labelBacking.animate(n,this.options.stateHoverAnimation)}},_onClick:function(e){var t=this._getStateFromEvent(e);if(!t.hitArea){return}return!this._triggerEvent("click",e,t)},_onMouseOver:function(e){var t=this._getStateFromEvent(e);if(!t.hitArea){return}return!this._triggerEvent("mouseover",e,t)},_defaultMouseOverAction:function(t){this.bringShapeToFront(t.shape);this.paper.safari();var n={};if(this.options.stateSpecificHoverStyles[t.name]){e.extend(n,this.options.stateHoverStyles,this.options.stateSpecificHoverStyles[t.name])}else{n=this.options.stateHoverStyles}t.shape.animate(n,this.options.stateHoverAnimation);if(t.labelBacking){var n={};if(this.options.stateSpecificLabelBackingHoverStyles[t.name]){e.extend(n,this.options.labelBackingHoverStyles,this.options.stateSpecificLabelBackingHoverStyles[t.name])}else{n=this.options.labelBackingHoverStyles}t.labelBacking.animate(n,this.options.stateHoverAnimation)}},_triggerEvent:function(t,n,r){var i=r.name;var s=false;var o=e.Event("usmap"+t+i);o.originalEvent=n;if(this.options[t+"State"][i]){s=this.options[t+"State"][i](o,r)===false}if(o.isPropagationStopped()){this.element.trigger(o,[r]);s=s||o.isDefaultPrevented()}if(!o.isPropagationStopped()){var u=e.Event("usmap"+t);u.originalEvent=n;if(this.options[t]){s=this.options[t](u,r)===false||s}if(!u.isPropagationStopped()){this.element.trigger(u,[r]);s=s||u.isDefaultPrevented()}}if(!s){switch(t){case"mouseover":this._defaultMouseOverAction(r);break;case"mouseout":this._defaultMouseOutAction(r);break}}return!s},trigger:function(e,t,n){t=t.replace("usmap","");e=e.toUpperCase();var r=this._getState(e);this._triggerEvent(t,n,r)},bringShapeToFront:function(e){if(this.topShape){e.insertAfter(this.topShape)}this.topShape=e}};var c=[];s(e,"usmap",l,c)})(jQuery,document,window,Raphael)`
    }

    getStateJavascriptForMapping() {
        let f = "";
        const states = Object.values(this.states);

        for (let i = 0; i < states.length; i++) {
            // quote the key to ensure valid JS identifiers in the generated object
            f += `"${states[i].fields.abbr}":"${states[i].d}"`
            if (i < states.length - 1) {
                f += ", ";
            }
        }

        return f
    }

    exportCode2() {
        const parts = [];

        // generated mapping code
        if (this.jet_data.mapping_enabled) {
            parts.push("\n// Generated mapping code\n", this.getMapCode(), "\n\n");
        }

        const generatedCyoaCode = this.getCYOACode();
        parts.push(generatedCyoaCode);

        // helper to stringify data collections
        const stringifyCollection = (name, collection, isMap = false) => {
            const data = isMap ? Array.from(collection.values()) : Object.values(collection);
            const json = JSON.stringify(data, null, 4).replaceAll("â€™", "'");
            return `campaignTrail_temp.${name} = ${json};\n\n`;
        };

        const collections = [
            ["questions_json", this.questions, true],
            ["answers_json", this.answers],
            ["states_json", this.states],
            ["issues_json", this.issues],
            ["state_issue_score_json", this.state_issue_scores],
            ["candidate_issue_score_json", this.candidate_issue_score],
            ["running_mate_issue_score_json", this.running_mate_issue_score],
            ["candidate_state_multiplier_json", this.candidate_state_multiplier],
            ["answer_score_global_json", this.answer_score_global],
            ["answer_score_issue_json", this.answer_score_issue],
            ["answer_score_state_json", this.answer_score_state],
            ["answer_feedback_json", this.answer_feedback],
        ];

        collections.forEach(([name, data, isMap]) => {
            parts.push(stringifyCollection(name, data, isMap));
        });

        // banner data if enabled
        if (this.jet_data.banner_enabled && this.jet_data.banner_data) {
            const b = this.jet_data.banner_data;
            parts.push(
                `campaignTrail_temp.candidate_image_url = "${b.canImage || ''}";\n`,
                `campaignTrail_temp.running_mate_image_url = "${b.runImage || ''}";\n`,
                `campaignTrail_temp.candidate_last_name = "${b.canName || ''}";\n`,
                `campaignTrail_temp.running_mate_last_name = "${b.runName || ''}";\n\n`
            );
        }

        parts.push(this.getEndingCode());

        let codeToAdd = this.jet_data.code_to_add || "";

        // if generated CYOA code was also imported into custom code, strip it from #startcode
        // this is to avoid duplicate code from CYOA, helpers, and other functions
        if (generatedCyoaCode && codeToAdd) {
            let normalizedCustom = codeToAdd.replace(/\r\n/g, "\n");

            const findFunctionEnd = (src, startIndex) => {
                const open = src.indexOf("{", startIndex);
                if (open === -1) return -1;

                let depth = 0;
                let inSingle = false, inDouble = false, inTemplate = false;
                let inLineComment = false, inBlockComment = false;
                let escaped = false;

                for (let i = open; i < src.length; i++) {
                    const ch = src[i];
                    const next = i + 1 < src.length ? src[i + 1] : "";

                    if (inLineComment) {
                        if (ch === "\n") inLineComment = false;
                        continue;
                    }
                    if (inBlockComment) {
                        if (ch === "*" && next === "/") {
                            inBlockComment = false;
                            i++;
                        }
                        continue;
                    }

                    if (inSingle) {
                        if (!escaped && ch === "'") inSingle = false;
                        escaped = !escaped && ch === "\\";
                        continue;
                    }
                    if (inDouble) {
                        if (!escaped && ch === '"') inDouble = false;
                        escaped = !escaped && ch === "\\";
                        continue;
                    }
                    if (inTemplate) {
                        if (!escaped && ch === "`") inTemplate = false;
                        escaped = !escaped && ch === "\\";
                        continue;
                    }

                    if (ch === "/" && next === "/") {
                        inLineComment = true;
                        i++;
                        continue;
                    }
                    if (ch === "/" && next === "*") {
                        inBlockComment = true;
                        i++;
                        continue;
                    }

                    if (ch === "'") {
                        inSingle = true;
                        escaped = false;
                        continue;
                    }
                    if (ch === '"') {
                        inDouble = true;
                        escaped = false;
                        continue;
                    }
                    if (ch === "`") {
                        inTemplate = true;
                        escaped = false;
                        continue;
                    }

                    if (ch === "{") depth++;
                    else if (ch === "}") {
                        depth--;
                        if (depth === 0) return i + 1;
                    }
                }

                return -1;
            };

            const stripLegacyCyoaBlock = (src) => {
                const markers = [
                    "campaignTrail_temp.cyoa = true;",
                    "let _questionIdxByPk = null;",
                    "function _rebuildQuestionIdxMap(",
                    "function getQuestionIndexFromPk(",
                    "function getJumpIndexFromPk(",
                    "function getQuestionNumberFromPk(",
                    "cyoAdventure = function"
                ];

                let blockStart = -1;
                for (const marker of markers) {
                    const idx = src.indexOf(marker);
                    if (idx !== -1 && (blockStart === -1 || idx < blockStart)) {
                        blockStart = idx;
                    }
                }

                if (blockStart === -1) return src;

                const adventureIdx = src.indexOf("cyoAdventure = function", blockStart);
                if (adventureIdx === -1) return src;

                let blockEnd = findFunctionEnd(src, adventureIdx);
                if (blockEnd === -1) return src;

                // consume optional semicolon and trailing whitespace/newlines
                while (blockEnd < src.length && /[;\s]/.test(src[blockEnd])) {
                    blockEnd++;
                }

                return src.slice(0, blockStart) + src.slice(blockEnd);
            };

            normalizedCustom = stripLegacyCyoaBlock(normalizedCustom);

            if (generatedCyoaCode.includes("let _questionIdxByPk = null;")) {
                normalizedCustom = normalizedCustom.replace(/^\s*let\s+_questionIdxByPk\s*=\s*null;\s*$/gm, "");
            }

            normalizedCustom = normalizedCustom.replace(/(\n\s*){3,}/g, "\n\n").trim();
            codeToAdd = normalizedCustom;
        }

        if (codeToAdd) {
            parts.push("\n\n//#startcode\n", codeToAdd, "\n//#endcode\n");
        }

        // export jet_data while stripping bulky or temporary fields
        parts.push("\n\ncampaignTrail_temp.jet_data = [");
        const jetDataStr = JSON.stringify(this.jet_data, (key, value) => {
            if (key === "code_to_add") return undefined;
            if (key === "mapSvg") return "";
            return value;
        }, 4);
        parts.push(jetDataStr, "\n]", "\n\n");

        return parts.join("");
    }

    getEndingCode() {
        if (!this.jet_data.endings_enabled || !this.jet_data.ending_data) {
            return "";
        }

        const endings = this.getAllEndings();
        if (endings.length === 0) return "";

        let f = "campaignTrail_temp.multiple_endings = true;\n\n";

        f += `const setImage = (url) => {
    if (!url) return;
    const interval = setInterval(() => {
        const img = document.querySelector(".person_image");
        if (img) {
            img.src = url;
            clearInterval(interval);
        }
    }, 50);
};\n\n`;

        f += "endingPicker = (out, totv, aa, quickstats) => {\n";

        for (const ending of endings) {
            const op = ending.operator || '>';
            f += `    if (quickstats[${ending.variable}] ${op} ${ending.amount}) {
        setImage("${ending.endingImage}");
        return \`${ending.endingText}\`;
    }\n`;
        }

        f += "}\n";
        return f;
    }

    getCYOACode() {
        if (!this.jet_data.cyoa_enabled || !this.jet_data.cyoa_data) {
            return "";
        }

        let f = `
campaignTrail_temp.cyoa = true;

// pk -> index lookup for questions
let _questionIdxByPk = null;

function _rebuildQuestionIdxMap() {
  _questionIdxByPk = new Map();
  const arr = campaignTrail_temp.questions_json;
  for (let i = 0; i < arr.length; i++) {
    _questionIdxByPk.set(Number(arr[i].pk), i);
  }
}

// returns the true array index (>= 0) or -1 if not found
function getQuestionIndexFromPk(pk) {
  const n = Number(pk);
  if (!_questionIdxByPk) _rebuildQuestionIdxMap();

  let idx = _questionIdxByPk.get(n);
  // if map is stale, rebuild once
  if (idx == null || campaignTrail_temp.questions_json[idx]?.pk !== n) {
    _rebuildQuestionIdxMap();
    idx = _questionIdxByPk.get(n);
  }
  return idx ?? -1;
}

// index to assign into question_number before nextQuestion()
function getJumpIndexFromPk(pk) {
  const idx = getQuestionIndexFromPk(pk);
  return idx >= 0 ? idx - 1 : -1;
}

// for backwards compatibility
function getQuestionNumberFromPk(pk) {
  return getJumpIndexFromPk(pk);
}`;

        // add variable declarations
        const variables = this.getAllCyoaVariables();
        if (variables.length > 0) {
            f += "\n\n// CYOA Variables\n";
            for (const variable of variables) {
                f += `var ${variable.name} = ${variable.defaultValue};\n`;
            }
        }

        f += `\ncyoAdventure = function (a) {
    const ans = campaignTrail_temp.player_answers[campaignTrail_temp.player_answers.length - 1];\n`;

        // variable effects grouped by logic
        const variableEffects = this.getAllCyoaVariableEffects();
        if (variableEffects.length > 0) {
            const effectGroups = {};
            for (const effect of variableEffects) {
                const key = `${effect.variable}_${effect.operation}_${effect.amount}`;
                if (!effectGroups[key]) {
                    effectGroups[key] = {
                        variable: effect.variable,
                        operation: effect.operation,
                        amount: effect.amount,
                        answers: []
                    };
                }
                effectGroups[key].answers.push(effect.answer);
            }

            for (const key in effectGroups) {
                const group = effectGroups[key];
                const operator = group.operation === 'add' ? '+=' : '-=';
                const cond = group.answers.length > 1
                    ? `[${group.answers.join(', ')}].includes(ans)`
                    : `ans == ${group.answers[0]}`;

                f += `\n    // ${group.operation === 'add' ? '+' : '-'}${group.amount} ${group.variable}\n`;
                f += `    if (${cond}) {\n`;
                f += `        ${group.variable} ${operator} ${group.amount};\n`;
                f += `    }\n`;
            }
        }

        // sort rules for consistent generation (by answer pk)
        const events = this.getAllCyoaEvents().slice().sort((a, b) => (a.answer ?? 0) - (b.answer ?? 0));
        if (events.length > 0) {
            f += "\n    // Branching logic\n";
            for (let i = 0; i < events.length; i++) {
                f += `    ${i > 0 ? "else " : ""}if (ans == ${events[i].answer}) {
        campaignTrail_temp.question_number = getQuestionNumberFromPk(${events[i].question});
    }\n`;
            }
            f += "    else {\n        return false;\n    }\n";
        }

        f += "}\n\n";
        return f;
    }
}

function extractJSON(raw_file, start, end, backup = null, backupEnd = null, required = true, fallback = [], outRange = null) {
    let f = raw_file;
    let res;

    let startIndex = f.indexOf(start);
    if (startIndex === -1) {
        if (backup != null) {
            console.log(`Start [${start}] not in file provided, trying backup ${backup}`);
            return extractJSON(f, backup, backupEnd == null ? end : backupEnd, null, null, required, fallback, outRange);
        }
        console.log(`ERROR: Start [${start}] not in file provided, returning none`);
        if (required) {
            console.warn(`WARNING: Your uploaded code 2 is missing the section '${start}'. Skipping it.`);
        }
        return fallback;
    }

    // try smart extraction for JSON.parse(...) wrappers
    if (start.includes("JSON.parse")) {
        let startString = f.substring(startIndex + start.length);
        let s = startString.trimStart();
        const firstChar = s[0];

        if (firstChar === '"' || firstChar === "'") {
            const quote = firstChar;
            let i = 1;
            let escaped = false;
            let literalContent = "";
            for (; i < s.length; i++) {
                const ch = s[i];
                if (escaped) {
                    literalContent += "\\" + ch;
                    escaped = false;
                    continue;
                }
                if (ch === "\\") {
                    escaped = true;
                    continue;
                }
                if (ch === quote) {
                    break;
                }
                literalContent += ch;
            }

            if (i < s.length && s[i] === quote) {
                const fullQuotedLiteral = quote + literalContent + quote;
                let jsonText;
                try {
                    jsonText = JSON.parse(fullQuotedLiteral);
                } catch (e) {
                    jsonText = literalContent.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, "\\").replace(/\\n/g, "\n");
                }

                try {
                    let candidate = jsonText;
                    candidate = candidate.replace(/,\s*([}\]])/g, "$1");
                    if (end == "]") candidate = "[" + candidate + "]";
                    res = JSON.parse(candidate);

                    if (outRange) {
                        outRange.start = startIndex;
                        outRange.end = startIndex + start.length + startString.indexOf(s) + i + 1;
                        let rest = f.substring(outRange.end).trimStart();
                        if (rest.startsWith(");")) outRange.end = f.indexOf(");", outRange.end) + 2;
                        else if (rest.startsWith(")")) outRange.end = f.indexOf(")", outRange.end) + 1;
                    }

                    console.log("Found valid JSON via JSON.parse-string extraction for " + start + "!");
                    return res;
                } catch (parseErr) {
                    // continue to legacy probing
                }
            }
        }
    }

    // legacy/array literal probing
    let startString = f.substring(startIndex + start.length);
    // safety check if string empty
    if (!startString) return fallback;

    const possibleEndings = getAllIndexes(startString, end);
    let foundValidJSON = false;

    // regex to match strings (group 1: double, single, or backtick), block comments (group 2), or line comments (group 3)
    const commentCleanerRegex = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:\\[\s\S]|[^`\\])*`)|(\/\*[\s\S]*?\*\/)|(\/\/.*$)/gm;

    // regex to capture comments before an object and inject them as a "_note" field
    // matches: // comment [newline] {
    const commentPreserverRegex = /\/\/(.*)\s*[\r\n]+\s*\{/g;

    for (let i = 0; i < possibleEndings.length; i++) {
        let raw = startString.slice(0, possibleEndings[i]);
        let trimmedRaw = raw.trim();

        // if the content is wrapped in quotes, unwrap it
        if (trimmedRaw[0] === '"' || trimmedRaw[0] === "'") {
            const quote = trimmedRaw[0];
            let lastQuote = -1;
            let escaped = false;
            for (let j = 1; j < trimmedRaw.length; j++) {
                if (escaped) { escaped = false; continue; }
                if (trimmedRaw[j] === '\\') { escaped = true; continue; }
                if (trimmedRaw[j] === quote) { lastQuote = j; break; }
            }
            if (lastQuote !== -1) {
                raw = trimmedRaw.slice(1, lastQuote);
            }
        }

        // preserve  comments by injecting them into the JSON structure
        // converts: //example \n {  ->  { "_note": "example",
        raw = raw.replace(commentPreserverRegex, (match, comment) => {
            const safeComment = comment.trim().replace(/"/g, '\\"'); // escape quotes
            return `{ "_note": "${safeComment}", `;
        });

        // strip any remaining comments (inline or block) to ensure valid JSON
        raw = raw.replace(commentCleanerRegex, (match, str, block, line) => {
            if (str) return str; // keep strings
            return ""; // remove comments
        });

        // remove trailing commas
        // note: strict JSON.parse will still fail if regex misses newlines, so we have a fallback below
        raw = raw.replace(/,\s*([}\]])/g, "$1");

        try {
            let jsonAttempt = raw;
            if (end == "]") jsonAttempt = "[" + raw + "]";
            res = JSON.parse(jsonAttempt);
            foundValidJSON = true;
            if (outRange) {
                outRange.start = startIndex;
                outRange.end = startIndex + start.length + possibleEndings[i] + end.length;
            }
            console.log("Found valid ending for " + start + "!");
            break;
        } catch (e) {
            // handle trailing commas or single quotes by using loose JS evaluation
            try {
                let evalAttempt = raw;
                if (end == "]") evalAttempt = "[" + raw + "]";
                // ensure it starts with an array or object
                if (evalAttempt.trim().startsWith("[") || evalAttempt.trim().startsWith("{")) {
                    res = new Function("return " + evalAttempt)();
                    foundValidJSON = true;
                    if (outRange) {
                        outRange.start = startIndex;
                        outRange.end = startIndex + start.length + possibleEndings[i] + end.length;
                    }
                    console.log("Found valid ending for " + start + " via loose evaluation!");
                    break;
                }
            } catch (e2) { }

            // handle bad escaped characters (legacy fallback)
            if (e instanceof SyntaxError && e.message.includes("bad escaped character")) {
                try {
                    const cleanRaw = raw.replaceAll("\\'", "'");
                    let attempt = cleanRaw;
                    if (end == "]") attempt = "[" + cleanRaw + "]";
                    res = JSON.parse(attempt);
                    foundValidJSON = true;
                    if (outRange) {
                        outRange.start = startIndex;
                        outRange.end = startIndex + start.length + possibleEndings[i] + end.length;
                    }
                    console.log("Found valid ending for " + start + " after sanitizing escaped quotes!");
                    break;
                } catch (e2) { }
            }
        }
    }

    if (!foundValidJSON) {
        console.log(`Error: Could not find a valid JSON for start ${start}`);
        return fallback;
    }

    console.log(`found ${start}!`);
    return res;
}


function loadDataFromFile(raw_json) {
    let highest_pk = -1;

    let questions = new Map();
    let answers = {};
    let states = {};
    let feedbacks = {};
    let answer_score_globals = {};
    let answer_score_issues = {};
    let answer_score_states = {};
    let state_issue_scores = {};
    let candidate_issue_scores = {};
    let candidate_state_multipliers = {};
    let running_mate_issue_scores = {};
    let issues = {};
    let jet_data = {};

    // map to track remapped IDs ( Old_Bad_ID => New_Safe_ID )
    let pkReplacements = new Map();

    const rangesToExclude = [];
    function getSection(name, required = true, fallback = []) {
        const range = { start: -1, end: -1 };

        // try to find the assignment with a flexible regex to handle spacing and case
        // match: campaignTrail_temp.xxx = [ or { or JSON.parse(
        const pattern = new RegExp(`campaignTrail_temp\\.${name}\\s*=\\s*(JSON\\.parse\\s*\\(|[\\{\\[]|\\"[\\{\\[]|\\'[\\{\\[])`, "i");
        const match = raw_json.match(pattern);

        if (match) {
            const foundStart = match[0];
            const innerFound = match[1].trim();
            let endMarker = ");";
            if (innerFound.startsWith("[")) endMarker = "]";
            else if (innerFound.startsWith("{")) endMarker = "}";
            else if (innerFound.startsWith("'") || innerFound.startsWith("\"")) {
                endMarker = innerFound[0]; // matched quotes
            }

            const res = extractJSON(raw_json, foundStart, endMarker, null, null, required, fallback, range);
            if (range.start !== -1) {
                rangesToExclude.push(range);
            }
            return res;
        }

        if (required) {
            console.warn(`WARNING: Your uploaded code 2 is missing the section 'campaignTrail_temp.${name}'. Skipping it.`);
        }
        return fallback;
    }

    // Logging helpers for duplicates
    const duplicateCounters = new Map();
    function _recordDuplicate(label) {
        let c = duplicateCounters.get(label) || { total: 0 };
        c.total += 1;
        duplicateCounters.set(label, c);
    }

    // sanitize/normalize PKs to avoid insane values (e.g. scientific-notation randoms)
    function normalizePk(obj, container) {
        let raw = obj.pk;
        let pkNum = Number(raw);
        let needsRemap = false;

        // check for non-finite or unsafe integers
        if (!Number.isFinite(pkNum) || Math.abs(pkNum) > Number.MAX_SAFE_INTEGER) {
            console.log(`PK ${raw} exceeds JS safety limits. Remapping...`);
            needsRemap = true;
        }

        // check for duplicates only if not already needing remap
        else {
            let isTaken = (container instanceof Map ? container.has(pkNum) : (pkNum in container));
            if (isTaken) {
                _recordDuplicate(obj.model || "unknown");
                needsRemap = true;
            }
        }

        if (needsRemap) {
            // assign a new safe integer at the end of the list
            let newPk = ++highest_pk;

            // store the mapping so we can fix foreign keys later
            pkReplacements.set(raw, newPk);

            // apply new PK
            obj.pk = newPk;
        } else {
            // it's valid (even if float), keep it
            obj.pk = pkNum;

            // update highest_pk logic to account for this existing ID
            // we use Ceil to ensure the next generated ID is a clean integer above this one
            if (pkNum > highest_pk && pkNum < Number.MAX_SAFE_INTEGER) {
                highest_pk = Math.ceil(pkNum);
            }
        }
    }

    function ensureUniqueAndStore(container, obj) {
        if (!obj || typeof obj !== 'object') return;
        if (!obj.fields || typeof obj.fields !== 'object') obj.fields = {};

        normalizePk(obj, container);

        if (container instanceof Map) {
            container.set(obj.pk, obj);
        } else {
            container[obj.pk] = obj;
        }
    }

    // load states (establishes baseline highest_pk)
    getSection("states_json").forEach(state => ensureUniqueAndStore(states, state));

    // load questions
    getSection("questions_json").forEach(q => {
        if (q?.fields?.description) q.fields.description = q.fields.description.replaceAll("â€™", "'").replaceAll("â€”", "—");
        ensureUniqueAndStore(questions, q);
    });

    // load answers
    getSection("answers_json").forEach(a => {
        if (a?.fields?.description) a.fields.description = a.fields.description.replaceAll("â€™", "'").replaceAll("â€”", "—");
        ensureUniqueAndStore(answers, a);
    });

    // load feedback
    getSection("answer_feedback_json").forEach(f => {
        if (f?.fields?.answer_feedback) f.fields.answer_feedback = f.fields.answer_feedback.replaceAll("â€™", "'").replaceAll("â€”", "—");
        ensureUniqueAndStore(feedbacks, f);
    });

    // load everything else
    const collections = [
        [answer_score_globals, "answer_score_global_json"],
        [answer_score_issues, "answer_score_issue_json"],
        [answer_score_states, "answer_score_state_json"],
        [candidate_issue_scores, "candidate_issue_score_json"],
        [candidate_state_multipliers, "candidate_state_multiplier_json"],
        [running_mate_issue_scores, "running_mate_issue_score_json"],
        [state_issue_scores, "state_issue_score_json"]
    ];

    collections.forEach(([cont, name]) => {
        getSection(name).forEach(x => ensureUniqueAndStore(cont, x));
    });

    const issues_json = getSection("issues_json");
    issues_json.forEach(x => ensureUniqueAndStore(issues, x));

    if (pkReplacements.size > 0) {
        console.log(`Patching ${pkReplacements.size} ID references (duplicates/overflows)...`);

        const allContainers = [
            questions, answers, states, feedbacks,
            answer_score_globals, answer_score_issues, answer_score_states,
            state_issue_scores, candidate_issue_scores, candidate_state_multipliers,
            running_mate_issue_scores, issues
        ];

        // fields that act as Foreign Keys
        const foreignKeyFields = [
            "question", "answer", "candidate", "issue", "state", "affected_candidate", "running_mate"
        ];

        allContainers.forEach(container => {
            const values = container instanceof Map ? Array.from(container.values()) : Object.values(container);

            values.forEach(item => {
                if (!item.fields) return;

                foreignKeyFields.forEach(field => {
                    const val = item.fields[field];
                    // if the field value matches a bad ID we replaced
                    if (val !== undefined && pkReplacements.has(val)) {
                        item.fields[field] = pkReplacements.get(val);
                    }
                });
            });
        });
    }

    jet_data = getSection("jet_data", false, [{}])[0];

    // fallback extraction for jet_data
    if (!jet_data || Object.keys(jet_data).length === 0) {
        try {
            let startMarker = "campaignTrail_temp.jet_data = [";
            let jIdx = raw_json.indexOf(startMarker);
            if (jIdx !== -1) {
                let segment = raw_json.substring(jIdx + startMarker.length);
                let lastBracket = segment.lastIndexOf("]");
                if (lastBracket !== -1) {
                    rangesToExclude.push({ start: jIdx, end: jIdx + startMarker.length + lastBracket + 1 });
                    let rawObj = segment.substring(0, lastBracket);
                    const commentCleanerRegex = /("(?:[^"\\]|\\.)*")|(\/\*[\s\S]*?\*\/)|(\/\/.*$)/gm;
                    rawObj = rawObj.replace(commentCleanerRegex, (match, str, block, line) => str ? str : "");
                    rawObj = rawObj.replace(/,\s*([}\]])/g, "$1").replaceAll("\\'", "'");
                    jet_data = JSON.parse("[" + rawObj + "]")[0];
                }
            }
        } catch (e) { }
    }

    jet_data = jet_data || {};

    // some maps (such as those made by Oldbox) lack the map SVG in jet_data, but still have the
    // custom map injection code in there. this is a way to add the old-school maps back in
    if (!jet_data.mapping_enabled && (!jet_data.mapping_data || !jet_data.mapping_data.mapSvg)) {
        // use [\s\S] to match across newlines, and \s* around = to handle minification
        const mapInjectorMatch = raw_json.match(/_initCreateStates:function\(\)\{[^}]*?var\s+\w+\s*=\s*(\{[\s\S]+?\});/);
        if (mapInjectorMatch) {
            try {
                const mapObjStr = mapInjectorMatch[1];
                // match keys that are optionally quoted, allowing spaces/dots/dashes
                // Group 1 is quoted, Group 2 is unquoted
                const pathRegex = /(?:["']([\w\s\.-]+)["']|([\w\s\.-]+))\s*:\s*"([^"]+)"/g;
                let pathMatch;
                let svgPaths = [];

                while ((pathMatch = pathRegex.exec(mapObjStr)) !== null) {
                    const stateName = pathMatch[1] || pathMatch[2];
                    const pathData = pathMatch[3];
                    svgPaths.push(`<path id="${stateName}" d="${pathData}" />`);
                }

                if (svgPaths.length > 0) {
                    let viewBox = "0 0 960 600"; // default
                    // try to extract viewBox offsets
                    const vbOffsets = raw_json.match(/this\.paper\.setViewBox\(([\d\.-]+),([\d\.-]+)/);
                    if (vbOffsets) {
                        const startX = vbOffsets[1];
                        const startY = vbOffsets[2];
                        // estimate width/height
                        const dimsMatch = raw_json.match(/var\s+o=(\d+),u=(\d+)/);
                        if (dimsMatch) {
                            // let's give it generous space
                            viewBox = `${startX} ${startY} 1100 ${dimsMatch[2]}`;
                        } else {
                            viewBox = `${startX} ${startY} 1000 600`;
                        }
                    }

                    jet_data.mapping_data = jet_data.mapping_data || {};
                    jet_data.mapping_enabled = true;
                    jet_data.mapping_data.mapSvg = `<svg viewBox="${viewBox}">${svgPaths.join("")}</svg>`;
                    console.log("Injected custom map from code 2 injector pattern.");
                }
            } catch (e) {
                console.error("Failed to parse map injector", e);
            }
        }
    }

    // exclude markers and standard banners/endings to avoid duplication

    // markers
    const markers = ["//#startcode", "//#endcode", "//# startcode", "//# endcode"];
    markers.forEach(m => {
        let idx = raw_json.indexOf(m);
        while (idx !== -1) {
            rangesToExclude.push({ start: idx, end: idx + m.length });
            idx = raw_json.indexOf(m, idx + 1);
        }
    });

    // clear anything else that the tool manages explicitly in exportCode2
    // also exclude the hardcoded versions
    const bannerRegex = /campaignTrail_temp\.(candidate_image_url|running_mate_image_url|candidate_last_name|running_mate_last_name)\s*=\s*".*?"\s*;/g;
    const multiEndingsRegex = /campaignTrail_temp\.multiple_endings\s*=\s*true\s*;/g;
    const standardGeneratedRegexes = [bannerRegex, multiEndingsRegex];
    standardGeneratedRegexes.forEach(re => {
        let match;
        while ((match = re.exec(raw_json)) !== null) {
            rangesToExclude.push({ start: match.index, end: match.index + match[0].length });
        }
    });

    // exclude generated CYOA code block if present at top-level,
    // so it is not duplicated later inside //#startcode
    const cyoaStart = raw_json.indexOf("campaignTrail_temp.cyoa = true;");
    if (cyoaStart !== -1) {
        const questionsAssignMatch = /campaignTrail_temp\.questions_json\s*=/g;
        questionsAssignMatch.lastIndex = cyoaStart;
        const assignMatch = questionsAssignMatch.exec(raw_json);
        const questionsStart = assignMatch ? assignMatch.index : -1;
        if (questionsStart !== -1 && questionsStart > cyoaStart) {
            rangesToExclude.push({ start: cyoaStart, end: questionsStart });
        }
    }

    // merge overlapping ranges and ensure logical order
    rangesToExclude.sort((a, b) => a.start - b.start);
    const mergedRanges = [];
    if (rangesToExclude.length > 0) {
        let current = { ...rangesToExclude[0] };
        for (let i = 1; i < rangesToExclude.length; i++) {
            let next = rangesToExclude[i];
            if (next.start <= current.end) {
                current.end = Math.max(current.end, next.end);
            } else {
                mergedRanges.push(current);
                current = { ...next };
            }
        }
        mergedRanges.push(current);
    }

    let extraCodeParts = [];
    let lastEnd = 0;
    for (const range of mergedRanges) {
        if (range.start > lastEnd) {
            extraCodeParts.push(raw_json.substring(lastEnd, range.start));
        }
        lastEnd = Math.max(lastEnd, range.end);
    }
    if (lastEnd < raw_json.length) {
        extraCodeParts.push(raw_json.substring(lastEnd));
    }

    // process the extracted code
    let combined = extraCodeParts.join("");

    // trim the start/end to avoid massive gaps at boundaries
    combined = combined.trim();

    // collapse excessive internal newlines (3+ -> 2)
    combined = combined.replace(/(\r\n|\r|\n){3,}/g, "\n\n");

    jet_data.code_to_add = combined;

    // ensure required metadata structures exist
    jet_data.nicknames = jet_data.nicknames || {};
    jet_data.banner_data = jet_data.banner_data || {};
    jet_data.mapping_data = jet_data.mapping_data || {};

    let data = new TCTData(questions, answers, issues, state_issue_scores, candidate_issue_scores, running_mate_issue_scores, candidate_state_multipliers, answer_score_globals, answer_score_issues, answer_score_states, feedbacks, states, highest_pk, jet_data);

    for (const [label, c] of duplicateCounters) {
        if (c.total > 0) console.log(`Remapped ${c.total} duplicates in ${label}`);
    }

    return data;
}


// https://stackoverflow.com/questions/20798477/how-to-find-the-indexes-of-all-occurrences-of-an-element-in-array#:~:text=The%20.,val%2C%20i%2B1))%20!%3D
function getAllIndexes(arr, val) {
    var indexes = [], i = -1;
    while ((i = arr.indexOf(val, i + 1)) != -1) {
        indexes.push(i);
    }
    return indexes;
}
