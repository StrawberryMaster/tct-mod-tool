const DB_NAME = 'tct_mod_tool_db';
const DB_VERSION = 1;

let _db = null;
let _dbOpenPromise = null;

/**
 * Opens the IndexedDB for the TCT Mod Tool.
 * @returns {Promise<IDBDatabase>}
 */
function openTCTDB() {
    if (_db) return Promise.resolve(_db);
    if (_dbOpenPromise) return _dbOpenPromise;

    _dbOpenPromise = new Promise((resolve, reject) => {
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
            const db = event.target.result;
            db.onclose = () => {
                _db = null;
            };
            db.onversionchange = () => {
                db.close();
                _db = null;
            };
            _db = db;
            _dbOpenPromise = null;
            resolve(db);
        };

        request.onblocked = () => {
            console.warn("Database opening blocked. Please close other open tabs of this app.");
        };

        request.onerror = (event) => {
            _dbOpenPromise = null;
            reject(event.target.error || new Error('Failed to open database'));
        };
    });

    return _dbOpenPromise;
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

        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(new Error('Transaction aborted'));
    });
}

/**
 * Sets a value in a store, and resolves when data is safely committed to disk.
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

        if (store.keyPath) {
            store.put(value);
        } else if (key !== undefined) {
            store.put(value, key);
        } else {
            store.put(value);
        }

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(new Error('Transaction aborted'));
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

        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(new Error('Transaction aborted'));
    });
}

/**
 * Deletes a value from a store, and resolves when committed to disk.
 * @param {string} storeName
 * @param {string} key
 * @returns {Promise<void>}
 */
async function dbDelete(storeName, key) {
    const db = await openTCTDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        store.delete(key);

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(new Error('Transaction aborted'));
    });
}

/**
 * Clears a store, and resolves when committed to disk.
 * @param {string} storeName
 * @returns {Promise<void>}
 */
async function dbClear(storeName) {
    const db = await openTCTDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        store.clear();

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(new Error('Transaction aborted'));
    });
}

/**
 * Migrates data from localStorage and old IndexedDB safely in batched transactions.
 */
async function migrateLocalStorageToIndexedDB() {
    // avoid running migration check if it was already marked complete
    if (localStorage.getItem('tct_migration_done') === 'true') {
        return;
    }

    try {
        const db = await openTCTDB();

        // migrate setting and autosave keys from localStorage
        const keysToMigrate = [
            { key: 'autosaveEnabled', store: 'settings', type: 'boolean' },
            { key: 'autosave', store: 'autosaves', type: 'string' },
            { key: 'code1_autosaveEnabled', store: 'settings', type: 'boolean' },
            { key: 'code1_autosave', store: 'autosaves', type: 'string' }
        ];

        // group into a single transaction for efficiency
        const migrateTx = db.transaction(['settings', 'autosaves'], 'readwrite');
        const settingsStore = migrateTx.objectStore('settings');
        const autosavesStore = migrateTx.objectStore('autosaves');

        for (const item of keysToMigrate) {
            let value = localStorage.getItem(item.key);
            if (value !== null) {
                // ensure boolean strings from localStorage are parsed to actual booleans
                if (item.type === 'boolean') {
                    value = value === 'true';
                }

                const activeStore = item.store === 'settings' ? settingsStore : autosavesStore;
                // only write if it does not already exist
                const checkReq = activeStore.get(item.key);
                checkReq.onsuccess = () => {
                    if (checkReq.result === undefined) {
                        console.log(`Migrating ${item.key} to IndexedDB...`);
                        activeStore.put(value, item.key);
                    }
                };
            }
        }

        await new Promise((resolve, reject) => {
            migrateTx.oncomplete = () => resolve();
            migrateTx.onerror = () => reject(migrateTx.error);
        });

        // migrate presets from localStorage
        const presetsRaw = localStorage.getItem('tct-mod-presets');
        if (presetsRaw) {
            try {
                const presets = JSON.parse(presetsRaw);
                if (Array.isArray(presets) && presets.length > 0) {
                    const presetTx = db.transaction('presets', 'readwrite');
                    const presetStore = presetTx.objectStore('presets');

                    for (const p of presets) {
                        if (!p.id) p.id = Date.now().toString() + Math.random().toString(36).slice(2, 8);

                        const checkReq = presetStore.get(p.id);
                        checkReq.onsuccess = () => {
                            if (!checkReq.result) {
                                console.log(`Migrating preset ${p.name || p.id} to IndexedDB...`);
                                presetStore.put(p);
                            }
                        };
                    }

                    await new Promise((resolve, reject) => {
                        presetTx.oncomplete = () => resolve();
                        presetTx.onerror = () => reject(presetTx.error);
                    });
                }
            } catch (e) {
                console.error("Failed to migrate presets from localStorage:", e);
            }
        }

        // migrate from the old presets DB if it exists
        const oldDBName = 'tct_mod_presets_db';
        let oldDbExists = true;

        if (typeof indexedDB.databases === 'function') {
            const dbs = await indexedDB.databases();
            oldDbExists = dbs.some(d => d.name === oldDBName);
        }

        if (oldDbExists) {
            await new Promise((resolve) => {
                const oldDBRequest = indexedDB.open(oldDBName);
                let wasCreated = false;

                oldDBRequest.onupgradeneeded = (event) => {
                    // if oldVersion is 0, the database did not exist and we just created it
                    if (event.oldVersion === 0) {
                        wasCreated = true;
                    }
                };

                oldDBRequest.onsuccess = async (event) => {
                    const oldDB = event.target.result;

                    if (wasCreated || !oldDB.objectStoreNames.contains('presets')) {
                        oldDB.close();
                        indexedDB.deleteDatabase(oldDBName); // clean up if empty
                        resolve();
                        return;
                    }

                    const tx = oldDB.transaction('presets', 'readonly');
                    const store = tx.objectStore('presets');
                    const getAllReq = store.getAll();

                    getAllReq.onsuccess = async () => {
                        const oldPresets = getAllReq.result;
                        if (oldPresets && oldPresets.length > 0) {
                            const newPresetTx = db.transaction('presets', 'readwrite');
                            const newPresetStore = newPresetTx.objectStore('presets');

                            for (const p of oldPresets) {
                                const checkReq = newPresetStore.get(p.id);
                                checkReq.onsuccess = () => {
                                    if (!checkReq.result) {
                                        console.log(`Migrating preset ${p.name || p.id} from old IndexedDB...`);
                                        newPresetStore.put(p);
                                    }
                                };
                            }

                            newPresetTx.oncomplete = () => {
                                oldDB.close();
                                indexedDB.deleteDatabase(oldDBName); // clean up
                                resolve();
                            };
                            newPresetTx.onerror = () => {
                                oldDB.close();
                                resolve();
                            };
                        } else {
                            oldDB.close();
                            indexedDB.deleteDatabase(oldDBName);
                            resolve();
                        }
                    };

                    getAllReq.onerror = () => {
                        oldDB.close();
                        resolve();
                    };
                };

                oldDBRequest.onerror = () => {
                    resolve();
                };
            });
        }

        // mark migration process as complete to prevent re-running
        localStorage.setItem('tct_migration_done', 'true');

    } catch (err) {
        console.error("Migration error occurred:", err);
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

// initial state fallback from localStorage
window.autosaveEnabled = localStorage.getItem("autosaveEnabled") === "true";
window.code1_autosaveEnabled = localStorage.getItem("code1_autosaveEnabled") === "true";
if (localStorage.getItem("code1_autosaveEnabled") === null) {
    window.code1_autosaveEnabled = true;
}
