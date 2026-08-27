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
  vueInit.js           — Vue app creation, autosave, data loading, global helpers
  db.js                — IndexedDB wrapper (230 lines)
  engine.js            — map rendering engine
  components/
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
```

## Key architecture patterns

- **Component registration**: `window.registerComponent('name', { template: \`...\`, data, methods, computed })`. Components queue until Vue app mounts, then registered globally.
- **Global reactive state**: `window.$TCT` (reactive `TCTData` instance), `window.$globalData` (reactive object with `mode`, `question`, `state`, `issue`, `candidate`, `dataVersion`, `filename`).
- **Reactivity trigger**: Every data mutation must increment `$globalData.dataVersion++` (triggers Vue re-renders for computed properties that reference it).
- **Autosave**: Call `window.requestAutosaveIfEnabled?.()` after each mutation. Autosaves every 15s to IndexedDB.
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
- **CYOA variables**: Stored in `jet_data.cyoa_variables` — user-defined name/value pairs with auto-incrementing `id`.
- **CYOA events** (branching): answer triggers → condition check → question jump.
- **Question/Answer swaps**: Post-answer swaps that modify future question/answer positions. Stored in `jet_data.cyoa_question_swaps` / `cyoa_answer_swaps`.
- **Bunnyhop**: Shuffles question pools (`jet_data.bunnyhop_pools`).
- **Generated code**: `getCYOACode()` at `base.js:2939` emits the `cyoAdventure` function.

## Common tasks

- **Export**: `this.$TCT.exportCode2()` at `base.js:2205` — generates full Code 2 string (JSON data + CYOA + endings + banner + bunnyhop + custom code).
- **Custom code**: Stored in `jet_data.code_to_add`, wrapped between `//#startcode` / `//#endcode` markers.
- **Code 1 tool**: Separate page at `code1.html` with its own Vue app in `js/code1/`.
- **Debug**: Check `window.$TCT`, `window.$globalData` in browser console.
