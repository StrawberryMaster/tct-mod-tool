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
    rand = sfc32(seed[0], seed[1], seed[2], seed[3]);
    // use a constant, code below keeps the branch behavior intact
    const t = 1;
    const raw = getListOfCandidates();
    const i = [];
    for (const combo of raw) {
        i.push(combo[0]);
    }
    // declare locally (strict mode)
    let r;

    e.player_visits = [];
    // tolerate questions being a Set or an Array or absent
    global_parameter[0].fields.question_count =
        e.questions?.size ?? e.questions?.length ?? global_parameter[0].fields.question_count;

    let running_mate_issue_score = Object.values(e.running_mate_issue_score);
    let state_issue_score = Object.values(e.state_issue_scores);
    let states = Object.values(e.states);

    const s = i.map((candidate) => {
        e.player_answers = [];
        const n = e.player_answers.reduce((acc, answer) => {
            const score = e.answer_score_global.find(
                (item) =>
                    item.fields.answer === answer &&
                    item.fields.candidate === e.candidate_id &&
                    item.fields.affected_candidate === candidate
            );
            if (score) {
                acc.push(score.fields.global_multiplier);
            }
            return acc;
        }, []);

        const l = n.reduce((acc, score) => acc + score, 0);
        const o =
            candidate === e.candidate_id && l < -0.4
                ? 0.6
                : 1 + l;
        const c =
            candidate === e.candidate_id
                ? o * (1 + F(candidate) * VARIANCE) * e.difficulty_level_multiplier
                : o * (1 + F(candidate) * VARIANCE);
        const _ = isNaN(c) ? 1 : c;

        return {
            candidate,
            global_multiplier: _,
        };
    });


    const u = i.map((candidate) => {
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

    const f = [];
    let candidate_state_multiplier = Object.values(e.candidate_state_multiplier);
    for (let a = 0; a < i.length; a++) {
        const m = [];
        for (let r = 0; r < candidate_state_multiplier.length; r++) {
            if (candidate_state_multiplier[r].fields.candidate == i[a]) {
                const p =
                    candidate_state_multiplier[r].fields.state_multiplier *
                    s[a].global_multiplier *
                    (1 + F(candidate_state_multiplier[r].fields.candidate) * VARIANCE);
                if (m.push({ state: candidate_state_multiplier[r].fields.state, state_multiplier: p }), m.length == states.length) break;
                P(m, "state");
            }
        }
        f.push({ candidate_id: i[a], state_multipliers: m });
    }

    for (let a = 0; a < u[0].issue_scores.length; a++) {
        const h = running_mate_issue_score.findIndex(
            (x) => x.fields.issue == u[0].issue_scores[a].issue
        );
        let g = 0, b = 0;
        for (let r = 0; r < e.player_answers.length; r++)
            for (let d = 0; d < e.answer_score_issue.length; d++)
                e.answer_score_issue[d].fields.issue == u[0].issue_scores[a].issue &&
                    e.answer_score_issue[d].fields.answer == e.player_answers[r] &&
                    (g += e.answer_score_issue[d].fields.issue_score * e.answer_score_issue[d].fields.issue_importance,
                        b += e.answer_score_issue[d].fields.issue_importance);

        const rmScore = h >= 0 ? running_mate_issue_score[h].fields.issue_score : 0;
        u[0].issue_scores[a].issue_score =
            (u[0].issue_scores[a].issue_score * global_parameter[0].fields.candidate_issue_weight +
                rmScore * global_parameter[0].fields.running_mate_issue_weight + g) /
            (global_parameter[0].fields.candidate_issue_weight +
                global_parameter[0].fields.running_mate_issue_weight + b);
    }

    for (let a = 0; a < i.length; a++)
        for (let r = 0; r < f[a].state_multipliers.length; r++) {
            let w = 0;
            for (let d = 0; d < e.player_answers.length; d++)
                for (let j = 0; j < e.answer_score_state.length; j++)
                    e.answer_score_state[j].fields.state == f[a].state_multipliers[r].state &&
                        e.answer_score_state[j].fields.answer == e.player_answers[d] &&
                        e.answer_score_state[j].fields.candidate == e.candidate_id &&
                        e.answer_score_state[j].fields.affected_candidate == i[a] &&
                        (w += e.answer_score_state[j].fields.state_multiplier);

            if (a === 0) {
                e.running_mate_state_id == f[a].state_multipliers[r].state &&
                    (w += RUNNING_MATE_STATE_BOOST * f[a].state_multipliers[r].state_multiplier);
                for (let d = 0; d < e.player_visits.length; d++)
                    e.player_visits[d] == f[a].state_multipliers[r].state &&
                        (w += VISIT_STATE_BOOST * Math.max(.1, f[a].state_multipliers[r].state_multiplier) * (e.shining_data.visit_multiplier ?? 1));
            }
            f[a].state_multipliers[r].state_multiplier += w;
        }

    const y = [];
    for (let a = 0; a < f[0].state_multipliers.length; a++) {
        const k = [];
        for (let r = 0; r < i.length; r++) {
            let $ = 0;
            for (let d = 0; d < u[r].issue_scores.length; d++) {
                let T = 0, A = 1;
                for (let j = 0; j < state_issue_score.length; j++) {
                    if (state_issue_score[j].fields.state == f[0].state_multipliers[a].state &&
                        state_issue_score[j].fields.issue == u[0].issue_scores[d].issue) {
                        T = state_issue_score[j].fields.state_issue_score;
                        A = state_issue_score[j].fields.weight;
                        break;
                    }
                }
                const S = u[r].issue_scores[d].issue_score * Math.abs(u[r].issue_scores[d].issue_score);
                const E = T * Math.abs(T);
                $ += global_parameter[0].fields.vote_variable - Math.abs((S - E) * A);
            }

            const C = f[r].state_multipliers.findIndex(
                (sm) => sm.state == f[0].state_multipliers[a].state
            );
            if (C === -1) continue; // guard

            if (DEBUG) {
                console.log(`From key ${r} into f, trying to get state multiplier index ${C}`);
                console.log(f[r].state_multipliers[C]);
            }

            $ *= f[r].state_multipliers[C].state_multiplier;
            $ = Math.max($, 0);
            k.push({ candidate: i[r], result: $ });
        }
        y.push({ state: f[0].state_multipliers[a].state, result: k });
    }

    for (let a = 0; a < y.length; a++)
        for (let r = 0; r < states.length; r++)
            if (y[a].state == states[r].pk) {
                y[a].abbr = states[r].fields.abbr;
                break;
            }

    for (let a = 0; a < y.length; a++) {
        let M = 0;
        for (let r = 0; r < states.length; r++)
            if (states[r].pk == y[a].state) {
                M = Math.floor(states[r].fields.popular_votes * (.95 + .1 * rand()));
                break;
            }
        let x = 0;
        for (let r = 0; r < y[a].result.length; r++) x += y[a].result[r].result;
        for (let r = 0; r < y[a].result.length; r++) {
            const N = y[a].result[r].result / x;
            y[a].result[r].percent = N;
            y[a].result[r].votes = Math.floor(N * M);
        }
    }

    for (let a = 0; a < y.length; a++) {
        const I = R(states, y[a].state);
        let O = 0;
        if (P(y[a].result, "percent"), y[a].result.reverse(), O = states[I].fields.electoral_votes, ("1" == e.game_type_id || "3" == e.game_type_id)) {
            if (1 == states[I].fields.winner_take_all_flg)
                for (let r = 0; r < y[a].result.length; r++) y[a].result[r].electoral_votes = 0 == r ? O : 0;
            else {
                O = states[I].fields.electoral_votes;
                let H = 0;
                for (let r = 0; r < y[a].result.length; r++) H += y[a].result[r].votes;
                const L = Math.ceil(y[a].result[0].votes / H * O * 1.25);
                const D = O - L;
                for (let r = 0; r < y[a].result.length; r++) y[a].result[r].electoral_votes = 0 == r ? L : 1 == r ? D : 0;
            }
        }
        if ("2" == e.game_type_id) {
            const V = [];
            for (let r = 0; r < y[a].result.length; r++) V.push(y[a].result[r].percent);
            const q = divideElectoralVotesProp(V, O);
            for (let r = 0; r < y[a].result.length; r++) y[a].result[r].electoral_votes = q[r];
        }
    }

    if (e.primary_states) {
        const primaryStates = JSON.parse(e.primary_states);
        const primM = primaryStates.slice().map(f => f.state);
        for (let idx = 0; idx < y.length; idx++) {
            if (primM.includes(y[idx].state)) {
                const indexOfed = primM.findIndex(state => state === y[idx].state);
                y[idx].result = primaryStates[indexOfed].result;
            }
        }
    }

    if (1 == t) return y;
    if (2 == t) {
        for (let a = 0; a < y.length; a++) {
            for (let r = 0; r < y[a].result.length; r++) {
                const G = 1 + F(y[a].result[r].candidate) * VARIANCE;
                y[a].result[r].result *= G;
            }
            let M = 0;
            for (let r = 0; r < states.length; r++)
                if (states[r].pk == y[a].state) { M = Math.floor(states[r].fields.popular_votes * (.95 + .1 * rand())); break; }
            let x = 0;
            for (let r = 0; r < y[a].result.length; r++) x += y[a].result[r].result;
            for (let r = 0; r < y[a].result.length; r++) {
                const N = y[a].result[r].result / x;
                y[a].result[r].percent = N; y[a].result[r].votes = Math.floor(N * M);
            }
        }
        return y;
    }
}

function R(states, pk) {
    return states.findIndex(s => s.pk == pk);
}

function F() {
    var e, t, i;
    do {
        i = (e = 2 * rand() - 1) * e + (t = 2 * rand() - 1) * t
    } while (i >= 1 || 0 == i);
    return e * Math.sqrt(-2 * Math.log(i) / i)
}

function P(e, t) {
    return e.sort(function (e, i) {
        var a = e[t],
            s = i[t];
        return a < s ? -1 : a > s ? 1 : 0
    })
}

function removeIssueDuplicates(array) {
    const seen = new Set();
    return array.filter(item => {
        if (seen.has(item.issue)) return false;
        seen.add(item.issue);
        return true;
    });
}