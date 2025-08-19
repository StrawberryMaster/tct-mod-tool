window.defineComponent('cyoa', {

    data() {
        return {
            temp_events: [],
            tick: 0
        };
    },

    template: `
    <div class="mx-auto bg-white rounded-lg shadow p-4">
        <div class="flex items-center justify-between mb-3">
            <h1 class="font-bold text-xl">CYOA Options</h1>
            <div class="space-x-2">
                <button v-if="!enabled" class="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600" v-on:click="toggleEnabled()" aria-label="Enable CYOA">Enable</button>
                <button v-else class="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600" v-on:click="toggleEnabled()" aria-label="Disable CYOA">Disable</button>
            </div>
        </div>

        <div v-if="enabled" class="space-y-4">
            <!-- Variables Section -->
            <details open class="bg-gray-50 rounded border">
                <summary class="px-3 py-2 font-medium cursor-pointer">CYOA Variables</summary>
                <div class="p-3 space-y-3">
                    <div class="flex items-center gap-2">
                        <button 
                            class="bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600" 
                            v-on:click="addVariable()"
                        >
                            Add Variable
                        </button>
                        <span class="text-sm text-gray-600" v-if="cyoaVariables.length">Total: {{ cyoaVariables.length }}</span>
                    </div>
                    <p v-if="cyoaVariables.length === 0" class="text-gray-500 italic">No variables yet. Click "Add Variable" to create one.</p>
                    <div v-else class="space-y-2">
                        <cyoa-variable @deleteVariable="deleteVariable" :id="variable.id" :key="variable.id" v-for="variable in cyoaVariables"></cyoa-variable>
                    </div>
                </div>
            </details>

            <!-- Branching Events Section -->
            <div class="mb-2 flex items-center gap-2">
                <button 
                    class="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed" 
                    v-on:click="addCyoaEvent()" 
                    :disabled="!canAdd"
                    :title="canAdd ? 'Add a new branching rule' : 'Need at least one question and one answer'"
                >
                    Add CYOA Event
                </button>
                <span class="text-sm text-gray-600" v-if="cyoaEvents.length">Total: {{ cyoaEvents.length }}</span>
            </div>

            <details open class="bg-gray-50 rounded border">
                <summary class="px-3 py-2 font-medium cursor-pointer">CYOA Events</summary>
                <div class="p-3">
                    <p v-if="cyoaEvents.length === 0" class="text-gray-500 italic">No CYOA events yet. Click "Add CYOA Event" to create one.</p>
                    <ul v-else class="space-y-3">
                        <cyoa-event @deleteEvent="deleteEvent" :id="x.id" :key="x.id" v-for="x in cyoaEvents"></cyoa-event>
                    </ul>
                </div>
            </details>

            <!-- Answer Swap Rules Section -->
            <details open class="bg-gray-50 rounded border">
                <summary class="px-3 py-2 font-medium cursor-pointer">Answer Swap Rules</summary>
                <div class="p-3 space-y-3">
                    <div class="flex items-center gap-2">
                        <button class="bg-purple-500 text-white px-3 py-2 rounded hover:bg-purple-600" @click="addAnswerSwapRule">
                            Add Swap Rule
                        </button>
                        <span class="text-sm text-gray-600" v-if="cyoaAnswerSwaps.length">Total: {{ cyoaAnswerSwaps.length }}</span>
                    </div>
                    <p v-if="cyoaAnswerSwaps.length === 0" class="text-gray-500 italic">
                        No swap rules yet. Click "Add Swap Rule" to create one.
                    </p>
                    <div v-else class="space-y-2">
                        <cyoa-answer-swap
                            v-for="r in cyoaAnswerSwaps"
                            :id="r.id"
                            :key="r.id"
                            @deleteRule="deleteAnswerSwapRule">
                        </cyoa-answer-swap>
                    </div>
                </div>
            </details>
        </div>
    </div>
    `,

    methods: {

        toggleEnabled: function(evt) {
            Vue.prototype.$TCT.jet_data.cyoa_enabled = !Vue.prototype.$TCT.jet_data.cyoa_enabled;
            const temp = Vue.prototype.$globalData.filename;
            Vue.prototype.$globalData.filename = "";
            Vue.prototype.$globalData.filename = temp;
            this.tick++;
        },

        addCyoaEvent: function(evt) {
            // guard: require at least one Q and one A
            const answers = Object.values(Vue.prototype.$TCT.answers);
            const questions = Array.from(Vue.prototype.$TCT.questions.values());
            if (!answers.length || !questions.length) {
                console.warn("CYOA: cannot add event without at least one answer and one question.");
                return;
            }
            let id = Date.now();
            Vue.prototype.$TCT.jet_data.cyoa_data[id] = {
                'answer': answers[0].pk,
                'question': questions[0].pk,
                'id': id
            };
            this.temp_events = [];
            this.tick++;
        },

        deleteEvent: function(id) {
            delete Vue.prototype.$TCT.jet_data.cyoa_data[id];
            this.temp_events = [];
            this.tick++;
        },

        addVariable: function() {
            if (!Vue.prototype.$TCT.jet_data.cyoa_variables) {
                Vue.prototype.$TCT.jet_data.cyoa_variables = {};
            }
            let id = Date.now();
            Vue.prototype.$TCT.jet_data.cyoa_variables[id] = {
                'id': id,
                'name': `variable${Object.keys(Vue.prototype.$TCT.jet_data.cyoa_variables || {}).length + 1}`,
                'defaultValue': 0
            };
            this.tick++;
        },

        deleteVariable: function(id) {
            // capture name before deleting the variable
            const variableObj = Vue.prototype.$TCT.jet_data.cyoa_variables?.[id];
            const variableName = variableObj?.name;

            if (variableName && Vue.prototype.$TCT.jet_data.cyoa_variable_effects) {
                const effects = Vue.prototype.$TCT.getAllCyoaVariableEffects?.() || Object.values(Vue.prototype.$TCT.jet_data.cyoa_variable_effects);
                for (let effect of effects) {
                    if (effect?.variable === variableName) {
                        delete Vue.prototype.$TCT.jet_data.cyoa_variable_effects[effect.id];
                    }
                }
            }

            delete Vue.prototype.$TCT.jet_data.cyoa_variables[id];

            this.tick++;
        },

        // Answer swap rules
        addAnswerSwapRule() {
            if (!Vue.prototype.$TCT.jet_data.cyoa_answer_swaps) {
                Vue.prototype.$TCT.jet_data.cyoa_answer_swaps = {};
            }
            const id = Date.now();
            Vue.prototype.$TCT.jet_data.cyoa_answer_swaps[id] = {
                id,
                triggers: [],                 // array of answer PKs that trigger the swap block
                condition: {                  // optional condition; empty variable = no condition
                    variable: '',
                    comparator: '>=',
                    value: 0
                },
                swaps: [                      // one or more swaps to apply
                    { pk1: null, pk2: null, takeEffects: true }
                ]
            };
            this.tick++;
            if (localStorage.getItem("autosaveEnabled") === "true") window.requestAutosaveDebounced?.();
        },

        deleteAnswerSwapRule(id) {
            if (!Vue.prototype.$TCT.jet_data.cyoa_answer_swaps) return;
            delete Vue.prototype.$TCT.jet_data.cyoa_answer_swaps[id];
            this.tick++;
            if (localStorage.getItem("autosaveEnabled") === "true") window.requestAutosaveDebounced?.();
        },
    },

    computed: {

        cyoaEvents: function() {
            this.tick;
            return Vue.prototype.$TCT.getAllCyoaEvents();
        },

        cyoaVariables: function() {
            this.tick;
            return Vue.prototype.$TCT.getAllCyoaVariables();
        },

        enabled: function() {
            if(Vue.prototype.$TCT.jet_data.cyoa_enabled == null) {
                Vue.prototype.$TCT.jet_data.cyoa_enabled = false;
            }

            if(Vue.prototype.$TCT.jet_data.cyoa_data == null) {
                Vue.prototype.$TCT.jet_data.cyoa_data = {};
            }

            if(Vue.prototype.$TCT.jet_data.cyoa_variables == null) {
                Vue.prototype.$TCT.jet_data.cyoa_variables = {};
            }

            if(Vue.prototype.$TCT.jet_data.cyoa_variable_effects == null) {
                Vue.prototype.$TCT.jet_data.cyoa_variable_effects = {};
            }
            // initialize answer swap rules store
            if(Vue.prototype.$TCT.jet_data.cyoa_answer_swaps == null) {
                Vue.prototype.$TCT.jet_data.cyoa_answer_swaps = {};
            }

            const temp = Vue.prototype.$globalData.filename;
            Vue.prototype.$globalData.filename = "";
            Vue.prototype.$globalData.filename = temp;

            return Vue.prototype.$TCT.jet_data.cyoa_enabled;
        },

        // disable Add button if we have no data to populate selects
        canAdd: function() {
            const hasAnswers = Object.values(Vue.prototype.$TCT.answers).length > 0;
            const hasQuestions = Array.from(Vue.prototype.$TCT.questions.values()).length > 0;
            return hasAnswers && hasQuestions;
        },

        // expose swaps as a sorted list
        cyoaAnswerSwaps() {
            this.tick;
            const src = Vue.prototype.$TCT.jet_data.cyoa_answer_swaps || {};
            return Object.values(src).sort((a,b) => a.id - b.id);
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

        // Insert the answerSwapper function after getQuestionNumberFromPk function or at the beginning
        insertSwapperAfterHelper(out) {
            const func = this.buildAnswerSwapperFunction();
            
            // Try to find getQuestionNumberFromPk function
            const helperRe = /function\s+getQuestionNumberFromPk[\s\S]*?\n}/m;
            const match = helperRe.exec(out);
            
            if (match) {
                // Insert after the helper function
                const insertPos = match.index + match[0].length;
                return out.slice(0, insertPos) + '\n\n' + func + out.slice(insertPos);
            } else {
                // Fallback: insert at the beginning of the file
                return func + '\n\n' + out;
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
        }
    }
})

// Create a global helper object that can be accessed from other components
window.TCTAnswerSwapHelper = {
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

    indentBlock(block, indent) {
        if (!block) return '';
        return block
            .split('\n')
            .map(line => (line.trim().length ? indent + line : line))
            .join('\n');
    },

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

    insertSwapperAfterHelper(out) {
        const func = this.buildAnswerSwapperFunction();
        
        // Try to find getQuestionNumberFromPk function
        const helperRe = /function\s+getQuestionNumberFromPk[\s\S]*?\n}/m;
        const match = helperRe.exec(out);
        
        if (match) {
            // Insert after the helper function
            const insertPos = match.index + match[0].length;
            return out.slice(0, insertPos) + '\n\n' + func + out.slice(insertPos);
        } else {
            // Fallback: insert at the beginning of the file
            return func + '\n\n' + out;
        }
    },

    injectAnswerSwapIntoCode2(code) {
        let out = String(code || '');

        // 1) Ensure function is added right after getQuestionNumberFromPk (or fallback)
        out = this.insertSwapperAfterHelper(out);

        // 2) Build blocks and insert inside cyoAdventure with clean indentation (header only, no BEGIN/END)
        const blocks = this.buildAnswerSwapBlocks();
        out = this.insertSwapsInsideCyoAdventure(out, blocks);

        return out;
    }
};

window.defineComponent('cyoa-event', {

    props: ['id'],

    data() {
        return {
            answerVal: null,
            questionVal: null
        };
    },

    template: `
    <div class="bg-white rounded shadow p-4">
        <div class="flex justify-between items-start mb-3">
            <div class="text-sm text-gray-700">
                <div class="font-medium">Branch Summary</div>
                <div class="mt-1">
                    If Answer <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">#{{ answerVal }}</span>
                    then jump to Question <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">#{{ questionVal }}</span>
                </div>
            </div>
            <button class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600" v-on:click="deleteEvent()">Delete</button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <p class="text-sm text-gray-700 italic mb-1">Answer that triggers the jump:</p>
                <label class="block text-sm font-medium mb-1" for="answer">Answer</label>
                <select v-model.number="answerVal" name="answer" class="w-full border rounded p-2">
                    <option v-for="answer in answers" :value="answer.pk" :key="answer.pk">
                        {{answer.pk}} - {{description(answer)}}
                    </option>
                </select>
            </div>

            <div>
                <p class="text-sm text-gray-700 italic mb-1">Question to jump to:</p>
                <label class="block text-sm font-medium mb-1" for="question">Question</label>
                <select v-model.number="questionVal" name="question" class="w-full border rounded p-2">
                    <option v-for="question in questions" :value="question.pk" :key="question.pk">
                        {{question.pk}} - {{description(question)}}
                    </option>
                </select>
            </div>
        </div>
    </div>
    `,

    methods: {
        deleteEvent: function() {
            if (confirm('Delete this CYOA event?')) {
                this.$emit('deleteEvent', this.id);
            }
        },

        onChange: function(evt) {
            const val = Number(evt.target.value);
            Vue.prototype.$TCT.jet_data.cyoa_data[this.id][evt.target.name] = val;
        },

        description:function(qa) {
            if(!qa || !qa.fields || qa.fields.description == null || qa.fields.description === '') {
                return '...';
            }
            const s = qa.fields.description;
            return s.length > 50 ? (s.slice(0, 50) + "...") : s;
        },

        updateGlobal: function(field, val) {
            if (!Vue.prototype.$TCT.jet_data.cyoa_data[this.id]) return;
            Vue.prototype.$TCT.jet_data.cyoa_data[this.id][field] = Number(val);
        },

        syncFromGlobal: function() {
            const row = Vue.prototype.$TCT.jet_data.cyoa_data[this.id] || {};
            // fallbacks in case of missing data
            const answers = Object.values(Vue.prototype.$TCT.answers);
            const questions = Array.from(Vue.prototype.$TCT.questions.values());
            this.answerVal = Number(row.answer ?? (answers[0]?.pk ?? 0));
            this.questionVal = Number(row.question ?? (questions[0]?.pk ?? 0));
        }
    },

    mounted() {
        this.syncFromGlobal();
    },

    watch: {
        id() {
            this.syncFromGlobal();
        },
        answerVal(val) {
            this.updateGlobal('answer', val);
        },
        questionVal(val) {
            this.updateGlobal('question', val);
        }
    },

    computed: {
        currentQuestion: function() {
            const row = Vue.prototype.$TCT.jet_data.cyoa_data[this.id] || {};
            return row.question;
        },

        currentAnswer: function() {
            const row = Vue.prototype.$TCT.jet_data.cyoa_data[this.id] || {};
            return row.answer;
        },

        questions: function() {
            return Array.from(Vue.prototype.$TCT.questions.values());
        },

        answers: function() {
            return Object.values(Vue.prototype.$TCT.answers);
        },
    }
})

window.defineComponent('cyoa-variable', {

    props: ['id'],

    data() {
        return {
            nameVal: '',
            defaultValueVal: 0
        };
    },

    template: `
    <div class="bg-white rounded shadow p-3 border-l-4 border-blue-400">
        <div class="flex justify-between items-start mb-2">
            <div class="text-sm text-gray-700">
                <div class="font-medium">Variable</div>
            </div>
            <button class="text-red-600 hover:text-red-800 text-sm" v-on:click="deleteVariable()" aria-label="Delete variable">
                ✕
            </button>
        </div>
        
        <div class="grid grid-cols-2 gap-3">
            <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Variable Name:</label>
                <input 
                    v-model="nameVal" 
                    @input="onChange" 
                    name="name" 
                    type="text" 
                    class="w-full border rounded p-2 text-sm"
                    placeholder="e.g. wins, trust">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Default Value:</label>
                <input 
                    v-model.number="defaultValueVal" 
                    @input="onChange" 
                    name="defaultValue" 
                    type="number" 
                    class="w-full border rounded p-2 text-sm">
            </div>
        </div>
    </div>
    `,

    methods: {
        deleteVariable: function() {
            if (confirm('Delete this variable? This will also remove all effects that use this variable.')) {
                this.$emit('deleteVariable', this.id);
            }
        },

        onChange: function(evt) {
            const val = evt.target.name === 'defaultValue' ? Number(evt.target.value) : evt.target.value;
            Vue.prototype.$TCT.jet_data.cyoa_variables[this.id][evt.target.name] = val;
        },

        syncFromGlobal: function() {
            const variable = Vue.prototype.$TCT.jet_data.cyoa_variables[this.id] || {};
            this.nameVal = variable.name || '';
            this.defaultValueVal = variable.defaultValue || 0;
        }
    },

    mounted() {
        this.syncFromGlobal();
    },

    watch: {
        id() {
            this.syncFromGlobal();
        },
        nameVal(val) {
            this.updateGlobal('name', val);
        },
        defaultValueVal(val) {
            this.updateGlobal('defaultValue', val);
        }
    },

    computed: {
        updateGlobal: function() {
            return function(field, val) {
                if (!Vue.prototype.$TCT.jet_data.cyoa_variables[this.id]) return;
                Vue.prototype.$TCT.jet_data.cyoa_variables[this.id][field] = val;
            };
        }
    }
})

// Single Answer Swap Rule editor
window.defineComponent('cyoa-answer-swap', {
    props: ['id'],

    data() {
        return {
            triggerToAdd: null,
            swapRowsTick: 0
        };
    },

    methods: {
        getRule() {
            return Vue.prototype.$TCT.jet_data.cyoa_answer_swaps?.[this.id] || {
                id: this.id, triggers: [], condition: { variable: '', comparator: '>=', value: 0 }, swaps: []
            };
        },

        addTrigger() {
            const rule = this.getRule();
            const val = Number(this.triggerToAdd);
            if (!val) return;
            if (!rule.triggers.includes(val)) {
                rule.triggers.push(val);
                this.triggerToAdd = null;
                if (localStorage.getItem("autosaveEnabled") === "true") window.requestAutosaveDebounced?.();
            }
        },

        removeTrigger(pk) {
            const rule = this.getRule();
            rule.triggers = rule.triggers.filter(x => x !== pk);
            if (localStorage.getItem("autosaveEnabled") === "true") window.requestAutosaveDebounced?.();
        },

        addSwap() {
            const rule = this.getRule();
            rule.swaps.push({ pk1: null, pk2: null, takeEffects: true });
            this.swapRowsTick++;
            if (localStorage.getItem("autosaveEnabled") === "true") window.requestAutosaveDebounced?.();
        },

        removeSwap(index) {
            const rule = this.getRule();
            rule.swaps.splice(index, 1);
            this.swapRowsTick++;
            if (localStorage.getItem("autosaveEnabled") === "true") window.requestAutosaveDebounced?.();
        },

        updateCondition(field, value) {
            const rule = this.getRule();
            if (field === 'value') {
                rule.condition.value = Number(value);
            } else {
                rule.condition[field] = value;
            }
            if (localStorage.getItem("autosaveEnabled") === "true") window.requestAutosaveDebounced?.();
        },

        updateSwap(index, field, value) {
            const rule = this.getRule();
            if (!rule.swaps[index]) return;
            if (field === 'takeEffects') {
                rule.swaps[index].takeEffects = !!value;
            } else {
                rule.swaps[index][field] = Number(value) || null;
            }
            this.swapRowsTick++;
            if (localStorage.getItem("autosaveEnabled") === "true") window.requestAutosaveDebounced?.();
        }
    },

    computed: {
        rule() {
            // touch tick so list reflects changes
            this.swapRowsTick;
            return this.getRule();
        },

        variables() {
            // variable names from CYOA vars
            return (Vue.prototype.$TCT.getAllCyoaVariables?.() || []).map(v => v.name);
        },

        answers() {
            return Object.values(Vue.prototype.$TCT.answers || {});
        }
    },

    template: `
    <div class="bg-white rounded shadow p-3 border-l-4 border-purple-400">
        <div class="flex justify-between items-start mb-2">
            <div class="text-sm text-gray-700">
                <div class="font-medium">Swap Rule #{{ id }}</div>
                <div class="text-xs text-gray-500">
                    Runs in Code 2 via answerSwapper for selected triggers and optional condition.
                </div>
            </div>
            <button class="text-red-600 hover:text-red-800 text-sm" @click="$emit('deleteRule', id)" aria-label="Delete rule">✕</button>
        </div>

        <!-- Triggers -->
        <div class="mb-3">
            <label class="block text-xs font-medium text-gray-600 mb-1">Trigger Answers:</label>
            <div class="flex items-center gap-2">
                <select v-model.number="triggerToAdd" class="border rounded p-1 text-sm">
                    <option :value="null" disabled>Select answer...</option>
                    <option v-for="a in answers" :key="a.pk" :value="a.pk">
                        {{ a.pk }} - {{ (a.fields?.description || '...').slice(0,50) }}
                    </option>
                </select>
                <button class="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600" @click="addTrigger">Add</button>
            </div>
            <div class="mt-2 flex flex-wrap gap-1">
                <span v-for="pk in rule.triggers" :key="'t-'+pk" class="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                    #{{ pk }}
                    <button class="ml-1 text-blue-700 hover:text-blue-900" @click="removeTrigger(pk)" aria-label="Remove">✕</button>
                </span>
            </div>
        </div>

        <!-- Optional Condition -->
        <div class="mb-3">
            <label class="block text-xs font-medium text-gray-600 mb-1">Optional Condition:</label>
            <div class="grid grid-cols-3 gap-2 items-center">
                <select :value="rule.condition.variable" @change="updateCondition('variable', $event.target.value)" class="border rounded p-1 text-sm">
                    <option value="">(none)</option>
                    <option v-for="v in variables" :key="v" :value="v">{{ v }}</option>
                </select>
                <select :value="rule.condition.comparator" @change="updateCondition('comparator', $event.target.value)" class="border rounded p-1 text-sm" :disabled="!rule.condition.variable">
                    <option value=">=">>=</option>
                    <option value="<="><=</option>
                    <option value=">">></option>
                    <option value="<"><</option>
                    <option value="==">==</option>
                    <option value="!=">!=</option>
                </select>
                <input type="number" :value="rule.condition.value" @input="updateCondition('value', $event.target.value)" class="border rounded p-1 text-sm" :disabled="!rule.condition.variable">
            </div>
            <div v-if="rule.condition.variable" class="text-xs text-gray-500 mt-1">
                Condition: {{ rule.condition.variable }} {{ rule.condition.comparator }} {{ rule.condition.value }}
            </div>
        </div>

        <!-- Swaps -->
        <div class="mb-1">
            <label class="block text-xs font-medium text-gray-600 mb-1">Swaps to Apply:</label>
            <div v-for="(s,idx) in rule.swaps" :key="'s-'+idx" class="grid grid-cols-1 md:grid-cols-5 gap-2 items-center mb-2">
                <div class="md:col-span-2">
                    <label class="block text-[10px] text-gray-500 mb-0.5">Answer PK 1</label>
                    <select :value="s.pk1" @change="updateSwap(idx,'pk1',$event.target.value)" class="border rounded p-1 text-sm w-full">
                        <option :value="null" disabled>Select answer...</option>
                        <option v-for="a in answers" :key="'pk1-'+a.pk" :value="a.pk">
                            {{ a.pk }} - {{ (a.fields?.description || '...').slice(0,40) }}
                        </option>
                    </select>
                </div>
                <div class="md:col-span-2">
                    <label class="block text-[10px] text-gray-500 mb-0.5">Answer PK 2</label>
                    <select :value="s.pk2" @change="updateSwap(idx,'pk2',$event.target.value)" class="border rounded p-1 text-sm w-full">
                        <option :value="null" disabled>Select answer...</option>
                        <option v-for="a in answers" :key="'pk2-'+a.pk" :value="a.pk">
                            {{ a.pk }} - {{ (a.fields?.description || '...').slice(0,40) }}
                        </option>
                    </select>
                </div>
                <div class="flex items-center gap-2">
                    <label class="inline-flex items-center text-xs">
                        <input type="checkbox" :checked="s.takeEffects" @change="updateSwap(idx,'takeEffects',$event.target.checked)" class="mr-1">
                        Take effects
                    </label>
                    <button class="text-red-600 hover:text-red-800 text-xs" @click="removeSwap(idx)">✕</button>
                </div>
            </div>
            <button class="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-xs" @click="addSwap">Add another swap</button>
        </div>
    </div>
    `
})