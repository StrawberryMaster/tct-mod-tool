let app;
const { createApp, reactive, ref, computed, watch } = Vue;

let autosaveEnabled = localStorage.getItem("autosaveEnabled") == "true";
const autosave = localStorage.getItem("autosave");
let autosaveFunction = null;

// keep a global mirror for other scripts/components
window.autosaveEnabled = autosaveEnabled;
// optionally expose the function too (function declarations are global, but this is explicit)
window.saveAutosave = window.saveAutosave || saveAutosave;

// Debounced autosave helper exposed globally
let _autosaveDebounceTimer = null;
function requestAutosaveDebounced(delay = 600) {
	// only queue if autosave is enabled
	if (localStorage.getItem("autosaveEnabled") !== "true") return;
	clearTimeout(_autosaveDebounceTimer);
	_autosaveDebounceTimer = setTimeout(() => {
		try { saveAutosave(); } catch (e) { console.error(e); }
	}, delay);
}
window.requestAutosaveDebounced = requestAutosaveDebounced;

if(autosaveEnabled) {
    startAutosave();
}

const QUESTION = "QUESTION";
const STATE = "STATE";
const ISSUE = "ISSUE";
const CANDIDATE = "CANDIDATE";
const CYOA = "CYOA";
const BANNER = "BANNER";
const ENDINGS = "ENDINGS";
const MAPPING = "MAPPING";
const BULK = "BULK";

function shouldBeSavedAsNumber(value) {
    return !isNaN(value) && !(value != "0" && Number(value) == 0);
}

function startAutosave() {
    autosaveFunction = setInterval(saveAutosave, 15000);
}

function saveAutosave() {
    const tct = Vue?.prototype?.$TCT;
    if (!tct || typeof tct.exportCode2 !== 'function') return;
    let code2 = tct.exportCode2();
    localStorage.setItem("autosave", code2);
    try {
        window.dispatchEvent(new CustomEvent('tct:autosaved'));
    } catch (e) { /* no-op */ }
}

function firstNonNull(arr) {
    return arr.filter((x) => x !== null)[0]
}

async function loadData(dataName, isFirstLoad) {
    let mode = QUESTION;
    let raw;

    if(!isFirstLoad || !autosaveEnabled || !autosave) {
        let f = await fetch(`./public/${dataName}`, {mode: "no-cors"});
        raw = await f.text();
    } else {
        raw = autosave;
    }

    if(raw == null) {
        alert(`Loaded file ./public/${dataName} was null. Not loading.`)
        return;
    }

    Vue.prototype.$TCT = loadDataFromFile(raw);

    let isNew = app == null;

    let firstQuestion = Array.from(Vue.prototype.$TCT.questions.values())[0];
    let firstState = Object.values(Vue.prototype.$TCT.states)[0];
    let firstIssue = Object.values(Vue.prototype.$TCT.issues)[0];
    let firstCandidateArr = getListOfCandidates();
    let firstCandidate = firstCandidateArr.length > 0 ? firstCandidateArr[0][0] : null;

    if(isNew) {
        app = createApp({});
        app.config.globalProperties.$TCT = Vue.prototype.$TCT;
        app.config.globalProperties.$globalData = reactive({
            mode: mode,
            question: firstQuestion ? firstQuestion.pk : null,
            state: firstState ? firstState.pk : null,
            issue: firstIssue ? firstIssue.pk : null,
            candidate: firstCandidate,
            filename: "default"
        });
        
        // Initialize modern component system
        if (window.initializeTCTApp) {
            window.initializeTCTApp(app);
        }
        
        // Keep Vue 2 prototype in sync
        Vue.prototype.$globalData = app.config.globalProperties.$globalData;
    }
    else {
        Vue.prototype.$globalData.question = firstQuestion ? firstQuestion.pk : null;
        Vue.prototype.$globalData.state = firstState ? firstState.pk : null;
        Vue.prototype.$globalData.issue = firstIssue ? firstIssue.pk : null;
        Vue.prototype.$globalData.candidate = firstCandidate;
        Vue.prototype.$globalData.filename = dataName;
    }

    console.log("Loaded data: ", raw);
    console.log("Mode is: ", Vue.prototype.$globalData.mode)

    if(isNew) {
        app.mount('#app')
    }
}

function getListOfCandidates() {

    if(Object.values(Vue.prototype.$TCT.candidate_issue_score).length == 0) {
        return [[null, null]];
    }

    let arr = Object.values(Vue.prototype.$TCT.candidate_issue_score).map(c => c.fields.candidate);
    arr = Array.from(new Set(arr));
    arr = arr.map((c) => {
        let nickname = Vue.prototype.$TCT.getNicknameForCandidate(c);
        if(nickname != "" && nickname != null) {
            nickname = ` (${nickname})`
            return [c, c + nickname];
        }
        
        return [c, c];
    });

    return arr;
}