const { createApp, reactive, ref, computed, watch, onMounted } = Vue;

let app = null;
let autosaveController = null;
let autosaveEnabled = false;
let code1AutosaveData = null;

function createCode1AutosaveController() {
    if (autosaveController) return autosaveController;
    if (!window.TCTAutosave) return null;

    autosaveController = window.TCTAutosave.create({
        name: 'code1',
        store: 'autosaves',
        key: 'code1_autosave',
        localStorageKey: 'code1_autosave',
        eventName: 'tct:code1_autosaved',
        debounce: 600,
        maxWait: 4000,
        interval: 15000,
        isEnabled: () => !!window.code1_autosaveEnabled,
        getVersion: () => (window.$globalData ? window.$globalData.dataVersion : null),
        serialize: () => {
            const tct = window.$TCT;
            if (!tct || typeof tct.exportCode1 !== 'function') return '';
            return tct.exportCode1();
        }
    });

    // what we just loaded is already in storage
    if (code1AutosaveData) autosaveController.seed(code1AutosaveData);

    return autosaveController;
}

// global exports
window.code1_autosaveEnabled = false;
window.requestCode1AutosaveDebounced = (delay) => {
    const c = createCode1AutosaveController();
    return c ? c.request(delay) : false;
};
window.requestCode1AutosaveIfEnabled = () => {
    const c = createCode1AutosaveController();
    return c ? c.markDirty() : false;
};
window.saveCode1Autosave = (reason) => {
    const c = createCode1AutosaveController();
    return c ? c.saveNow(reason || 'manual') : Promise.resolve(false);
};
window.$code1AutosaveStats = () => (autosaveController ? autosaveController.getStats() : null);

window.$promptCode1ChangePk = function (type, oldPk, label) {
    const newPk = prompt(`Enter new PK for ${label || type} (currently ${oldPk}):`, oldPk);
    if (newPk === null || newPk === "" || Number(newPk) === Number(oldPk)) return;
    const tct = window.$TCT;
    if (tct.changePk(type, Number(oldPk), Number(newPk))) {
        window.$globalData.dataVersion++;
    }
};

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
    const c = createCode1AutosaveController();
    if (c) c.start();
}
function stopAutosave() {
    if (autosaveController) autosaveController.stop();
}
window.code1StartAutosave = startAutosave;
window.code1StopAutosave = stopAutosave;

// global data for Code 1
const globalData = reactive({
    mode: 'ELECTION',
    selectedElection: 0,
    selectedCandidate: 0,
    selectedRunningMate: 0,
    dataVersion: 0
});

window.$globalData = globalData;

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Loading Code 1 tool...");
    await initCode1Storage();
    const rawTct = new TCTCode1Data();
    const tct = reactive(rawTct);
    window.$TCT = tct;

    // load from autosave if it exists
    let autosaveData = null;
    if (window.TCTDB) {
        autosaveData = await TCTDB.get('autosaves', 'code1_autosave');
    } else {
        autosaveData = localStorage.getItem("code1_autosave");
    }
    code1AutosaveData = autosaveData;

    if (autosaveData) {
        console.log("Loading Code 1 from autosave...");
        tct.loadCode1(autosaveData);
    }

    const app = createApp({
        setup() {
            onMounted(() => {
                console.log("App mounted, fetching templates...");
                tct.fetchTemplates();
            });

            // deep watcher
            watch(
                tct,
                (newVal) => {
                    const election = newVal.elections[0];
                    const temp = newVal.temp_election_list[0];
                    if (election && temp) {
                        temp.id = Number(election.pk);
                        temp.year = Number(election.fields.year);
                        temp.display_year = election.fields.display_year;
                    }

                    globalData.dataVersion++;
                    window.requestCode1AutosaveIfEnabled?.();
                },
                { deep: true }
            );

            return {
                globalData,
                tct
            };
        }
    });

    window.TCTApp = app;
    app.config.globalProperties.$globalData = globalData;
    app.config.globalProperties.$TCT = tct;

    // register components from the queue
    if (window.TCT1ComponentQueue) {
        window.TCT1ComponentQueue.forEach(comp => {
            app.component(comp.name, comp.definition);
        });
    }

    app.mount('#app');
});
