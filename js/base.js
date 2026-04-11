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

(function () {
    const THEME_KEY = 'tct-theme';

    function resolvePreferredTheme() {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved === 'light' || saved === 'dark') {
            return saved;
        }

        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }

        return 'light';
    }

    function applyTheme(theme) {
        const nextTheme = theme === 'dark' ? 'dark' : 'light';
        const root = document.documentElement;
        root.setAttribute('data-theme', nextTheme);
        root.style.colorScheme = nextTheme;
        localStorage.setItem(THEME_KEY, nextTheme);
        return nextTheme;
    }

    window.getCurrentTheme = function () {
        const current = document.documentElement.getAttribute('data-theme');
        return current === 'dark' ? 'dark' : 'light';
    };

    window.setTheme = function (theme) {
        return applyTheme(theme);
    };

    window.toggleTheme = function () {
        const current = window.getCurrentTheme();
        const next = current === 'dark' ? 'light' : 'dark';
        return applyTheme(next);
    };

    applyTheme(resolvePreferredTheme());
})();

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
            const requestedSet = new Set(newOrderPks);
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
                const missing = current.filter(q => !requestedSet.has(q.pk));
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

        const normalizeEnding = (entry) => {
            if (!entry || typeof entry !== "object") return entry;

            if (entry.endingTitle == null) entry.endingTitle = "";
            if (entry.endingSubtitle == null) entry.endingSubtitle = "";
            if (entry.endingText == null) entry.endingText = "";
            if (entry.endingImage == null) entry.endingImage = "";
            if (entry.endingHideImage == null) entry.endingHideImage = false;
            if (entry.audioTitle == null) entry.audioTitle = "";
            if (entry.audioArtist == null) entry.audioArtist = "";
            if (entry.audioCover == null) entry.audioCover = "";
            if (entry.audioUrl == null) entry.audioUrl = "";
            if (entry.endingAccentColor == null) entry.endingAccentColor = "#11299e";
            if (entry.endingBackgroundColor == null) entry.endingBackgroundColor = "#ffffff";
            if (entry.endingTextColor == null) entry.endingTextColor = "#000000";
            if (entry.variableConditionEnabled == null) entry.variableConditionEnabled = false;
            if (entry.variableConditionName == null) entry.variableConditionName = "";
            if (entry.variableConditionOperator == null) entry.variableConditionOperator = "==";
            if (entry.variableConditionValue == null) entry.variableConditionValue = "";
            if (entry.answerConditionType == null) entry.answerConditionType = "ignore";
            if (entry.answerConditionAnswer == null) entry.answerConditionAnswer = "";
            if (entry.answerConditionAnswers == null) entry.answerConditionAnswers = "";

            if (!entry.answerConditionAnswers && entry.answerConditionAnswer != null && entry.answerConditionAnswer !== "") {
                entry.answerConditionAnswers = String(entry.answerConditionAnswer);
            }

            // backfill advanced-only entries into simple fields so they stay editable
            if ((!entry.endingText || !entry.endingTitle) && entry.endingSlidesJson) {
                try {
                    const parsed = JSON.parse(entry.endingSlidesJson);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        const first = parsed[0] || {};
                        if (!entry.endingTitle && first.title) entry.endingTitle = String(first.title);
                        if (!entry.endingSubtitle && first.subtitle) entry.endingSubtitle = String(first.subtitle);
                        if (!entry.endingText && first.content) entry.endingText = String(first.content);
                        if (!entry.endingImage && first.image && first.image !== false) entry.endingImage = String(first.image);
                        if (first.image === false) entry.endingHideImage = true;
                        if (first.audio && typeof first.audio === "object") {
                            if (!entry.audioTitle && first.audio.title) entry.audioTitle = String(first.audio.title);
                            if (!entry.audioArtist && first.audio.artist) entry.audioArtist = String(first.audio.artist);
                            if (!entry.audioCover && first.audio.cover) entry.audioCover = String(first.audio.cover);
                            if (!entry.audioUrl && first.audio.url) entry.audioUrl = String(first.audio.url);
                        }
                    }
                } catch (err) {
                    // keep original data if JSON is malformed
                }
            }

            if (entry.endingMode != null) {
                entry.endingMode = "simple";
            }

            return entry;
        };

        Object.values(this.jet_data.ending_data).forEach(normalizeEnding);

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
            const requestedSet = new Set(newOrderIds.map(id => Number(id)));

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
                if (!requestedSet.has(Number(ending.id))) {
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

    _resolveMapElementId(el) {
        let node = el;
        while (node && typeof node.getAttribute === 'function') {
            const idAttr = node.getAttribute('id') || node.getAttribute('data-id');
            if (idAttr && idAttr.trim() !== '') {
                return idAttr.trim();
            }
            node = node.parentElement;
        }
        return null;
    }

    _resolveMapElementName(el, fallback) {
        let node = el;
        while (node && typeof node.getAttribute === 'function') {
            const dataName = node.getAttribute('data-name');
            if (dataName && dataName.trim() !== '') {
                return dataName.trim();
            }
            node = node.parentElement;
        }
        return fallback;
    }

    _collectTransformChain(el) {
        const transforms = [];
        let node = el;

        while (node && typeof node.getAttribute === 'function') {
            const t = node.getAttribute('transform');
            if (t && t.trim() !== '') {
                transforms.push(t.trim());
            }

            const tag = (node.tagName || '').toLowerCase();
            if (tag === 'svg') {
                break;
            }

            node = node.parentElement;
        }

        if (transforms.length === 0) {
            return '';
        }

        transforms.reverse();
        return transforms.join(' ');
    }

    _readSvgNumber(el, attrName, fallback = 0) {
        const raw = el.getAttribute(attrName);
        const num = Number(raw);
        return Number.isFinite(num) ? num : fallback;
    }

    _polyPointsToPath(pointsRaw, shouldClose) {
        if (!pointsRaw || typeof pointsRaw !== 'string') {
            return null;
        }
        const nums = pointsRaw.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi);
        if (!nums || nums.length < 4 || nums.length % 2 !== 0) {
            return null;
        }

        const coords = nums.map((x) => Number(x));
        if (coords.some((x) => !Number.isFinite(x))) {
            return null;
        }

        let d = `M ${coords[0]} ${coords[1]}`;
        for (let i = 2; i < coords.length; i += 2) {
            d += ` L ${coords[i]} ${coords[i + 1]}`;
        }
        if (shouldClose) {
            d += ' Z';
        }
        return d;
    }

    _rectToPath(el) {
        const x = this._readSvgNumber(el, 'x', 0);
        const y = this._readSvgNumber(el, 'y', 0);
        const width = this._readSvgNumber(el, 'width', NaN);
        const height = this._readSvgNumber(el, 'height', NaN);

        if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
            return null;
        }

        let rx = this._readSvgNumber(el, 'rx', 0);
        let ry = this._readSvgNumber(el, 'ry', 0);

        if (rx > 0 || ry > 0) {
            if (rx <= 0) rx = ry;
            if (ry <= 0) ry = rx;
            rx = Math.min(rx, width / 2);
            ry = Math.min(ry, height / 2);
            return [
                `M ${x + rx} ${y}`,
                `H ${x + width - rx}`,
                `A ${rx} ${ry} 0 0 1 ${x + width} ${y + ry}`,
                `V ${y + height - ry}`,
                `A ${rx} ${ry} 0 0 1 ${x + width - rx} ${y + height}`,
                `H ${x + rx}`,
                `A ${rx} ${ry} 0 0 1 ${x} ${y + height - ry}`,
                `V ${y + ry}`,
                `A ${rx} ${ry} 0 0 1 ${x + rx} ${y}`,
                'Z'
            ].join(' ');
        }

        return `M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z`;
    }

    _circleToPath(el) {
        const cx = this._readSvgNumber(el, 'cx', 0);
        const cy = this._readSvgNumber(el, 'cy', 0);
        const r = this._readSvgNumber(el, 'r', NaN);
        if (!Number.isFinite(r) || r <= 0) {
            return null;
        }

        return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
    }

    _ellipseToPath(el) {
        const cx = this._readSvgNumber(el, 'cx', 0);
        const cy = this._readSvgNumber(el, 'cy', 0);
        const rx = this._readSvgNumber(el, 'rx', NaN);
        const ry = this._readSvgNumber(el, 'ry', NaN);
        if (!Number.isFinite(rx) || !Number.isFinite(ry) || rx <= 0 || ry <= 0) {
            return null;
        }

        return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
    }

    _lineToPath(el) {
        const x1 = this._readSvgNumber(el, 'x1', NaN);
        const y1 = this._readSvgNumber(el, 'y1', NaN);
        const x2 = this._readSvgNumber(el, 'x2', NaN);
        const y2 = this._readSvgNumber(el, 'y2', NaN);
        if (![x1, y1, x2, y2].every((x) => Number.isFinite(x))) {
            return null;
        }
        return `M ${x1} ${y1} L ${x2} ${y2}`;
    }

    _shapeToPathData(el) {
        const tag = (el.tagName || '').toLowerCase();
        if (tag === 'path') {
            const d = el.getAttribute('d');
            return d && d.trim() !== '' ? d : null;
        }
        if (tag === 'polygon') {
            return this._polyPointsToPath(el.getAttribute('points'), true);
        }
        if (tag === 'polyline') {
            return this._polyPointsToPath(el.getAttribute('points'), false);
        }
        if (tag === 'rect') {
            return this._rectToPath(el);
        }
        if (tag === 'circle') {
            return this._circleToPath(el);
        }
        if (tag === 'ellipse') {
            return this._ellipseToPath(el);
        }
        if (tag === 'line') {
            return this._lineToPath(el);
        }
        return null;
    }

    _extractMapShapes(svg) {
        const out = [];
        const warnings = [];

        if (!svg || typeof svg !== 'string') {
            warnings.push('Input SVG is empty or not a string.');
            return { out, warnings };
        }

        try {
            if (typeof DOMParser !== 'undefined') {
                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
                const parserError = svgDoc.querySelector('parsererror');
                if (parserError) {
                    warnings.push('SVG parser reported errors. Some elements may be skipped.');
                }

                const shapeNodes = svgDoc.querySelectorAll('path, polygon, polyline, rect, circle, ellipse, line');

                for (let i = 0; i < shapeNodes.length; i++) {
                    const node = shapeNodes[i];
                    const tag = (node.tagName || '').toLowerCase();
                    const dAttr = this._shapeToPathData(node);
                    if (!dAttr) {
                        warnings.push(`Skipped element #${i} (<${tag}>): missing or invalid geometry attributes.`);
                        continue;
                    }

                    const idAttr = this._resolveMapElementId(node);
                    if (!idAttr) {
                        warnings.push(`Skipped element #${i} (<${tag}>): missing id/data-id on element and parent groups.`);
                        continue;
                    }

                    const transformAttr = this._collectTransformChain(node);

                    const abbr = idAttr.split(' ')[0].replaceAll('-', '_');
                    const nameAttr = this._resolveMapElementName(node, idAttr);
                    out.push({
                        id: idAttr,
                        abbr,
                        name: nameAttr,
                        d: dAttr,
                        transform: transformAttr,
                        tag,
                        index: i
                    });
                }

                const seenAbbr = new Set();
                for (let i = 0; i < out.length; i++) {
                    const abbr = out[i].abbr;
                    if (seenAbbr.has(abbr)) {
                        warnings.push(`Duplicate state abbreviation "${abbr}" detected from id "${out[i].id}".`);
                    }
                    seenAbbr.add(abbr);
                }

                return { out, warnings };
            }
        } catch (err) {
            warnings.push(`DOM parsing failed: ${err?.message || err}`);
        }

        warnings.push('DOMParser unavailable. Falling back to path-only regex parsing.');

        const pathRegex = /<path\b[^>]*>/gi;
        const idReStrict = /(?:^|[\s"'<])id\s*=\s*"([^"]+)"/i;
        const dataIdRe = /(?:^|[\s"'<])data-id\s*=\s*"([^"]+)"/i;
        const dReStrict = /(?:^|[\s"'<])d\s*=\s*"([^"]+)"/i;
        const transformRe = /(?:^|[\s"'<])transform\s*=\s*"([^"]+)"/i;
        const paths = svg.match(pathRegex) || [];

        for (let i = 0; i < paths.length; i++) {
            const tag = paths[i];
            const idMatch = idReStrict.exec(tag) || dataIdRe.exec(tag);
            const dMatch = dReStrict.exec(tag);

            if (!idMatch || !dMatch) {
                warnings.push(`Skipped regex path #${i}: missing id/data-id or d attribute.`);
                continue;
            }

            const id = idMatch[1];
            const d = dMatch[1];
            const transformMatch = transformRe.exec(tag);
            const transform = transformMatch?.[1]?.trim() || '';
            const abbr = id.split(' ')[0].replaceAll('-', '_');
            out.push({ id, abbr, name: id, d, transform, tag: 'path', index: i });
        }

        return { out, warnings };
    }

    getMapForPreview(svg) {
        console.log("getMapForPreview called with SVG length:", svg?.length ?? 0);
        if (!svg || typeof svg !== 'string') {
            console.error("Invalid SVG data: not a string");
            return [];
        }

        const parsed = this._extractMapShapes(svg);
        if (parsed.warnings.length > 0) {
            console.warn(`Map preview parsing produced ${parsed.warnings.length} warning(s).`);
            for (let i = 0; i < parsed.warnings.length; i++) {
                console.warn(parsed.warnings[i]);
            }
        }

        const previewData = parsed.out.map((x) => [x.abbr, x.d, x.transform || '']);
        console.log(`Successfully processed ${previewData.length} states for preview`);
        return previewData;
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
            const stateResult = getCurrentVoteResults(this).find((x) => x.state == pk);
            if (!stateResult || !Array.isArray(stateResult.result)) {
                return ["No PV data available for state"];
            }

            return stateResult.result.map(
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

    _addStateRelations(statePk, candidatePks, issuePks) {
        for (let i = 0; i < candidatePks.length; i++) {
            const cPk = this.getNewPk();
            this.candidate_state_multiplier[cPk] = {
                "model": "campaign_trail.candidate_state_multiplier",
                "pk": cPk,
                "fields": {
                    "candidate": candidatePks[i],
                    "state": statePk,
                    "state_multiplier": 1
                }
            };
        }

        for (let i = 0; i < issuePks.length; i++) {
            const iPk = this.getNewPk();
            this.state_issue_scores[iPk] = {
                "model": "campaign_trail.state_issue_score",
                "pk": iPk,
                "fields": {
                    "state": statePk,
                    "issue": Number(issuePks[i]),
                    "state_issue_score": 0,
                    "weight": 1.5
                }
            };
        }
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

        this._addStateRelations(newPk, cans, issues);
        this._invalidateCache('candidate_state_multiplier_by_candidate');
        this._invalidateCache('candidate_state_multiplier_by_state');
        this._invalidateCache('state_issue_scores_by_state');
        this._invalidateCache('state_issue_scores_by_issue');

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

        const parsed = this._extractMapShapes(svg);
        this.jet_data.mapping_data.lastImportWarnings = parsed.warnings;

        for (let i = 0; i < parsed.out.length; i++) {
            const shape = parsed.out[i];
            const newPk = this.getNewPk();
            const state = {
                "model": "campaign_trail.state",
                "pk": newPk,
                "fields": {
                    "name": shape.name || shape.abbr,
                    "abbr": shape.abbr,
                    "electoral_votes": 1,
                    "popular_votes": 10,
                    "poll_closing_time": 120,
                    "winner_take_all_flg": 1,
                    "election": electionPk,
                },
                "d": shape.d,
                "transform": shape.transform || ""
            };
            this.states[newPk] = state;
            this._addStateRelations(newPk, cans, issues);
        }

        if (parsed.warnings.length > 0) {
            console.warn(`Map import completed with ${parsed.warnings.length} warning(s).`);
            for (let i = 0; i < parsed.warnings.length; i++) {
                console.warn(parsed.warnings[i]);
            }
        }

        this._invalidateCache('candidate_state_multiplier_by_candidate');
        this._invalidateCache('candidate_state_multiplier_by_state');
        this._invalidateCache('state_issue_scores_by_state');
        this._invalidateCache('state_issue_scores_by_issue');
    }

    getMapCode() {
        const viewboxCode = false ? "this.paper.setViewBox(0,0,c,u,false);" : `this.paper.setViewBox(${this.jet_data.mapping_data.dx}, ${this.jet_data.mapping_data.dy}, ${this.jet_data.mapping_data.x}, ${this.jet_data.mapping_data.y}, false);`;
        return `(function(e,t,n,r,i){function s(e,t,n,r){r=r instanceof Array?r:[];var i={};for(var s=0;s<r.length;s++){i[r[s]]=true}var o=function(e){this.element=e};o.prototype=n;e.fn[t]=function(){var n=arguments;var r=this;this.each(function(){var s=e(this);var u=s.data("plugin-"+t);if(!u){u=new o(s);s.data("plugin-"+t,u);if(u._init){u._init.apply(u,n)}}else if(typeof n[0]=="string"&&n[0].charAt(0)!="_"&&typeof u[n[0]]=="function"){var a=Array.prototype.slice.call(n,1);var f=u[n[0]].apply(u,a);if(n[0]in i){r=f}}});return r}}var o=370,u=215,a=10;var f={stateStyles:{fill:"#333",stroke:"#666","stroke-width":1,"stroke-linejoin":"round",scale:[1,1]},stateHoverStyles:{fill:"#33c",stroke:"#000",scale:[1.1,1.1]},stateSpecificStyles:{},stateSpecificHoverStyles:{},click:null,mouseover:null,mouseout:null,clickState:{},mouseoverState:{},mouseoutState:{},showLabels:true,labelWidth:20,labelHeight:15,labelGap:6,labelRadius:3,labelBackingStyles:{fill:"#333",stroke:"#666","stroke-width":1,"stroke-linejoin":"round",scale:[1,1]},labelBackingHoverStyles:{fill:"#33c",stroke:"#000"},stateSpecificLabelBackingStyles:{},stateSpecificLabelBackingHoverStyles:{},labelTextStyles:{fill:"#fff",stroke:"none","font-weight":300,"stroke-width":0,"font-size":"10px"},labelTextHoverStyles:{},stateSpecificLabelTextStyles:{},stateSpecificLabelTextHoverStyles:{}};var l={_init:function(t){this.options={};e.extend(this.options,f,t);var n=this.element.width();var i=this.element.height();var s=this.element.width()/o;var l=this.element.height()/u;this.scale=Math.min(s,l);this.labelAreaWidth=Math.ceil(a/this.scale);var c=o+Math.max(0,this.labelAreaWidth-a);this.paper=r(this.element.get(0),c,u);this.paper.setSize(n,i);${viewboxCode}this.stateHitAreas={};this.stateShapes={};this.topShape=null;this._initCreateStates();this.labelShapes={};this.labelTexts={};this.labelHitAreas={};if(this.options.showLabels){this._initCreateLabels()}},_initCreateStates:function(){var t=this.options.stateStyles;var n=this.paper;var r={${this.getStateJavascriptForMapping()}};var tr={${this.getStateTransformJavascriptForMapping()}};var i={};for(var s in r){i={};if(this.options.stateSpecificStyles[s]){e.extend(i,t,this.options.stateSpecificStyles[s])}else{i=t}this.stateShapes[s]=n.path(r[s]).attr(i);if(tr[s]){if(this.stateShapes[s].node&&this.stateShapes[s].node.setAttribute){this.stateShapes[s].node.setAttribute("transform",tr[s])}else{this.stateShapes[s].transform(tr[s])}}this.topShape=this.stateShapes[s];this.stateHitAreas[s]=n.path(r[s]).attr({fill:"#000","stroke-width":0,opacity:0,cursor:"pointer"});if(tr[s]){if(this.stateHitAreas[s].node&&this.stateHitAreas[s].node.setAttribute){this.stateHitAreas[s].node.setAttribute("transform",tr[s])}else{this.stateHitAreas[s].transform(tr[s])}}this.stateHitAreas[s].node.dataState=s}this._onClickProxy=e.proxy(this,"_onClick");this._onMouseOverProxy=e.proxy(this,"_onMouseOver"),this._onMouseOutProxy=e.proxy(this,"_onMouseOut");for(var s in this.stateHitAreas){this.stateHitAreas[s].toFront();e(this.stateHitAreas[s].node).bind("mouseout",this._onMouseOutProxy);e(this.stateHitAreas[s].node).bind("click",this._onClickProxy);e(this.stateHitAreas[s].node).bind("mouseover",this._onMouseOverProxy)}},_initCreateLabels:function(){var t=this.paper;var n=[];var r=860;var i=220;var s=this.options.labelWidth;var o=this.options.labelHeight;var u=this.options.labelGap;var a=this.options.labelRadius;var f=s/this.scale;var l=o/this.scale;var c=(s+u)/this.scale;var h=(o+u)/this.scale*.5;var p=a/this.scale;var d=this.options.labelBackingStyles;var v=this.options.labelTextStyles;var m={};for(var g=0,y,b,w;g<n.length;++g){w=n[g];y=(g+1)%2*c+r;b=g*h+i,m={};if(this.options.stateSpecificLabelBackingStyles[w]){e.extend(m,d,this.options.stateSpecificLabelBackingStyles[w])}else{m=d}this.labelShapes[w]=t.rect(y,b,f,l,p).attr(m);m={};if(this.options.stateSpecificLabelTextStyles[w]){e.extend(m,v,this.options.stateSpecificLabelTextStyles[w])}else{e.extend(m,v)}if(m["font-size"]){m["font-size"]=parseInt(m["font-size"])/this.scale+"px"}this.labelTexts[w]=t.text(y+f/2,b+l/2,w).attr(m);this.labelHitAreas[w]=t.rect(y,b,f,l,p).attr({fill:"#000","stroke-width":0,opacity:0,cursor:"pointer"});this.labelHitAreas[w].node.dataState=w}for(var w in this.labelHitAreas){this.labelHitAreas[w].toFront();e(this.labelHitAreas[w].node).bind("mouseout",this._onMouseOutProxy);e(this.labelHitAreas[w].node).bind("click",this._onClickProxy);e(this.labelHitAreas[w].node).bind("mouseover",this._onMouseOverProxy)}},_getStateFromEvent:function(e){var t=e.target&&e.target.dataState||e.dataState;return this._getState(t)},_getState:function(e){var t=this.stateShapes[e];var n=this.stateHitAreas[e];var r=this.labelShapes[e];var i=this.labelTexts[e];var s=this.labelHitAreas[e];return{shape:t,hitArea:n,name:e,labelBacking:r,labelText:i,labelHitArea:s}},_onMouseOut:function(e){var t=this._getStateFromEvent(e);if(!t.hitArea){return}return!this._triggerEvent("mouseout",e,t)},_defaultMouseOutAction:function(t){var n={};if(this.options.stateSpecificStyles[t.name]){e.extend(n,this.options.stateStyles,this.options.stateSpecificStyles[t.name])}else{n=this.options.stateStyles}t.shape.animate(n,this.options.stateHoverAnimation);if(t.labelBacking){var n={};if(this.options.stateSpecificLabelBackingStyles[t.name]){e.extend(n,this.options.labelBackingStyles,this.options.stateSpecificLabelBackingStyles[t.name])}else{n=this.options.labelBackingStyles}t.labelBacking.animate(n,this.options.stateHoverAnimation)}},_onClick:function(e){var t=this._getStateFromEvent(e);if(!t.hitArea){return}return!this._triggerEvent("click",e,t)},_onMouseOver:function(e){var t=this._getStateFromEvent(e);if(!t.hitArea){return}return!this._triggerEvent("mouseover",e,t)},_defaultMouseOverAction:function(t){this.bringShapeToFront(t.shape);this.paper.safari();var n={};if(this.options.stateSpecificHoverStyles[t.name]){e.extend(n,this.options.stateHoverStyles,this.options.stateSpecificHoverStyles[t.name])}else{n=this.options.stateHoverStyles}t.shape.animate(n,this.options.stateHoverAnimation);if(t.labelBacking){var n={};if(this.options.stateSpecificLabelBackingHoverStyles[t.name]){e.extend(n,this.options.labelBackingHoverStyles,this.options.stateSpecificLabelBackingHoverStyles[t.name])}else{n=this.options.labelBackingHoverStyles}t.labelBacking.animate(n,this.options.stateHoverAnimation)}},_triggerEvent:function(t,n,r){var i=r.name;var s=false;var o=e.Event("usmap"+t+i);o.originalEvent=n;if(this.options[t+"State"][i]){s=this.options[t+"State"][i](o,r)===false}if(o.isPropagationStopped()){this.element.trigger(o,[r]);s=s||o.isDefaultPrevented()}if(!o.isPropagationStopped()){var u=e.Event("usmap"+t);u.originalEvent=n;if(this.options[t]){s=this.options[t](u,r)===false||s}if(!u.isPropagationStopped()){this.element.trigger(u,[r]);s=s||u.isDefaultPrevented()}}if(!s){switch(t){case"mouseover":this._defaultMouseOverAction(r);break;case"mouseout":this._defaultMouseOutAction(r);break}}return!s},trigger:function(e,t,n){t=t.replace("usmap","");e=e.toUpperCase();var r=this._getState(e);this._triggerEvent(t,n,r)},bringShapeToFront:function(e){if(this.topShape){e.insertAfter(this.topShape)}this.topShape=e}};var c=[];s(e,"usmap",l,c)})(jQuery,document,window,Raphael)`
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

    getStateTransformJavascriptForMapping() {
        const chunks = [];
        const states = Object.values(this.states);

        for (let i = 0; i < states.length; i++) {
            const abbr = states[i].fields.abbr;
            const transform = states[i].transform || "";
            if (transform) {
                const escapedTransform = String(transform).replaceAll('\\', '\\\\').replaceAll('"', '\\"');
                chunks.push(`"${abbr}":"${escapedTransform}"`);
            }
        }

        return chunks.join(',');
    }

    exportCode2() {
        const parts = [];

        // generated mapping code
        if (this.jet_data.mapping_enabled) {
            parts.push("\n// Generated mapping code\n", this.getMapCode(), "\n\n");
        }

        const generatedCyoaCode = this.getCYOACode();

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

        let codeToAdd = (this.jet_data.code_to_add || "").trim();

        // normalize custom code newlines
        if (codeToAdd) {
            codeToAdd = codeToAdd.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").replace(/^\n+/, "").replace(/\n+$/, "");
        }

        // CYOA merging logic
        if (generatedCyoaCode) {
            const hasCustomCyoa = codeToAdd.includes("cyoAdventure") && codeToAdd.includes("function");

            if (!hasCustomCyoa) {
                // if user has no existing CYOA
                codeToAdd = `${generatedCyoaCode}\n\n${codeToAdd}`;
            } else {
                // if user has existing CYOA

                // declare missing variables
                const missingVars = [];
                for (const v of this.getAllCyoaVariables()) {
                    const varName = (v.name || "").trim();
                    if (varName && !new RegExp(`\\b(?:var|let|const)\\s+${varName}\\s*=`).test(codeToAdd)) {
                        missingVars.push(`var ${varName} = ${v.defaultValue};`);
                    }
                }
                
                if (missingVars.length > 0) {
                    const missingStr = missingVars.join("\n");
                    // try to inject right after the existing comment
                    if (codeToAdd.includes("// CYOA Variables")) {
                        codeToAdd = codeToAdd.replace(/\/\/\s*CYOA Variables\s*\n/, "// CYOA Variables\n" + missingStr + "\n");
                    } else {
                        // otherwise prepend it
                        codeToAdd = `// CYOA Variables\n${missingStr}\n\n${codeToAdd}`;
                    }
                }

                // extract the effects
                const effectMatch = generatedCyoaCode.match(/cyoAdventure\s*=\s*function\s*\([^)]*\)\s*\{([\s\S]*?)\n\}\s*$/m);
                let generatedEffects = "";
                if (effectMatch) {
                    let fnBody = effectMatch[1];
                    fnBody = fnBody.replace(/^\s*(?:const|let|var)?\s*ans\s*=.*?;\s*/m, ""); // Strip redundant 'ans' definition
                    fnBody = fnBody.replace(/^\s*e\.noCounter\s*=\s*.*?;\s*/m, ""); // Strip redundant e.noCounter definition
                    generatedEffects = fnBody.split(/\n\s*\/\/ Branching logic\b/m)[0].replace(/^\n+/, "").trimEnd();
                }

                // inject effects block
                const blockStart = "// [JETS_CYOA_VARIABLE_EFFECTS_START]";
                const blockEnd = "// [JETS_CYOA_VARIABLE_EFFECTS_END]";

                const existingBlockRe = new RegExp(`\\n?\\s*${blockStart.replace(/\[/g, '\\[').replace(/\]/g, '\\]')}[\\s\\S]*?${blockEnd.replace(/\[/g, '\\[').replace(/\]/g, '\\]')}\\n?`, "g");
                codeToAdd = codeToAdd.replace(existingBlockRe, "\n");

                if (generatedEffects) {
                    const noCounterRe = /(cyoAdventure\s*=\s*function\s*\([^)]*\)\s*\{[\s\S]*?(?:(?:const|let|var)\s+)?ans\s*=[^;]+;[\s\S]*?e\.noCounter\s*=\s*[^;]+;[ \t]*\r?\n)/;
                    const ansRe = /(cyoAdventure\s*=\s*function\s*\([^)]*\)\s*\{[\s\S]*?(?:(?:const|let|var)\s+)?ans\s*=[^;]+;[ \t]*\r?\n)/;
                    
                    let match = codeToAdd.match(noCounterRe);
                    let insertionPoint = -1;
                    let indent = "    ";

                    if (match) {
                        insertionPoint = match.index + match[0].length;
                        const indentMatch = match[0].match(/(?:^|\n)([ \t]*)e\.noCounter\s*=/);
                        if (indentMatch) indent = indentMatch[1];
                    } else {
                        match = codeToAdd.match(ansRe);
                        if (match) {
                            insertionPoint = match.index + match[0].length;
                            const indentMatch = match[0].match(/(?:^|\n)([ \t]*)(?:(?:const|let|var)\s+)?ans\s*=/);
                            if (indentMatch) indent = indentMatch[1];
                        }
                    }

                    if (insertionPoint !== -1) {
                        const formattedEffects = generatedEffects.split("\n").map(l => l.trim() ? `${indent}${l.replace(/^ {1,4}/, "")}` : "").join("\n");
                        const block = `\n${indent}${blockStart}\n${formattedEffects}\n${indent}${blockEnd}\n`;

                        codeToAdd = codeToAdd.slice(0, insertionPoint) + block + codeToAdd.slice(insertionPoint);
                    }
                }

                // inject missing helpers
                let prelude = "";
                if (!codeToAdd.includes("getQuestionIndexFromPk")) {
                    const preludeMatch = generatedCyoaCode.match(/([\s\S]*?)(?=\/\/ CYOA Variables|\ncyoAdventure\s*=)/);
                    if (preludeMatch) prelude = preludeMatch[1].trim() + "\n\n";
                }

                codeToAdd = `${prelude}${codeToAdd}`;
            }
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

        const preparedEndings = endings.map((ending) => ({
            id: ending?.id,
            variable: Number(ending?.variable ?? 0),
            operator: ending?.operator || ">",
            amount: Number(ending?.amount ?? 0),
            endingTitle: ending?.endingTitle || "",
            endingSubtitle: ending?.endingSubtitle || "",
            endingText: ending?.endingText || "",
            endingImage: ending?.endingImage || "",
            endingHideImage: !!ending?.endingHideImage,
            endingSlidesJson: ending?.endingSlidesJson || "",
            audioTitle: ending?.audioTitle || "",
            audioArtist: ending?.audioArtist || "",
            audioCover: ending?.audioCover || "",
            audioUrl: ending?.audioUrl || "",
            endingAccentColor: ending?.endingAccentColor || "#11299e",
            endingBackgroundColor: ending?.endingBackgroundColor || "#ffffff",
            endingTextColor: ending?.endingTextColor || "#000000",
            variableConditions: Array.isArray(ending?.variableConditions) ? ending.variableConditions : [],
            variableConditionOperator: ending?.variableConditionOperator || "AND",
            answerConditionType: ending?.answerConditionType || "ignore",
            answerConditionAnswer: ending?.answerConditionAnswer ?? "",
            answerConditionAnswers: ending?.answerConditionAnswers ?? ""
        }));

        let f = "// [JETS_ENDINGS_START]\n";
        f += "campaignTrail_temp.multiple_endings = true;\n\n";
        f += `const _tctEndingDefs = ${JSON.stringify(preparedEndings, null, 4)};\n\n`;
        f += `const _tctOpMap = {
    ">": (a, b) => a > b,
    ">=": (a, b) => a >= b,
    "==": (a, b) => a == b,
    "<=": (a, b) => a <= b,
    "<": (a, b) => a < b,
    "!=": (a, b) => a != b
};

const _tctGetEndingImageEl = () => {
    const imageContainer = document.querySelector(".person_image");
    if (!imageContainer) return null;
    if (imageContainer.tagName && imageContainer.tagName.toLowerCase() === "img") {
        return imageContainer;
    }
    return imageContainer.querySelector("img");
};

const _tctReadVariable = (name) => {
    if (!name || typeof name !== "string") return undefined;
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) return undefined;
    try {
        return Function("return (typeof " + name + " !== 'undefined') ? " + name + " : undefined;")();
    } catch (_err) {
        return undefined;
    }
};

const _tctParseConditionValue = (value) => {
    if (value == null || value === "") return "";
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
    return value;
};

const _tctCheckExtraConditions = (entry, playerAnswers) => {
    // check variable conditions
    if (Array.isArray(entry.variableConditions) && entry.variableConditions.length > 0) {
        const operator = entry.variableConditionOperator || "AND";
        const results = entry.variableConditions.map((cond) => {
            const left = _tctReadVariable(cond.variable);
            const right = _tctParseConditionValue(cond.value);
            const opFn = _tctOpMap[cond.comparator] || _tctOpMap["=="];
            return opFn(left, right);
        });

        if (operator === "AND") {
            if (!results.every((r) => r)) return false;
        } else if (operator === "OR") {
            if (!results.some((r) => r)) return false;
        }
    }

    const answerType = entry.answerConditionType || "ignore";
    if (answerType !== "ignore") {
        const rawAnswers = String(entry.answerConditionAnswers || entry.answerConditionAnswer || "").trim();
        const answerIds = rawAnswers
            .split(/[\\s,]+/)
            .filter((v) => v.length > 0)
            .map((v) => Number(v))
            .filter((v) => Number.isFinite(v));

        if (answerIds.length === 0) return false;

        const hasAny = Array.isArray(playerAnswers) && answerIds.some((id) => playerAnswers.includes(id));
        if (answerType === "has" && !hasAny) return false;
        if (answerType === "not_has" && hasAny) return false;
    }

    return true;
};

const playEndingSong = (title, artist, cover, url) => {
    if (!url) return;
    if (typeof Playlist !== "undefined" && typeof Song !== "undefined" && typeof changePlaylist === "function") {
        const playlist = new Playlist();
        const song = new Song(title || "", artist || "", cover || "", url);
        playlist.addSong(song);
        changePlaylist(playlist);
    }
};

const styleEndingDescription = () => {
    const desc = document.querySelector("#final_results_description");
    if (!desc) return;

    const e = campaignTrail_temp;
    const theme = e._endingTheme || {};
    const bg = theme.backgroundColor || "#ffffff";
    const fg = theme.textColor || "#000000";
    const border = theme.accentColor || "#11299e";

    Object.assign(desc.style, {
        textAlign: "left",
        width: "72%",
        maxHeight: "20em",
        minHeight: "8em",
        height: "auto",
        display: "block",
        margin: "0 auto",
        overflowY: "auto",
        overflowX: "hidden",
        whiteSpace: "normal",
        overflowWrap: "anywhere",
        wordBreak: "break-word",
        transform: "translateZ(0)",
        backgroundColor: bg,
        color: fg,
        border: "2px solid " + border,
        borderRadius: "4px",
        padding: "10px"
    });

    desc.dataset.endingStyled = "1";
};

const applyEndingImage = (slide) => {
    const imageEl = _tctGetEndingImageEl();
    if (!imageEl || !slide) return;

    if (slide.image === false) {
        imageEl.style.display = "none";
        imageEl.removeAttribute("src");
        return;
    }

    if (!imageEl.dataset.endingStyled) {
        const e = campaignTrail_temp;
        const theme = e._endingTheme || {};
        const border = theme.accentColor || "#11299e";
        Object.assign(imageEl.style, {
            border: "3px solid " + border,
            display: "block",
            width: "210px",
            height: "250px",
            objectFit: "cover"
        });
        imageEl.dataset.endingStyled = "1";
    } else {
        imageEl.style.display = "block";
        const e = campaignTrail_temp;
        const theme = e._endingTheme || {};
        imageEl.style.border = "3px solid " + (theme.accentColor || "#11299e");
    }

    if (slide.image && imageEl.getAttribute("src") !== slide.image) {
        imageEl.src = slide.image;
    }
};

const applyEndingButtons = () => {
    const e = campaignTrail_temp;
    const theme = e._endingTheme || {};
    const imageEl = _tctGetEndingImageEl();
    if (!imageEl || !imageEl.parentNode) return;

    let btnContainer = document.getElementById("ending_slide_buttons");
    if (!btnContainer) {
        btnContainer = document.createElement("div");
        btnContainer.id = "ending_slide_buttons";
        Object.assign(btnContainer.style, {
            display: "flex",
            gap: "20px",
            left: "13px",
            top: "280px",
            position: "absolute"
        });
        imageEl.parentNode.insertBefore(btnContainer, imageEl.nextSibling);
    }

    let buttonsHtml = "";
    if (e.page > 0) {
        buttonsHtml += '<button onclick="endingConstructor(-1)">Back</button>';
    }
    if (e.page < e.endingSlides.length - 1) {
        buttonsHtml += '<button onclick="endingConstructor(1)">Next</button>';
    }

    if (btnContainer.innerHTML !== buttonsHtml) {
        btnContainer.innerHTML = buttonsHtml;
    }

    const buttonBg = theme.accentColor || "#11299e";
    const buttonText = "#ffffff";
    btnContainer.querySelectorAll("button").forEach((btn) => {
        Object.assign(btn.style, {
            backgroundColor: buttonBg,
            border: "1px solid " + buttonBg,
            color: buttonText,
            padding: "4px 10px",
            cursor: "pointer"
        });
    });
};

const syncEndingSlideDom = () => {
    const e = campaignTrail_temp;
    const slide = e.endingSlides?.[e.page];
    if (!slide) return;

    styleEndingDescription();
    applyEndingImage(slide);
    applyEndingButtons();

    if (slide.audio && slide.audio.url) {
        const key = [slide.audio.title || "", slide.audio.artist || "", slide.audio.url || ""].join("|");
        if (e._endingAudioPlayedKey !== key) {
            playEndingSong(slide.audio.title, slide.audio.artist, slide.audio.cover, slide.audio.url);
            e._endingAudioPlayedKey = key;
        }
    }
};

const syncEndingSlideDomDeferred = () => {
    requestAnimationFrame(() => {
        syncEndingSlideDom();
    });
};

const _tctBuildSlides = (entry) => {
    if (entry && entry.endingSlidesJson) {
        try {
            const parsed = JSON.parse(entry.endingSlidesJson);
            if (Array.isArray(parsed) && parsed.length > 0) {
                const normalizeSlide = (slide) => ({
                    variable: Number(slide?.variable ?? 0),
                    operator: slide?.operator || ">",
                    amount: Number(slide?.amount ?? 0),
                    title: slide?.title || "",
                    subtitle: slide?.subtitle || "",
                    content: slide?.content || "",
                    image: slide?.image,
                    audio: slide?.audio && slide.audio.url ? {
                        title: slide.audio.title || "",
                        artist: slide.audio.artist || "",
                        cover: slide.audio.cover || "",
                        url: slide.audio.url || ""
                    } : undefined
                });

                const hasGroups = parsed.some((slide) => slide && slide.slideGroup);
                if (!hasGroups) {
                    return parsed.map((slide) => normalizeSlide(slide));
                }

                const groupMap = new Map();
                const groupOrder = [];
                for (const slide of parsed) {
                    const groupKey = slide?.slideGroup || "main";
                    if (!groupMap.has(groupKey)) {
                        groupMap.set(groupKey, []);
                        groupOrder.push(groupKey);
                    }
                    groupMap.get(groupKey).push(slide);
                }

                const playerAnswers = campaignTrail_temp?.player_answers || [];
                const selectedSlides = [];

                for (const groupKey of groupOrder) {
                    const groupSlides = groupMap.get(groupKey) || [];
                    let selected = groupSlides.find((slide) => {
                        const opFn = _tctOpMap[slide?.operator] || _tctOpMap[">"];
                        const left = quickstats?.[Number(slide?.variable) || 0];
                        const right = Number(slide?.amount) || 0;
                        return opFn(left, right) && _tctCheckExtraConditions(slide, playerAnswers);
                    });
                    if (!selected) selected = groupSlides[0];
                    if (selected) selectedSlides.push(normalizeSlide(selected));
                }

                return selectedSlides;
            }
        } catch (err) {
            console.warn("Invalid endingSlidesJson for ending", entry?.id, err);
        }
    }

    const fallbackSlide = {
        title: entry?.endingTitle || "",
        subtitle: entry?.endingSubtitle || "",
        content: entry?.endingText || "",
        image: entry?.endingHideImage ? false : (entry?.endingImage || undefined)
    };

    if (entry?.audioUrl) {
        fallbackSlide.audio = {
            title: entry.audioTitle || "",
            artist: entry.audioArtist || "",
            cover: entry.audioCover || "",
            url: entry.audioUrl || ""
        };
    }

    return [fallbackSlide];
};

const _tctConstructSlide = (direction = 1) => {
    const e = campaignTrail_temp;
    if (!Array.isArray(e.endingSlides) || e.endingSlides.length === 0) return "";

    e.page += direction;
    if (e.page < 0) e.page = 0;
    if (e.page >= e.endingSlides.length) e.page = e.endingSlides.length - 1;

    const currentSlide = e.endingSlides[e.page];
    if (!currentSlide) return "";

    let html = "";
    if (currentSlide.title) html += "<h3>" + currentSlide.title + "</h3>";
    if (currentSlide.subtitle) html += "<h4>" + currentSlide.subtitle + "</h4>";
    html += (currentSlide.content || "") + "<br><br>";
    return html;
};

endingConstructor = (direction = 1) => {
    const desc = document.querySelector("#final_results_description");
    if (!desc) return;
    desc.innerHTML = _tctConstructSlide(direction);
    syncEndingSlideDomDeferred();
};

endingPicker = (out, totv, aa, quickstats) => {
    const playerAnswers = campaignTrail_temp?.player_answers || [];
    for (const entry of _tctEndingDefs) {
        const opFn = _tctOpMap[entry.operator] || _tctOpMap[">"];
        const left = quickstats?.[Number(entry.variable) || 0];
        const right = Number(entry.amount) || 0;

        if (opFn(left, right) && _tctCheckExtraConditions(entry, playerAnswers)) {
            const e = campaignTrail_temp;
            e.multiple_endings = true;
            e.page = -1;
            e._endingTheme = {
                accentColor: entry?.endingAccentColor || "#11299e",
                backgroundColor: entry?.endingBackgroundColor || "#ffffff",
                textColor: entry?.endingTextColor || "#000000"
            };
            e.endingSlides = _tctBuildSlides(entry);
            e._endingAudioPlayedKey = "";

            const html = _tctConstructSlide(1);
            syncEndingSlideDomDeferred();
            return html;
        }
    }

    return "";
};
`;
        f += "\n// [JETS_ENDINGS_END]\n";
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
    const ans = campaignTrail_temp.player_answers[campaignTrail_temp.player_answers.length - 1];
    e.noCounter = campaignTrail_temp.player_answers.length;
`;

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

        const normalizeConditionOperand = (variableName) => {
            const key = String(variableName || '').trim().toLowerCase();
            if (key === '__no_counter__' || key === 'nocounter' || key === 'e.nocounter') {
                return 'e.noCounter';
            }
            return variableName;
        };

        const buildConditionExpr = (conditions, conditionOperator = 'AND') => {
            if (!Array.isArray(conditions) || conditions.length === 0) return '';

            const valid = conditions
                .filter(c => c && c.variable && c.comparator && Number.isFinite(Number(c.value)))
                .map(c => `${normalizeConditionOperand(c.variable)} ${c.comparator} ${Number(c.value)}`);

            if (!valid.length) return '';
            const joinStr = conditionOperator === 'OR' ? ' || ' : ' && ';
            const expr = valid.join(joinStr);
            return valid.length > 1 ? `(${expr})` : expr;
        };

        // sort rules for consistent generation (by answer pk, then id)
        const events = this.getAllCyoaEvents().slice().sort((a, b) => {
            const ansA = Number(a?.answer ?? 0);
            const ansB = Number(b?.answer ?? 0);
            if (ansA !== ansB) return ansA - ansB;
            return Number(a?.id ?? 0) - Number(b?.id ?? 0);
        });

        const compiledEvents = events
            .map(event => {
                const questionPk = Number(event?.question);
                const answerPk = Number(event?.answer);
                if (!Number.isFinite(questionPk) || !Number.isFinite(answerPk)) return null;

                const answerExpr = `ans == ${answerPk}`;
                const condExpr = buildConditionExpr(event?.conditions, event?.conditionOperator || 'AND');
                const combinedExpr = condExpr ? `(${answerExpr}) && ${condExpr}` : answerExpr;

                return {
                    condition: combinedExpr,
                    questionPk
                };
            })
            .filter(Boolean);

        if (compiledEvents.length > 0) {
            f += "\n    // Branching logic\n";
            for (let i = 0; i < compiledEvents.length; i++) {
                const row = compiledEvents[i];
                f += `    ${i > 0 ? "else " : ""}if (${row.condition}) {\n`;
                f += `        campaignTrail_temp.question_number = getQuestionNumberFromPk(${row.questionPk});\n`;
                f += "    }\n";
            }
        }

        f += "}\n\n";
        return f;
    }
}

// helper to extract code
class CodeExtractor {
    constructor(rawText) {
        this.raw = rawText;
        this.ranges = [];
    }

    exclude(start, end) {
        if (start !== -1 && end !== -1 && start < end) {
            this.ranges.push({ start, end });
        }
    }

    excludeRegex(regex) {
        let match;
        const flags = regex.flags.includes('g') ? regex.flags : regex.flags + 'g';
        const globalRegex = new RegExp(regex.source, flags);
        while ((match = globalRegex.exec(this.raw)) !== null) {
            this.exclude(match.index, match.index + match[0].length);
        }
    }

    getRemainingCode() {
        if (this.ranges.length === 0) return this.raw.trim();

        this.ranges.sort((a, b) => a.start - b.start);
        const merged = [];
        let curr = { ...this.ranges[0] };

        for (let i = 1; i < this.ranges.length; i++) {
            let next = this.ranges[i];
            if (next.start <= curr.end) {
                curr.end = Math.max(curr.end, next.end);
            } else {
                merged.push(curr);
                curr = { ...next };
            }
        }
        merged.push(curr);

        let parts = [];
        let lastEnd = 0;
        for (const r of merged) {
            if (r.start > lastEnd) parts.push(this.raw.substring(lastEnd, r.start));
            lastEnd = r.end;
        }
        if (lastEnd < this.raw.length) parts.push(this.raw.substring(lastEnd));

        let combined = parts.join("");

        // clean up formatting artifacts
        combined = combined.replace(/^[;\s]+/, "");
        combined = combined.replace(/;\s*;/g, ";");
        combined = combined.replace(/^[ \t]*;[ \t]*(?:\r?\n|$)/gm, "");
        combined = combined.replace(/[ \t]+$/gm, "");
        combined = combined.replace(/(\r\n|\r|\n){3,}/g, "\n\n");

        return combined.trim();
    }
}

function extractJSON(raw_file, start, end, backup = null, backupEnd = null, required = true, fallback = [], outRange = null, fromIndex = 0) {
    let f = raw_file;
    let startIndex = f.indexOf(start, Math.max(0, Number(fromIndex) || 0));
    if (startIndex === -1) {
        if (backup != null) return extractJSON(f, backup, backupEnd == null ? end : backupEnd, null, null, required, fallback, outRange, fromIndex);
        if (required) console.warn(`WARNING: Missing section '${start}'. Skipping it.`);
        return fallback;
    }

    let startString = f.substring(startIndex + start.length);
    if (start.includes("JSON.parse")) {
        let s = startString.trimStart();
        if (s[0] === '"' || s[0] === "'") {
            const quote = s[0];
            let i = 1, escaped = false, literalContent = "";
            for (; i < s.length; i++) {
                const ch = s[i];
                if (escaped) { literalContent += "\\" + ch; escaped = false; continue; }
                if (ch === "\\") { escaped = true; continue; }
                if (ch === quote) break;
                literalContent += ch;
            }
            if (i < s.length && s[i] === quote) {
                let jsonText;
                try { jsonText = JSON.parse(quote + literalContent + quote); }
                catch (e) { jsonText = literalContent.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, "\\").replace(/\\n/g, "\n"); }

                try {
                    let candidate = jsonText.replace(/,\s*([}\]])/g, "$1");
                    if (end == "]") candidate = "[" + candidate + "]";
                    let res = JSON.parse(candidate);

                    if (outRange) {
                        outRange.start = startIndex;
                        outRange.end = startIndex + start.length + startString.indexOf(s) + i + 1;
                        let rest = f.substring(outRange.end).trimStart();
                        if (rest.startsWith(");")) outRange.end = f.indexOf(");", outRange.end) + 2;
                        else if (rest.startsWith(")")) outRange.end = f.indexOf(")", outRange.end) + 1;
                    }
                    return res;
                } catch (e) { }
            }
        }
    }

    const commentCleanerRegex = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:\\[\s\S]|[^`\\])*`)|(\/\*[\s\S]*?\*\/)|(\/\/.*$)/gm;
    const commentPreserverRegex = /\/\/(.*)\s*[\r\n]+\s*\{/g;
    let searchFrom = 0;

    while (true) {
        const endIdx = startString.indexOf(end, searchFrom);
        if (endIdx === -1) break;

        let raw = startString.slice(0, endIdx).trim();
        if (raw[0] === '"' || raw[0] === "'") {
            const quote = raw[0];
            let lastQuote = -1, escaped = false;
            for (let j = 1; j < raw.length; j++) {
                if (escaped) { escaped = false; continue; }
                if (raw[j] === '\\') { escaped = true; continue; }
                if (raw[j] === quote) { lastQuote = j; break; }
            }
            if (lastQuote !== -1) raw = raw.slice(1, lastQuote);
        }

        let jsonAttempt = raw;
        if (jsonAttempt.trim().startsWith("{")) {
            jsonAttempt = jsonAttempt.replace(commentPreserverRegex, (match, comment) => `{ "_note": "${comment.trim().replace(/"/g, '\\"')}", `);
        }
        jsonAttempt = jsonAttempt.replace(commentCleanerRegex, (match, str) => str ? str : "").replace(/,\s*([}\]])/g, "$1");

        try {
            let finalizedJson = end == "]" ? "[" + jsonAttempt + "]" : jsonAttempt;
            let res = JSON.parse(finalizedJson);
            if (outRange) { outRange.start = startIndex; outRange.end = startIndex + start.length + endIdx + end.length; }
            return res;
        } catch (e) {
            try {
                let evalAttempt = end == "]" ? "[" + jsonAttempt + "]" : jsonAttempt;
                if (evalAttempt.trim().startsWith("[") || evalAttempt.trim().startsWith("{")) {
                    let res = new Function("return " + evalAttempt)();
                    if (outRange) { outRange.start = startIndex; outRange.end = startIndex + start.length + endIdx + end.length; }
                    return res;
                }
            } catch (e2) { }
        }
        searchFrom = endIdx + 1;
    }

    return fallback;
}

function loadDataFromFile(raw_json) {
    const extractor = new CodeExtractor(raw_json);
    let highest_pk = -1;
    let pkReplacements = new Map();
    const duplicateCounters = new Map();

    const parseStructuredLiteral = (source) => {
        if (typeof source !== 'string') return null;

        const commentCleanerRegex = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:\\[\s\S]|[^`\\])*`)|(\/\*[\s\S]*?\*\/)|(\/\/.*$)/gm;
        const cleaned = source
            .replace(commentCleanerRegex, (match, str) => str ? str : "")
            .replace(/,\s*([}\]])/g, "$1");

        try {
            return JSON.parse(cleaned);
        } catch (_jsonErr) {
            try {
                return new Function("return " + cleaned)();
            } catch (_evalErr) {
                return null;
            }
        }
    };

    const findBalancedLiteralEnd = (text, startIndex, openChar, closeChar) => {
        let depth = 0;
        let inString = false;
        let stringChar = '';
        let escape = false;
        let inSingleLine = false;
        let inMultiLine = false;

        for (let i = startIndex; i < text.length; i++) {
            const ch = text[i];
            const next = text[i + 1];

            if (inSingleLine) {
                if (ch === '\n' || ch === '\r') inSingleLine = false;
                continue;
            }

            if (inMultiLine) {
                if (ch === '*' && next === '/') {
                    inMultiLine = false;
                    i++;
                }
                continue;
            }

            if (inString) {
                if (!escape && ch === stringChar) {
                    inString = false;
                    stringChar = '';
                }
                escape = (!escape && ch === '\\');
                if (escape && ch !== '\\') escape = false;
                continue;
            }

            if (ch === '"' || ch === "'" || ch === '`') {
                inString = true;
                stringChar = ch;
                escape = false;
                continue;
            }

            if (ch === '/' && next === '/') {
                inSingleLine = true;
                i++;
                continue;
            }

            if (ch === '/' && next === '*') {
                inMultiLine = true;
                i++;
                continue;
            }

            if (ch === openChar) {
                depth++;
                continue;
            }

            if (ch === closeChar) {
                depth--;
                if (depth === 0) return i + 1;
            }
        }

        return -1;
    };

    const excludeAllButLastRegex = (regex) => {
        const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
        const scan = new RegExp(regex.source, flags);
        const ranges = [];
        let m;

        while ((m = scan.exec(raw_json)) !== null) {
            ranges.push({ start: m.index, end: m.index + m[0].length });
            if (m[0].length === 0) scan.lastIndex++;
        }

        for (let i = 0; i < ranges.length - 1; i++) {
            extractor.exclude(ranges[i].start, ranges[i].end);
        }
    };

    // exclude repeated arrow-function assignments like:
    // endingPicker = (...) => { ... }
    // while keeping the last one
    const excludeArrowFunctionAssignmentsButKeepLast = (identifier) => {
        const headerRe = new RegExp(`${identifier}\\s*=\\s*\\([^)]*\\)\\s*=>\\s*\\{`, "g");
        let match;
        const ranges = [];

        while ((match = headerRe.exec(raw_json)) !== null) {
            const header = match[0];
            const bodyStart = match.index + header.length - 1; // points to '{'

            let i = bodyStart;
            let depth = 0;
            let inString = false;
            let stringChar = '';
            let escape = false;
            let inSingleLine = false;
            let inMultiLine = false;

            for (; i < raw_json.length; i++) {
                const ch = raw_json[i];
                const next = raw_json[i + 1];

                if (inSingleLine) {
                    if (ch === '\n' || ch === '\r') inSingleLine = false;
                    continue;
                }

                if (inMultiLine) {
                    if (ch === '*' && next === '/') {
                        inMultiLine = false;
                        i++;
                    }
                    continue;
                }

                if (inString) {
                    if (!escape && ch === stringChar) {
                        inString = false;
                        stringChar = '';
                    }
                    escape = (!escape && ch === '\\');
                    if (escape && ch !== '\\') escape = false;
                    continue;
                }

                if (ch === '"' || ch === "'" || ch === '`') {
                    inString = true;
                    stringChar = ch;
                    escape = false;
                    continue;
                }

                if (ch === '/' && next === '/') {
                    inSingleLine = true;
                    i++;
                    continue;
                }

                if (ch === '/' && next === '*') {
                    inMultiLine = true;
                    i++;
                    continue;
                }

                if (ch === '{') {
                    depth++;
                    continue;
                }

                if (ch === '}') {
                    depth--;
                    if (depth === 0) {
                        let end = i + 1;
                        while (end < raw_json.length && /\s/.test(raw_json[end])) end++;
                        if (raw_json[end] === ';') end++;
                        ranges.push({ start: match.index, end });
                        break;
                    }
                }
            }
        }

        for (let i = 0; i < ranges.length - 1; i++) {
            extractor.exclude(ranges[i].start, ranges[i].end);
        }
    };

    const normalizeTextEncoding = (text) => {
        return typeof text === 'string' ? text.replaceAll("â€™", "'").replaceAll("â€”", "—") : text;
    };

    const getSection = (name, required = true, fallback = []) => {
        const pattern = new RegExp(`campaignTrail_temp\\.${name}\\s*=\\s*(JSON\\.parse\\s*\\(|[\\{\\[]|\\"[\\{\\[]|\\'[\\{\\[])`, "ig");
        const matches = [];
        let match;

        while ((match = pattern.exec(raw_json)) !== null) {
            matches.push({
                full: match[0],
                marker: match[1],
                index: match.index
            });
        }

        if (matches.length === 0) {
            if (required) console.warn(`WARNING: Missing 'campaignTrail_temp.${name}'. Skipping it.`);
            return fallback;
        }

        if (matches.length > 1) {
            console.warn(`Found ${matches.length} assignments for campaignTrail_temp.${name}; using the last one.`);
        }

        let resolved = fallback;
        for (let i = 0; i < matches.length; i++) {
            const current = matches[i];
            const marker = (current.marker || '').trim();
            const markerStart = current.index + current.full.length - marker.length;

            if (marker.startsWith("[") || marker.startsWith("{")) {
                const openChar = marker[0];
                const closeChar = openChar === "[" ? "]" : "}";
                const literalEnd = findBalancedLiteralEnd(raw_json, markerStart, openChar, closeChar);

                if (literalEnd !== -1) {
                    const literalText = raw_json.slice(markerStart, literalEnd);
                    const parsedLiteral = parseStructuredLiteral(literalText);

                    if (parsedLiteral != null) {
                        let sectionEnd = literalEnd;
                        while (sectionEnd < raw_json.length && /\s/.test(raw_json[sectionEnd])) sectionEnd++;
                        if (raw_json[sectionEnd] === ';') sectionEnd++;

                        extractor.exclude(current.index, sectionEnd);
                        resolved = parsedLiteral;
                        continue;
                    }
                }
            }

            let endMarker = marker.startsWith("[") ? "]" : marker.startsWith("{") ? "}" : marker[0];
            if (marker.includes("JSON.parse")) endMarker = ");";

            const range = { start: -1, end: -1 };
            const parsed = extractJSON(raw_json, current.full, endMarker, null, null, false, fallback, range, current.index);

            if (range.start >= 0 && range.end > range.start) {
                extractor.exclude(range.start, range.end);
                resolved = parsed;
            }
        }

        return resolved;
    };

    const ensureUniqueAndStore = (container, obj) => {
        if (!obj || typeof obj !== 'object') return;
        obj.fields = obj.fields || {};

        let pkNum = Number(obj.pk);
        let needsRemap = !Number.isFinite(pkNum) || Math.abs(pkNum) > Number.MAX_SAFE_INTEGER;

        if (!needsRemap && (container instanceof Map ? container.has(pkNum) : (pkNum in container))) {
            const modelName = obj.model || "unknown";
            duplicateCounters.set(modelName, (duplicateCounters.get(modelName) || 0) + 1);
            needsRemap = true;
        }

        if (needsRemap) {
            let newPk = ++highest_pk;
            pkReplacements.set(obj.pk, newPk);
            obj.pk = newPk;
        } else {
            obj.pk = pkNum;
            if (pkNum > highest_pk && pkNum < Number.MAX_SAFE_INTEGER) highest_pk = Math.ceil(pkNum);
        }

        if (container instanceof Map) container.set(obj.pk, obj);
        else container[obj.pk] = obj;
    };

    const questions = new Map(), answers = {}, states = {}, feedbacks = {}, answer_score_globals = {},
        answer_score_issues = {}, answer_score_states = {}, state_issue_scores = {},
        candidate_issue_scores = {}, candidate_state_multipliers = {},
        running_mate_issue_scores = {}, issues = {};

    // fetch and store
    getSection("states_json").forEach(s => ensureUniqueAndStore(states, s));

    getSection("questions_json").forEach(q => {
        if (q?.fields?.description) q.fields.description = normalizeTextEncoding(q.fields.description);
        ensureUniqueAndStore(questions, q);
    });

    getSection("answers_json").forEach(a => {
        if (a?.fields?.description) a.fields.description = normalizeTextEncoding(a.fields.description);
        ensureUniqueAndStore(answers, a);
    });

    getSection("answer_feedback_json").forEach(f => {
        if (f?.fields?.answer_feedback) f.fields.answer_feedback = normalizeTextEncoding(f.fields.answer_feedback);
        ensureUniqueAndStore(feedbacks, f);
    });

    const collections = [
        [answer_score_globals, "answer_score_global_json"],
        [answer_score_issues, "answer_score_issue_json"],
        [answer_score_states, "answer_score_state_json"],
        [candidate_issue_scores, "candidate_issue_score_json"],
        [candidate_state_multipliers, "candidate_state_multiplier_json"],
        [running_mate_issue_scores, "running_mate_issue_score_json"],
        [state_issue_scores, "state_issue_score_json"],
        [issues, "issues_json"]
    ];

    collections.forEach(([cont, name]) => getSection(name).forEach(x => ensureUniqueAndStore(cont, x)));

    // patch foreign keys for remapped IDs
    if (pkReplacements.size > 0) {
        console.log(`Patching ${pkReplacements.size} ID references (duplicates/overflows)...`);
        const allContainers = [
            questions, answers, states, feedbacks, answer_score_globals, answer_score_issues,
            answer_score_states, state_issue_scores, candidate_issue_scores,
            candidate_state_multipliers, running_mate_issue_scores, issues
        ];
        const foreignKeyFields = ["question", "answer", "candidate", "issue", "state", "affected_candidate", "running_mate"];

        allContainers.forEach(container => {
            const values = container instanceof Map ? Array.from(container.values()) : Object.values(container);
            values.forEach(item => {
                if (!item.fields) return;
                foreignKeyFields.forEach(field => {
                    if (item.fields[field] !== undefined && pkReplacements.has(item.fields[field])) {
                        item.fields[field] = pkReplacements.get(item.fields[field]);
                    }
                });
            });
        });
    }

    // isolate jet_data
    let jet_data = getSection("jet_data", false, [{}])[0] || {};
    if (Object.keys(jet_data).length === 0) {
        let jIdx = raw_json.indexOf("campaignTrail_temp.jet_data = [");
        if (jIdx !== -1) {
            let segment = raw_json.substring(jIdx + 31);
            let lastBracket = segment.lastIndexOf("]");
            if (lastBracket !== -1) {
                extractor.exclude(jIdx, jIdx + 31 + lastBracket + 1);
                let rawObj = segment.substring(0, lastBracket).replace(/("(?:[^"\\]|\\.)*")|(\/\*[\s\S]*?\*\/)|(\/\/.*$)/gm, (m, str) => str ? str : "");
                try { jet_data = JSON.parse("[" + rawObj.replace(/,\s*([}\]])/g, "$1").replaceAll("\\'", "'") + "]")[0] || {}; } catch (e) { }
            }
        }
    }

    // inject fallback map - if logic is outdated
    if (!jet_data.mapping_enabled && (!jet_data.mapping_data || !jet_data.mapping_data.mapSvg)) {
        const mapInjectorMatch = raw_json.match(/_initCreateStates:function\(\)\{[^}]*?var\s+\w+\s*=\s*(\{[\s\S]+?\});/);
        if (mapInjectorMatch) {
            const pathRegex = /(?:["']([\w\s\.-]+)["']|([\w\s\.-]+))\s*:\s*"([^"]+)"/g;
            let pathMatch, svgPaths = [];
            while ((pathMatch = pathRegex.exec(mapInjectorMatch[1])) !== null) {
                svgPaths.push(`<path id="${pathMatch[1] || pathMatch[2]}" d="${pathMatch[3]}" />`);
            }
            if (svgPaths.length > 0) {
                let viewBox = "0 0 960 600";
                const vbOffsets = raw_json.match(/this\.paper\.setViewBox\(([\d\.-]+),([\d\.-]+)/);
                if (vbOffsets) {
                    const dimsMatch = raw_json.match(/var\s+o=(\d+),u=(\d+)/);
                    viewBox = `${vbOffsets[1]} ${vbOffsets[2]} ${dimsMatch ? '1100 ' + dimsMatch[2] : '1000 600'}`;
                }
                jet_data.mapping_data = { mapSvg: `<svg viewBox="${viewBox}">${svgPaths.join("")}</svg>` };
                jet_data.mapping_enabled = true;
            }
        }
    }

    // exclude markers
    extractor.excludeRegex(/\/\/\s*#\s*(start|end)code/gi);
    extractor.excludeRegex(/\/\/\s*Generated mapping code[\s\S]*?\}\)\(jQuery,document,window,Raphael\)\s*;?/gi);
    extractor.excludeRegex(/\(function\(e,t,n,r,i\)\{[\s\S]*?s\(e,"usmap",l,c\)\}\)\(jQuery,document,window,Raphael\)\s*;?/gi);
    // keep manual banner assignments in custom code unless the banner module is enabled
    if (jet_data.banner_enabled) {
        extractor.excludeRegex(/campaignTrail_temp\.(candidate_image_url|running_mate_image_url|candidate_last_name|running_mate_last_name|running_mate_state_id)\s*=\s*(?:(["']).*?\2|\d+)\s*;/g);
    }
    extractor.excludeRegex(/\/\/\s*\[JETS_ENDINGS_START\][\s\S]*?\/\/\s*\[JETS_ENDINGS_END\]/g);
    excludeAllButLastRegex(/campaignTrail_temp\.multiple_endings\s*=\s*true\s*;?/gi);
    excludeArrowFunctionAssignmentsButKeepLast("endingPicker");

    // ta-da!
    jet_data.code_to_add = extractor.getRemainingCode();
    jet_data.nicknames = jet_data.nicknames || {};
    jet_data.banner_data = jet_data.banner_data || {};
    jet_data.mapping_data = jet_data.mapping_data || {};

    duplicateCounters.forEach((count, label) => count > 0 && console.log(`Remapped ${count} duplicates in ${label}`));

    return new TCTData(questions, answers, issues, state_issue_scores, candidate_issue_scores, running_mate_issue_scores, candidate_state_multipliers, answer_score_globals, answer_score_issues, answer_score_states, feedbacks, states, highest_pk, jet_data);
}

