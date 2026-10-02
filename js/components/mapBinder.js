/*
 * Basically this glues a Vue component to TCTMapView.MapView
 *
 * The point of this file is to keep Vue's reactivity *out* of the map, so the
 * map's <svg> subtree is created *once* and then mutated imperatively, so a data
 * change costs a few hundred attribute writes instead of a re-diff of megabytes
 * of path geometry. whew!
 *
 * Usage inside a component:
 *   mounted()            { this.mapBinder = createMapBinder(this, {...}).attach(); }
 *   watch: dataVersion   { this.mapBinder.refresh(); }
 *   beforeUnmount()      { this.mapBinder.destroy(); }
 */
(function (global) {
    'use strict';

    const SVG_NS = 'http://www.w3.org/2000/svg';

    function createMapBinder(component, config) {
        const view = new global.TCTMapView.MapView(null, config.options || {});
        let attached = false;
        let lastItems = null;
        let lastEntries = null;
        let destroyed = false;
        // wheel listeners live on the host, so they must be torn down separately
        const wheelGuards = [];

        // the <svg> is created here rather than declared in the template so Vue
        // never gets a chance to patch it
        function buildSvg() {
            const svg = document.createElementNS(SVG_NS, 'svg');
            svg.setAttribute('version', '1.1');
            svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            svg.style.width = '100%';
            svg.style.height = '100%';
            svg.style.display = 'block';
            svg.style.touchAction = 'none';
            // cursor is owned by MapView (it tracks hover + drag, see
            // MapView._updateCursor); seeding it here keeps it sane before the
            // first pointermove arrives
            svg.style.cursor = 'grab';
            svg.style.userSelect = 'none';
            return svg;
        }

        /**
         * Wheel handling
         */
        function attachWheelGuard(host) {
            const onWheel = (evt) => {
                evt.preventDefault();
                view.zoomAt(evt.deltaY < 0 ? 1.15 : 1 / 1.15, evt.clientX, evt.clientY);
                view.onZoom?.();
            };
            host.addEventListener('wheel', onWheel, { passive: false, capture: true });
            host.style.overscrollBehavior = 'contain';
            wheelGuards.push([host, onWheel]);
        }

        function attach(hostSelector) {
            if (attached || destroyed) return api;
            attached = true;
            // MapView accepts its element late, so listeners bind exactly once
            view.setSvg(buildSvg());

            view.onPick = (pk, event) => config.onPick?.(pk, event);
            view.onPickEmpty = (event) => config.onPickEmpty?.(event);
            view.onHover = (pk) => config.onHover?.(pk);
            view.onZoom = () => config.onZoom?.(view.zoom);

            const host = typeof hostSelector === 'string'
                ? component.$el.querySelector(hostSelector)
                : hostSelector;
            if (!host) {
                console.warn('TCTMapBinder: host element not found');
                return api;
            }
            host.appendChild(view.svg);
            attachWheelGuard(host);
            api.svg = view.svg;
            api.host = host;
            api.sync(true);
            return api;
        }

        const api = {
            view,
            svg: null,
            host: null,

            attach,

            /** re-reads data from the component */
            sync(force = false) {
                if (destroyed || !view.svg) return;
                const entries = config.getEntries();
                const items = config.getItems();
                const box = config.getBaseBox();

                if (view.setBaseBox(box.x, box.y, box.width, box.height)) {
                    view.fit();
                }

                const changed = force || entries !== lastEntries || items !== lastItems;
                lastEntries = entries;
                lastItems = items;
                if (changed) {
                    view.setProviders({
                        fill: config.getFill,
                        stroke: config.getStroke,
                        width: config.getStrokeWidth
                    });
                    view.setData(items, config.resolve);
                } else {
                    view.refresh();
                }
            },

            /** re-applies colours only (selection, hover, value changes) */
            refresh() {
                if (destroyed || !view.svg) return;
                view.refresh();
            },

            /** used after the host element is re-created (e.g. modal open) */
            reattach(hostSelector) {
                if (destroyed) return;
                if (view.svg && view.svg.parentNode) view.svg.parentNode.removeChild(view.svg);
                lastItems = null;
                lastEntries = null;
                attach(hostSelector);
            },

            zoomIn() { view.zoomIn(); },
            zoomOut() { view.zoomOut(); },
            fit() { view.fit(); },
            get zoom() { return view.zoom; },

            destroy() {
                destroyed = true;
                for (const [host, onWheel] of wheelGuards) {
                    host.removeEventListener('wheel', onWheel, { capture: true });
                    host.style.overscrollBehavior = '';
                }
                wheelGuards.length = 0;
                view.destroy();
            }
        };

        return api;
    }

    global.createMapBinder = createMapBinder;
})(typeof globalThis !== 'undefined' ? globalThis : this);
