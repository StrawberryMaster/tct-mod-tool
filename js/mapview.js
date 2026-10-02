/*
 * TCTMapView — basically a fairly high performance SVG map rendering tool
 *
 * Why this exists: mod maps can be enormous. A single 5 MB Code 2 export can
 * carry many paths totalling >2 MB of path data, with a single path holding
 * over 200k points. Rendering that through Vue is bad and we should avoid that!
 *
 */
(function (global) {
    'use strict';

    const SVG_NS = 'http://www.w3.org/2000/svg';

    // a monotonic-enough clock
    const now = (typeof performance !== 'undefined' && performance.now)
        ? () => performance.now()
        : () => Date.now();
    const TOKEN_RE = /([MmZzLlHhVvCcSsQqTtAa])|([-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?)/g;
    const ARITY = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
    const STRAIGHT = { L: 1, H: 1, V: 1 };

    function tokenize(d) {
        const tokens = [];
        if (!d || typeof d !== 'string') return tokens;
        TOKEN_RE.lastIndex = 0;
        let m;
        while ((m = TOKEN_RE.exec(d)) !== null) {
            if (m[1]) tokens.push(m[1]);
            else tokens.push(parseFloat(m[2]));
        }
        return tokens;
    }

    /**
     * Parses a path into a flat list of absolute segments
     * Segment: { c, a, x, y, sx, sy, close } with x/y the absolute endpoint
     */
    function parsePath(d) {
        const tokens = tokenize(d);
        const segs = [];
        let i = 0;
        let cmd = null;
        let cx = 0, cy = 0, sx = 0, sy = 0;
        let open = false;

        while (i < tokens.length) {
            // every iteration must consume at least one token, otherwise an
            // unusable command letter (or a truncated argument list) would spin
            // forever on the same value
            const consumedBefore = i;

            if (typeof tokens[i] === 'string') {
                cmd = tokens[i++];
            } else if (cmd) {
                // implicit repeat: M/m continues as L/l
                if (cmd === 'M') cmd = 'L';
                else if (cmd === 'm') cmd = 'l';
            } else {
                // coordinates before any command letter are an implicit moveto:
                // SVG allows a path to start with bare coordinates, and browsers
                // treat the first pair as `M`. skipping them shifted every
                // following point, which drew a stray line across the map
                cmd = 'M';
                // fall through and consume the pair below
            }

            const upper = cmd.toUpperCase();
            const rel = cmd !== upper;
            const need = ARITY[upper];
            if (need === undefined) {
                // unknown command letter: drop it, but only if it was a real
                // token so the loop cannot stall on a number
                cmd = null;
                if (i === consumedBefore) i++;
                continue;
            }

            if (upper === 'Z') {
                if (open) segs.push({ c: 'Z', a: [], x: sx, y: sy, sx: cx, sy: cy, close: true });
                cx = sx; cy = sy;
                open = false;
                continue;
            }

            const a = new Array(need);
            let ok = true;
            for (let k = 0; k < need; k++) {
                const v = tokens[i + k];
                if (typeof v !== 'number' || !Number.isFinite(v)) { ok = false; break; }
                a[k] = v;
            }
            if (!ok) {
                // truncated argument list (e.g. "M0,0 L10"): stop here rather
                // than re-reading the same token forever
                cmd = null;
                if (i === consumedBefore) i++;
                continue;
            }
            i += need;

            let x = cx, y = cy;
            switch (upper) {
                case 'M': x = rel ? cx + a[0] : a[0]; y = rel ? cy + a[1] : a[1]; break;
                case 'L': x = rel ? cx + a[0] : a[0]; y = rel ? cy + a[1] : a[1]; break;
                case 'H': x = rel ? cx + a[0] : a[0]; break;
                case 'V': y = rel ? cy + a[0] : a[0]; break;
                case 'C': x = rel ? cx + a[4] : a[4]; y = rel ? cy + a[5] : a[5]; break;
                case 'S':
                case 'Q': x = rel ? cx + a[2] : a[2]; y = rel ? cy + a[3] : a[3]; break;
                case 'T': x = rel ? cx + a[0] : a[0]; y = rel ? cy + a[1] : a[1]; break;
                case 'A': x = rel ? cx + a[5] : a[5]; y = rel ? cy + a[6] : a[6]; break;
            }

            if (upper === 'M') {
                if (open) segs.push({ c: 'Z', a: [], x: cx, y: cy, sx: cx, sy: cy, close: true });
                sx = x; sy = y;
                open = true;
            }
            segs.push({ c: cmd, a, x, y, sx: cx, sy: cy, close: false });
            cx = x; cy = y;
        }

        return segs;
    }

    /** Conservative bbox: curve control points are included, so it never culls
     *  something that is actually visible */
    function segmentsBBox(segs) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const add = (x, y) => {
            if (!Number.isFinite(x) || !Number.isFinite(y)) return;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        };
        for (let i = 0; i < segs.length; i++) {
            const s = segs[i];
            const upper = s.c.toUpperCase();
            add(s.x, s.y);
            if (upper === 'C') { add(s.a[0], s.a[1]); add(s.a[2], s.a[3]); }
            else if (upper === 'S' || upper === 'Q') { add(s.a[0], s.a[1]); }
            else if (upper === 'A') { add(s.x - s.a[0], s.y - s.a[1]); add(s.x + s.a[0], s.y + s.a[1]); }
        }
        return Number.isFinite(minX) ? { minX, minY, maxX, maxY } : null;
    }

    // simplification cache, keyed by the source `d` string
    //
    // the Issues tab, the state-effects editor and the Mapping tab can each have
    // a map on screen at once, and the expanded modal doubles a map again
    // without this the same 4 MB of geometry is re-parsed for each one; with it
    // only the first pays
    const geometryCache = new Map();
    const GEOMETRY_CACHE_LIMIT = 512;

    function cachedSimplify(d, eps) {
        let byLevel = geometryCache.get(d);
        if (!byLevel) {
            byLevel = new Map();
            if (geometryCache.size >= GEOMETRY_CACHE_LIMIT) {
                // map preserves insertion order, so this drops the oldest entry
                geometryCache.delete(geometryCache.keys().next().value);
            }
            geometryCache.set(d, byLevel);
        }
        let geo = byLevel.get(eps);
        if (!geo) {
            geo = simplifyPath(d, eps);
            byLevel.set(eps, geo);
        }
        return geo;
    }

    function clearGeometryCache() {
        geometryCache.clear();
    }

    // ----------------------------------------------- decimation (RDP)

    // Iterative Douglas-Peucker over [first, last]; marks survivors in `keep`.
    function rdp(pts, first, last, eps2, keep) {
        if (last <= first + 1) return;
        const stack = [first, last];

        while (stack.length) {
            const hi = stack.pop();
            const lo = stack.pop();
            if (hi <= lo + 1) continue;
            const lx = pts[lo * 2], ly = pts[lo * 2 + 1];
            const ex = pts[hi * 2] - lx, ey = pts[hi * 2 + 1] - ly;
            const len2 = ex * ex + ey * ey;
            let best = -1, bestDist = eps2;
            for (let k = lo + 1; k < hi; k++) {
                const px = pts[k * 2] - lx, py = pts[k * 2 + 1] - ly;
                let dist;
                if (len2 === 0) {
                    dist = px * px + py * py;
                } else {
                    let t = (px * ex + py * ey) / len2;
                    if (t < 0) t = 0; else if (t > 1) t = 1;
                    const qx = px - ex * t, qy = py - ey * t;
                    dist = qx * qx + qy * qy;
                }
                if (dist > bestDist) { bestDist = dist; best = k; }
            }
            if (best >= 0) {
                keep[best] = 1;
                stack.push(lo, best, best, hi);
            }
        }
    }

    function fmt(value, precision) {
        if (!Number.isFinite(value)) return '0';
        const r = Number(value.toFixed(precision));
        return String(r === 0 ? 0 : r);
    }

    /**
     * Decimates a path
     * Only maximal runs of straight segments (L/H/V, absolute or relative) are
     * approximated; every other command is copied through untouched, so curves
     * and arcs keep their exact shape
     * @param {string} d
     * @param {number} eps tolerance in user units (0 / non-finite = no decimation)
     * @returns {{d: string, points: number, bbox: object|null}}
     */
    function simplifyPath(d, eps) {
        const segs = parsePath(d);
        if (!segs.length) return { d: typeof d === 'string' ? d : '', points: 0, bbox: null };

        let maxAbs = 1;
        for (let i = 0; i < segs.length; i++) {
            const s = segs[i];
            if (Math.abs(s.x) > maxAbs) maxAbs = Math.abs(s.x);
            if (Math.abs(s.y) > maxAbs) maxAbs = Math.abs(s.y);
            for (let k = 0; k < s.a.length; k++) {
                const av = Math.abs(s.a[k]);
                if (Number.isFinite(av) && av > maxAbs) maxAbs = av;
            }
        }
        const precision = maxAbs < 1000 ? 2 : 0;
        const doDecimate = Number.isFinite(eps) && eps > 0;
        const eps2 = doDecimate ? eps * eps : 0;

        const out = [];
        let points = 0;
        let runPts = null, runKeep = null;

        const flushRun = () => {
            if (!runPts) return;
            const n = runPts.length / 2;
            if (n > 0) {
                if (n === 1 || !doDecimate) {
                    for (let i = 0; i < n; i++) runKeep[i] = 1;
                } else {
                    runKeep[0] = 1;
                    runKeep[n - 1] = 1;
                    rdp(runPts, 0, n - 1, eps2, runKeep);
                }
                for (let i = 0; i < n; i++) {
                    if (!runKeep[i]) continue;
                    out.push('L', fmt(runPts[i * 2], precision), fmt(runPts[i * 2 + 1], precision));
                    points++;
                }
            }
            runPts = null;
            runKeep = null;
        };

        for (let i = 0; i < segs.length; i++) {
            const s = segs[i];
            const upper = s.c.toUpperCase();

            if (upper === 'M') {
                flushRun();
                out.push('M', fmt(s.x, precision), fmt(s.y, precision));
                points++;
                continue;
            }
            if (s.close) {
                flushRun();
                out.push('Z');
                continue;
            }
            if (STRAIGHT[upper]) {
                if (!runPts) { runPts = []; runKeep = []; }
                runPts.push(s.x, s.y);
                runKeep.push(0);
                continue;
            }
            // curves / arcs: flush the straight run, then re-emit
            //
            // the original command letter matters
            // copying a relative `c`/`s`/`q`/`t`/`a` as an uppercase absolute command
            // reinterprets its arguments as absolute coordinates, which teleports the curve
            // somewhere else entirely
            // preserve the case and copy the arguments verbatim
            flushRun();
            out.push(s.c);
            for (let k = 0; k < s.a.length; k++) out.push(fmt(s.a[k], precision));
            points += Math.ceil(s.a.length / 2);
        }
        flushRun();

        return { d: out.join(' '), points, bbox: segmentsBBox(segs) };
    }

    // ------------------------------------------------ transform matrices

    function multiply(m1, m2) {
        return [
            m1[0] * m2[0] + m1[2] * m2[1],
            m1[1] * m2[0] + m1[3] * m2[1],
            m1[0] * m2[2] + m1[2] * m2[3],
            m1[1] * m2[2] + m1[3] * m2[3],
            m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
            m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
        ];
    }

    function transformToMatrix(type, a) {
        switch (type) {
            case 'matrix':
                return a.length >= 6 ? [a[0], a[1], a[2], a[3], a[4], a[5]] : null;
            case 'translate':
                return [1, 0, 0, 1, a[0] || 0, a[1] || 0];
            case 'scale':
                return [a.length > 1 ? a[1] : (a[0] ?? 1), 0, 0, a[0] ?? 1, 0, 0];
            case 'rotate': {
                const r = (a[0] || 0) * Math.PI / 180;
                const cos = Math.cos(r), sin = Math.sin(r);
                const m = [cos, sin, -sin, cos, 0, 0];
                if (a.length >= 3) {
                    return multiply(multiply([1, 0, 0, 1, a[1], a[2]], m), [1, 0, 0, 1, -a[1], -a[2]]);
                }
                return m;
            }
            case 'skewX':
                return [1, 0, Math.tan((a[0] || 0) * Math.PI / 180), 1, 0, 0];
            case 'skewY':
                return [1, Math.tan((a[0] || 0) * Math.PI / 180), 0, 1, 0, 0];
        }
        return null;
    }

    /** @returns {number[]|null} [a,b,c,d,e,f] */
    function parseTransform(str) {
        if (!str || typeof str !== 'string' || !str.trim()) return null;
        const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
        let m;
        let out = null;
        while ((m = re.exec(str)) !== null) {
            const nums = (m[2].match(/[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) || []).map(Number);
            const mat = transformToMatrix(m[1], nums);
            if (mat) out = out ? multiply(out, mat) : mat;
        }
        return out;
    }

    function transformBBox(box, m) {
        if (!box || !m) return box;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const xs = [box.minX, box.maxX];
        const ys = [box.minY, box.maxY];
        for (let i = 0; i < 2; i++) {
            for (let k = 0; k < 2; k++) {
                const x = m[0] * xs[i] + m[2] * ys[k] + m[4];
                const y = m[1] * xs[i] + m[3] * ys[k] + m[5];
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }
        }
        return { minX, minY, maxX, maxY };
    }

    // ------------------------------------------------------------ MapView

    const DEFAULTS = {
        minZoom: 0.2,
        maxZoom: 40,
        pixelTolerance: 0.3,  // max allowed visual error, in CSS pixels
        coarsestLevel: 8,      // decimation stops here (2^8 user units)
        finestLevel: -8,
        cullMinPoints: 2000,   // cull only once the simplified map is this big
        cullMargin: 0.35,      // keep shapes within this fraction of the viewport
        cull: true,            // set false to draw every shape, always
        buildBudgetMs: 12      // per-frame slice for the initial geometry build
    };

    /**
     * Renders map shapes into an <svg> and owns pan/zoom
     *
     * The caller passes `items` (anything with a stable `pk`) plus
     * `resolve(item)` returning the `[abbr, d, transform]` entry, then supplies
     * colours through `setProviders()` / `refresh()`
     */
    class MapView {
        constructor(svg, options) {
            this.svg = null;
            this.opt = Object.assign({}, DEFAULTS, options || {});
            this.baseX = 0;
            this.baseY = 0;
            this.baseW = 1000;
            this.baseH = 600;
            this.zoom = 1;
            this.panX = 0;
            this.panY = 0;
            this.paths = [];
            this.byPk = new Map();
            this.providers = {};
            this.styleCache = new Map();
            this.level = null;
            this.heavy = false;
            this._culling = false;
            this._frame = null;
            this._disposed = false;
            this._built = false;
            this._hover = null;
            this._downPk = null;      // pk under the pointer at pointerdown
            this._interacting = false;   // true while a drag is in progress
            this._listeners = [];
            this._onFrame = this._onFrame.bind(this);
            // the element may be supplied later (see `setSvg`), which lets the
            // owner create the <svg> itself instead of declaring it in a template
            if (svg) this.setSvg(svg);
        }

        /** Attaches to an <svg> element and binds interaction */
        setSvg(svg) {
            if (this.svg === svg) return;
            this.unbindEvents();
            this.svg = svg;
            if (svg) this._bindEvents();
        }

        unbindEvents() {
            for (const [type, fn, opts] of this._listeners) {
                this.svg.removeEventListener(type, fn, opts);
            }
            this._listeners = [];
        }

        // -------------------------------------------------------- viewport

        setBaseBox(x, y, w, h) {
            const nx = Number.isFinite(x) ? x : 0;
            const ny = Number.isFinite(y) ? y : 0;
            const nw = w > 0 ? w : 1000;
            const nh = h > 0 ? h : 1000;
            if (this.baseX === nx && this.baseY === ny && this.baseW === nw && this.baseH === nh) return false;
            this.baseX = nx;
            this.baseY = ny;
            this.baseW = nw;
            this.baseH = nh;
            this.svg.setAttribute('viewBox', `${nx} ${ny} ${nw} ${nh}`);
            return true;
        }

        /**
         * The visible user-space rectangle
         *
         * Because zoom is driven by the viewBox (`panX panY baseW/zoom
         * baseH/zoom`), the visible area *is* that box and no inverse transform
         * is needed. `preserveAspectRatio="xMidYMid meet"` letterboxes the unused
         * axis, so the painted area can be slightly narrower than this, which
         * only ever makes culling slightly conservative
         */
        get viewport() {
            return {
                x: this.panX,
                y: this.panY,
                width: this.baseW / this.zoom,
                height: this.baseH / this.zoom
            };
        }

        setViewport(x, y, zoom) {
            if (Number.isFinite(x)) this.panX = x;
            if (Number.isFinite(y)) this.panY = y;
            if (Number.isFinite(zoom)) {
                this.zoom = Math.min(this.opt.maxZoom, Math.max(this.opt.minZoom, zoom));
            }
            this._schedule();
        }

        fit() {
            this.panX = this.baseX;
            this.panY = this.baseY;
            this.zoom = 1;
            this._schedule();
        }

        /**
         * CSS pixels per user unit at the current zoom
         *
         * The viewBox is `base/zoom` wide, fitted with `meet`, so this is just
         * the fit-scale of that box
         */
        _pixelsPerUnit() {
            const rect = this.svg.getBoundingClientRect();
            if (!rect.width || !rect.height) return 0;
            const fit = Math.min(
                rect.width / (this.baseW / this.zoom),
                rect.height / (this.baseH / this.zoom)
            );
            return fit || 0;
        }

        /** User units per CSS pixel at the current zoom */
        _userPerPixel() {
            const ppu = this._pixelsPerUnit();
            return ppu ? 1 / ppu : 0;
        }

        /**
         * The rendered mapping is the viewBox
         *   (panX, panY, baseW/zoom, baseH/zoom)
         * fitted into the element with `xMidYMid meet`, so a user-space point u
         * lands at
         *
         *   px = offset + fit * (u - pan)
         *
         * where `fit` is the meet-scale for the current viewBox and `offset`
         * centres it. The helpers below are the inverse of that, which keeps
         * panning and zooming consistent with what is actually painted
         */

        /** The user-space point currently under a client pixel */
        _userAt(clientX, clientY) {
            const rect = this.svg.getBoundingClientRect();
            const viewW = this.baseW / this.zoom;
            const viewH = this.baseH / this.zoom;
            if (!rect.width || !rect.height) return null;
            const fit = Math.min(rect.width / viewW, rect.height / viewH);
            if (!fit) return null;
            const offX = (rect.width - viewW * fit) / 2;
            const offY = (rect.height - viewH * fit) / 2;
            const px = (clientX ?? rect.left + rect.width / 2) - rect.left;
            const py = (clientY ?? rect.top + rect.height / 2) - rect.top;
            return {
                x: this.panX + (px - offX) / fit,
                y: this.panY + (py - offY) / fit
            };
        }

        /** Pans by a delta expressed in CSS pixels (screen space, zoom-independent) */
        panByPixels(dxPx, dyPx) {
            const scale = this._pixelsPerUnit();
            if (!scale) return;
            this.setViewport(this.panX - dxPx / scale, this.panY - dyPx / scale, this.zoom);
        }

        /**
         * Zooms by `factor`, keeping the point under (clientX, clientY) fixed
         *
         * The viewBox is `pan + base/zoom`, so after a zoom change both the
         * fit-scale and the centring offset change. Re-derive them for the *new*
         * zoom and solve `px = offset + fit * (u - pan)` for the pan that pins the
         * anchor. Using the pre-zoom values here is what makes the map "swim"
         * away from the cursor while zooming
         */
        zoomAt(factor, clientX, clientY) {
            const nextZoom = Math.min(this.opt.maxZoom, Math.max(this.opt.minZoom, this.zoom * factor));
            if (nextZoom === this.zoom) return;
            const anchor = this._userAt(clientX, clientY);
            if (anchor) {
                const rect = this.svg.getBoundingClientRect();
                const nextW = this.baseW / nextZoom;
                const nextH = this.baseH / nextZoom;
                const fit = Math.min(rect.width / nextW, rect.height / nextH);
                if (fit) {
                    const offX = (rect.width - nextW * fit) / 2;
                    const offY = (rect.height - nextH * fit) / 2;
                    const px = (clientX ?? rect.left + rect.width / 2) - rect.left;
                    const py = (clientY ?? rect.top + rect.height / 2) - rect.top;
                    this.panX = anchor.x - (px - offX) / fit;
                    this.panY = anchor.y - (py - offY) / fit;
                }
            }
            this.zoom = nextZoom;
            this._schedule();
        }

        zoomIn() { this.zoomAt(1.3); }
        zoomOut() { this.zoomAt(1 / 1.3); }

        // ------------------------------------------------------------ data

        setData(items, resolve) {
            const svg = this.svg;
            while (svg.firstChild) svg.removeChild(svg.firstChild);
            this.paths = [];
            this.byPk.clear();
            this.styleCache.clear();
            this.level = null;
            this.heavy = false;
            this._culling = false;

            if (items && items.length) {
                const frag = document.createDocumentFragment();
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    const entry = resolve(item);
                    if (!entry || !entry[1]) continue;
                    const el = document.createElementNS(SVG_NS, 'path');
                    el.setAttribute('data-pk', String(item.pk));
                    el.setAttribute('stroke-linejoin', 'round');
                    el.setAttribute('vector-effect', 'non-scaling-stroke');
                    if (entry[2]) el.setAttribute('transform', entry[2]);
                    const rec = {
                        el,
                        pk: item.pk,
                        abbr: entry[0],
                        d: entry[1],
                        matrix: parseTransform(entry[2] || ''),
                        levels: new Map(),
                        level: null,
                        bbox: null,
                        hidden: false
                    };
                    frag.appendChild(el);
                    this.paths.push(rec);
                    this.byPk.set(item.pk, rec);
                }
                svg.appendChild(frag);
            }

            this._built = true;
            this.refresh();
            this._flush();
        }

        setProviders(providers) {
            this.providers = providers || {};
        }

        // -------------------------------------------------------- geometry

        _levelForEps(eps) {
            if (!Number.isFinite(eps) || eps <= 0) return this.opt.finestLevel;
            let level = Math.floor(Math.log2(eps));
            if (level > this.opt.coarsestLevel) level = this.opt.coarsestLevel;
            if (level < this.opt.finestLevel) level = this.opt.finestLevel;
            return level;
        }

        _geometryFor(rec, level) {
            let geo = rec.levels.get(level);
            if (geo) return geo;
            const eps = level >= this.opt.coarsestLevel ? 0 : Math.pow(2, level);
            geo = cachedSimplify(rec.d, eps);
            if (!rec.bbox) rec.bbox = transformBBox(geo.bbox, rec.matrix);
            rec.levels.set(level, geo);
            return geo;
        }

        /**
         * Applies geometry for the current level
         *
         * The first build of a large map can take a second or more of pure CPU, so
         * it is time-sliced across animation frames: the panel appears immediately
         * and fills in, instead of the tab freezing. Later level switches reuse
         * cached geometry and usually complete in a single frame
         */
        _updateLevel() {
            const perPx = this._userPerPixel();
            const level = this._levelForEps(this.opt.pixelTolerance * (perPx || 0));
            // a partial build must resume even when the level is unchanged, so
            // "which level" and "how far along" are tracked separately
            if (level === this.level && this._levelSettled()) return;
            this.level = level;

            const paths = this.paths;
            let total = this._slicePoints || 0;
            // resume where the previous slice stopped. restarting from 0 would
            // re-scan cheap paths forever and never reach the expensive tail
            let i = 0;
            while (i < paths.length && paths[i].level === level) i++;
            const deadline = now() + this.opt.buildBudgetMs;
            do {
                const rec = paths[i];
                if (rec && rec.level !== level) {
                    const geo = this._geometryFor(rec, level);
                    rec.el.setAttribute('d', geo.d);
                    rec.level = level;
                    total += geo.points;
                }
                i++;
            } while (i < paths.length && now() < deadline);

            // points are accumulated across slices, so `heavy` is only decided
            // once the whole level has been applied
            this._slicePoints = total;
            if (i >= paths.length) {
                this.heavy = total > this.opt.cullMinPoints;
                this._slicePoints = 0;
            }
        }

        /**
         * Hides shapes that are entirely outside the viewport
         *
         * Three deliberate conservatisms, because getting this wrong shows up as
         * "states near the edge vanish while panning":
         *
         *  1. A margin. `cullMargin` (a fraction of the viewport) is added on
         *     every side, so a shape is only hidden once it is clearly outside
         *  2. Hysteresis. A shape must fall outside the *larger* margin to be
         *     hidden, and re-appear as soon as it touches the *smaller* one, so
         *     it cannot flicker on and off while parked on the boundary
         *  3. No culling mid-gesture. While the pointer is down or a wheel
         *     gesture is in flight the set is frozen, because the viewport used
         *     here always lags the pointer by up to a frame
         *
         * Culling is a pure optimisation, so when in doubt we draw the shape
         */
        _cull() {
            if (!this.opt.cull || !this.heavy || this.zoom <= 1.02 || this._interacting) {
                if (this._culling) {
                    for (let i = 0; i < this.paths.length; i++) {
                        if (this.paths[i].hidden) {
                            this.paths[i].hidden = false;
                            this.paths[i].el.style.display = '';
                        }
                    }
                    this._culling = false;
                }
                return;
            }

            const box = this.viewport;
            const mx = box.width * this.opt.cullMargin;
            const my = box.height * this.opt.cullMargin;
            const showX = box.x - mx * 0.5, showY = box.y - my * 0.5;
            const showW = box.width + mx, showH = box.height + my;
            const hideX = box.x - mx, hideY = box.y - my;
            const hideW = box.width + mx * 2, hideH = box.height + my * 2;

            for (let i = 0; i < this.paths.length; i++) {
                const rec = this.paths[i];
                const b = rec.bbox;
                if (!b) continue;
                let outside;
                if (rec.hidden) {
                    // already hidden: only bring it back once it is safely inside
                    outside = b.maxX < showX || b.minX > showX + showW ||
                        b.maxY < showY || b.minY > showY + showH;
                } else {
                    outside = b.maxX < hideX || b.minX > hideX + hideW ||
                        b.maxY < hideY || b.minY > hideY + hideH;
                }
                if (outside !== rec.hidden) {
                    rec.hidden = outside;
                    rec.el.style.display = outside ? 'none' : '';
                }
            }
            this._culling = true;
        }

        // --------------------------------------------------------- styling

        _styleFor(pk) {
            const cached = this.styleCache.get(pk);
            const p = this.providers;
            const fill = p.fill ? p.fill(pk) : null;
            const stroke = p.stroke ? p.stroke(pk) : null;
            const width = p.width ? p.width(pk) : null;
            if (cached && cached.fill === fill && cached.stroke === stroke && cached.width === width) return cached;
            const next = { fill, stroke, width };
            this.styleCache.set(pk, next);
            return next;
        }

        /** Re-applies fill/stroke, touching only attributes that changed */
        refresh() {
            if (!this._built) return;
            const paths = this.paths;
            for (let i = 0; i < paths.length; i++) {
                const rec = paths[i];
                const s = this._styleFor(rec.pk);
                const el = rec.el;
                if (s.fill != null && el.getAttribute('fill') !== s.fill) el.setAttribute('fill', s.fill);
                if (s.stroke != null && el.getAttribute('stroke') !== s.stroke) el.setAttribute('stroke', s.stroke);
                const w = s.width == null ? null : String(s.width);
                if (w != null && el.getAttribute('stroke-width') !== w) el.setAttribute('stroke-width', w);
            }
        }

        // --------------------------------------------------------- rAF loop

        _schedule() {
            if (this._disposed || this._frame != null) return;
            this._frame = requestAnimationFrame(this._onFrame);
        }

        _onFrame() {
            this._frame = null;
            if (this._disposed) return;
            this._flush();
        }

        _flush() {
            // Zoom is expressed through the viewBox, not a CSS transform
            //
            // A CSS `scale()` on the <svg> makes the browser scale the *rasterized
            // layer*, which magnifies pixels (blur) and clips anything outside the
            // layer's box (states appear cut off). Driving the viewBox instead makes
            // the browser re-render true vector geometry at the new scale, so the
            // map stays sharp at every zoom level
            this.svg.setAttribute(
                'viewBox',
                `${this.panX} ${this.panY} ${this.baseW / this.zoom} ${this.baseH / this.zoom}`
            );
            this._updateLevel();
            this._cull();
            // a time-sliced build is not finished; come back next frame
            if (!this._levelSettled()) this._schedule();
        }

        /** True when every path carries geometry for the active level */
        _levelSettled() {
            if (this.level == null) return true;
            const paths = this.paths;
            for (let i = 0; i < paths.length; i++) {
                if (paths[i].level !== this.level) return false;
            }
            return true;
        }

        // ----------------------------------------------------- interaction

        pkFromEvent(e) {
            const t = e.target;
            if (!t || typeof t.getAttribute !== 'function') return null;
            const pk = t.getAttribute('data-pk');
            return pk == null ? null : Number(pk);
        }

        _bindEvents() {
            const svg = this.svg;
            const add = (type, fn, opts) => {
                svg.addEventListener(type, fn, opts);
                this._listeners.push([type, fn, opts]);
            };

            this._onPointerDown = (e) => {
                if (e.button != null && e.button !== 0) return;
                // remember what is under the pointer *before* capturing it
                this._downPk = this.pkFromEvent(e);
                this._drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
                // freeze culling for the duration of the gesture: the viewport
                // this frame lags the pointer, so culling now could briefly hide
                // a shape the user is dragging towards
                this._interacting = true;
                try { svg.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
                this.onDragStart?.();
            };
            this._onPointerMove = (e) => {
                if (this._drag && e.pointerId === this._drag.id) {
                    const dx = e.clientX - this._drag.x;
                    const dy = e.clientY - this._drag.y;
                    if (!this._drag.moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) this._drag.moved = true;
                    this._drag.x = e.clientX;
                    this._drag.y = e.clientY;
                    if (this._drag.moved) this.panByPixels(dx, dy);
                    return;
                }
                const pk = this.pkFromEvent(e);
                if (pk !== this._hover) {
                    this._hover = pk;
                    this.onHover?.(pk);
                }
            };
            this._onPointerUp = (e) => {
                if (!this._drag) return;
                const moved = this._drag.moved;
                this._drag = null;
                this._interacting = false;
                try { svg.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
                if (e.type === 'pointercancel') {
                    // the gesture was aborted, so no click will follow to consume _downPk
                    this._downPk = null;
                }
                if (moved) {
                    // swallow the click browsers synthesise after a drag
                    this._suppressClick = true;
                    setTimeout(() => {
                        this._suppressClick = false;
                        this._downPk = null;
                    }, 0);
                }
                // cull only now that the gesture is over and the viewport is final
                this._flush();
                this.onDragEnd?.(moved);
            };
            this._onPointerLeave = () => {
                if (this._hover != null) {
                    this._hover = null;
                    this.onHover?.(null);
                }
            };
            // wheel is intentionally not bound here: owners attach it to a container that
            // also covers their overlays (see js/components/mapBinder.js)
            this._onWheel = null;
            this._onClick = (e) => {
                if (this._suppressClick) return;
                // prefer the target's own pk; fall back to the one captured at
                // pointerdown, because pointer capture makes `click` target the
                // <svg> rather than the <path> (see _onPointerDown)
                const pk = this.pkFromEvent(e) ?? this._downPk;
                this._downPk = null;
                if (pk != null) {
                    e.stopPropagation();
                    this.onPick?.(pk, e);
                } else {
                    this.onPickEmpty?.(e);
                }
            };
            this._onContextMenu = (e) => e.preventDefault();

            add('pointerdown', this._onPointerDown);
            add('pointermove', this._onPointerMove);
            add('pointerup', this._onPointerUp);
            add('pointercancel', this._onPointerUp);
            add('pointerleave', this._onPointerLeave);
            // wheel is intentionally not bound here: owners attach it to a container that
            // also covers their overlays (see js/components/mapBinder.js)
            add('click', this._onClick);
            add('contextmenu', this._onContextMenu);
        }

        destroy() {
            this._disposed = true;
            if (this._frame != null) cancelAnimationFrame(this._frame);
            this._frame = null;
            if (this.svg) {
                this.unbindEvents();
                while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild);
            }
            this.paths = [];
            this.byPk.clear();
        }
    }

    const api = {
        MapView,
        parsePath,
        simplifyPath,
        cachedSimplify,
        clearGeometryCache,
        parseTransform,
        transformBBox,
        segmentsBBox
    };
    global.TCTMapView = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
