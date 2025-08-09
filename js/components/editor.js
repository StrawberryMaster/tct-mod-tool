// Modern component registration using Vue 3 patterns
window.defineComponent('toolbar', {

    data() {
        return {
            localAutosaveEnabled : autosaveEnabled,
        };
    },
    template: `
    <div class="flex flex-wrap mx-auto p-4">
        <input type="file" id="file" style="display:none;" @change="fileUploaded($event)"></input>
        <button class="bg-gray-300 p-2 m-2 rounded hover:bg-gray-500" v-on:click="importCode2()">Import Code 2</button>
        <button class="bg-gray-300 p-2 m-2 rounded hover:bg-gray-500" v-on:click="exportCode2()">Export Code 2</button>
        <button class="bg-gray-300 p-2 m-2 rounded hover:bg-gray-500" v-on:click="clipboardCode2()">Copy to Clipboard</button>
        <button class="bg-gray-300 p-2 m-2 rounded hover:bg-gray-500" v-on:click="toggleAutosave()">{{localAutosaveEnabled ? "Disable Autosave" : "Enable Autosave"}}</button>
        <a href="https://jetsimon.com/jets-code-one-tool/" class="bg-gray-300 p-2 m-2 rounded hover:bg-gray-500">Code 1 Tool Here</a>
    </div>
    `,

    methods: {

        toggleAutosave : function(evt) {
            if(!autosaveEnabled) {
                localStorage.setItem("autosaveEnabled", "true");
                startAutosave();
            }
            else {
                localStorage.setItem("autosaveEnabled", "false");
                clearInterval(autosaveFunction);
            }

            autosaveEnabled = localStorage.getItem("autosaveEnabled") == "true";
            // keep global mirror in sync
            window.autosaveEnabled = autosaveEnabled;

            this.localAutosaveEnabled = autosaveEnabled;
        },

        fileUploaded: function(evt) {
            const file = evt.target.files[0];
            
            if (file) {
                var reader = new FileReader();
                reader.readAsText(file, "UTF-8");
                reader.onload = function (evt) {
                    try {
                        Vue.prototype.$TCT = loadDataFromFile(evt.target.result);
                        Vue.prototype.$globalData.question = Array.from(Vue.prototype.$TCT.questions.values())[0].pk;
                        Vue.prototype.$globalData.state = Object.values(Vue.prototype.$TCT.states)[0].pk;
                        Vue.prototype.$globalData.issue = Object.values(Vue.prototype.$TCT.issues)[0].pk;
                        Vue.prototype.$globalData.candidate = getListOfCandidates()[0][0];
                        Vue.prototype.$globalData.filename = file.name;
                    } catch(e) {
                        alert("Error parsing uploaded file: " + e)
                    }
                    
                }
                reader.onerror = function (evt) {
                    alert("Error reading uploaded file!")
                }
            }
            
            
        },

        importCode2: function() {
            const input = document.getElementById("file");
            input.click();
        },

        exportCode2: function() {
            const f = Vue.prototype.$TCT.exportCode2();

            let element = document.createElement('a');
            element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(f));
            element.setAttribute('download', Vue.prototype.$globalData.filename);

            element.style.display = 'none';
            document.body.appendChild(element);

            element.click();

            document.body.removeChild(element);
        },

        clipboardCode2: function() {
            const f = Vue.prototype.$TCT.exportCode2();
            navigator.clipboard.writeText(f);
        }
    }
})

window.defineComponent('editor', {
    template: `
    <div class="mx-auto bg-gray-100 p-4">

        <question v-if="currentMode == 'QUESTION'" :pk="parseInt(question)"></question>
        <state v-if="currentMode == 'STATE'" :pk="state"></state>
        <issue v-if="currentMode == 'ISSUE'" :pk="issue"></issue>
        <candidate v-if="currentMode == 'CANDIDATE'" :pk="candidate"></candidate>
        <cyoa v-if="currentMode == 'CYOA'"></cyoa>
        <endings v-if="currentMode == 'ENDINGS'"></endings>
        <mapping v-if="currentMode == 'MAPPING'"></mapping>
        <banner-settings v-if="currentMode == 'BANNER'"></banner-settings>
        <bulk v-if="currentMode == 'BULK'"></bulk>
    </div>
    `,

    computed: {

        currentMode: function() {
            return Vue.prototype.$globalData.mode;
        },

        question: function () {
            return Vue.prototype.$globalData.question;
        },

        state: function () {
            return Vue.prototype.$globalData.state;
        },

        issue: function () {
            return Vue.prototype.$globalData.issue;
        },

        candidate: function () {
            return Vue.prototype.$globalData.candidate;
        },
    }
})