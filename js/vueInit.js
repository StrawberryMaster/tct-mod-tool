const { createApp, reactive, ref, computed, watch } = Vue;

Vue.prototype = Vue.prototype || {};

let app = null;
let autosaveInterval = null;
let autosaveEnabled = localStorage.getItem("autosaveEnabled") === "true";
const autosaveData = localStorage.getItem("autosave");

// global exports
window.autosaveEnabled = autosaveEnabled;
window.saveAutosave = saveAutosave;

// debounced autosave request
const requestAutosaveDebounced = (() => {
    let timer = null;
    return (delay = 600) => {
        if (!autosaveEnabled) return;

        clearTimeout(timer);
        timer = setTimeout(() => {
            requestAnimationFrame(() => {
                try { saveAutosave(); }
                catch (e) { console.error("Autosave failed:", e); }
            });
        }, delay);
    };
})();
window.requestAutosaveDebounced = requestAutosaveDebounced;

if (autosaveEnabled) {
    startAutosave();
}

const MODES = {
    QUESTION: "QUESTION",
    STATE: "STATE",
    ISSUE: "ISSUE",
    CANDIDATE: "CANDIDATE",
    CYOA: "CYOA",
    BANNER: "BANNER",
    ENDINGS: "ENDINGS",
    MAPPING: "MAPPING",
    BULK: "BULK"
};
Object.assign(window, MODES);

function shouldBeSavedAsNumber(value) {
    return !isNaN(value) && !(value != "0" && Number(value) === 0);
}

function startAutosave() {
    if (autosaveInterval) clearInterval(autosaveInterval);
    autosaveInterval = setInterval(saveAutosave, 15000);
}

function saveAutosave() {
    const tct = Vue.prototype.$TCT;
    if (!tct || typeof tct.exportCode2 !== 'function') return;

    try {
        const code2 = tct.exportCode2();
        localStorage.setItem("autosave", code2);
        window.dispatchEvent(new CustomEvent('tct:autosaved'));
    } catch (e) {
        console.error("Error during export/save:", e);
    }
}

function firstNonNull(arr) {
    return arr.find(x => x !== null);
}

async function loadData(dataName, isFirstLoad) {
    let raw;

    try {
        if (!isFirstLoad || !autosaveEnabled || !autosaveData) {
            const url = `./public/${dataName}`;
            const resp = await fetch(url, { cache: 'no-cache' });
            if (!resp.ok) throw new Error(`Failed to fetch ${url}: ${resp.status} ${resp.statusText}`);
            raw = await resp.text();
        } else {
            raw = autosaveData;
        }

        if (!raw) {
            alert(`Failed to load data for ${dataName}.`);
            return;
        }

        const parsedTCT = loadDataFromFile(raw);

        // attach to Vue prototype for global access
        Vue.prototype.$TCT = parsedTCT;

        const questions = Array.from(parsedTCT.questions.values());

        const states = Object.values(parsedTCT.states ?? {});
        const issues = Object.values(parsedTCT.issues ?? {});

        // get the first PKs
        const firstQuestionPk = questions.length > 0 ? questions[0].pk : null;
        const firstStatePk = states.length > 0 ? states[0].pk : null;
        const firstIssuePk = issues.length > 0 ? issues[0].pk : null;

        const candidatesList = getListOfCandidates();
        const firstCandidate = candidatesList.length > 0 ? candidatesList[0][0] : null;

        // initialize or update app
        if (!app) {
            app = createApp({});
            app.config.globalProperties.$TCT = parsedTCT;

            const globalData = reactive({
                mode: MODES.QUESTION,
                question: firstQuestionPk,
                state: firstStatePk,
                issue: firstIssuePk,
                candidate: firstCandidate,
                filename: "default"
            });

            app.config.globalProperties.$globalData = globalData;

            if (typeof window.initializeTCTApp === 'function') {
                window.initializeTCTApp(app);
            }

            Vue.prototype.$globalData = globalData;
            app.mount('#app');
        }
        else {
            const gd = app.config.globalProperties.$globalData;
            gd.question = firstQuestionPk;
            gd.state = firstStatePk;
            gd.issue = firstIssuePk;
            gd.candidate = firstCandidate;
            gd.filename = dataName;

            app.config.globalProperties.$TCT = parsedTCT;
        }

        console.log(`Loaded data. Mode:`, app.config.globalProperties.$globalData.mode);

    } catch (err) {
        console.error("Critical error in loadData:", err);
        alert("Zoinks! Error loading data. Check console for details.");
    }
}

function getListOfCandidates() {
    const scores = Vue.prototype.$TCT?.candidate_issue_score;
    if (!scores || Object.keys(scores).length === 0) {
        return [[null, null]];
    }

    // extract candidate IDs
    const allCandidates = Object.values(scores).map(c => c.fields.candidate);

    // deduplicate
    const uniqueCandidates = [...new Set(allCandidates)];

    // map to [id, label] format
    return uniqueCandidates.map(c => {
        const nickname = Vue.prototype.$TCT.getNicknameForCandidate(c);
        const label = (nickname) ? `${c} (${nickname})` : c;
        return [c, label];
    });
}

// load default template on startup
loadData(TEMPLATE_NAMES[0], true);