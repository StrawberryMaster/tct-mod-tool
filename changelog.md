# Changelog

## 1.5.2

Catch-up release: because I never really updated this changelog since 1.3.9 (the most recent version on Jet's), this is a simplified summary of everything that landed since then (see the git history for details).

- Migrated the tool from Vue 2 to Vue 3 (plus repeated Vue/Tailwind upgrades since) and did large cleanups across `base.js`, the components, `engine.js`, `db.js` and `sw.js`.
- Rewrote how mod files are loaded and exported: much faster loading, fixes for mods that use `JSON.parse` or comments in JSON, `jet_data` no longer gets wiped after repeated imports/exports, duplicated exported code no longer breaks editing, and non-native Code 2 elements are kept in the save. Exported code was also significantly refactored so future updates stop breaking it.
- Storage now uses IndexedDB (with a localStorage fallback) so bigger mods stay editable, plus PWA/offline support, autosave optimizations (debouncing, dirty tracking, clearer save indicator) and error handling around IndexedDB.
- Massively faster visualization of maps, especially for large custom maps (e.g. United Kingdom constituencies and Canadian riding districts):
    - Map geometry is simplified to what is actually visible at the current zoom (a 4 MB map draws as ~0.7 MB), and off-screen states are skipped while zoomed in. Zooming restores full detail automatically.
    - Panning and zooming no longer re-render the map, and editing a state's colour is instant instead of rebuilding every state shape.
    - Zoom is driven by the viewBox, so it stays sharp at every level instead of going blurry.
    - Fixed the scroll wheel scrolling the page behind the map while zooming, a stray line across some imported maps, and custom map shapes displaying as undefined.
- Custom map tooling: drag/zoom on the map preview, a standardized custom map screen, and smarter import/export (viewport fields, out-of-border SVG shapes, minified maps, `data-id` paths, better SVG area recognition). Also added a map GUI for issue scores, better issue visualisation, and dark-theme compatible maps. It can be expanded!
- CYOA: new variables system (UI + code generation), question swaps, an answer swapper (including multiple variables per swap), candidate switching, running mates in CYOA, and grouped branching events.
- Fixed CYOA tunneling (branching) being silently dropped from the export when a mod has its own hand-written `cyoAdventure`: branching is now injected between `// [JETS_CYOA_BRANCHING_START]` / `_END]` markers and is replaced (not duplicated) on re-export.
- Fixed crashes and other oddities with CYOA rules: half-configured swap rules are repaired on load by `TCTData.normalizeCyoaRules()`, incomplete rules show a warning instead of being silently skipped, some stored CYOA no longer fails to appear on-screen, and condition operators only appear when really necessary.
- Enhanced ending system: redesigned endings page, support for other ending operators, generic win/loss/tie endings, auto order/reorder fixes, and a better colour picker. It's loosely based off the page-style ending system used in Little Big Man and The Major Leagues.
- Banner settings improvements, including a fix for candidate banners not updating and the banner preview not refreshing.
- Themes and UI: new themes (including Sepia and two extra dark themes), theme refactoring, custom accent/background/text colours for headers, windows and description windows, a minimizable unified toolbar, accessibility improvements, and a large question modal for longer mods.
- New editing features: mod presets, campaign data, an add-on Code 1 editor (with TCT.net examples), live preview (start screen, game mode/difficulty selection), state visits/advisor URLs, pasting Code 2 files directly, PK editing + an election PK editor, question reordering and deletion from the picker, issue add/clone, and experimental fine-tuning of initial margins.
- Bulk tools: extra bulk options, smart random effects, delete-all-state-effects, a modernized/expanded bulk issue page, and a fix for batch edit.
- More base scenarios added (with attribution to its creators on TCT.net), plus a better scenario select.
- Assorted fixes: target multipliers not working, 2016 PKs, custom quotes breaking, running-mate creation reusing existing links, deleted issues leaving effects behind, modboxes, and many smaller ones.

## 1.3.9

- Add bulk multi state multiplier tool

## 1.3.8

- Add clone answer button

## 1.3.7

- Add fallback if PV predict fails (still need to fix)

## 1.3.6

- Add PV predictor

## 1.3.5

- Clean up sidebar to fit closer together
- Add "Add State" button as requested by S4M.

## 1.3.4

- Make it so the issue field in issue answer effect is a dropdown instead.

## 1.3.3

- Added button to clone questions easily. Clones answers, feedback, etc.

## 1.3.2

- Added option to autosave every 15 seconds. When autosave is on everytime you reload the page it will try to reload the last autosave you have.

## 1.3.1

- Added bulk state multipliers tool

## 1.3.0

- Added bulk issue score changing for one value in bulk tools

## 1.2.9

- Added ability to change all state issue scores for an issue from the issue screen.

## 1.2.8

- Added issue and issue stance description support.

## 1.2.7

- Added bulk state score tool

## 1.2.6

- Made sure initial values for answer effects were real PKs to avoid invalid PKs.

## 1.2.5

- Added ability to add/delete candidates


## 1.2.4

- Fixed bug where you can't use ']' in questions

## 1.2.3

- Fixed map preview updating

## 1.2.2

- Added ability to scale map SVGs.

## 1.2.1

- Added first version of custom map preview. You still need to click in and out to view the preview.

## 1.2.0

- Added first version of automatic custom map making from SVG import.
    - It deletes all states and things to do with states.
    - Reads svg paths and uses their ids as names.
    - Creates new candidate state multipliers and state issue scores automatically.
    - May not work with all SVGs, but confirmed to work with the few I tested.
    - If you want you can just upload a dummy code 2 and then use the tool and still code the rest manually. It should save you time.
    - If your map is weirdly sized, then resize the SVG in Inkscape or something.

## 1.1.9

- Added ability to delete states.

## 1.1.8

- Added state dropdown for state answer effects to make it easier.

## 1.1.7

- Added ability to add (basic) custom endings/code generation. You can choose from 3 variable and 3 operators.
  
## 1.1.6

- Added ability to change the lower banner image/names easily.
    - Kind of janky, need to go in and out to see image changes. But overall works.

## 1.1.5

- Fix glitchy number entry bug

## 1.1.4

- Added copy code 2 to clipboard option

## 1.1.3

- Added a list of templates from the base scenarios so people can easily load in base Code 2 files.

## 1.1.2

- Added ability to have code the persists between files.
    - Code must have a //#startcode before it.
    - Code must have a //#endcode after it.
    - There can only be one instance of those tags in your code.
    - Example:

        //#startcode
        console.log("Hello World");
        //#endcode


## 1.1.1

- Made it so imported JSON is sanitized for numbers, so cannot have NaN errors.
- Made it so when you input text it tries to convert to number when possible!
- Thanks Astro! 

## 1.1.0

- Added warning on import if duplicate PKs are found (Thanks Astro!)
- Changed the state issue score issue pk to be a dropdown menu

## 1.0.9

- Fixed horrible bug where question/answer fields would be reset upon adding!

## 1.0.8

- Changed questions to use Map instead to preserve question ordering

## 1.0.7

- Added CYOA supprt
- CYOA support does not import CYOA data from existing mods, only those made with Jet's TCT Mod Tool

## 1.0.6

- Added ability to add/delete questions!

## 1.0.5

- Added state PK field to answer state score (oops)

## 1.0.4

- Fixed new line import error for some code 2 files

## 1.0.3

- Added ability to nickname candidates and have their name show next to their pk in editor
- Started saving/loading of jet_data, so the editor can save some data with the files and save state inbetween.

## 1.0.2

- We now gracefully handle missing parts of json

## 1.0.1

- Made homepage look a bit nicer
- Added version and change log

## 1.0.0

- First released!
- Removed Herobrine
