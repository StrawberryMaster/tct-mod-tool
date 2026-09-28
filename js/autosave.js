/**
 * This is a shared autosave controller (for both the code 1 and 2 tools)
 */
(function () {
    'use strict';

    const DEFAULTS = {
        name: 'autosave',
        store: 'autosaves',
        key: 'autosave',
        localStorageKey: 'autosave',
        eventName: null,
        settledEventName: null,  // defaults to eventName + ':settled'
        debounce: 500,      // quiet period after a change before saving
        maxWait: 4000,      // but never postpone longer than this while typing
        idleTimeout: 2000,  // requestIdleCallback deadline
        interval: 15000     // safety net for mutations that forget markDirty()
    };

    /** good enough to detect changes! */
    function hashString(str) {
        let h = 0x811c9dc5;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 0x01000193) >>> 0;
        }
        // fold the length in so equal-content-different-length never collides
        return ((h >>> 0) ^ (str.length >>> 0)) >>> 0;
    }

    function create(userConfig) {
        const cfg = Object.assign({}, DEFAULTS, userConfig || {});
        if (!cfg.settledEventName && cfg.eventName) cfg.settledEventName = cfg.eventName + ':settled';

        if (typeof cfg.isEnabled !== 'function') throw new Error('Autosave: isEnabled() is required');
        if (typeof cfg.serialize !== 'function') throw new Error('Autosave: serialize() is required');
        if (typeof cfg.getVersion !== 'function') throw new Error('Autosave: getVersion() is required');

        const stats = {
            writes: 0,
            skippedClean: 0,      // nothing changed at all woohoo
            skippedIdentical: 0,  // exporter ran, content was byte identical
            errors: 0,
            lastBytes: 0,
            lastDurationMs: 0,
            lastReason: null,
            lastSavedAt: 0
        };

        const state = {
            pending: false,
            writing: false,
            rerun: false,
            dirtySeq: 0,      // bumped by markDirty, detects edits during a write
            firstDirtyAt: 0,
            lastVersion: null,
            lastHash: null,
            intervalId: null,
            inflight: null
        };

        let timerId = null;
        let idleId = null;
        let idleIsRaf = false;

        function now() { return Date.now(); }

        function readVersion() {
            try {
                const v = cfg.getVersion();
                return typeof v === 'number' ? v : null;
            } catch (e) {
                return null;
            }
        }

        function isEnabled() {
            try { return !!cfg.isEnabled(); } catch (e) { return false; }
        }

        function cancelScheduled() {
            if (timerId !== null) { clearTimeout(timerId); timerId = null; }
            if (idleId !== null) {
                if (idleIsRaf && window.cancelIdleCallback) window.cancelIdleCallback(idleId);
                else clearTimeout(idleId);
                idleId = null;
            }
        }

        function schedule(delay) {
            if (!isEnabled()) return;

            const wait = typeof delay === 'number' ? Math.max(0, delay) : cfg.debounce;

            if (timerId !== null) clearTimeout(timerId);

            // never push a pending save past maxWait from the first change
            const sinceFirst = state.firstDirtyAt ? now() - state.firstDirtyAt : 0;
            const effective = Math.max(0, Math.min(wait, cfg.maxWait - sinceFirst));

            timerId = setTimeout(runWhenIdle, effective);
        }

        function runWhenIdle() {
            timerId = null;
            if (!state.pending || state.writing) return;

            const run = () => { idleId = null; flush('idle'); };
            if (typeof window.requestIdleCallback === 'function') {
                idleIsRaf = true;
                idleId = window.requestIdleCallback(run, { timeout: cfg.idleTimeout });
            } else {
                idleIsRaf = false;
                idleId = setTimeout(run, 0);
            }
        }

        /** record that something changed */
        function markDirty() {
            if (!isEnabled()) return false;

            state.dirtySeq++;
            if (!state.pending) {
                state.pending = true;
                state.firstDirtyAt = now();
            }
            schedule(cfg.debounce);
            return true;
        }

        /** back-compat entry point */
        function request(delay) {
            const ok = markDirty();
            if (ok && typeof delay === 'number') schedule(delay);
            return ok;
        }

        async function persist(payload) {
            if (window.TCTDB) {
                try {
                    await window.TCTDB.set(cfg.store, cfg.key, payload);
                    return;
                } catch (err) {
                    console.warn('[' + cfg.name + '] IndexedDB write failed, falling back to localStorage:', err);
                }
            }
            localStorage.setItem(cfg.localStorageKey, payload);
        }

        /**
         * @param {string} reason  for stats/debugging
         * @param {{force?: boolean}} [options] force bypasses both skip gates
         * @returns {Promise<boolean>} true when something was actually written
         */
        function flush(reason, options) {
            const force = !!(options && options.force);
            reason = reason || 'manual';

            // an explicit request always wins over the enabled flag
            if (!force && !isEnabled()) return Promise.resolve(false);

            // never run two exports/writes at once
            if (state.writing) {
                state.rerun = true;
                return state.inflight;
            }

            const versionBefore = readVersion();

            // ---- gate 1: cheap. nothing pending and the data version has not
            // moved since the last write, so the exporter is never even called
            if (!force && !state.pending && versionBefore !== null && versionBefore === state.lastVersion) {
                stats.skippedClean++;
                return Promise.resolve(false);
            }

            state.writing = true;
            cancelScheduled();

            const startedAt = now();
            const seqBefore = state.dirtySeq;
            let failed = false;
            let wrote = false;

            state.inflight = (async () => {
                try {
                    const payload = cfg.serialize();
                    const hash = hashString(payload);
                    const versionAfter = readVersion();
                    // edits that arrived while we were exporting
                    const editedDuringExport = state.dirtySeq !== seqBefore || versionAfter !== versionBefore;

                    // ---- gate 2: the content is byte identical to what is
                    // already stored (navigated away and back, edit undone)
                    if (!force && hash === state.lastHash) {
                        stats.skippedIdentical++;
                        state.lastVersion = versionAfter;
                        state.pending = editedDuringExport;
                        state.firstDirtyAt = state.pending ? now() : 0;
                        return false;
                    }

                    await persist(payload);
                    wrote = true;

                    state.lastHash = hash;
                    state.lastVersion = versionAfter;
                    state.pending = editedDuringExport;
                    state.firstDirtyAt = state.pending ? now() : 0;

                    stats.writes++;
                    stats.lastBytes = payload.length;
                    stats.lastDurationMs = now() - startedAt;
                    stats.lastReason = reason;
                    stats.lastSavedAt = now();

                    // only announce real writes
                    if (cfg.eventName) {
                        window.dispatchEvent(new CustomEvent(cfg.eventName, {
                            detail: { reason: reason, bytes: payload.length, durationMs: stats.lastDurationMs }
                        }));
                    }
                    return true;
                } catch (e) {
                    failed = true;
                    stats.errors++;
                    // stay dirty so the next tick retries
                    state.pending = true;
                    if (!state.firstDirtyAt) state.firstDirtyAt = now();
                    console.error('[' + cfg.name + '] save failed:', e);
                    return false;
                } finally {
                    state.writing = false;
                    state.inflight = null;

                    // tell the UI the save attempt is over and whether anything
                    // was actually written
                    if (cfg.settledEventName) {
                        window.dispatchEvent(new CustomEvent(cfg.settledEventName, {
                            detail: {
                                wrote: wrote,
                                failed: failed,
                                reason: reason,
                                pending: state.pending
                            }
                        }));
                    }

                    if (state.rerun) {
                        // someone asked for a save while this one ran
                        state.rerun = false;
                        schedule(0);
                    } else if (state.pending && !failed) {
                        // for edits landed during the export, if not failed
                        schedule(cfg.debounce);
                    }
                }
            })();

            return state.inflight;
        }

        /** explicit user triggered save: always write, even if unchanged */
        function saveNow(reason) {
            return flush(reason || 'manual', { force: true });
        }

        /**
         * Tell the controller what is already in storage, so the first tick
         * after loading an autosave is a no-op instead of a rewrite
         */
        function seed(storedPayload) {
            if (typeof storedPayload === 'string' && storedPayload.length > 0) {
                state.lastHash = hashString(storedPayload);
                state.lastVersion = readVersion();
                state.pending = false;
                state.firstDirtyAt = 0;
            }
        }

        function start() {
            if (state.intervalId !== null) return;
            state.intervalId = setInterval(() => flush('interval'), cfg.interval);
        }

        function stop() {
            if (state.intervalId !== null) {
                clearInterval(state.intervalId);
                state.intervalId = null;
            }
            cancelScheduled();
        }

        function isDirty() {
            return state.pending || readVersion() !== state.lastVersion;
        }

        function getStats() {
            return Object.assign({}, stats, {
                pending: state.pending,
                lastVersion: state.lastVersion,
                currentVersion: readVersion()
            });
        }

        // ---- flush before the tab goes away -------------------------------
        function flushOnHide() {
            if (!isEnabled()) return;
            if (!state.pending && readVersion() === state.lastVersion) return;
            flush('lifecycle', { force: true });
        }

        if (typeof document !== 'undefined' && document.addEventListener) {
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') flushOnHide();
            });
        }
        if (typeof window !== 'undefined' && window.addEventListener) {
            window.addEventListener('pagehide', flushOnHide);
            window.addEventListener('beforeunload', flushOnHide);
        }

        return {
            name: cfg.name,
            markDirty: markDirty,
            request: request,
            flush: flush,
            saveNow: saveNow,
            seed: seed,
            start: start,
            stop: stop,
            isDirty: isDirty,
            getStats: getStats
        };
    }

    window.TCTAutosave = { create: create, hash: hashString, DEFAULTS: DEFAULTS };
})();
