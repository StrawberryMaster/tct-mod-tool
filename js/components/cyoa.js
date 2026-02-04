registerComponent('cyoa', {

    data() {
        return {
            temp_events: []
        };
    },

    created() {
        this.initStores();
    },

    template: `
    <div class="mx-auto bg-white rounded-lg shadow-sm p-4">
        <div class="flex items-center justify-between mb-3">
            <h1 class="font-bold text-xl">CYOA toolkit</h1>
            <div class="space-x-2">
                <button v-if="!enabled" class="bg-green-500 text-white px-3 py-2 rounded-sm hover:bg-green-600" v-on:click="toggleEnabled()" aria-label="Enable CYOA">Enable</button>
                <button v-else class="bg-red-500 text-white px-3 py-2 rounded-sm hover:bg-red-600" v-on:click="toggleEnabled()" aria-label="Disable CYOA">Disable</button>
            </div>
        </div>

        <div v-if="enabled" class="space-y-4">
            <!-- Variables section -->
            <details open class="bg-gray-50 rounded-sm border">
                <summary class="px-3 py-2 font-medium cursor-pointer">CYOA variables</summary>
                <p class="px-3 py-2 text-sm text-gray-700 italic">Your variable can be used in conditions and effects, e.g., to track player choices or stats.</p>
                <div class="p-3 space-y-3">
                    <div class="flex items-center gap-2">
                        <button 
                            class="bg-blue-500 text-white px-3 py-2 rounded-sm hover:bg-blue-600" 
                            v-on:click="addVariable()"
                        >
                            Add variable
                        </button>
                        <span class="text-sm text-gray-600" v-if="cyoaVariables.length">Total: {{ cyoaVariables.length }}</span>
                    </div>
                    <p v-if="cyoaVariables.length === 0" class="text-gray-500 italic">No variables yet. Click "Add Variable" to create one.</p>
                    <div v-else class="space-y-2">
                        <cyoa-variable @deleteVariable="deleteVariable" :id="variable.id" :key="variable.id" v-for="variable in cyoaVariables"></cyoa-variable>
                    </div>
                </div>
            </details>

            <!-- Branching events section -->
            <details open class="bg-gray-50 rounded-sm border">
                <summary class="px-3 py-2 font-medium cursor-pointer">CYOA events (tunneling)</summary>
                <p class="px-3 py-2 text-sm text-gray-700 italic">Also known as tunneling, these events let you immediately jump to specific questions based on player answers/variables.</p>
                <div class="p-3 space-y-3">
                    <div class="flex items-center gap-2">
                        <button 
                            class="bg-green-500 text-white px-3 py-2 rounded-sm hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed" 
                            v-on:click="addCyoaEvent()" 
                            :disabled="!canAdd"
                            :title="canAdd ? 'Add a new branching rule' : 'Need at least one question and one answer'"
                        >
                            Add CYOA event
                        </button>
                        <span class="text-sm text-gray-600" v-if="cyoaEvents.length">Total: {{ cyoaEvents.length }}</span>
                    </div>
                    <p v-if="cyoaEvents.length === 0" class="text-gray-500 italic">No CYOA events yet. Click "Add CYOA Event" to create one.</p>
                    <div v-else class="space-y-3">
                        <cyoa-event @deleteEvent="deleteEvent" :id="x.id" :key="x.id" v-for="x in cyoaEvents"></cyoa-event>
                    </div>
                </div>
            </details>

            <!-- Question Swap section -->
            <details open class="bg-gray-50 rounded-sm border">
                <summary class="px-3 py-2 font-medium cursor-pointer">Question swap rules</summary>
                <p class="px-3 py-2 text-sm text-gray-700 italic">Use these rules to swap the positions of questions based on player answers and variable conditions.</p>
                <div class="p-3 space-y-3">
                    <div class="flex items-center gap-2">
                        <button class="bg-indigo-500 text-white px-3 py-2 rounded-sm hover:bg-indigo-600" @click="addQuestionSwapRule">
                            Add question swap rule
                        </button>
                        <span class="text-sm text-gray-600" v-if="cyoaQuestionSwaps.length">Total: {{ cyoaQuestionSwaps.length }}</span>
                    </div>
                    <p v-if="cyoaQuestionSwaps.length === 0" class="text-gray-500 italic">
                        No question swap rules yet. Click "Add question swap rule" to create one.
                    </p>
                    <div v-else class="space-y-2">
                        <cyoa-question-swap
                            v-for="r in cyoaQuestionSwaps"
                            :id="r.id"
                            :key="r.id"
                            @deleteRule="deleteQuestionSwapRule">
                        </cyoa-question-swap>
                    </div>
                </div>
            </details>

            <!-- Answer swap rules -->
            <details open class="bg-gray-50 rounded-sm border">
                <summary class="px-3 py-2 font-medium cursor-pointer">Answer swap rules</summary>
                <p class="px-3 py-2 text-sm text-gray-700 italic">Use these rules to swap the positions of answers based on player answers and variable conditions.</p>
                <div class="p-3 space-y-3">
                    <div class="flex items-center gap-2">
                        <button class="bg-purple-500 text-white px-3 py-2 rounded-sm hover:bg-purple-600" @click="addAnswerSwapRule">
                            Add swap rule
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
        initStores() {
            const TCT = this.$TCT;
            const jet = TCT.jet_data || (TCT.jet_data = {});
            let changed = false;

            if (jet.cyoa_enabled == null) { jet.cyoa_enabled = false; changed = true; }
            if (jet.cyoa_data == null) { jet.cyoa_data = {}; changed = true; }
            if (jet.cyoa_variables == null) { jet.cyoa_variables = {}; changed = true; }
            if (jet.cyoa_variable_effects == null) { jet.cyoa_variable_effects = {}; changed = true; }
            if (jet.cyoa_question_swaps == null) { jet.cyoa_question_swaps = {}; changed = true; }
            if (jet.cyoa_answer_swaps == null) { jet.cyoa_answer_swaps = {}; changed = true; }

            if (changed) {
                this.$globalData.dataVersion++;
            }
        },

        // simple collision-safe ID generator for all CYOA stores
        generateId(stores = []) {
            let id = Date.now();
            // bump until free in any target store
            while (stores.some(store => store && store[id])) id++;
            return id;
        },

        toggleEnabled: function (evt) {
            this.$TCT.jet_data.cyoa_enabled = !this.$TCT.jet_data.cyoa_enabled;
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        addCyoaEvent: function (evt) {
            // guard: require at least one Q and one A
            const answers = Object.values(this.$TCT.answers);
            const questions = Array.from(this.$TCT.questions.values());
            if (!answers.length || !questions.length) {
                console.warn("CYOA: cannot add event without at least one answer and one question.");
                return;
            }
            const jet = this.$TCT.jet_data;
            const id = this.generateId([jet.cyoa_data]);
            jet.cyoa_data[id] = {
                'answer': answers[0].pk,
                'question': questions[0].pk,
                'id': id
            };
            this.temp_events = [];
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        deleteEvent: function (id) {
            delete this.$TCT.jet_data.cyoa_data[id];
            this.temp_events = [];
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        addVariable: function () {
            if (!this.$TCT.jet_data.cyoa_variables) {
                this.$TCT.jet_data.cyoa_variables = {};
            }
            const jet = this.$TCT.jet_data;
            const id = this.generateId([jet.cyoa_variables]);
            jet.cyoa_variables[id] = {
                'id': id,
                'name': `variable${Object.keys(jet.cyoa_variables || {}).length + 1}`,
                'defaultValue': 0
            };
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        deleteVariable: function (id) {
            // capture name before deleting the variable
            const variableObj = this.$TCT.jet_data.cyoa_variables?.[id];
            const variableName = variableObj?.name;

            if (variableName && this.$TCT.jet_data.cyoa_variable_effects) {
                const effects = this.$TCT.getAllCyoaVariableEffects?.() || Object.values(this.$TCT.jet_data.cyoa_variable_effects);
                for (let effect of effects) {
                    if (effect?.variable === variableName) {
                        delete this.$TCT.jet_data.cyoa_variable_effects[effect.id];
                    }
                }
            }

            delete this.$TCT.jet_data.cyoa_variables[id];

            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        // Answer swap rules
        addQuestionSwapRule() {
            if (!this.$TCT.jet_data.cyoa_question_swaps) {
                this.$TCT.jet_data.cyoa_question_swaps = {};
            }
            const jet = this.$TCT.jet_data;
            const id = this.generateId([jet.cyoa_question_swaps]);
            jet.cyoa_question_swaps[id] = {
                id,
                triggers: [],
                conditions: [],
                conditionOperator: 'AND',
                swaps: [{ pk1: null, pk2: null }]
            };
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        deleteQuestionSwapRule(id) {
            if (!this.$TCT.jet_data.cyoa_question_swaps) return;
            delete this.$TCT.jet_data.cyoa_question_swaps[id];
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        addAnswerSwapRule() {
            if (!this.$TCT.jet_data.cyoa_answer_swaps) {
                this.$TCT.jet_data.cyoa_answer_swaps = {};
            }
            const jet = this.$TCT.jet_data;
            const id = this.generateId([jet.cyoa_answer_swaps]);
            jet.cyoa_answer_swaps[id] = {
                id,
                triggers: [],
                conditions: [],
                conditionOperator: 'AND',
                swaps: [{ pk1: null, pk2: null, takeEffects: true }]
            };
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        deleteAnswerSwapRule(id) {
            if (!this.$TCT.jet_data.cyoa_answer_swaps) return;
            delete this.$TCT.jet_data.cyoa_answer_swaps[id];
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },
    },

    computed: {

        cyoaEvents: function () {
            this.$globalData.dataVersion;
            return this.$TCT.getAllCyoaEvents();
        },

        cyoaVariables: function () {
            this.$globalData.dataVersion;
            return this.$TCT.getAllCyoaVariables();
        },

        enabled: function () {
            this.$globalData.dataVersion;
            return this.$TCT.jet_data?.cyoa_enabled;
        },

        // disable Add button if we have no data to populate selects
        canAdd: function () {
            const hasAnswers = Object.values(this.$TCT.answers).length > 0;
            const hasQuestions = Array.from(this.$TCT.questions.values()).length > 0;
            return hasAnswers && hasQuestions;
        },

        // expose swaps as a sorted list
        cyoaQuestionSwaps() {
            this.$globalData.dataVersion;
            const src = this.$TCT.jet_data.cyoa_question_swaps || {};
            return Object.values(src).sort((a, b) => a.id - b.id);
        },

        cyoaAnswerSwaps() {
            this.$globalData.dataVersion;
            const src = this.$TCT.jet_data.cyoa_answer_swaps || {};
            return Object.values(src).sort((a, b) => a.id - b.id);
        },

        buildQuestionSwapperFunction() {
            return window.TCTAnswerSwapHelper.buildQuestionSwapperFunction();
        },

        buildAnswerSwapperFunction() {
            return window.TCTAnswerSwapHelper.buildAnswerSwapperFunction();
        },

        buildQuestionSwapBlocks() {
            return window.TCTAnswerSwapHelper.buildQuestionSwapBlocks();
        },

        buildAnswerSwapBlocks() {
            return window.TCTAnswerSwapHelper.buildAnswerSwapBlocks();
        },

        indentBlock(block, indent) {
            return window.TCTAnswerSwapHelper.indentBlock(block, indent);
        },

        insertSwapsInsideCyoAdventure(out, blocks) {
            return window.TCTAnswerSwapHelper.insertSwapsInsideCyoAdventure(out, blocks);
        },

        insertSwapperAfterHelper(out) {
            return window.TCTAnswerSwapHelper.insertSwapperAfterHelper(out);
        },

        injectAnswerSwapIntoCode2(code) {
            return window.TCTAnswerSwapHelper.injectAnswerSwapIntoCode2(code);
        }
    }
})

// create a global helper object that can be accessed from other components
window.TCTAnswerSwapHelper = {
    buildQuestionSwapperFunction() {
        return `
function questionSwapper(pk1, pk2) {
    const questionData = campaignTrail_temp.questions_json;
    
    // find indices of the questions
    const index1 = getQuestionIndexFromPk(pk1);
    const index2 = getQuestionIndexFromPk(pk2);
    
    // validate both questions exist
    if (index1 === -1 || index2 === -1) {
        console.warn(\`questionSwapper: Could not find question(s) with pk \${pk1} and/or \${pk2}\`);
        return false;
    }
    
    // swap the entire question objects
    [questionData[index1], questionData[index2]] = [questionData[index2], questionData[index1]];
    
    // rebuild the index map since positions changed
    _rebuildQuestionIdxMap();
    
    return true;
}
`.trim();
    },

    buildAnswerSwapperFunction() {
        return `
function answerSwapper(pk1, pk2, takeEffects = true) {
    const answerData = campaignTrail_temp.answers_json;

   // find the indices of the objects with the specified PKs
    const index1 = answerData.findIndex(item => Number(item.pk) === Number(pk1));
    const index2 = answerData.findIndex(item => Number(item.pk) === Number(pk2));

    // check if objects with those PKs exist
    if (index1 === -1 || index2 === -1) return;

    // swap the question assignment
    const tempQuestion = answerData[index1].fields.question;
    answerData[index1].fields.question = answerData[index2].fields.question;
    answerData[index2].fields.question = tempQuestion;

    // if takeEffects is true, answers swap effects also
    if (takeEffects) {
        const otherJsons = [
            campaignTrail_temp.answer_score_global_json,
            campaignTrail_temp.answer_score_issue_json,
            campaignTrail_temp.answer_score_state_json,
            campaignTrail_temp.answer_feedback_json
        ];

        otherJsons.forEach(jsonData => {
            if (!jsonData) return;
            jsonData.forEach(item => {
                const itemAns = Number(item.fields.answer);
                if (itemAns === Number(pk1)) {
                    item.fields.answer = pk2;
                } else if (itemAns === Number(pk2)) {
                    item.fields.answer = pk1;
                }
            });
        });
    }
}
`.trim();
    },

    buildQuestionSwapBlocks() {
        const rulesSrc = window.$TCT.jet_data?.cyoa_question_swaps || {};
        const rules = Object.values(rulesSrc);
        if (!rules.length) return '';

        const blocks = rules.map(rule => {
            const triggers = Array.isArray(rule.triggers) ? rule.triggers.filter(x => Number.isFinite(x)) : [];
            const swaps = Array.isArray(rule.swaps) ? rule.swaps.filter(s => Number.isFinite(s?.pk1) && Number.isFinite(s?.pk2)) : [];
            if (!triggers.length || !swaps.length) return '';

            const triggerCond = triggers.map(pk => `ans == ${pk}`).join(' || ');
            const swapLines = swaps.map(s => {
                return `questionSwapper(${s.pk1}, ${s.pk2});`;
            }).join('\n        ');

            let conditionStr = '';
            if (rule.conditions && Array.isArray(rule.conditions) && rule.conditions.length > 0) {
                const validConditions = rule.conditions.filter(c => c && c.variable && c.comparator && Number.isFinite(Number(c.value)));
                if (validConditions.length > 0) {
                    const conditionParts = validConditions.map(c => `${c.variable} ${c.comparator} ${c.value}`);
                    const operator = rule.conditionOperator || 'AND';
                    const joinStr = operator === 'OR' ? ' || ' : ' && ';
                    conditionStr = `if (${conditionParts.join(joinStr)}) {\n        `;
                }
            }

            let output = `if (${triggerCond}) {`;
            if (conditionStr) {
                output += `\n    ${conditionStr}${swapLines}\n    }\n}`;
            } else {
                output += `\n    ${swapLines}\n}`;
            }
            return output;
        }).filter(Boolean);

        if (!blocks.length) return '';

        return `// question swap CYOA here\n${blocks.join('\n')}`;
    },

    buildAnswerSwapBlocks() {
        const rulesSrc = window.$TCT.jet_data?.cyoa_answer_swaps || {};
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

            let conditionStr = '';
            if (rule.conditions && Array.isArray(rule.conditions) && rule.conditions.length > 0) {
                const validConditions = rule.conditions.filter(c => c && c.variable && c.comparator && Number.isFinite(Number(c.value)));
                if (validConditions.length > 0) {
                    const conditionParts = validConditions.map(c => `${c.variable} ${c.comparator} ${c.value}`);
                    const operator = rule.conditionOperator || 'AND';
                    const joinStr = operator === 'OR' ? ' || ' : ' && ';
                    conditionStr = `if (${conditionParts.join(joinStr)}) {\n        `;
                }
            } else if (rule.condition && rule.condition.variable) {
                conditionStr = `if (${rule.condition.variable} ${rule.condition.comparator} ${rule.condition.value}) {\n        `;
            }

            let output = `if (${triggerCond}) {`;
            if (conditionStr) {
                output += `\n    ${conditionStr}${swapLines}\n    }\n}`;
            } else {
                output += `\n    ${swapLines}\n}`;
            }
            return output;
        }).filter(Boolean);

        if (!blocks.length) return '';

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

        // clean up any legacy BEGIN/END wrapped blocks from older exports
        out = out.replace(/\/\/\s*BEGIN_TCT_ANSWER_SWAP_RULES[\s\S]*?\/\/\s*END_TCT_ANSWER_SWAP_RULES\s*/m, '');

        // find cyoAdventure function (assignment form preferred)
        const reAssign = /cyoAdventure\s*=\s*function\s*\(\s*a\s*\)\s*\{/m;
        let m = reAssign.exec(out);
        let openIdx;

        if (m) {
            openIdx = m.index + m[0].length - 1; // position of '{'
        } else {
            const reNamed = /function\s+cyoAdventure\s*\(\s*a?\s*\)\s*\{/m;
            m = reNamed.exec(out);
            if (!m) {
                // as last resort, just append at end without indentation
                return out + `\n\n${blocks}\n`;
            }
            openIdx = m.index + m[0].length - 1;
        }

        // find matching closing brace to get function body range
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

        // prefer to insert after the 'ans =' assignment if present
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

        // if a previous header exists, replace from that header to the next same-indentation comment or end of body
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

        // prepare neat, indented payload with the header included in 'blocks'
        const indentedPayload = '\n' + this.indentBlock(blocks, indentForInsert) + '\n';

        if (insertPosInBody >= 0) {
            // insert right after ans assignment
            const newBody = body.slice(0, insertPosInBody) + indentedPayload + body.slice(insertPosInBody);
            return out.slice(0, bodyStart) + newBody + out.slice(closeIdx);
        } else {
            // insert at top of body
            const newBody = '\n' + this.indentBlock(blocks, indentForInsert) + '\n' + body;
            return out.slice(0, bodyStart) + newBody + out.slice(closeIdx);
        }
    },

    insertSwapperAfterHelper(out) {
        const questionSwapFunc = this.buildQuestionSwapperFunction();
        const answerSwapFunc = this.buildAnswerSwapperFunction();
        const combinedFuncs = questionSwapFunc + '\n\n' + answerSwapFunc;

        // try to find getQuestionNumberFromPk function
        const helperRe = /function\s+getQuestionNumberFromPk[\s\S]*?\n}/m;
        const match = helperRe.exec(out);

        if (match) {
            // insert after the helper function
            const insertPos = match.index + match[0].length;
            return out.slice(0, insertPos) + '\n\n' + combinedFuncs + out.slice(insertPos);
        } else {
            return combinedFuncs + '\n\n' + out;
        }
    },

    injectAnswerSwapIntoCode2(code) {
        let out = String(code || '');

        if (!window.$TCT || !window.$TCT.jet_data) {
            return out;
        }

        if (window.$TCT.jet_data.cyoa_enabled) {
            out = this.insertSwapperAfterHelper(out);
            const questionBlocks = this.buildQuestionSwapBlocks();
            const answerBlocks = this.buildAnswerSwapBlocks();
            const combinedBlocks = [questionBlocks, answerBlocks].filter(Boolean).join('\n\n');
            out = this.insertSwapsInsideCyoAdventure(out, combinedBlocks);
        }

        return out;
    }
};

registerComponent('cyoa-event', {

    props: ['id'],

    data() {
        return {
            answerVal: null,
            questionVal: null
        };
    },

    template: `
    <div class="bg-white rounded-sm shadow-sm p-4">
        <div class="flex justify-between items-start mb-3">
            <div class="text-sm text-gray-700">
                <div class="font-medium">Branch summary</div>
                <div class="mt-1">
                    If player selects answer <span class="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium bg-blue-100 text-blue-800">#{{ answerVal }}</span>,
                    then immediately jump to question <span class="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium bg-purple-100 text-purple-800">#{{ questionVal }}</span>
                </div>
            </div>
            <button class="bg-red-500 text-white px-3 py-1 rounded-sm hover:bg-red-600" v-on:click="deleteEvent()">Delete</button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-medium mb-1" for="answer">Answer
                <span class="ml-1 text-xs text-gray-500 italic">(triggers the jump)</span></label>
                <select v-model.number="answerVal" name="answer" class="w-full border rounded-sm p-2">
                    <option v-for="answer in answers" :value="answer.pk" :key="answer.pk">
                        {{answer.pk}} - {{description(answer)}}
                    </option>
                </select>
            </div>

            <div>
                <label class="block text-sm font-medium mb-1" for="answer">Question
                <span class="ml-1 text-xs text-gray-500 italic">(to jump to)</span></label>
                <select v-model.number="questionVal" name="question" class="w-full border rounded-sm p-2">
                    <option v-for="question in questions" :value="question.pk" :key="question.pk">
                        {{question.pk}} - {{description(question)}}
                    </option>
                </select>
            </div>
        </div>
    </div>
    `,

    methods: {
        deleteEvent: function () {
            if (confirm('Delete this CYOA event?')) {
                this.$emit('deleteEvent', this.id);
            }
        },

        description: function (qa) {
            if (!qa || !qa.fields || qa.fields.description == null || qa.fields.description === '') {
                return '...';
            }
            const s = qa.fields.description;
            return s.length > 50 ? (s.slice(0, 50) + "...") : s;
        },

        updateGlobal: function (field, val) {
            if (!this.$TCT.jet_data.cyoa_data[this.id]) return;
            const current = this.$TCT.jet_data.cyoa_data[this.id][field];
            if (current === Number(val)) return;
            this.$TCT.jet_data.cyoa_data[this.id][field] = Number(val);
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        syncFromGlobal: function () {
            const row = this.$TCT.jet_data.cyoa_data[this.id] || {};
            // fallbacks in case of missing data
            const answers = Object.values(this.$TCT.answers);
            const questions = Array.from(this.$TCT.questions.values());
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
        currentQuestion: function () {
            const row = this.$TCT.jet_data.cyoa_data[this.id] || {};
            return row.question;
        },

        currentAnswer: function () {
            const row = this.$TCT.jet_data.cyoa_data[this.id] || {};
            return row.answer;
        },

        questions: function () {
            return Array.from(this.$TCT.questions.values());
        },

        answers: function () {
            return Object.values(this.$TCT.answers);
        },
    }
})

registerComponent('cyoa-variable', {

    props: ['id'],

    data() {
        return {
            nameVal: '',
            defaultValueVal: 0
        };
    },

    template: `
    <div class="bg-white rounded-sm shadow-sm p-3 border-l-4 border-blue-400">
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
                <label class="block text-xs font-medium text-gray-600 mb-1">Variable name:</label>
                <input 
                    v-model="nameVal" 
                    name="name" 
                    type="text" 
                    class="w-full border rounded-sm p-2 text-sm"
                    placeholder="e.g. wins, trust">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Default value:</label>
                <input 
                    v-model.number="defaultValueVal" 
                    name="defaultValue" 
                    type="number" 
                    class="w-full border rounded-sm p-2 text-sm">
            </div>
        </div>
    </div>
    `,

    methods: {
        deleteVariable: function () {
            if (confirm('Delete this variable? This will also remove all effects that use this variable.')) {
                this.$emit('deleteVariable', this.id);
            }
        },

        updateGlobal: function (field, val) {
            if (!this.$TCT.jet_data.cyoa_variables[this.id]) return;
            const current = this.$TCT.jet_data.cyoa_variables[this.id][field];
            if (current === val) return;
            this.$TCT.jet_data.cyoa_variables[this.id][field] = val;
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        syncFromGlobal: function () {
            const variable = this.$TCT.jet_data.cyoa_variables[this.id] || {};
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
    }
})

// small global helper to trigger autosave only when enabled
window.requestAutosaveIfEnabled = function () {
    if (localStorage.getItem("autosaveEnabled") === "true") {
        window.requestAutosaveDebounced?.();
    }
};

// Single Answer Swap Rule editor
registerComponent('cyoa-question-swap', {
    props: ['id'],

    data() {
        return {
            triggerToAdd: null,
            conditionToAdd: {
                variable: '',
                comparator: '>=',
                value: 0
            }
        };
    },

    methods: {
        getRule() {
            if (!this.$TCT.jet_data.cyoa_question_swaps) {
                this.$TCT.jet_data.cyoa_question_swaps = {};
            }
            if (!this.$TCT.jet_data.cyoa_question_swaps[this.id]) {
                this.$TCT.jet_data.cyoa_question_swaps[this.id] = {
                    id: this.id,
                    triggers: [],
                    conditions: [],
                    conditionOperator: 'AND',
                    swaps: []
                };
            }
            if (!this.$TCT.jet_data.cyoa_question_swaps[this.id].conditions) {
                this.$TCT.jet_data.cyoa_question_swaps[this.id].conditions = [];
            }
            if (!this.$TCT.jet_data.cyoa_question_swaps[this.id].conditionOperator) {
                this.$TCT.jet_data.cyoa_question_swaps[this.id].conditionOperator = 'AND';
            }
            return this.$TCT.jet_data.cyoa_question_swaps[this.id];
        },

        addTrigger() {
            const rule = this.getRule();
            const val = Number(this.triggerToAdd);
            if (!val) return;
            if (!rule.triggers.includes(val)) {
                rule.triggers.push(val);
                this.triggerToAdd = null;
                this.$globalData.dataVersion++;
                window.requestAutosaveIfEnabled?.();
            }
        },

        removeTrigger(pk) {
            const rule = this.getRule();
            rule.triggers = rule.triggers.filter(x => x !== pk);
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        addCondition() {
            const rule = this.getRule();
            if (!this.conditionToAdd.variable) {
                alert('Please select a variable.');
                return;
            }

            rule.conditions.push({
                variable: this.conditionToAdd.variable,
                comparator: this.conditionToAdd.comparator,
                value: Number(this.conditionToAdd.value)
            });

            this.conditionToAdd = { variable: '', comparator: '>=', value: 0 };
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        removeCondition(index) {
            const rule = this.getRule();
            if (rule.conditions) {
                rule.conditions.splice(index, 1);
                this.$globalData.dataVersion++;
                window.requestAutosaveIfEnabled?.();
            }
        },

        updateConditionOperator(value) {
            const rule = this.getRule();
            rule.conditionOperator = value;
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        addSwap() {
            const rule = this.getRule();
            rule.swaps.push({ pk1: null, pk2: null });
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        removeSwap(index) {
            const rule = this.getRule();
            rule.swaps.splice(index, 1);
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        updateSwap(index, field, value) {
            const rule = this.getRule();
            if (!rule.swaps[index]) return;

            const newSwap = { ...rule.swaps[index] };
            newSwap[field] = Number(value) || null;

            rule.swaps[index] = newSwap;
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        }
    },

    computed: {
        rule() {
            this.$globalData.dataVersion;
            return this.getRule();
        },

        tick() {
            return this.$globalData.dataVersion;
        },

        variables() {
            return (this.$TCT.getAllCyoaVariables?.() || []).map(v => v.name);
        },

        answers() {
            return Object.values(this.$TCT.answers || {});
        },

        questions() {
            return Array.from(this.$TCT.questions?.values() || []);
        },

        hasConditions() {
            this.$globalData.dataVersion;
            const rule = this.getRule();
            return rule.conditions && rule.conditions.length > 0;
        },

        conditionsList() {
            this.$globalData.dataVersion;
            const rule = this.getRule();
            return rule.conditions || [];
        }
    },

    template: `
    <div class="bg-white rounded-sm shadow-sm p-3 border-l-4 border-indigo-400">
        <div class="flex justify-between items-start mb-2">
            <div class="text-sm text-gray-700">
                <div class="font-medium">Question swap rule #{{ id }}</div>
                <div class="text-xs text-gray-500">
                    (Question swaps are applied after each answer is recorded, allowing you to dynamically change which questions appear.)
                </div>
            </div>
            <button class="text-red-600 hover:text-red-800 text-sm" @click="$emit('deleteRule', id)" aria-label="Delete rule">✕</button>
        </div>

        <!-- Triggers -->
        <div class="mb-3">
            <label class="block text-xs font-medium text-gray-600 mb-1">Trigger answers:</label>
            <div class="flex items-center gap-2">
                <select v-model.number="triggerToAdd" class="border rounded-sm p-1 text-sm">
                    <option :value="null" disabled>Select answer...</option>
                    <option v-for="a in answers" :key="a.pk" :value="a.pk">
                        {{ a.pk }} - {{ (a.fields?.description || '...').slice(0,50) }}
                    </option>
                </select>
                <button class="bg-blue-500 text-white px-2 py-1 rounded-sm text-xs hover:bg-blue-600" @click="addTrigger">Add</button>
            </div>
            <div class="mt-2 flex flex-wrap gap-1">
                <span v-for="pk in rule.triggers" :key="'t-'+pk+'-'+tick" class="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-0.5 rounded-sm text-xs">
                    #{{ pk }}
                    <button class="ml-1 text-blue-700 hover:text-blue-900" @click="removeTrigger(pk)" aria-label="Remove">✕</button>
                </span>
            </div>
        </div>

        <!-- Multiple conditions -->
        <div class="mb-3">
            <label class="block text-xs font-medium text-gray-600 mb-1">Conditions (optional):</label>
            
            <!-- Condition operator selector (only show if conditions exist) -->
            <div v-if="hasConditions" class="mb-2 flex items-center gap-2">
                <span class="text-xs text-gray-600">Join with:</span>
                <select :value="rule.conditionOperator" @change="updateConditionOperator($event.target.value)" class="border rounded-sm p-1 text-sm">
                    <option value="AND">AND (all must be true)</option>
                    <option value="OR">OR (any can be true)</option>
                </select>
            </div>

            <!-- Existing conditions list -->
            <div v-if="hasConditions" class="mb-2 space-y-1">
                <div v-for="(c, idx) in conditionsList" :key="'c-'+idx+'-'+tick" class="grid grid-cols-4 gap-1 items-center bg-gray-100 p-2 rounded-sm">
                    <div class="text-xs font-medium">{{ c.variable }}</div>
                    <div class="text-xs">{{ c.comparator }}</div>
                    <div class="text-xs">{{ c.value }}</div>
                    <button class="text-red-600 hover:text-red-800 text-xs justify-self-end" @click="removeCondition(idx)">✕</button>
                </div>
            </div>

            <!-- Add new condition -->
            <div class="grid grid-cols-4 gap-1 items-center">
                <select v-model="conditionToAdd.variable" class="border rounded-sm p-1 text-sm col-span-1">
                    <option value="" disabled>Variable...</option>
                    <option v-for="v in variables" :key="v" :value="v">{{ v }}</option>
                </select>
                <select v-model="conditionToAdd.comparator" class="border rounded-sm p-1 text-sm col-span-1">
                    <option value=">=">&gt;=</option>
                    <option value="<=">&lt;=</option>
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value="==">==</option>
                    <option value="!=">!=</option>
                </select>
                <input v-model.number="conditionToAdd.value" type="number" class="border rounded-sm p-1 text-sm col-span-1">
                <button class="bg-gray-300 hover:bg-gray-400 px-2 py-1 rounded-sm text-xs col-span-1" @click="addCondition" :disabled="!conditionToAdd.variable">Add</button>
            </div>
        </div>

        <!-- Swaps -->
        <div class="mb-1">
            <label class="block text-xs font-medium text-gray-600 mb-1">Question swaps to apply:</label>
            <div v-for="(s,idx) in rule.swaps" :key="'s-'+idx+'-'+tick" class="grid grid-cols-1 md:grid-cols-5 gap-2 items-center mb-2">
                <div class="md:col-span-2">
                    <label class="block text-[10px] text-gray-500 mb-0.5">Question PK 1</label>
                    <select :value="s.pk1" @change="updateSwap(idx,'pk1',$event.target.value)" class="border rounded-sm p-1 text-sm w-full">
                        <option :value="null" disabled>Select question...</option>
                        <option v-for="q in questions" :key="'pk1-'+q.pk" :value="q.pk">
                            {{ q.pk }} - {{ (q.fields?.question || '...').slice(0,40) }}
                        </option>
                    </select>
                </div>
                <div class="md:col-span-2">
                    <label class="block text-[10px] text-gray-500 mb-0.5">Question PK 2</label>
                    <select :value="s.pk2" @change="updateSwap(idx,'pk2',$event.target.value)" class="border rounded-sm p-1 text-sm w-full">
                        <option :value="null" disabled>Select question...</option>
                        <option v-for="q in questions" :key="'pk2-'+q.pk" :value="q.pk">
                            {{ q.pk }} - {{ (q.fields?.question || '...').slice(0,40) }}
                        </option>
                    </select>
                </div>
                <div class="flex items-center gap-2">
                    <button class="text-red-600 hover:text-red-800 text-xs" @click="removeSwap(idx)">✕</button>
                </div>
            </div>
            <button class="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded-sm text-xs" @click="addSwap">Add another swap</button>
        </div>
    </div>
    `
})

registerComponent('cyoa-answer-swap', {
    props: ['id'],

    data() {
        return {
            triggerToAdd: null,
            conditionToAdd: {
                variable: '',
                comparator: '>=',
                value: 0
            }
        };
    },

    methods: {
        getRule() {
            if (!this.$TCT.jet_data.cyoa_answer_swaps) {
                this.$TCT.jet_data.cyoa_answer_swaps = {};
            }
            if (!this.$TCT.jet_data.cyoa_answer_swaps[this.id]) {
                this.$TCT.jet_data.cyoa_answer_swaps[this.id] = {
                    id: this.id,
                    triggers: [],
                    conditions: [],
                    conditionOperator: 'AND',
                    swaps: []
                };
            }
            if (!this.$TCT.jet_data.cyoa_answer_swaps[this.id].conditions) {
                this.$TCT.jet_data.cyoa_answer_swaps[this.id].conditions = [];
            }
            if (!this.$TCT.jet_data.cyoa_answer_swaps[this.id].conditionOperator) {
                this.$TCT.jet_data.cyoa_answer_swaps[this.id].conditionOperator = 'AND';
            }
            return this.$TCT.jet_data.cyoa_answer_swaps[this.id];
        },

        addTrigger() {
            const rule = this.getRule();
            const val = Number(this.triggerToAdd);
            if (!val) return;
            if (!rule.triggers.includes(val)) {
                rule.triggers.push(val);
                this.triggerToAdd = null;
                this.$globalData.dataVersion++;
                window.requestAutosaveIfEnabled?.();
            }
        },

        removeTrigger(pk) {
            const rule = this.getRule();
            rule.triggers = rule.triggers.filter(x => x !== pk);
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        addCondition() {
            const rule = this.getRule();
            if (!this.conditionToAdd.variable) {
                alert('Please select a variable.');
                return;
            }

            rule.conditions.push({
                variable: this.conditionToAdd.variable,
                comparator: this.conditionToAdd.comparator,
                value: Number(this.conditionToAdd.value)
            });

            this.conditionToAdd = { variable: '', comparator: '>=', value: 0 };
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        removeCondition(index) {
            const rule = this.getRule();
            if (rule.conditions) {
                rule.conditions.splice(index, 1);
                this.$globalData.dataVersion++;
                window.requestAutosaveIfEnabled?.();
            }
        },

        updateConditionOperator(value) {
            const rule = this.getRule();
            rule.conditionOperator = value;
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        addSwap() {
            const rule = this.getRule();
            rule.swaps.push({ pk1: null, pk2: null, takeEffects: true });
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        removeSwap(index) {
            const rule = this.getRule();
            rule.swaps.splice(index, 1);
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        },

        updateSwap(index, field, value) {
            const rule = this.getRule();
            if (!rule.swaps[index]) return;

            const newSwap = { ...rule.swaps[index] };

            if (field === 'takeEffects') {
                newSwap.takeEffects = !!value;
            } else {
                newSwap[field] = Number(value) || null;
            }

            rule.swaps[index] = newSwap;
            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
        }
    },

    computed: {
        rule() {
            this.$globalData.dataVersion;
            return this.getRule();
        },

        tick() {
            return this.$globalData.dataVersion;
        },

        variables() {
            return (this.$TCT.getAllCyoaVariables?.() || []).map(v => v.name);
        },

        answers() {
            return Object.values(this.$TCT.answers || {});
        },

        hasConditions() {
            this.$globalData.dataVersion;
            const rule = this.getRule();
            return rule.conditions && rule.conditions.length > 0;
        },

        conditionsList() {
            this.$globalData.dataVersion;
            const rule = this.getRule();
            return rule.conditions || [];
        }
    },

    template: `
    <div class="bg-white rounded-sm shadow-sm p-3 border-l-4 border-purple-400">
        <div class="flex justify-between items-start mb-2">
            <div class="text-sm text-gray-700">
                <div class="font-medium">Swap rule #{{ id }}</div>
                <div class="text-xs text-gray-500">
                    (Swaps are applied after each answer is recorded, so swapping answers that have already been given will not retroactively change past answers.)
                </div>
            </div>
            <button class="text-red-600 hover:text-red-800 text-sm" @click="$emit('deleteRule', id)" aria-label="Delete rule">✕</button>
        </div>

        <!-- Triggers -->
        <div class="mb-3">
            <label class="block text-xs font-medium text-gray-600 mb-1">Trigger answers:</label>
            <div class="flex items-center gap-2">
                <select v-model.number="triggerToAdd" class="border rounded-sm p-1 text-sm">
                    <option :value="null" disabled>Select answer...</option>
                    <option v-for="a in answers" :key="a.pk" :value="a.pk">
                        {{ a.pk }} - {{ (a.fields?.description || '...').slice(0,50) }}
                    </option>
                </select>
                <button class="bg-blue-500 text-white px-2 py-1 rounded-sm text-xs hover:bg-blue-600" @click="addTrigger">Add</button>
            </div>
            <div class="mt-2 flex flex-wrap gap-1">
                <span v-for="pk in rule.triggers" :key="'t-'+pk+'-'+tick" class="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-0.5 rounded-sm text-xs">
                    #{{ pk }}
                    <button class="ml-1 text-blue-700 hover:text-blue-900" @click="removeTrigger(pk)" aria-label="Remove">✕</button>
                </span>
            </div>
        </div>

        <!-- Multiple conditions -->
        <div class="mb-3">
            <label class="block text-xs font-medium text-gray-600 mb-1">Conditions (optional):</label>
            
            <!-- Condition operator selector (only show if conditions exist) -->
            <div v-if="hasConditions" class="mb-2 flex items-center gap-2">
                <span class="text-xs text-gray-600">Join with:</span>
                <select :value="rule.conditionOperator" @change="updateConditionOperator($event.target.value)" class="border rounded-sm p-1 text-sm">
                    <option value="AND">AND (all must be true)</option>
                    <option value="OR">OR (any can be true)</option>
                </select>
            </div>

            <!-- Existing conditions list -->
            <div v-if="hasConditions" class="mb-2 space-y-1">
                <div v-for="(c, idx) in conditionsList" :key="'c-'+idx+'-'+tick" class="grid grid-cols-4 gap-1 items-center bg-gray-100 p-2 rounded-sm">
                    <div class="text-xs font-medium">{{ c.variable }}</div>
                    <div class="text-xs">{{ c.comparator }}</div>
                    <div class="text-xs">{{ c.value }}</div>
                    <button class="text-red-600 hover:text-red-800 text-xs justify-self-end" @click="removeCondition(idx)">✕</button>
                </div>
            </div>

            <!-- Add new condition -->
            <div class="grid grid-cols-4 gap-1 items-center">
                <select v-model="conditionToAdd.variable" class="border rounded-sm p-1 text-sm col-span-1">
                    <option value="" disabled>Variable...</option>
                    <option v-for="v in variables" :key="v" :value="v">{{ v }}</option>
                </select>
                <select v-model="conditionToAdd.comparator" class="border rounded-sm p-1 text-sm col-span-1">
                    <option value=">=">&gt;=</option>
                    <option value="<=">&lt;=</option>
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value="==">==</option>
                    <option value="!=">!=</option>
                </select>
                <input v-model.number="conditionToAdd.value" type="number" class="border rounded-sm p-1 text-sm col-span-1">
                <button class="bg-gray-300 hover:bg-gray-400 px-2 py-1 rounded-sm text-xs col-span-1" @click="addCondition" :disabled="!conditionToAdd.variable">Add</button>
            </div>
        </div>

        <!-- Swaps -->
        <div class="mb-1">
            <label class="block text-xs font-medium text-gray-600 mb-1">Swaps to apply:</label>
            <div v-for="(s,idx) in rule.swaps" :key="'s-'+idx+'-'+tick" class="grid grid-cols-1 md:grid-cols-5 gap-2 items-center mb-2">
                <div class="md:col-span-2">
                    <label class="block text-[10px] text-gray-500 mb-0.5">Answer PK 1</label>
                    <select :value="s.pk1" @change="updateSwap(idx,'pk1',$event.target.value)" class="border rounded-sm p-1 text-sm w-full">
                        <option :value="null" disabled>Select answer...</option>
                        <option v-for="a in answers" :key="'pk1-'+a.pk" :value="a.pk">
                            {{ a.pk }} - {{ (a.fields?.description || '...').slice(0,40) }}
                        </option>
                    </select>
                </div>
                <div class="md:col-span-2">
                    <label class="block text-[10px] text-gray-500 mb-0.5">Answer PK 2</label>
                    <select :value="s.pk2" @change="updateSwap(idx,'pk2',$event.target.value)" class="border rounded-sm p-1 text-sm w-full">
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
            <button class="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded-sm text-xs" @click="addSwap">Add another swap</button>
        </div>
    </div>
    `
})
