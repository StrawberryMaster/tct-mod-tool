
const DB_NAME = 'tct_mod_tool_db';
const DB_VERSION = 1;

/**
 * Opens the IndexedDB for the TCT Mod Tool.
 * @returns {Promise<IDBDatabase>}
 */
function openTCTDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings');
            }
            if (!db.objectStoreNames.contains('autosaves')) {
                db.createObjectStore('autosaves');
            }
            if (!db.objectStoreNames.contains('presets')) {
                db.createObjectStore('presets', { keyPath: 'id' });
            }
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

/**
 * Gets a value from a store.
 * @param {string} storeName 
 * @param {string} key 
 * @returns {Promise<any>}
 */
async function dbGet(storeName, key) {
    const db = await openTCTDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Sets a value in a store.
 * @param {string} storeName 
 * @param {string} key 
 * @param {any} value 
 * @returns {Promise<void>}
 */
async function dbSet(storeName, key, value) {
    const db = await openTCTDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = key !== undefined ? store.put(value, key) : store.put(value);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Gets all values from a store.
 * @param {string} storeName 
 * @returns {Promise<any[]>}
 */
async function dbGetAll(storeName) {
    const db = await openTCTDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Deletes a value from a store.
 * @param {string} storeName 
 * @param {string} key 
 * @returns {Promise<void>}
 */
async function dbDelete(storeName, key) {
    const db = await openTCTDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Clears a store.
 * @param {string} storeName 
 * @returns {Promise<void>}
 */
async function dbClear(storeName) {
    const db = await openTCTDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Migrates data from localStorage to IndexedDB.
 */
async function migrateLocalStorageToIndexedDB() {
    const keysToMigrate = [
        { key: 'autosaveEnabled', store: 'settings' },
        { key: 'autosave', store: 'autosaves' },
        { key: 'code1_autosaveEnabled', store: 'settings' },
        { key: 'code1_autosave', store: 'autosaves' }
    ];

    for (const item of keysToMigrate) {
        const value = localStorage.getItem(item.key);
        if (value !== null) {
            const existing = await dbGet(item.store, item.key);
            if (existing === undefined) {
                console.log(`Migrating ${item.key} to IndexedDB...`);
                await dbSet(item.store, item.key, value);
            }
        }
    }

    // migrate presets from localStorage
    const presetsRaw = localStorage.getItem('tct-mod-presets');
    if (presetsRaw) {
        try {
            const presets = JSON.parse(presetsRaw);
            if (Array.isArray(presets)) {
                for (const p of presets) {
                    if (!p.id) p.id = Date.now().toString() + Math.random().toString(36).slice(2, 8);
                    const existing = await dbGet('presets', p.id);
                    if (!existing) {
                        console.log(`Migrating preset ${p.name} to IndexedDB...`);
                        await dbSet('presets', undefined, p);
                    }
                }
            }
        } catch (e) {
            console.error("Failed to migrate presets from localStorage:", e);
        }
    }

    // migrate from the old presets DB if it exists
    try {
        const oldDBName = 'tct_mod_presets_db';
        const oldDBRequest = indexedDB.open(oldDBName);
        oldDBRequest.onsuccess = async (event) => {
            const oldDB = event.target.result;
            if (oldDB.objectStoreNames.contains('presets')) {
                const tx = oldDB.transaction('presets', 'readonly');
                const store = tx.objectStore('presets');
                const getAllReq = store.getAll();
                getAllReq.onsuccess = async () => {
                    const oldPresets = getAllReq.result;
                    for (const p of oldPresets) {
                        const existing = await dbGet('presets', p.id);
                        if (!existing) {
                            console.log(`Migrating preset ${p.name} from old IndexedDB...`);
                            await dbSet('presets', undefined, p);
                        }
                    }
                    oldDB.close();
                };
            } else {
                oldDB.close();
            }
        };
    } catch (e) {
        console.warn("Could not migrate from old presets DB:", e);
    }
}

// export functions to window
window.TCTDB = {
    get: dbGet,
    set: dbSet,
    getAll: dbGetAll,
    delete: dbDelete,
    clear: dbClear,
    migrate: migrateLocalStorageToIndexedDB,
    openTCTDB: openTCTDB
};

// initial sync load from localStorage as a fallback/initial state
window.autosaveEnabled = localStorage.getItem("autosaveEnabled") === "true";
window.code1_autosaveEnabled = localStorage.getItem("code1_autosaveEnabled") === "true";
if (localStorage.getItem("code1_autosaveEnabled") === null) {
    window.code1_autosaveEnabled = true;
}


