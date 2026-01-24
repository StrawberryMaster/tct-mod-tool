"use strict";
const DEBUG = false;

// https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
function cyrb128(str) {
    let h1 = 1779033703, h2 = 3144134277,
        h3 = 1013904242, h4 = 2773480762;
    for (let i = 0, k; i < str.length; i++) {
        k = str.charCodeAt(i);
        h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
        h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
        h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
        h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    h1 ^= (h2 ^ h3 ^ h4), h2 ^= h1, h3 ^= h1, h4 ^= h1;
    return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

function sfc32(a, b, c, d) {
    return function () {
        a |= 0; b |= 0; c |= 0; d |= 0;
        var t = (a + b | 0) + d | 0;
        d = d + 1 | 0;
        a = b ^ b >>> 9;
        b = c + (c << 3) | 0;
        c = (c << 21 | c >>> 11);
        c = c + t | 0;
        return (t >>> 0) / 4294967296;
    }
}

// Small tuning constants for clarity
const RUNNING_MATE_STATE_BOOST = 0.004;
const VISIT_STATE_BOOST = 0.005;

// Optional seed helpers for determinism control
function setSeedString(str) {
    seed = cyrb128(str);
    rand = sfc32(seed[0], seed[1], seed[2], seed[3]);
}

let seed = cyrb128("wallave");
let rand = sfc32(seed[0], seed[1], seed[2], seed[3]);

let global_parameter = [
    {
        "model": "campaign_trail.global_parameter",
        "pk": 1,
        "fields": {
            "vote_variable": 1.125,
            "max_swing": 0.12,
            "start_point": 0.94,
            "candidate_issue_weight": 10,
            "running_mate_issue_weight": 3,
            "issue_stance_1_max": -0.71,
            "issue_stance_2_max": -0.3,
            "issue_stance_3_max": -0.125,
            "issue_stance_4_max": 0.125,
            "issue_stance_5_max": 0.3,
            "issue_stance_6_max": 0.71,
            "global_variance": 0.01,
            "state_variance": 0.005,
            "question_count": 25,
            "default_map_color_hex": "#C9C9C9",
            "no_state_map_color_hex": "#999999"
        }
    }
]

const VARIANCE = global_parameter[0].fields.global_variance;

function getCurrentVoteResults(e) {
    // reset RNG state
    rand = sfc32(seed[0], seed[1], seed[2], seed[3]);

    // cache globals to avoid repeated deep access
    const GLOBALS = global_parameter[0].fields;
    const VOTE_VARIABLE = GLOBALS.vote_variable;
    const CAND_ISSUE_WT = GLOBALS.candidate_issue_weight;
    const MATE_ISSUE_WT = GLOBALS.running_mate_issue_weight;

    const t = 1;
    const rawCandidates = getListOfCandidates();
    const candidates = [];
    for (let i = 0; i < rawCandidates.length; i++) {
        candidates.push(rawCandidates[i][0]);
    }

    e.player_visits = e.player_visits || [];

    // fix question count
    if (e.questions) {
        GLOBALS.question_count = e.questions.size ?? e.questions.length ?? GLOBALS.question_count;
    }

    // index answer global scores: Map<"answer_cand_affected", multiplier>
    const answerScoreGlobalMap = new Map();
    const answerScoreGlobalList = e.answer_score_global;
    for (let i = 0; i < answerScoreGlobalList.length; i++) {
        const f = answerScoreGlobalList[i].fields;
        answerScoreGlobalMap.set(`${f.answer}_${f.candidate}_${f.affected_candidate}`, f.global_multiplier);
    }

    // index running mate scores: Map<issueId, score>
    const rmIssueScoreMap = new Map();
    const rmScoresRaw = Object.values(e.running_mate_issue_score);
    for (let i = 0; i < rmScoresRaw.length; i++) {
        rmIssueScoreMap.set(rmScoresRaw[i].fields.issue, rmScoresRaw[i].fields.issue_score);
    }

    // index answer issue scores: Map<issueId, Array<{answer, score, importance}>>
    const answerIssueMap = new Map();
    for (let i = 0; i < e.answer_score_issue.length; i++) {
        const f = e.answer_score_issue[i].fields;
        if (!answerIssueMap.has(f.issue)) answerIssueMap.set(f.issue, []);
        answerIssueMap.get(f.issue).push(f);
    }

    // index answer state scores: Map<stateId, Array<{answer, multiplier, cand, affected}>>
    const answerStateMap = new Map();
    for (let i = 0; i < e.answer_score_state.length; i++) {
        const f = e.answer_score_state[i].fields;
        if (!answerStateMap.has(f.state)) answerStateMap.set(f.state, []);
        answerStateMap.get(f.state).push(f);
    }

    // index state issue scores: Map<stateId_issueId, {score, weight}>
    const stateIssueScoreMap = new Map();
    const stateIssueScoresList = Object.values(e.state_issue_scores);
    for (let i = 0; i < stateIssueScoresList.length; i++) {
        const f = stateIssueScoresList[i].fields;
        stateIssueScoreMap.set(`${f.state}_${f.issue}`, { score: f.state_issue_score, weight: f.weight });
    }

    // group candidate state multipliers by candidate
    const csmByCandidate = new Map();
    const csmList = Object.values(e.candidate_state_multiplier);
    for (let i = 0; i < csmList.length; i++) {
        const f = csmList[i].fields;
        if (!csmByCandidate.has(f.candidate)) csmByCandidate.set(f.candidate, []);
        csmByCandidate.get(f.candidate).push(f);
    }

    const states = Object.values(e.states);
    const visitMap = new Set(e.player_visits);
    const playerAnswers = e.player_answers || [];

    // calculate global multipliers per candidate
    const s = candidates.map((candidate) => {
        let l = 0;
        for (let j = 0; j < playerAnswers.length; j++) {
            const key = `${playerAnswers[j]}_${e.candidate_id}_${candidate}`;
            const mult = answerScoreGlobalMap.get(key);
            if (mult !== undefined) l += mult;
        }

        const o = (candidate === e.candidate_id && l < -0.4) ? 0.6 : 1 + l;

        let c;
        if (candidate === e.candidate_id) {
            c = o * (1 + F(candidate) * VARIANCE) * e.difficulty_level_multiplier;
        } else {
            c = o * (1 + F(candidate) * VARIANCE);
        }

        return {
            candidate,
            global_multiplier: isNaN(c) ? 1 : c,
        };
    });

    // calculate issue scores per candidate
    const u = candidates.map((candidate) => {
        const v = Object.values(e.candidate_issue_score)
            .filter((item) => item.fields.candidate === candidate)
            .map((item) => ({
                issue: item.fields.issue,
                issue_score: item.fields.issue_score,
            }));

        return {
            candidate_id: candidate,
            issue_scores: removeIssueDuplicates(v),
        };
    });

    // process state multipliers
    const f = [];
    for (let a = 0; a < candidates.length; a++) {
        const candidateId = candidates[a];
        const m = [];

        const candMultipliers = csmByCandidate.get(candidateId) || [];

        for (let r = 0; r < candMultipliers.length; r++) {
            const field = candMultipliers[r];
            const p = field.state_multiplier *
                s[a].global_multiplier *
                (1 + F(candidateId) * VARIANCE);

            m.push({ state: field.state, state_multiplier: p });
            if (m.length === states.length) break;
        }
        P(m, "state");
        f.push({ candidate_id: candidateId, state_multipliers: m });
    }

    // adjust issue scores for candidate 0
    const issueScores0 = u[0].issue_scores;
    for (let a = 0; a < issueScores0.length; a++) {
        const issueId = issueScores0[a].issue;
        const rmScore = rmIssueScoreMap.get(issueId) ?? 0;

        let g = 0, b = 0;

        const relevantIssueAnswers = answerIssueMap.get(issueId);
        if (relevantIssueAnswers) {
            for (let d = 0; d < relevantIssueAnswers.length; d++) {
                const ria = relevantIssueAnswers[d];
                if (playerAnswers.includes(ria.answer)) {
                    g += ria.issue_score * ria.issue_importance;
                    b += ria.issue_importance;
                }
            }
        }

        issueScores0[a].issue_score =
            (issueScores0[a].issue_score * CAND_ISSUE_WT +
                rmScore * MATE_ISSUE_WT + g) /
            (CAND_ISSUE_WT + MATE_ISSUE_WT + b);
    }

    // adjust state multipliers based on answers & visits
    const visitMult = e.shining_data?.visit_multiplier ?? 1;

    for (let a = 0; a < candidates.length; a++) {
        const multipliers = f[a].state_multipliers;
        for (let r = 0; r < multipliers.length; r++) {
            const stateId = multipliers[r].state;
            let w = 0;

            const relevantStateAnswers = answerStateMap.get(stateId);
            if (relevantStateAnswers) {
                for (let j = 0; j < relevantStateAnswers.length; j++) {
                    const rsa = relevantStateAnswers[j];
                    if (rsa.candidate == e.candidate_id &&
                        rsa.affected_candidate == candidates[a] &&
                        playerAnswers.includes(rsa.answer)) {
                        w += rsa.state_multiplier;
                    }
                }
            }

            if (a === 0) {
                if (e.running_mate_state_id == stateId) {
                    w += RUNNING_MATE_STATE_BOOST * multipliers[r].state_multiplier;
                }
                if (visitMap.has(stateId)) {
                    w += VISIT_STATE_BOOST * Math.max(0.1, multipliers[r].state_multiplier) * visitMult;
                }
            }
            multipliers[r].state_multiplier += w;
        }
    }

    // calculate state results
    const y = [];
    const baseMultipliers = f[0].state_multipliers;

    const cachedIssueScores = u.map(c => c.issue_scores);

    for (let a = 0; a < baseMultipliers.length; a++) {
        const stateId = baseMultipliers[a].state;
        const k = [];

        for (let r = 0; r < candidates.length; r++) {
            let $ = 0;
            const cIssues = cachedIssueScores[r];

            for (let d = 0; d < cIssues.length; d++) {
                const issueId = cIssues[d].issue;
                const scoreObj = stateIssueScoreMap.get(`${stateId}_${issueId}`);

                let T = 0, A = 1;
                if (scoreObj) {
                    T = scoreObj.score;
                    A = scoreObj.weight;
                }

                const iscore = cIssues[d].issue_score;
                const S = iscore * Math.abs(iscore); // equivalent to signed square
                const E = T * Math.abs(T);

                $ += VOTE_VARIABLE - Math.abs((S - E) * A);
            }

            // find state multiplier index
            let stateMult = 0;
            const candStateList = f[r].state_multipliers;
            if (candStateList[a] && candStateList[a].state === stateId) {
                stateMult = candStateList[a].state_multiplier;
            } else {
                const match = candStateList.find(sm => sm.state == stateId);
                if (match) stateMult = match.state_multiplier;
            }

            $ *= stateMult;
            $ = Math.max($, 0);
            k.push({ candidate: candidates[r], result: $ });
        }
        y.push({ state: stateId, result: k });
    }

    // add state abbreviations
    const stateAbbrMap = new Map();
    const statePkMap = new Map(); // for getting state object by PK later
    for (const st of states) {
        stateAbbrMap.set(st.pk, st.fields.abbr);
        statePkMap.set(st.pk, st);
    }

    for (let a = 0; a < y.length; a++) {
        y[a].abbr = stateAbbrMap.get(y[a].state);
    }

    // distribute votes
    for (let a = 0; a < y.length; a++) {
        const stateObj = statePkMap.get(y[a].state);
        let M = 0;
        if (stateObj) {
            M = Math.floor(stateObj.fields.popular_votes * (0.95 + 0.1 * rand()));
        }

        let x = 0;
        for (let r = 0; r < y[a].result.length; r++) x += y[a].result[r].result;

        // avoid division by zero
        const totalInv = x === 0 ? 0 : 1 / x;

        for (let r = 0; r < y[a].result.length; r++) {
            const N = y[a].result[r].result * totalInv;
            y[a].result[r].percent = N;
            y[a].result[r].votes = Math.floor(N * M);
        }
    }

    // assign electoral votes
    for (let a = 0; a < y.length; a++) {
        const stateObj = statePkMap.get(y[a].state);
        if (!stateObj) continue;

        let O = 0;
        // sort results by percent descending
        P(y[a].result, "percent");
        y[a].result.reverse();

        O = stateObj.fields.electoral_votes;

        if ("1" == e.game_type_id || "3" == e.game_type_id) {
            if (1 == stateObj.fields.winner_take_all_flg) {
                for (let r = 0; r < y[a].result.length; r++) {
                    y[a].result[r].electoral_votes = (r === 0) ? O : 0;
                }
            } else {
                let H = 0;
                for (let r = 0; r < y[a].result.length; r++) H += y[a].result[r].votes;

                const L = Math.ceil(y[a].result[0].votes / H * O * 1.25);
                const D = O - L;
                for (let r = 0; r < y[a].result.length; r++) {
                    y[a].result[r].electoral_votes = (r === 0) ? L : (r === 1 ? D : 0);
                }
            }
        }
        if ("2" == e.game_type_id) {
            const V = [];
            for (let r = 0; r < y[a].result.length; r++) V.push(y[a].result[r].percent);
            const q = divideElectoralVotesProp(V, O);
            for (let r = 0; r < y[a].result.length; r++) y[a].result[r].electoral_votes = q[r];
        }
    }

    // primary states override
    if (e.primary_states) {
        const primaryStates = JSON.parse(e.primary_states);
        const primaryMap = new Map();
        for (const p of primaryStates) primaryMap.set(p.state, p.result);

        for (let idx = 0; idx < y.length; idx++) {
            if (primaryMap.has(y[idx].state)) {
                y[idx].result = primaryMap.get(y[idx].state);
            }
        }
    }

    if (t === 1) return y;

    if (t === 2) {
        for (let a = 0; a < y.length; a++) {
            for (let r = 0; r < y[a].result.length; r++) {
                const G = 1 + F(y[a].result[r].candidate) * VARIANCE;
                y[a].result[r].result *= G;
            }
            const stateObj = statePkMap.get(y[a].state);
            let M = 0;
            if (stateObj) {
                M = Math.floor(stateObj.fields.popular_votes * (0.95 + 0.1 * rand()));
            }
            let x = 0;
            for (let r = 0; r < y[a].result.length; r++) x += y[a].result[r].result;
            const totalInv = x === 0 ? 0 : 1 / x;
            for (let r = 0; r < y[a].result.length; r++) {
                const N = y[a].result[r].result * totalInv;
                y[a].result[r].percent = N;
                y[a].result[r].votes = Math.floor(N * M);
            }
        }
        return y;
    }
}

function R(states, pk) {
    return states.findIndex(s => s.pk == pk);
}

// Box-Muller with caching
function F() {
    // check if we have a cached spare value from the previous call
    if (F.spare !== null) {
        const val = F.spare;
        F.spare = null;
        return val;
    }

    let u, v, s;
    do {
        u = 2 * rand() - 1;
        v = 2 * rand() - 1;
        s = u * u + v * v;
    } while (s >= 1 || s == 0);

    const mul = Math.sqrt(-2 * Math.log(s) / s);
    F.spare = v * mul; // Cache the second value
    return u * mul;
}
F.spare = null; // initialize cache property

function P(e, t) {
    return e.sort(function (e, i) {
        var a = e[t],
            s = i[t];
        return a < s ? -1 : a > s ? 1 : 0
    })
}

function removeIssueDuplicates(array) {
    const seen = new Set();
    const out = [];
    for (let i = 0; i < array.length; i++) {
        if (!seen.has(array[i].issue)) {
            seen.add(array[i].issue);
            out.push(array[i]);
        }
    }
    return out;
}