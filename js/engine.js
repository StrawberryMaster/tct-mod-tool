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

function splitEVTopTwo(totalEV, topVotes, totalVotes) {
    if (!Number.isFinite(totalEV) || totalEV <= 0) return [0, 0];
    if (!Number.isFinite(topVotes) || !Number.isFinite(totalVotes) || totalVotes <= 0) {
        return [totalEV, 0];
    }

    let winnerEV = Math.round((topVotes / totalVotes) * totalEV);
    winnerEV = Math.max(0, Math.min(totalEV, winnerEV));
    return [winnerEV, totalEV - winnerEV];
}

function getCurrentVoteResults(data) {
    // reset RNG state for deterministic results
    rand = sfc32(seed[0], seed[1], seed[2], seed[3]);

    // cache globals to avoid repeated deep access
    const globals = global_parameter[0].fields;
    const voteVariable = globals.vote_variable;
    const candIssueWeight = globals.candidate_issue_weight;
    const mateIssueWeight = globals.running_mate_issue_weight;

    const rawCandidates = getListOfCandidates();
    const candidates = [];
    for (let i = 0; i < rawCandidates.length; i++) {
        candidates.push(rawCandidates[i][0]);
    }

    const playerVisits = data.player_visits || [];

    // fix question count
    if (data.questions) {
        globals.question_count = data.questions.size ?? data.questions.length ?? globals.question_count;
    }

    // index answer global scores: Map<"answer_cand_affected", multiplier>
    const answerScoreGlobalMap = new Map();
    const answerScoreGlobalList = data.answer_score_global;
    for (let i = 0; i < answerScoreGlobalList.length; i++) {
        const f = answerScoreGlobalList[i].fields;
        answerScoreGlobalMap.set(`${f.answer}_${f.candidate}_${f.affected_candidate}`, f.global_multiplier);
    }

    // index running mate issue scores: Map<issueId, score>
    const rmIssueScoreMap = new Map();
    const rmScoresRaw = Object.values(data.running_mate_issue_score);
    for (let i = 0; i < rmScoresRaw.length; i++) {
        rmIssueScoreMap.set(rmScoresRaw[i].fields.issue, rmScoresRaw[i].fields.issue_score);
    }

    // index answer issue scores: Map<issueId, Array<{answer, score, importance}>>
    const answerIssueMap = new Map();
    for (let i = 0; i < data.answer_score_issue.length; i++) {
        const f = data.answer_score_issue[i].fields;
        if (!answerIssueMap.has(f.issue)) answerIssueMap.set(f.issue, []);
        answerIssueMap.get(f.issue).push(f);
    }

    // index answer state scores as aggregate lookup keyed by state/answer/affected candidate
    const answerStateAgg = new Map();
    for (let i = 0; i < data.answer_score_state.length; i++) {
        const f = data.answer_score_state[i].fields;
        if (f.candidate !== data.candidate_id) continue;
        const key = `${f.state}|${f.answer}|${f.affected_candidate}`;
        answerStateAgg.set(key, (answerStateAgg.get(key) || 0) + f.state_multiplier);
    }

    // index state issue scores: Map<stateId_issueId, {score, weight}>
    const stateIssueScoreMap = new Map();
    const stateIssueScoresList = Object.values(data.state_issue_scores);
    for (let i = 0; i < stateIssueScoresList.length; i++) {
        const f = stateIssueScoresList[i].fields;
        stateIssueScoreMap.set(`${f.state}_${f.issue}`, { score: f.state_issue_score, weight: f.weight });
    }

    // group candidate state multipliers by candidate
    const csmByCandidate = new Map();
    const csmList = Object.values(data.candidate_state_multiplier);
    for (let i = 0; i < csmList.length; i++) {
        const f = csmList[i].fields;
        if (!csmByCandidate.has(f.candidate)) csmByCandidate.set(f.candidate, []);
        csmByCandidate.get(f.candidate).push(f);
    }

    const states = Object.values(data.states);
    const visitCountByState = new Map();
    for (let i = 0; i < playerVisits.length; i++) {
        const st = playerVisits[i];
        visitCountByState.set(st, (visitCountByState.get(st) || 0) + 1);
    }
    const playerAnswers = data.player_answers || [];

    // calculate global multipliers per candidate
    const globalResults = candidates.map((candidate) => {
        let globalSum = 0;
        for (let j = 0; j < playerAnswers.length; j++) {
            const key = `${playerAnswers[j]}_${data.candidate_id}_${candidate}`;
            const mult = answerScoreGlobalMap.get(key);
            if (mult !== undefined) globalSum += mult;
        }

        const adjustedMult = (candidate === data.candidate_id && globalSum < -0.4) ? 0.6 : 1 + globalSum;

        let finalMult;
        if (candidate === data.candidate_id) {
            finalMult = adjustedMult * (1 + gaussianNoise() * VARIANCE) * data.difficulty_level_multiplier;
        } else {
            finalMult = adjustedMult * (1 + gaussianNoise() * VARIANCE);
        }

        return {
            candidate,
            global_multiplier: isNaN(finalMult) ? 1 : finalMult,
        };
    });

    // calculate issue scores per candidate
    const candidateIssues = candidates.map((candidate) => {
        const rawScores = Object.values(data.candidate_issue_score)
            .filter((item) => item.fields.candidate === candidate)
            .map((item) => ({
                issue: item.fields.issue,
                issue_score: item.fields.issue_score,
            }));

        return {
            candidate_id: candidate,
            issue_scores: removeIssueDuplicates(rawScores),
        };
    });

    // scale state multipliers by global multiplier and variance
    const stateMultResults = [];
    for (let cIdx = 0; cIdx < candidates.length; cIdx++) {
        const candidateId = candidates[cIdx];
        const stateMults = [];

        const candMultipliers = csmByCandidate.get(candidateId) || [];

        for (let smIdx = 0; smIdx < candMultipliers.length; smIdx++) {
            const sm = candMultipliers[smIdx];
            const scaledMult = sm.state_multiplier *
                globalResults[cIdx].global_multiplier *
                (1 + gaussianNoise() * VARIANCE);

            stateMults.push({ state: sm.state, state_multiplier: scaledMult });
            if (stateMults.length === states.length) break;
        }
        stateMults.sort((x, y) => x.state - y.state);
        stateMultResults.push({ candidate_id: candidateId, state_multipliers: stateMults });
    }

    // blend running mate issue scores & answer issue scores into the player candidate
    const playerIssueScores = candidateIssues[0].issue_scores;
    for (let iIdx = 0; iIdx < playerIssueScores.length; iIdx++) {
        const issueId = playerIssueScores[iIdx].issue;
        const rmScore = rmIssueScoreMap.get(issueId) ?? 0;

        let answerSum = 0, importanceSum = 0;

        const relevantIssueAnswers = answerIssueMap.get(issueId);
        if (relevantIssueAnswers) {
            for (let aiIdx = 0; aiIdx < relevantIssueAnswers.length; aiIdx++) {
                const answerIssue = relevantIssueAnswers[aiIdx];
                if (playerAnswers.includes(answerIssue.answer)) {
                    answerSum += answerIssue.issue_score * answerIssue.issue_importance;
                    importanceSum += answerIssue.issue_importance;
                }
            }
        }

        playerIssueScores[iIdx].issue_score =
            (playerIssueScores[iIdx].issue_score * candIssueWeight +
                rmScore * mateIssueWeight + answerSum) /
            (candIssueWeight + mateIssueWeight + importanceSum);
    }

    // adjust state multipliers based on answers & visits
    const visitMult = data.shining_data?.visit_multiplier ?? 1;

    for (let cIdx = 0; cIdx < candidates.length; cIdx++) {
        const stateMults = stateMultResults[cIdx].state_multipliers;
        for (let smIdx = 0; smIdx < stateMults.length; smIdx++) {
            const stateId = stateMults[smIdx].state;
            let adjustment = 0;

            for (let j = 0; j < playerAnswers.length; j++) {
                const answer = playerAnswers[j];
                adjustment += answerStateAgg.get(`${stateId}|${answer}|${candidates[cIdx]}`) || 0;
            }

            if (cIdx === 0) {
                if (data.running_mate_state_id == stateId) {
                    adjustment += RUNNING_MATE_STATE_BOOST * stateMults[smIdx].state_multiplier;
                }
                const visits = visitCountByState.get(stateId) || 0;
                if (visits > 0) {
                    adjustment += visits * VISIT_STATE_BOOST * Math.max(0.1, stateMults[smIdx].state_multiplier) * visitMult;
                }
            }
            stateMults[smIdx].state_multiplier += adjustment;
        }
    }

    // calculate state results from candidate issue alignment
    const stateResults = [];
    const playerStateMults = stateMultResults[0].state_multipliers;

    const issueScoresByCandidate = candidateIssues.map((c) => c.issue_scores);
    const playerIssueIds = (issueScoresByCandidate[0] || []).map((it) => it.issue);

    for (let sIdx = 0; sIdx < playerStateMults.length; sIdx++) {
        const stateId = playerStateMults[sIdx].state;
        const candidateResults = [];

        for (let cIdx = 0; cIdx < candidates.length; cIdx++) {
            let total = 0;
            const candIssueScores = issueScoresByCandidate[cIdx];

            for (let iIdx = 0; iIdx < candIssueScores.length; iIdx++) {
                const issueId = candIssueScores[iIdx].issue;
                const refIssueId = playerIssueIds[iIdx] ?? issueId;
                const stateIssue = stateIssueScoreMap.get(`${stateId}_${refIssueId}`);

                let stateScore = 0, stateWeight = 1;
                if (stateIssue) {
                    stateScore = stateIssue.score;
                    stateWeight = stateIssue.weight;
                }

                const candScore = candIssueScores[iIdx].issue_score;
                const candScoreSq = candScore * Math.abs(candScore); // signed square
                const stateScoreSq = stateScore * Math.abs(stateScore);

                total += voteVariable - Math.abs((candScoreSq - stateScoreSq) * stateWeight);
            }

            // find the state multiplier for this candidate/state
            let stateMult = 0;
            const candStateMults = stateMultResults[cIdx].state_multipliers;
            if (candStateMults[sIdx] && candStateMults[sIdx].state === stateId) {
                stateMult = candStateMults[sIdx].state_multiplier;
            } else {
                const match = candStateMults.find((sm) => sm.state == stateId);
                if (match) stateMult = match.state_multiplier;
            }

            total *= stateMult;
            total = Math.max(total, 0);
            candidateResults.push({ candidate: candidates[cIdx], result: total });
        }
        stateResults.push({ state: stateId, result: candidateResults });
    }

    // attach state abbreviations
    const stateAbbrMap = new Map();
    const statePkMap = new Map(); // for getting the state object by PK later
    for (const st of states) {
        stateAbbrMap.set(st.pk, st.fields.abbr);
        statePkMap.set(st.pk, st);
    }

    for (let sIdx = 0; sIdx < stateResults.length; sIdx++) {
        stateResults[sIdx].abbr = stateAbbrMap.get(stateResults[sIdx].state);
    }

    distributeVotes(stateResults, statePkMap);

    // assign electoral votes
    for (let sIdx = 0; sIdx < stateResults.length; sIdx++) {
        const stateObj = statePkMap.get(stateResults[sIdx].state);
        if (!stateObj) continue;

        // sort results by percent descending
        stateResults[sIdx].result.sort((a, b) => b.percent - a.percent);

        const evTotal = stateObj.fields.electoral_votes;

        if ("1" == data.game_type_id || "3" == data.game_type_id) {
            if (1 == stateObj.fields.winner_take_all_flg) {
                for (let cIdx = 0; cIdx < stateResults[sIdx].result.length; cIdx++) {
                    stateResults[sIdx].result[cIdx].electoral_votes = (cIdx === 0) ? evTotal : 0;
                }
            } else {
                let totalVotes = 0;
                for (let cIdx = 0; cIdx < stateResults[sIdx].result.length; cIdx++) {
                    totalVotes += stateResults[sIdx].result[cIdx].votes;
                }

                const topVotes = stateResults[sIdx].result[0]?.votes || 0;
                const [winnerEv, runnerUpEv] = splitEVTopTwo(evTotal, topVotes, totalVotes);
                for (let cIdx = 0; cIdx < stateResults[sIdx].result.length; cIdx++) {
                    stateResults[sIdx].result[cIdx].electoral_votes = (cIdx === 0) ? winnerEv : (cIdx === 1 ? runnerUpEv : 0);
                }
            }
        }
        if ("2" == data.game_type_id) {
            const shares = [];
            for (let cIdx = 0; cIdx < stateResults[sIdx].result.length; cIdx++) {
                shares.push(stateResults[sIdx].result[cIdx].percent);
            }
            const evShares = divideElectoralVotesProp(shares, evTotal);
            for (let cIdx = 0; cIdx < stateResults[sIdx].result.length; cIdx++) {
                stateResults[sIdx].result[cIdx].electoral_votes = evShares[cIdx];
            }
        }
    }

    // primary states override
    if (data.primary_states) {
        const primaryStates = JSON.parse(data.primary_states);
        const primaryMap = new Map();
        for (const prim of primaryStates) primaryMap.set(prim.state, prim.result);

        for (let idx = 0; idx < stateResults.length; idx++) {
            if (primaryMap.has(stateResults[idx].state)) {
                stateResults[idx].result = primaryMap.get(stateResults[idx].state);
            }
        }
    }

    return stateResults;
}

// turn raw alignment results into per-state vote counts and percentages
function distributeVotes(stateResults, statePkMap) {
    for (let sIdx = 0; sIdx < stateResults.length; sIdx++) {
        const stateObj = statePkMap.get(stateResults[sIdx].state);
        let totalVotes = 0;
        if (stateObj) {
            totalVotes = Math.floor(stateObj.fields.popular_votes * (0.95 + 0.1 * rand()));
        }

        let resultSum = 0;
        for (let cIdx = 0; cIdx < stateResults[sIdx].result.length; cIdx++) {
            resultSum += stateResults[sIdx].result[cIdx].result;
        }

        // avoid division by zero
        const totalInv = resultSum === 0 ? 0 : 1 / resultSum;

        for (let cIdx = 0; cIdx < stateResults[sIdx].result.length; cIdx++) {
            const share = stateResults[sIdx].result[cIdx].result * totalInv;
            stateResults[sIdx].result[cIdx].percent = share;
            stateResults[sIdx].result[cIdx].votes = Math.floor(share * totalVotes);
        }
    }
}

// Box-Muller with caching
function gaussianNoise() {
    // check if we have a cached spare value from the previous call
    if (gaussianNoise.spare !== null) {
        const val = gaussianNoise.spare;
        gaussianNoise.spare = null;
        return val;
    }

    let u, v, s;
    do {
        u = 2 * rand() - 1;
        v = 2 * rand() - 1;
        s = u * u + v * v;
    } while (s >= 1 || s === 0);

    const mul = Math.sqrt(-2 * Math.log(s) / s);
    gaussianNoise.spare = v * mul; // cache the second value
    return u * mul;
}
gaussianNoise.spare = null; // initialize cache property

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