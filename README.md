# [The Campaign Trail Mod Tool](https://strawberrymaster.github.io/tct-mod-tool/)

For context, this is a fork of [Jet's The Campaign Trail Mod Tool](https://jetsimon.com/Jets-The-Campaign-Trail-Mod-Tool-Website/). The main difference here is that it implements several of [madbailey](https://github.com/madbailey)'s changes on their fork of the aforementioned tool, including the revamped layout for editing questions and state scores. Some other advancements include:
* Upgraded to Vue 3, which brings improved performance
    * Especially when working with large mods!
* Reactive elements for a smoother user experience - no more switching between states to see changes
* A smarter-ish autosave system that reduces data loss
* Modernizations for better code organization and maintainability
* A couple of revamped sections, such as the CYOA and State tabs, for consistency (and following madbailey's lead)
* Other accessibility improvements

This also includes a Vue 3 port of the Code 1 tool (also from Jet, which you can find <a href="https://jetsimon.com/jets-code-one-tool/" target="_blank" rel="noopener noreferrer">here</a>). To access it, open the toolbar and click "Code 1 Editor here" to access it.

----

This is a graphical mod creation tool for [The Campaign Trail](https://www.americanhistoryusa.com/campaign-trail/).

Currently it supports importing code 2 files and then exporting them to share with others. If you do not have a code 2 to base off of, you can find them in the modding community or use [one I have here](https://raw.githubusercontent.com/JetSimon/Jets-The-Campaign-Trail-Mod-Tool/main/src/default_code2.js) as a default.

**Features**

* You (should) be able to import any existing code 2 and keep working off of it. If yours doesn't work please let me know so I can make it work! I've tested on ~10 and they work.
* Complete GUI interface - no coding strictly required
* Ability to add and delete answers and provides a centralized place to modify answer effects and feedback without flipping around files
* Change state margins
* Change issue effects
* Generates new PKs automatically
* Export and share
* Has the ability to make CYOA mods! (Cannot import existing CYOA data from mods made outside of this program).

**What this modding tool CANNOT do (yet):**

* Code 1 creation (though this part is generally seen as the “easier” part of modding, so I think you guys got this!)
* Does not support custom endings, or any other non-listed mods that involve custom JavaScript
* Does not add any aesthetic changes to the end of code 2. You’ll have to add those manually after export.

[Use it here in browser!](https://jetsimon.com/Jets-The-Campaign-Trail-Mod-Tool-Website/)

If you have any issues report them on the GitHub in the issues tab.

Happy mod making,

Jet
