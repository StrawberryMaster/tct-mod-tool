const { createApp, reactive, ref, computed, watch, onMounted } = Vue;

let app = null;
let autosaveInterval = null;
let autosaveEnabled = false;

// global exports
window.code1_autosaveEnabled = autosaveEnabled;

// debounced autosave request
const requestAutosaveDebounced = (() => {
    let timer = null;
    return (delay = 600) => {
        if (!window.code1_autosaveEnabled) return;

        clearTimeout(timer);
        timer = setTimeout(() => {
            requestAnimationFrame(() => {
                try { saveAutosave(); }
                catch (e) { console.error("Code 1 Autosave failed:", e); }
            });
        }, delay);
    };
})();
window.requestCode1AutosaveDebounced = requestAutosaveDebounced;

async function initCode1Storage() {
    if (window.TCTDB) {
        await TCTDB.migrate();
        const enabled = await TCTDB.get('settings', 'code1_autosaveEnabled');
        if (enabled === null) {
            autosaveEnabled = true; // default
        } else {
            autosaveEnabled = enabled === "true";
        }
    } else {
        autosaveEnabled = localStorage.getItem("code1_autosaveEnabled") === "true";
        if (localStorage.getItem("code1_autosaveEnabled") === null) {
            autosaveEnabled = true;
        }
    }
    
    window.code1_autosaveEnabled = autosaveEnabled;
    if (autosaveEnabled) {
        startAutosave();
    }
}


function startAutosave() {
    if (autosaveInterval) clearInterval(autosaveInterval);
    autosaveInterval = setInterval(saveAutosave, 15000);
}

function saveAutosave() {
    const tct = window.$TCT1;
    if (!tct || typeof tct.exportCode1 !== 'function') return;

    try {
        const code1 = tct.exportCode1();
        if (window.TCTDB) {
            TCTDB.set('autosaves', 'code1_autosave', code1)
                .catch(err => {
                    console.warn("Code 1 IndexedDB autosave failed, falling back to localStorage:", err);
                    localStorage.setItem("code1_autosave", code1);
                });
        } else {
            localStorage.setItem("code1_autosave", code1);
        }
        window.dispatchEvent(new CustomEvent('tct:code1_autosaved'));
    } catch (e) {
        console.error("Error during Code 1 export/save:", e);
    }
}

// global data for Code 1
const globalData = reactive({
    mode: 'ELECTION', // ELECTION, CANDIDATE, RUNNING_MATE, THEME, SETTINGS
    selectedElection: 0,
    selectedCandidate: 0,
    selectedRunningMate: 0,
    dataVersion: 0
});

window.$globalData1 = globalData;

document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM Content Loaded - Initializing Code 1");
    await initCode1Storage();
    const rawTct = new TCTCode1Data();
    const tct1 = reactive(rawTct);
    window.$TCT1 = tct1;
    
    // load from autosave if it exists
    let autosaveData = null;
    if (window.TCTDB) {
        autosaveData = await TCTDB.get('autosaves', 'code1_autosave');
    } else {
        autosaveData = localStorage.getItem("code1_autosave");
    }

    if (autosaveData) {
        console.log("Loading Code 1 from autosave...");
        tct1.loadCode1(autosaveData);
    }

    const app = createApp({
        setup() {
            onMounted(() => {
                console.log("App mounted, fetching templates...");
                tct1.fetchTemplates();
            });
            return {
                globalData,
                tct1
            };
        }
    });

    window.TCTApp1 = app;
    app.config.globalProperties.$globalData1 = globalData;
    app.config.globalProperties.$TCT1 = tct1;

    // register components from the queue
    if (window.TCT1ComponentQueue) {
        window.TCT1ComponentQueue.forEach(comp => {
            app.component(comp.name, comp.definition);
        });
    }

    app.mount('#app');
});

