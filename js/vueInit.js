const { createApp, reactive, ref, computed, watch } = Vue;

let app = null;
let autosaveController = null;
let autosaveEnabled = false;
let autosaveData = null;

function createAutosaveController() {
    if (autosaveController) return autosaveController;
    if (!window.TCTAutosave) return null;

    autosaveController = window.TCTAutosave.create({
        name: 'code2',
        store: 'autosaves',
        key: 'autosave',
        localStorageKey: 'autosave',
        eventName: 'tct:autosaved',
        debounce: 600,
        maxWait: 4000,
        interval: 15000,
        isEnabled: () => !!window.autosaveEnabled,
        getVersion: () => (window.$globalData ? window.$globalData.dataVersion : null),
        serialize: () => {
            const tct = window.$TCT;
            if (!tct || typeof tct.exportCode2 !== 'function') return '';
            return tct.exportCode2();
        }
    });

    // whatever the page started with is already in storage, so no rewrite needed
    if (autosaveData) autosaveController.seed(autosaveData);

    return autosaveController;
}

// global exports
window.autosaveEnabled = false;
window.saveAutosave = (reason) => {
    const c = createAutosaveController();
    return c ? c.saveNow(reason || 'manual') : Promise.resolve(false);
};
window.requestAutosaveDebounced = (delay) => {
    const c = createAutosaveController();
    return c ? c.request(delay) : false;
};
window.requestAutosaveIfEnabled = () => {
    const c = createAutosaveController();
    return c ? c.markDirty() : false;
};
window.$autosaveStats = () => (autosaveController ? autosaveController.getStats() : null);

async function initAndLoad() {
    if (window.TCTDB) {
        try {
            await TCTDB.migrate();
            autosaveEnabled = (await TCTDB.get('settings', 'autosaveEnabled')) === "true";
            autosaveData = await TCTDB.get('autosaves', 'autosave');
        } catch (e) {
            console.warn("IndexedDB unavailable, falling back to localStorage:", e);
            window.TCTDB = null;
            autosaveEnabled = localStorage.getItem("autosaveEnabled") === "true";
            autosaveData = localStorage.getItem("autosave");
        }
    } else {
        autosaveEnabled = window.autosaveEnabled;
        autosaveData = localStorage.getItem("autosave");
    }

    window.autosaveEnabled = autosaveEnabled;
    if (autosaveEnabled) {
        startAutosave();
    }

    loadData(DEFAULT_TEMPLATE, true);
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

function updateGlobalTCT(newTCT) {
    window.$TCT = reactive(newTCT);
}
window.$updateGlobalTCT = updateGlobalTCT;

function shouldBeSavedAsNumber(value) {
    return !isNaN(value) && !(value != "0" && Number(value) === 0);
}

function startAutosave() {
    const c = createAutosaveController();
    if (c) c.start();
}
function stopAutosave() {
    if (autosaveController) autosaveController.stop();
}
window.startAutosave = startAutosave;
window.stopAutosave = stopAutosave;

function firstNonNull(arr) {
    return arr.find(x => x !== null);
}

function promptChangePk(type, oldPk) {
    const newPk = prompt(`Enter new PK for this ${type}:`, oldPk);
    if (newPk === null || newPk === "" || Number(newPk) === Number(oldPk)) return;

    if (confirm(`Are you sure you want to change ${type} PK ${oldPk} to ${newPk}? This will update all references.`)) {
        const tct = window.$TCT;
        const gd = window.$globalData;

        if (tct.changePk(type, oldPk, newPk)) {
            gd.dataVersion++;

            // update selection if the active item was changed
            const activeItemMap = {
                'question': 'question',
                'state': 'state',
                'issue': 'issue',
                'candidate': 'candidate'
            };

            const field = activeItemMap[type];
            if (field && gd[field] == oldPk) {
                gd[field] = Number(newPk);
            }
        }
    }
}

window.$promptChangePk = promptChangePk;

async function loadData(dataName, isFirstLoad) {
    let raw;

    try {
        if (!isFirstLoad || !autosaveEnabled || !autosaveData) {
            const url = `./public/${dataName}`;
            try {
                const resp = await fetch(url, { cache: 'default' });
                if (!resp.ok) throw new Error(`Failed to fetch ${url}: ${resp.status} ${resp.statusText}`);
                raw = await resp.text();
            } catch (e) {
                console.error("Fetch failed:", e);
                alert(`Failed to load data for ${dataName}. If you are offline, ensure you have loaded this template before.`);
                return;
            }
        } else {
            raw = autosaveData;
        }

        if (!raw) {
            alert(`Failed to load data for ${dataName}.`);
            return;
        }

        const parsedTCT = loadDataFromFile(raw);

        // attach to window for global access
        window.$updateGlobalTCT(parsedTCT);

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

            // set up reactive-ish pointers to global state
            Object.defineProperty(app.config.globalProperties, '$TCT', {
                get() { return window.$TCT; },
                set(v) { window.$TCT = v; },
                configurable: true
            });

            app.config.globalProperties.$promptChangePk = promptChangePk;

            const globalData = reactive({
                mode: MODES.QUESTION,
                question: firstQuestionPk,
                state: firstStatePk,
                issue: firstIssuePk,
                candidate: firstCandidate,
                filename: "default",
                dataVersion: 0
            });

            app.config.globalProperties.$globalData = globalData;

            // register queued components
            window.TCTApp = app;
            if (window.TCTComponentQueue) {
                window.TCTComponentQueue.forEach(({ name, definition }) => {
                    app.component(name, definition);
                });
                window.TCTComponentQueue = [];
            }

            window.$globalData = globalData;
            app.mount('#app');
        }
        else {
            const gd = app.config.globalProperties.$globalData;
            gd.question = firstQuestionPk;
            gd.state = firstStatePk;
            gd.issue = firstIssuePk;
            gd.candidate = firstCandidate;
            gd.filename = dataName;

            window.$updateGlobalTCT(parsedTCT);
        }

        console.log(`Loaded data. Mode:`, app.config.globalProperties.$globalData.mode);

        // loading a template/replacement changes the
        // content without bumping dataVersion, so flag it
        window.requestAutosaveIfEnabled?.();

    } catch (err) {
        console.error("Critical error in loadData:", err);
        alert("Zoinks! Error loading data. Check console for details.");
    }
}

function getListOfCandidates() {
    const scores = window.$TCT?.candidate_issue_score;
    if (!scores || Object.keys(scores).length === 0) {
        return [[null, null]];
    }

    // extract candidate IDs
    const allCandidates = Object.values(scores).map(c => c.fields.candidate);

    // deduplicate
    const uniqueCandidates = [...new Set(allCandidates)];

    // map to [id, label] format
    return uniqueCandidates.map(c => {
        const nickname = window.$TCT.getNicknameForCandidate(c);
        const label = (nickname) ? `${c} (${nickname})` : c;
        return [c, label];
    });
}

// load default template on startup
initAndLoad().catch(e => {
    console.error("Fatal init error:", e);
    alert("Zoinks! Error loading data. Check console for details.");
});
