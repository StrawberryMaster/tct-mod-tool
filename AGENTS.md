# AGENTS.md — tct-mod-tool

## Project overview

Browser-based graphical mod creation tool for the web game *The Campaign Trail* (TCT). Fork of Jet Simon's tool with Vue 3 upgrade, smarter autosave, and revamped UI.

**Zero build step.** Plain HTML/JS/CSS served as static site (GitHub Pages). No npm, no bundler, no linter, no tests.

## Stack

- **Vue 3** — bundled copy at `js/vue3.js` (Options API, inline template strings)
- **Tailwind CSS** — standalone build at `js/tailwind.js` (utility classes in HTML)
- **IndexedDB** — custom wrapper `js/db.js` (stores: `settings`, `autosaves`, `presets`); falls back to `localStorage`
- **Service Worker** — `sw.js` for offline support

## File layout

```
index.html             — main SPA (mounts #app)
code1.html             — secondary page (separate Vue app)
js/
  base.js              — TCTData class (data model, import/export, code gen, ~3767 lines)
  vueInit.js           — Vue app creation, autosave wiring, data loading, global helpers
  db.js                — IndexedDB wrapper (230 lines)
  autosave.js          — shared autosave controller (dirty tracking, dedupe, idle writes)
  mapview.js           — TCTMapView: fast SVG map renderer (decimation, pan/zoom, culling)
  components/
    mapBinder.js       — Vue bridge for TCTMapView (keeps Vue out of the map DOM)
    editor.js          — toolbar + editor shell
    pickers.js         — navigation pickers (questions, states, issues, candidates)
    questionAnswer.js  — question & answer editing
    stateCandidateIssues.js — state, candidate, issue editing
    cyoa.js            — CYOA (branching, question/answer swaps, variables, bunnyhop)
    bannerSettings.js  — banner image/name settings
    endings.js         — multiple endings editor
    mapping.js         — map preview component
    bulk.js            — bulk editing tools
public/*.txt           — 28 base scenario Code 2 templates (loaded by name)
tools/
  test-map.js           — runs every map test: `node tools/test-map.js [code2.txt]`
```

## Key architecture patterns

- **Component registration**: `window.registerComponent('name', { template: \`...\`, data, methods, computed })`. Components queue until Vue app mounts, then registered globally.
- **Global reactive state**: `window.$TCT` (reactive `TCTData` instance), `window.$globalData` (reactive object with `mode`, `question`, `state`, `issue`, `candidate`, `dataVersion`, `filename`).
- **Reactivity trigger**: Every data mutation must increment `$globalData.dataVersion++` (triggers Vue re-renders for computed properties that reference it).
- **Maps are NOT Vue-rendered**: `js/mapview.js` owns the `<svg>` subtree of every map. Never add a `v-for` over map paths — Vue re-diffing megabytes of `d` geometry is what made large maps unusable. Instead:
  - Put an empty host element in the template (`<div data-map-host="inline">`).
  - Build a binder with `createMapBinder(this, { getEntries, getItems, getBaseBox, resolve, getFill, getStroke, getStrokeWidth, onPick, onHover })`, then `binder.attach(selector)`.
  - Keep `mapBinders` (array) and call `mountMaps()` / `destroyMaps()` / `refreshMaps()`.
  - Bump `mapStyleVersion` when only colours change; its watcher calls `refreshMaps()`, which writes just the changed attributes. Never rebuild geometry for a colour change.
- **Autosave**: Call `window.requestAutosaveIfEnabled?.()` after each mutation. It is **cheap** — it only marks the data dirty and schedules a write; it never serializes. `js/autosave.js` then decides whether to actually export/write:
  1. *cheap gate* — nothing dirty and `$globalData.dataVersion` unchanged since the last write → skipped in O(1) (navigating between questions, switching tabs, opening panels).
  2. *content gate* — the `exportCode2()` payload is FNV-1a hashed and compared to the last written one → identical content is not written (undone edits, re-renders that only bump `dataVersion`).
  3. *single flight* — never two exports/writes at once; edits landing mid-export trigger exactly one debounced follow-up pass.
  4. *idle first* — `requestIdleCallback` (2s deadline) after a 600ms debounce, with a 4s `maxWait` cap so continuous typing still saves periodically.
  5. *lifecycle* — pending work is flushed on `visibilitychange`/`pagehide`/`beforeunload`; a 15s interval remains only as a safety net for mutations that forget to call the hook (it costs O(1) when clean).
  Failures never busy-loop; the state stays dirty and the next tick retries. `window.$autosaveStats()` (and `$code1AutosaveStats()` on the Code 1 page) returns counters for debugging.
  Explicit saves (`window.saveAutosave()`) bypass both gates so the user's click always writes.
  Loads/replaces of data do **not** bump `dataVersion`, so `loadData()` in `js/vueInit.js` calls `requestAutosaveIfEnabled()` explicitly.
  Every settled flush dispatches `<eventName>:settled` (e.g. `tct:autosaved:settled`) with `{wrote, failed, reason, pending}` so UI can show "Saved"/"Saved just now"/"Save failed" instead of a permanent "Saving...". Because a skipped write fires it with `wrote: false`, the status always resolves.
- **Code 1 page** mirrors this via `window.requestCode1AutosaveIfEnabled()` / `requestCode1AutosaveDebounced(delay)`; its deep Vue watcher only marks dirty and lets the controller decide.
- **Templates loaded from `public/*.txt`** — fetched via HTTP and parsed by `loadDataFromFile()` in `base.js`.
- **Themes**: 6 themes (`light`, `sepia`, `dark`, `mallard`, `xp-olive`, `xp-silver`) via `data-theme` attribute + CSS custom properties.
- **Tooltips**: Plain HTML `title` attribute (no tooltip library).
- **PK changes**: Use `window.$promptChangePk(type, oldPk)` — handles reference updates across all collections.

## Data model (TCTData class at `js/base.js:831`)

```
questions (Map)         — pk → question object
answers (object)        — pk → answer object
issues (object)         — pk → issue object
states (object)         — pk → state object
state_issue_scores      — pk → { fields: { state, issue, score } }
candidate_issue_score   — pk → { fields: { candidate, issue, score } }
candidate_state_multiplier — pk → { fields: { candidate, state, multiplier } }
answer_score_global     — pk → { fields: { answer, score } }
answer_score_issue      — pk → { fields: { answer, issue, score } }
answer_score_state      — pk → { fields: { answer, state, score } }
answer_feedback         — pk → { fields: { answer, feedback } }
jet_data                — CYOA config, endings, banners, presets, mapping, bunnyhop
highest_pk              — auto-incrementing PK counter
```

All records have `{ pk, fields: { ... }, model: "..." }` structure. Questions use a `Map` (to preserve insertion order); everything else is a plain object.

## CYOA system (`js/base.js:2960+`, `js/components/cyoa.js`)

- **noCounter**: Internal counter `e.noCounter = player_answers.length` — counts questions already answered. A condition value of N activates after question N (i.e., before question N+1). Displayed as "Question number" in UI.
- **CYOA variables**: Stored in `jet_data.cyoa_variables` — user-defined name/value pairs with auto-incrementing `id`. Names must be valid JS identifiers (no spaces, e.g. `primarywins`/`primary_wins`/`primaryWins`) because they are emitted verbatim by `getCYOACode()` (`var <name> = <default>;`); validate them with `TCTData.validateCyoaVariableName(name, excludeId)` / `isValidCyoaVariableName(name)`. Renaming an existing variable must go through `TCTData.renameCyoaVariable(oldName, newName)`, which rewrites every stored reference: `cyoa_variable_effects`, `cyoa_campaign_data_stats` (incl. auto-generated labels), conditions in `cyoa_data` / `cyoa_question_swaps` / `cyoa_answer_swaps` / `cyoa_candidate_switches`, and endings (`variableConditions`, legacy `variableConditionName`, `endingSlidesJson` slides).
- **CYOA events** (branching): answer triggers → condition check → question jump.
- **Question/Answer swaps**: Post-answer swaps that modify future question/answer positions. Stored in `jet_data.cyoa_question_swaps` / `cyoa_answer_swaps`.
- **Rule shape normalization**: The export replacer in `exportCode2()` strips `null` and empty arrays, so a rule saved before it was fully configured reloads without `triggers`/`conditions`. `TCTData.normalizeCyoaRules()` (in `base.js`) repairs every rule in `TCTData.CYOA_RULE_STORES()` and is applied by `loadDataFromFile()`, so imported data is correct before it becomes reactive. `TCTAnswerSwapHelper.normalizeRuleArrays()` in `cyoa.js` is a thin in-session fallback.
  - **Never repair reactive state from a computed getter.** `normalizeRuleArrays()` is reachable from `getRule()`, which is used by computeds (`rule`, `isIncomplete`, `validSwaps`). It must be a no-op on valid data — assigning a fresh array (e.g. via `.filter()`) every call invalidates the calling computed and spins the renderer forever, freezing the tab. Mutate in place (`splice`) and guard every write. `tools/test-swaps.js` asserts zero writes over repeated evaluation.
- **Bunnyhop**: Shuffles question pools (`jet_data.bunnyhop_pools`).
- **Generated code**: `getCYOACode()` at `base.js:2939` emits the `cyoAdventure` function.

## Common tasks

- **Export**: `this.$TCT.exportCode2()` at `base.js:2205` — generates full Code 2 string (JSON data + CYOA + endings + banner + bunnyhop + custom code).
- **Custom code**: Stored in `jet_data.code_to_add`, wrapped between `//#startcode` / `//#endcode` markers.
- **Code 1 tool**: Separate page at `code1.html` with its own Vue app in `js/code1/`.
- **Debug**: Check `window.$TCT`, `window.$globalData` in browser console.
