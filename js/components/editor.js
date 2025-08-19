// Modern component registration using Vue 3 patterns
window.defineComponent('toolbar', {

    data() {
        return {
            localAutosaveEnabled: autosaveEnabled,
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

        toggleAutosave: function (evt) {
            if (!autosaveEnabled) {
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

        fileUploaded: function (evt) {
            const file = evt.target.files[0];

            if (file) {
                var reader = new FileReader();
                reader.readAsText(file, "UTF-8");

                // remove JS-style comments but preserve strings
                // this lets mods such as the original Obamanation display here
                const stripJsonComments = (input) => {
                    let out = '';
                    let i = 0;
                    let inString = false;
                    let stringChar = '';
                    let escape = false;
                    let inSingleLine = false;
                    let inMultiLine = false;

                    while (i < input.length) {
                        const ch = input[i];
                        const chNext = input[i + 1];

                        if (inSingleLine) {
                            if (ch === '\n' || ch === '\r') {
                                inSingleLine = false;
                                out += ch;
                            }
                            // otherwise skip
                            i++;
                            continue;
                        }

                        if (inMultiLine) {
                            if (ch === '*' && chNext === '/') {
                                inMultiLine = false;
                                i += 2;
                                continue;
                            }
                            i++;
                            continue;
                        }

                        if (inString) {
                            out += ch;
                            if (!escape && ch === stringChar) {
                                inString = false;
                                stringChar = '';
                            }
                            escape = (!escape && ch === '\\') ? true : false;
                            i++;
                            continue;
                        }

                        // not in string/comment
                        if (ch === '"' || ch === "'") {
                            inString = true;
                            stringChar = ch;
                            out += ch;
                            i++;
                            continue;
                        }

                        // single-line comment
                        if (ch === '/' && chNext === '/') {
                            inSingleLine = true;
                            i += 2;
                            continue;
                        }

                        // multi-line comment
                        if (ch === '/' && chNext === '*') {
                            inMultiLine = true;
                            i += 2;
                            continue;
                        }

                        out += ch;
                        i++;
                    }

                    return out;
                };

                reader.onload = (evt) => {
                    try {
                        const raw = evt.target.result;
                        // preserve original (with comments) for export
                        Vue.prototype.$TCT_raw = raw;

                        // strip comments before handing to loader
                        const stripped = stripJsonComments(raw);

                        // parse!
                        Vue.prototype.$TCT = loadDataFromFile(stripped);
                        Vue.prototype.$globalData.question = Array.from(Vue.prototype.$TCT.questions.values())[0].pk;
                        Vue.prototype.$globalData.state = Object.values(Vue.prototype.$TCT.states)[0].pk;
                        Vue.prototype.$globalData.issue = Object.values(Vue.prototype.$TCT.issues)[0].pk;
                        Vue.prototype.$globalData.candidate = getListOfCandidates()[0][0];
                        Vue.prototype.$globalData.filename = file.name;
                    } catch (e) {
                        alert("Error parsing uploaded file: " + e)
                    }

                }
                reader.onerror = function (evt) {
                    alert("Error reading uploaded file!")
                }
            }


        },

        importCode2: function () {
            const input = document.getElementById("file");
            input.click();
        },

        // Build the answerSwapper function text
        buildAnswerSwapperFunction() {
            return `
function answerSwapper(pk1, pk2, takeEffects = true) {
    // hardcoded JSON data for answers
    const answerData = campaignTrail_temp.answers_json;

    // find the indices of the objects with the specified PKs
    const index1 = answerData.findIndex(item => item.pk === pk1);
    const index2 = answerData.findIndex(item => item.pk === pk2);

    // check if objects with those PKs exist
    if (index1 === -1 || index2 === -1) {
        return;
    }

    // swap the question values
    const tempQuestion = answerData[index1].fields.question;
    answerData[index1].fields.question = answerData[index2].fields.question;
    answerData[index2].fields.question = tempQuestion;

    // if takeEffects is true, answers swap effects also
    if (takeEffects) {
        const otherJsons = [
            campaignTrail_temp.answer_score_global_json,
            campaignTrail_temp.answer_score_issue_json,
            campaignTrail_temp.answer_score_state_json
        ];

        otherJsons.forEach(jsonData => {
            jsonData.forEach(item => {
                if (item.fields.answer === pk1) {
                    item.fields.answer = pk2;
                }
            });
        });
    }
}
`.trim();
        },

        // Build the rules block from jet_data.cyoa_answer_swaps
        buildAnswerSwapBlocks() {
            const rulesSrc = Vue.prototype.$TCT.jet_data?.cyoa_answer_swaps || {};
            const rules = Object.values(rulesSrc);
            if (!rules.length) return '';

            const blocks = rules.map(rule => {
                const triggers = Array.isArray(rule.triggers) ? rule.triggers.filter(x => Number.isFinite(x)) : [];
                const swaps = Array.isArray(rule.swaps) ? rule.swaps.filter(s => Number.isFinite(s?.pk1) && Number.isFinite(s?.pk2)) : [];
                if (!triggers.length || !swaps.length) return '';

                const triggerCond = triggers.map(pk => `ans == ${pk}`).join(' || ');
                const swapLines = swaps.map(s => {
                    const take = (s.takeEffects === false) ? 'false' : 'true';
                    return `answerSwapper(${s.pk1}, ${s.pk2}, ${take});`;
                }).join('\n        ');

                const hasCond = rule.condition && rule.condition.variable;
                if (hasCond) {
                    const comp = rule.condition.comparator || '>=';
                    const val = Number.isFinite(Number(rule.condition.value)) ? Number(rule.condition.value) : 0;
                    return `if (${triggerCond}) {\n    if (${rule.condition.variable} ${comp} ${val}) {\n        ${swapLines}\n    }\n}`;
                }
                return `if (${triggerCond}) {\n    ${swapLines}\n}`;
            }).filter(Boolean);

            if (!blocks.length) return '';

            // Keep a readable header inside the injected section
            return `// answer swap CYOA here\n${blocks.join('\n')}`;
        },

        // Helper to indent a multi-line block with a given indent string.
        indentBlock(block, indent) {
            if (!block) return '';
            return block
                .split('\n')
                .map(line => (line.trim().length ? indent + line : line))
                .join('\n');
        },

        // Insert swap blocks inside cyoAdventure = function (a) { ... } body, neatly indented.
        insertSwapsInsideCyoAdventure(out, blocks) {
            if (!blocks.trim()) return out;

            // Clean up any legacy BEGIN/END wrapped blocks from older exports
            out = out.replace(/\/\/\s*BEGIN_TCT_ANSWER_SWAP_RULES[\s\S]*?\/\/\s*END_TCT_ANSWER_SWAP_RULES\s*/m, '');

            // Find cyoAdventure function (assignment form preferred)
            const reAssign = /cyoAdventure\s*=\s*function\s*\(\s*a\s*\)\s*\{/m;
            let m = reAssign.exec(out);
            let openIdx;

            if (m) {
                openIdx = m.index + m[0].length - 1; // position of '{'
            } else {
                // Fallback: named function
                const reNamed = /function\s+cyoAdventure\s*\(\s*a?\s*\)\s*\{/m;
                m = reNamed.exec(out);
                if (!m) {
                    // As last resort, just append at end without indentation
                    return out + `\n\n${blocks}\n`;
                }
                openIdx = m.index + m[0].length - 1;
            }

            // Find matching closing brace to get function body range
            let i = openIdx;
            let depth = 0;
            let closeIdx = -1;
            for (; i < out.length; i++) {
                const ch = out[i];
                if (ch === '{') depth++;
                else if (ch === '}') {
                    depth--;
                    if (depth === 0) { closeIdx = i; break; }
                }
            }
            if (closeIdx === -1) {
                // malformed; append at end
                return out + `\n\n${blocks}\n`;
            }

            const bodyStart = openIdx + 1;
            let body = out.slice(bodyStart, closeIdx);

            // Prefer to insert after the 'ans =' assignment if present
            const ansRe = /\bans\s*=\s*campaignTrail_temp\.player_answers\s*\[\s*campaignTrail_temp\.player_answers\.length\s*-\s*1\s*\]\s*;?/m;
            let insertPosInBody = -1;
            let indentForInsert = '    '; // default to 4 spaces
            const ansMatch = ansRe.exec(body);
            if (ansMatch) {
                insertPosInBody = ansMatch.index + ansMatch[0].length;
                // compute indent from that line
                const lineStart = body.lastIndexOf('\n', ansMatch.index) + 1;
                const line = body.slice(lineStart, ansMatch.index);
                const leadingSpaces = line.match(/^\s*/)?.[0] || '';
                indentForInsert = leadingSpaces || indentForInsert;
            } else {
                // More generic fallback: first 'ans =' assignment
                const genericAnsRe = /\bans\s*=\s*[^;]+;/m;
                const m2 = genericAnsRe.exec(body);
                if (m2) {
                    insertPosInBody = m2.index + m2[0].length;
                    const lineStart = body.lastIndexOf('\n', m2.index) + 1;
                    const line = body.slice(lineStart, m2.index);
                    const leadingSpaces = line.match(/^\s*/)?.[0] || '';
                    indentForInsert = leadingSpaces || indentForInsert;
                }
            }

            // If a previous header exists, replace from that header to the next same-indentation comment or end of body
            const headerRe = /^(\s*)\/\/\s*answer swap CYOA here.*$/m;
            const headerMatch = headerRe.exec(body);
            if (headerMatch) {
                const headerIndent = headerMatch[1] || '';
                const afterHeader = body.slice(headerMatch.index + headerMatch[0].length);
                // next comment at the same indentation (not our header)
                const nextOtherCommentRe = new RegExp(`^${headerIndent}//(?!\\s*answer swap CYOA here).*`, 'm');
                const nextOther = nextOtherCommentRe.exec(afterHeader);
                const replaceEndInBody = headerMatch.index + headerMatch[0].length + (nextOther ? nextOther.index : afterHeader.length);
                const newSection = this.indentBlock(blocks, headerIndent);
                body = body.slice(0, headerMatch.index) + newSection + body.slice(replaceEndInBody);
                return out.slice(0, bodyStart) + body + out.slice(closeIdx);
            }

            // Prepare neat, indented payload with the header included in 'blocks'
            const indentedPayload = '\n' + this.indentBlock(blocks, indentForInsert) + '\n';

            if (insertPosInBody >= 0) {
                // Insert right after ans assignment
                const newBody = body.slice(0, insertPosInBody) + indentedPayload + body.slice(insertPosInBody);
                return out.slice(0, bodyStart) + newBody + out.slice(closeIdx);
            } else {
                // Insert at top of body
                const newBody = '\n' + this.indentBlock(blocks, indentForInsert) + '\n' + body;
                return out.slice(0, bodyStart) + newBody + out.slice(closeIdx);
            }
        },

        // Inject function and blocks into exported code with precise placement.
        injectAnswerSwapIntoCode2(code) {
            let out = String(code || '');

            // 1) Ensure function is added right after getQuestionNumberFromPk (or fallback)
            out = this.insertSwapperAfterHelper(out);

            // 2) Build blocks and insert inside cyoAdventure with clean indentation (header only, no BEGIN/END)
            const blocks = this.buildAnswerSwapBlocks();
            out = this.insertSwapsInsideCyoAdventure(out, blocks);

            return out;
        },

        exportCode2: function () {
            let f = Vue.prototype.$TCT.exportCode2();
            // Inject Answer Swapper code and rules
            f = this.injectAnswerSwapIntoCode2(f);

            let element = document.createElement('a');
            element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(f));
            element.setAttribute('download', Vue.prototype.$globalData.filename);

            element.style.display = 'none';
            document.body.appendChild(element);

            element.click();

            document.body.removeChild(element);
        },

        clipboardCode2: function () {
            let f = Vue.prototype.$TCT.exportCode2();
            // Inject Answer Swapper code and rules
            f = this.injectAnswerSwapIntoCode2(f);
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

        currentMode: function () {
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