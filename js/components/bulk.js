// political sentiment lexicons & stopwords
const TCT_STOPWORDS = new Set([
    "a", "about", "above", "after", "again", "against", "all", "almost", "also", "although",
    "always", "am", "an", "and", "another", "any", "are", "aren't", "as", "at", "be",
    "because", "been", "before", "being", "below", "between", "both", "but", "by", "can",
    "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't",
    "down", "during", "each", "even", "every", "few", "for", "from", "further", "had",
    "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's",
    "her", "here", "hers", "herself", "him", "himself", "his", "how", "however", "i",
    "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's",
    "its", "itself", "just", "let", "let's", "may", "maybe", "me", "might", "more",
    "most", "must", "my", "myself", "no", "nor", "not", "of", "off", "on", "once",
    "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own",
    "same", "shall", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so",
    "some", "such", "than", "that", "that's", "the", "their", "theirs", "them",
    "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll",
    "they're", "they've", "this", "those", "through", "to", "too", "under", "until",
    "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
    "weren't", "what", "what's", "when", "where", "which", "while", "who", "whom",
    "why", "will", "with", "won't", "would", "wouldn't", "yes", "yet", "you", "you'd",
    "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves"
]);

const TCT_GAFFE_PATTERNS = [
    /\bno comment\b/i,
    /\bnone of (your|the|anybody'?s) business\b/i,
    /\brefuse to (answer|comment|speak)\b/i,
    /\b(i )?(apologize|apologise|regret|misspoke|made a mistake)\b/i,
    /\bwho cares\b/i,
    /\bdon'?t care\b/i,
    /\bshut up\b/i,
    /\bnot my problem\b/i,
    /\bterrible mistake\b/i,
    /\bdisastrous blunder\b/i
];

const TCT_ATTACK_WORDS = new Set([
    "radical", "extremist", "corrupt", "corruption", "hypocrite", "hypocrisy",
    "liar", "lying", "cheat", "crooked", "scandal", "reckless", "puppet",
    "disaster", "failed", "failure", "weak", "weakness", "unfit", "treason",
    "traitor", "clown", "moron", "danger", "dangerous", "incompetent", "out-of-touch"
]);

const TCT_POSITIVE_WORDS = new Set([
    "progress", "prosper", "prosperity", "strong", "strength", "lead", "leader",
    "leadership", "unite", "unity", "deliver", "protect", "protection", "future",
    "reform", "improve", "improvement", "historic", "freedom", "liberty", "opportunity",
    "invest", "investment", "grow", "growth", "steady", "proud", "pride", "trust",
    "working", "families", "restore", "bright", "resolve", "popular", "success"
]);

const TCT_NEGATIVE_WORDS = new Set([
    "fail", "failure", "failed", "crisis", "disaster", "terrible", "awful", "horrible",
    "collapse", "ruin", "bankrupt", "shame", "shameful", "suffer", "suffering",
    "pain", "destroy", "destruction", "corrupt", "weak", "blunder", "mistake", "regret"
]);

const TCT_PRO_EXPANSION_WORDS = new Set([
    "support", "expand", "increase", "raise", "pass", "enact", "fund", "funding",
    "protect", "strengthen", "guarantee", "universal", "legalize", "subsidize",
    "promote", "invest", "extend", "favor"
]);

const TCT_ANTI_RESTRICTION_WORDS = new Set([
    "oppose", "ban", "cut", "slash", "reduce", "lower", "repeal", "end", "abolish",
    "block", "deny", "stop", "illegal", "restrict", "restriction", "eliminate",
    "terminate", "dismantle", "limit"
]);

const TCT_MODERATE_WORDS = new Set([
    "compromise", "moderate", "balance", "balanced", "middle", "bipartisan",
    "pragmatic", "caution", "cautious", "study", "review", "gradual", "current",
    "status", "sensible"
]);

const TCT_STANCE_BENCHMARKS = {
    1: -0.85,
    2: -0.50,
    3: -0.22,
    4:  0.00,
    5:  0.22,
    6:  0.50,
    7:  0.85
};

registerComponent('bulk', {

    data() {
        return {
            answerPk: "",
            candidate: "",
            affectedCandidate: "",
            issuePk: Object.keys(this.$TCT.issues)[0],
            stateIssueScore: "",
            issueWeight: "",
            issueFilter: "",
            bulkCandidatePk: this.$TCT.getAllCandidatePKs()[0],
            stateMultiplier: "",
            multiplier: 1,
            selectedQuestionPk: null,
            selectedAnswerPks: [],
            naturalLanguageEffects: "",
            randomEffectsSeed: "",
            randomGlobalChance: 0.5,
            randomGlobalMax: 0.008,
            randomIssueChance: 0.65,
            randomIssueMaxDelta: 0.8,
            randomIssueImportanceMin: 1,
            randomIssueImportanceMax: 2,
            randomSmartIssueSelection: true,
            campaignScriptInput: "",
            campaignScriptWarnings: [],
            campaignScriptFileName: "",
            changeElectionPk: "",
            stateItems: [],
            issueItems: [],
            multiplierItems: []
        };
    },

    template: `
    <div class="mx-auto p-4 bg-white rounded-lg shadow-sm">

        <h2 class="font-bold text-lg mb-3">Bulk Utilities</h2>

        <details class="mb-4">
            <summary class="font-semibold cursor-pointer p-2 bg-gray-50 rounded">Bulk State Answer Score Utility</summary>
            <div class="p-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Answer PK</label>
                        <input v-model="answerPk" name="name" type="number"
                               class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-xs focus:ring-3 focus:ring-blue-400 focus:border-blue-500">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700">Candidate PK</label>
                        <input v-model="candidate" name="name" type="number"
                               class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-xs focus:ring-3 focus:ring-blue-400 focus:border-blue-500">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700">Affected Candidate PK</label>
                        <input v-model="affectedCandidate" name="name" type="number"
                               class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-xs focus:ring-3 focus:ring-blue-400 focus:border-blue-500">
                    </div>
                </div>

                <div class="flex flex-wrap gap-2 mb-3">
                    <button class="bg-gray-200 text-gray-800 px-3 py-2 rounded hover:bg-gray-300" @click="checkAll()">Check All</button>
                    <button class="bg-gray-200 text-gray-800 px-3 py-2 rounded hover:bg-gray-300" @click="invertAll()">Invert All Values</button>
                    <button class="ml-auto bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600" @click="generate()">Generate State Scores</button>
                </div>

                <ul class="divide-y border rounded overflow-hidden">
                    <li v-for="item in stateItems" :key="item.pk" class="flex items-center justify-between p-2">
                        <div class="flex items-center space-x-3">
                            <input type="checkbox" v-model="item.include" class="h-4 w-4">
                            <span class="text-sm text-gray-700">{{ item.name }}</span>
                        </div>
                        <input v-model.number="item.amount" name="amount" type="number" class="ml-4 w-28 p-1 border border-gray-300 rounded-md text-sm">
                    </li>
                </ul>
            </div>
        </details>

        <details class="mb-4">
            <summary class="font-semibold cursor-pointer p-2 bg-gray-50 rounded">Bulk State Issue Score Utility</summary>
            <div class="p-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Issue</label>
                        <select @change="setIssuePk($event)" name="issue" v-model.number="issuePk"
                                class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-xs focus:ring-3 focus:ring-blue-400 focus:border-blue-500">
                            <option v-for="issue in issues" :value="issue.pk" :key="issue.pk">{{issue.pk}} - {{issue.fields.name}}</option>
                        </select>
                    </div>

                    <div class="flex gap-2">
                        <div class="flex-1">
                            <label class="block text-sm font-medium text-gray-700">Bulk issue score</label>
                            <input v-model="stateIssueScore" name="name" type="number" step="0.01"
                                class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-xs focus:ring-3 focus:ring-blue-400 focus:border-blue-500 transition-colors duration-300"
                                :class="getScoreColorClass(stateIssueScore)"
                                placeholder="Value to apply to checked">
                            <p v-if="stateIssueScore !== ''" class="text-[10px] mt-1 transition-colors duration-500" :class="getScoreColorClass(stateIssueScore)">
                                Target Stance: {{ getStanceLabel(stateIssueScore, issuePk) }}
                            </p>
                        </div>

                        <div class="flex-1">
                            <label class="block text-sm font-medium text-gray-700">Bulk issue weight</label>
                            <input v-model="issueWeight" name="name" type="number" step="0.1"
                                class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-xs focus:ring-3 focus:ring-blue-400 focus:border-blue-500"
                                placeholder="Value to apply to checked">
                        </div>
                    </div>
                </div>

                <div class="flex flex-wrap items-center gap-2 mb-3">
                    <button class="bg-gray-200 text-gray-800 px-3 py-1 text-sm rounded hover:bg-gray-300" @click="checkAllIssues()">Check all</button>
                    <button class="bg-gray-200 text-gray-800 px-3 py-1 text-sm rounded hover:bg-gray-300" @click="uncheckAllIssues()">Uncheck all</button>
                    <div class="flex-grow"></div>
                    <input v-model="issueFilter" placeholder="Filter states..." class="p-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 focus:border-blue-500 w-48">
                    <button class="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600" @click="setIssueScores()">Apply bulk updates</button>
                </div>

                <ul class="divide-y border rounded overflow-hidden max-h-96 overflow-y-auto">
                    <li v-for="item in filteredIssueItems" :key="item.pk" class="p-2 hover:bg-gray-50 flex flex-col gap-1 transition-all duration-300">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-3 overflow-hidden">
                                <input type="checkbox" v-model="item.include" class="h-4 w-4 shrink-0">
                                <div class="flex flex-col truncate">
                                    <span class="text-sm font-medium text-gray-700 truncate">{{ item.name }}</span>
                                    <span class="text-[10px] truncate transition-colors duration-500" :class="getScoreColorClass(item.score)">
                                        {{ getStanceLabel(item.score, issuePk) }}
                                    </span>
                                </div>
                            </div>

                            <div class="flex items-center gap-2 shrink-0">
                                <div class="flex flex-col">
                                    <label class="text-[10px] text-gray-400 uppercase leading-none">Score</label>
                                    <input v-model.number="item.score" @change="syncIssueItem(item)" type="number" step="0.001"
                                        class="w-20 p-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-400 transition-colors duration-300"
                                        :class="getScoreColorClass(item.score)">
                                </div>
                                <div class="flex flex-col">
                                    <label class="text-[10px] text-gray-400 uppercase leading-none">Weight</label>
                                    <input v-model.number="item.weight" @change="syncIssueItem(item)" type="number" step="0.1"
                                        class="w-16 p-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-400">
                                </div>
                            </div>
                        </div>

                        <div class="flex items-center pl-7 gap-2">
                            <input type="range" v-model.number="item.score" @input="syncIssueItem(item)" min="-1" max="1" step="0.001"
                                class="flex-grow h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer transition-all duration-300"
                                :class="getSliderAccentClass(item.score)">
                            <span class="text-[10px] font-mono w-10 text-right transition-colors duration-300" :class="getScoreColorClass(item.score)">
                                {{ Number(item.score).toFixed(3) }}
                            </span>
                        </div>
                    </li>
                </ul>
            </div>
        </details>

        <details class="mb-4">
            <summary class="font-semibold cursor-pointer p-2 bg-gray-50 rounded">Bulk Answer Effects Utility</summary>
            <div class="p-4">
                <div class="mb-3">
                    <label class="block text-sm font-medium text-gray-700">Question</label>
                    <select v-model.number="selectedQuestionPk"
                            class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-xs focus:ring-3 focus:ring-blue-400 focus:border-blue-500">
                        <option v-for="q in questionsList" :value="q.pk" :key="q.pk">{{q.pk}} - {{q.fields.description.substring(0, 100)}}...</option>
                    </select>
                </div>

                <div v-if="selectedQuestionPk" class="mb-3">
                    <label class="block text-sm font-medium text-gray-700">Answers</label>
                    <div class="mt-1 border rounded max-h-48 overflow-y-auto bg-white">
                        <label v-for="a in answersForSelectedQuestion" :key="a.pk" class="flex items-center p-2 border-b last:border-0 hover:bg-gray-50 cursor-pointer">
                            <input type="checkbox" :value="a.pk" v-model="selectedAnswerPks" class="h-4 w-4 mr-3">
                            <div class="flex flex-col">
                                <span class="text-xs font-bold text-gray-400">PK {{a.pk}}</span>
                                <span class="text-sm text-gray-700">{{a.fields.description}}</span>
                            </div>
                        </label>
                    </div>
                    <div class="mt-2 flex gap-2">
                        <button @click="selectAllAnswers" class="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300">Select all</button>
                        <button @click="deselectAllAnswers" class="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300">Deselect all</button>
                    </div>
                </div>

                <div class="mb-3">
                    <label class="block text-sm font-medium text-gray-700">Effects</label>
                    <textarea v-model="naturalLanguageEffects" rows="3"
                            placeholder="e.g. (-0.01 Smith, Economy 0.2 Importance 2, Healthcare 0.3 Importance 1)"
                            class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-xs focus:ring-3 focus:ring-blue-400 focus:border-blue-500"></textarea>
                    <p class="text-[12px] text-gray-500 mt-1">
                        Format: (value CandidatePK/Nickname, IssueName Score Importance Score ...)
                        Please separate multiple effects with commas.
                </div>

                <div class="flex justify-end">
                    <button class="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600 shadow-sm transition-all active:transform active:scale-95"
                            @click="applyBulkAnswerEffects()">
                        Apply to selected answers
                    </button>
                </div>

                <div class="mt-4 border border-gray-200 rounded p-3 bg-gray-50">
                    <p class="text-xs font-semibold text-gray-700 mb-1">Smart random effects</p>
                    <p class="text-xs text-gray-600 mb-3">These vaguely smart but definitely random effects will attempt to heuristically match questions to issues, compare answer wording against the campaign issue stances, flags political rhetoric/gaffes, and detects targeted opponent criticism. Use the global chance and cap to control how many effects are applied, and the issue-specific settings to control how strong those effects are.</p>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                        <div>
                            <label class="block text-xs font-medium text-gray-700">Seed (optional)</label>
                            <input v-model="randomEffectsSeed" type="text" placeholder="blank = fresh randomness"
                                class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-xs focus:ring-2 focus:ring-blue-400 focus:border-blue-500 text-xs">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-700">Global chance (0-1)</label>
                            <input v-model.number="randomGlobalChance" type="number" step="0.01" min="0" max="1"
                                class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-xs focus:ring-2 focus:ring-blue-400 focus:border-blue-500 text-xs">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-700">Global cap</label>
                            <input v-model.number="randomGlobalMax" type="number" step="0.001" min="0"
                                class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-xs focus:ring-2 focus:ring-blue-400 focus:border-blue-500 text-xs">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
                        <div>
                            <label class="block text-xs font-medium text-gray-700">Issue chance (0-1)</label>
                            <input v-model.number="randomIssueChance" type="number" step="0.01" min="0" max="1"
                                class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-xs focus:ring-2 focus:ring-blue-400 focus:border-blue-500 text-xs">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-700">Issue score cap</label>
                            <input v-model.number="randomIssueMaxDelta" type="number" step="0.01" min="0"
                                class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-xs focus:ring-2 focus:ring-blue-400 focus:border-blue-500 text-xs">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-700">Importance min</label>
                            <input v-model.number="randomIssueImportanceMin" type="number" step="0.1" min="0.1"
                                class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-xs focus:ring-2 focus:ring-blue-400 focus:border-blue-500 text-xs">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-700">Importance max</label>
                            <input v-model.number="randomIssueImportanceMax" type="number" step="0.1" min="0.1"
                                class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-xs focus:ring-2 focus:ring-blue-400 focus:border-blue-500 text-xs">
                        </div>
                    </div>

                    <label class="flex items-center gap-2 text-xs text-gray-700 mb-3">
                        <input type="checkbox" v-model="randomSmartIssueSelection" class="h-4 w-4">
                        Pick issues from question/answer text when possible
                    </label>

                    <div class="flex justify-end">
                        <button class="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600 shadow-sm transition-all active:transform active:scale-95"
                                @click="applySmartRandomEffects()">
                            Apply smart random effects
                        </button>
                    </div>
                </div>
            </div>
        </details>

        <details>
            <summary class="font-semibold cursor-pointer p-2 bg-gray-50 rounded">Bulk Candidate State Multiplier Utility</summary>
            <div class="p-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Candidate</label>
                        <select @change="setCandidatePk($event)" name="issue" v-model.number="bulkCandidatePk"
                                class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-xs focus:ring-3 focus:ring-blue-400 focus:border-blue-500">
                            <option v-for="candidate in candidates" :value="candidate.pk" :key="candidate.pk">{{candidate.pk}} {{candidate.nickname}}</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700">State Multiplier</label>
                        <input v-model.number="stateMultiplier" name="stateMultiplier" type="number"
                               class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-xs focus:ring-3 focus:ring-blue-400 focus:border-blue-500">
                    </div>
                </div>

                <div class="flex gap-2 mb-3">
                    <button class="bg-gray-200 text-gray-800 px-3 py-2 rounded hover:bg-gray-300" @click="checkAllStates()">Check All</button>
                    <button class="bg-gray-200 text-gray-800 px-3 py-2 rounded hover:bg-gray-300" @click="uncheckAllStates()">Uncheck All</button>
                    <button class="ml-auto bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600" @click="setStateMultipliers()">Set State Multipliers</button>
                </div>

                <ul class="divide-y border rounded overflow-hidden mb-3">
                    <li v-for="item in multiplierItems" :key="item.pk" class="flex items-center justify-between p-2">
                        <div class="flex items-center space-x-3">
                            <input type="checkbox" v-model="item.include" class="h-4 w-4">
                            <span class="text-sm text-gray-700">{{ item.name }}</span>
                        </div>
                    </li>
                </ul>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700">Multiply All Checked State Multipliers By</label>
                        <input v-model.number="multiplier" name="multiplier" type="number"
                               class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-xs focus:ring-3 focus:ring-blue-400 focus:border-blue-500">
                    </div>
                    <div class="flex justify-end">
                        <button class="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600" @click="multiplyStateMultipliers()">Multiply</button>
                    </div>
                </div>
            </div>
        </details>

        <details class="mt-4">
            <summary class="font-semibold cursor-pointer p-2 bg-gray-50 rounded">CampaignScript Import Utility</summary>
            <div class="p-4 space-y-3">
                <p class="text-xs text-gray-700">
                    Created by Decstar, CampaignScript (CS) uses natural language for easier creation of question sets for a mod.<br>Here, you can paste either import or paste CS text and apply it directly to this mod. Supports <span class="font-mono">Question</span>, <span class="font-mono">-</span>, <span class="font-mono">(feedback)</span>, <span class="font-mono">+</span>, <span class="font-mono">+*</span>, and <span class="font-mono">+-</span> syntax.
                </p>

                <div class="flex flex-wrap items-center gap-2">
                    <label class="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300 cursor-pointer">
                        Import file
                        <input type="file" class="hidden" accept=".txt,.cs,.campaignscript,.md" @change="importCampaignScriptFile($event)">
                    </label>
                    <span v-if="campaignScriptFileName" class="text-xs text-gray-500">{{ campaignScriptFileName }}</span>
                    <button class="ml-auto text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300" @click="campaignScriptInput = ''; campaignScriptWarnings = []; campaignScriptFileName = ''">Clear</button>
                </div>

                <textarea v-model="campaignScriptInput" rows="10"
                    placeholder="Question 1: Your question text\n- First answer\n(feedback text)\n+ 101 0.02\n+* 501 101 0.05\n+- 32 0.5 1"
                    class="p-2 block w-full border border-gray-300 rounded-md shadow-xs focus:ring-3 focus:ring-blue-400 focus:border-blue-500 font-mono text-xs"></textarea>

                <div class="flex justify-end">
                    <button class="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600" @click="applyCampaignScript()">Apply CampaignScript</button>
                </div>

                <div v-if="campaignScriptWarnings.length" class="border border-amber-300 bg-amber-50 rounded p-2">
                    <p class="text-xs font-semibold text-amber-700 mb-1">Warnings</p>
                    <ul class="list-disc pl-5 text-xs text-amber-700 space-y-1">
                        <li v-for="(w, idx) in campaignScriptWarnings" :key="'cswarn-' + idx">{{ w }}</li>
                    </ul>
                </div>
            </div>
        </details>

        <details class="mt-4">
            <summary class="font-semibold cursor-pointer p-2 bg-gray-50 rounded">Change election PK (use with caution)</summary>
            <div class="p-4 space-y-3">
                <div class="border border-amber-300 bg-amber-50 rounded p-3 text-xs text-amber-800">
                    <strong>Warning:</strong> This changes the election PK on the entirety of your Code 2. The election PKs here must
                    match the ones on your Code 1 as well, or else your scenario will break. Only use this if you know what you're doing.
                </div>
                <div class="flex items-center gap-3">
                    <div class="flex-1">
                        <label class="block text-sm font-medium text-gray-700">New election PK</label>
                        <input v-model="changeElectionPk" type="number" placeholder="Enter new election PK"
                               class="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-xs focus:ring-3 focus:ring-blue-400 focus:border-blue-500">
                    </div>
                    <button class="mt-6 bg-amber-500 text-white px-4 py-2 rounded hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            :disabled="changeElectionPk === '' || changeElectionPk === null"
                            @click="applyChangeElectionPk()">Apply</button>
                </div>
            </div>
        </details>

    </div>
    `,

    mounted() {
        this.refreshStateItems();
        this.refreshIssueItems();
        this.refreshMultiplierItems();
    },

    watch: {
        issuePk() {
            this.refreshIssueItems();
        },
        bulkCandidatePk() {
            this.refreshMultiplierItems();
        },
        selectedQuestionPk() {
            this.selectedAnswerPks = [];
        }
    },

    methods: {

        setCandidatePk: function (evt) {
            this.bulkCandidatePk = Number(evt.target.value);
        },

        setIssuePk: function (evt) {
            this.issuePk = Number(evt.target.value);
        },

        getStanceLabel(score, issuePk) {
            const issue = this.$TCT.issues[issuePk];
            if (!issue) return "Unknown issue";

            let stanceIndex = 4;
            if (score <= -0.71) stanceIndex = 1;
            else if (score <= -0.3) stanceIndex = 2;
            else if (score <= -0.125) stanceIndex = 3;
            else if (score <= 0.125) stanceIndex = 4;
            else if (score <= 0.3) stanceIndex = 5;
            else if (score <= 0.71) stanceIndex = 6;
            else stanceIndex = 7;

            return issue.fields["stance_" + stanceIndex] || `Stance ${stanceIndex}`;
        },

        getScoreColorClass(score) {
            if (score <= -0.125) return "text-red-600 font-bold";
            if (score >= 0.125) return "text-green-600 font-bold";
            return "text-gray-500";
        },

        getSliderAccentClass(score) {
            if (score <= -0.125) return "accent-red-500";
            if (score >= 0.125) return "accent-green-500";
            return "accent-blue-500";
        },

        refreshStateItems() {
            this.stateItems = Object.values(this.$TCT.states).map(s => ({
                pk: s.pk,
                name: s.fields.name || `State ${s.pk}`,
                include: false,
                amount: 0
            }));
        },

        refreshIssueItems() {
            const scores = Object.values(this.$TCT.state_issue_scores).filter((x) => x.fields.issue == this.issuePk);
            this.issueItems = scores.map(s => ({
                pk: s.pk,
                name: this.$TCT.states[s.fields.state]?.fields?.name || `State ${s.fields.state}`,
                include: false,
                score: s.fields.state_issue_score,
                weight: s.fields.weight
            }));
        },

        refreshMultiplierItems() {
            const mults = Object.values(this.$TCT.candidate_state_multiplier).filter((x) => x.fields.candidate == this.bulkCandidatePk);
            this.multiplierItems = mults.map(m => ({
                pk: m.pk,
                name: this.$TCT.states[m.fields.state]?.fields?.name || `State ${m.fields.state}`,
                include: false
            }));
        },

        syncIssueItem(item) {
            this.$TCT.state_issue_scores[item.pk].fields.state_issue_score = Number(item.score);
            this.$TCT.state_issue_scores[item.pk].fields.weight = Number(item.weight);
            this.$globalData.dataVersion++;
        },

        generate: function () {
            if (!this.answerPk) {
                alert("Answer PK required.");
                return;
            }
            for (const item of this.stateItems) {
                if (item.include) {
                    const newPk = this.$TCT.getNewPk();
                    let x = {
                        "model": "campaign_trail.answer_score_state",
                        "pk": newPk,
                        "fields": {
                            "answer": Number(this.answerPk),
                            "state": item.pk,
                            "candidate": Number(this.candidate) || this.$TCT.getDefaultCandidatePK(),
                            "affected_candidate": Number(this.affectedCandidate) || this.$TCT.getDefaultCandidatePK(),
                            "state_multiplier": item.amount
                        }
                    };
                    this.$TCT.answer_score_state[newPk] = x;
                }
            }
            this.$TCT._invalidateCache('state_score_by_answer');
            this.$globalData.dataVersion++;
            alert("Bulk generated state scores for answer with PK " + this.answerPk + " (do not submit again)");
        },

        setIssueScores: function () {
            for (const item of this.issueItems) {
                if (item.include) {
                    if (this.stateIssueScore !== "" && this.stateIssueScore !== null) {
                        this.$TCT.state_issue_scores[item.pk].fields.state_issue_score = Number(this.stateIssueScore);
                        item.score = Number(this.stateIssueScore);
                    }
                    if (this.issueWeight !== "" && this.issueWeight !== null) {
                        this.$TCT.state_issue_scores[item.pk].fields.weight = Number(this.issueWeight);
                        item.weight = Number(this.issueWeight);
                    }
                }
            }
            this.$globalData.dataVersion++;
            alert("Set issue scores!");
        },

        setStateMultipliers: function () {
            for (const item of this.multiplierItems) {
                if (item.include) {
                    this.$TCT.candidate_state_multiplier[item.pk].fields.state_multiplier = Number(this.stateMultiplier);
                }
            }
            this.$globalData.dataVersion++;
            alert("Set state multipliers!");
        },

        multiplyStateMultipliers: function () {
            for (const item of this.multiplierItems) {
                if (item.include) {
                    this.$TCT.candidate_state_multiplier[item.pk].fields.state_multiplier *= Number(this.multiplier);
                }
            }
            this.$globalData.dataVersion++;
            alert("Multiplied state multipliers!");
        },

        selectAllAnswers: function () {
            this.selectedAnswerPks = this.answersForSelectedQuestion.map(a => a.pk);
        },

        deselectAllAnswers: function () {
            this.selectedAnswerPks = [];
        },

        clamp(value, min, max) {
            return Math.max(min, Math.min(max, value));
        },

        makeSeededRng(seedText) {
            let seed = 2166136261;
            const source = String(seedText || "");
            for (let index = 0; index < source.length; index++) {
                seed ^= source.charCodeAt(index);
                seed = Math.imul(seed, 16777619);
            }
            seed >>>= 0;
            return function () {
                seed += 0x6D2B79F5;
                let t = seed;
                t = Math.imul(t ^ (t >>> 15), t | 1);
                t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            };
        },

        stemToken(word) {
            let w = String(word || "").toLowerCase().trim();
            if (w.length <= 3) return w;
            w = w.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
            if (w.length <= 3) return w;
            return w
                .replace(/(?:ing|edly|ingly|tion|tions|ment|ments|ness|nesses|ism|isms|ist|ists|al|als|ies)$/, "")
                .replace(/(?:ed|es|ly|s)$/, "");
        },

        tokenizeForSimilarity(text) {
            return String(text || "")
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, " ")
                .split(/[\s-]+/)
                .map(t => this.stemToken(t))
                .filter(t => t.length >= 3 && !TCT_STOPWORDS.has(t));
        },

        getCandidateProfiles() {
            const pks = this.$TCT.getAllCandidatePKs().map(Number);
            const defaultPk = Number(this.$TCT.getDefaultCandidatePK());
            const profiles = [];

            for (const pk of pks) {
                const names = new Set();
                const nickname = this.$TCT.getNicknameForCandidate?.(pk) || this.$TCT.jet_data?.nicknames?.[pk];
                if (nickname) {
                    names.add(String(nickname).toLowerCase().trim());
                }

                const candidateObj = this.$TCT.candidate?.[pk] || this.$TCT.candidates?.[pk];
                if (candidateObj && candidateObj.fields) {
                    const fn = String(candidateObj.fields.first_name || "").toLowerCase().trim();
                    const ln = String(candidateObj.fields.last_name || "").toLowerCase().trim();
                    if (fn && fn.length >= 3) names.add(fn);
                    if (ln && ln.length >= 3) names.add(ln);
                    if (fn && ln) names.add(`${fn} ${ln}`);
                }

                profiles.push({
                    pk,
                    isDefault: pk === defaultPk,
                    names: Array.from(names)
                });
            }
            return profiles;
        },

        analyzePoliticalContent(answerText, questionText, candidateProfiles) {
            const cleanAnswer = String(answerText || "").toLowerCase();
            const cleanQuestion = String(questionText || "").toLowerCase();

            // detect gaffes/evasions
            let isGaffe = false;
            for (const pattern of TCT_GAFFE_PATTERNS) {
                if (pattern.test(cleanAnswer)) {
                    isGaffe = true;
                    break;
                }
            }

            // detect candidate targeting (is an opponent explicitly mentioned?)
            let targetCandidatePk = null;
            let isAttack = false;
            for (const prof of candidateProfiles) {
                for (const name of prof.names) {
                    const regex = new RegExp(`\\b${name}\\b`, 'i');
                    if (regex.test(cleanAnswer)) {
                        if (!prof.isDefault) {
                            targetCandidatePk = prof.pk;
                        }
                        break;
                    }
                }
                if (targetCandidatePk) break;
            }

            // check attack keywords
            const tokens = cleanAnswer.replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
            let attackHits = 0;
            let posHits = 0;
            let negHits = 0;

            for (let i = 0; i < tokens.length; i++) {
                const token = tokens[i];
                const prev = i > 0 ? tokens[i - 1] : "";
                const isNegated = ["not", "never", "no", "without", "won't", "hardly"].includes(prev);

                if (TCT_ATTACK_WORDS.has(token)) {
                    attackHits += isNegated ? -0.5 : 1;
                }
                if (TCT_POSITIVE_WORDS.has(token)) {
                    posHits += isNegated ? -1 : 1;
                }
                if (TCT_NEGATIVE_WORDS.has(token)) {
                    negHits += isNegated ? -1 : 1;
                }
            }

            if (targetCandidatePk && attackHits >= 1) {
                isAttack = true;
            }

            let polarity = (posHits - negHits - attackHits * 0.5) / Math.max(1, posHits + negHits + attackHits);
            if (isGaffe) polarity = -0.8;
            if (tokens.length <= 4 && !posHits) polarity -= 0.3; // dismissive short answer

            return {
                polarity: this.clamp(polarity, -1, 1),
                isGaffe,
                isAttack,
                targetCandidatePk
            };
        },

        getTextPolarityScore(text) {
            const analysis = this.analyzePoliticalContent(text, "", []);
            return analysis.polarity;
        },

        getSentimentDirection(text, rng) {
            const polarity = this.getTextPolarityScore(text);
            const noisyPolarity = polarity + (rng() - 0.5) * 0.12;

            if (noisyPolarity > 0.04) return 1;
            if (noisyPolarity < -0.04) return -1;
            return rng() < 0.5 ? 1 : -1;
        },

        pickImportanceBucket(minValue, maxValue, rng) {
            const allowedValues = [1, 1.5, 2, 2.5].filter(v => v >= minValue && v <= maxValue);
            const pool = allowedValues.length > 0 ? allowedValues : [1, 1.5, 2];
            return pool[Math.floor(rng() * pool.length)];
        },

        pickCoherentIssuePk(questionText, answerText, rng) {
            const issueEntries = Object.values(this.$TCT.issues);
            if (issueEntries.length === 0) return null;

            if (!this.randomSmartIssueSelection) {
                const randomIssue = issueEntries[Math.floor(rng() * issueEntries.length)];
                return randomIssue ? Number(randomIssue.pk) : null;
            }

            const qLower = String(questionText || "").toLowerCase();
            const aLower = String(answerText || "").toLowerCase();
            const qTokens = new Set(this.tokenizeForSimilarity(qLower));
            const aTokens = new Set(this.tokenizeForSimilarity(aLower));

            const scored = issueEntries.map(issue => {
                const fields = issue.fields || {};
                const issueName = String(fields.name || "").toLowerCase().trim();
                let relevance = 0;

                // strong bonus if issue name explicitly appears in question or answer
                if (issueName) {
                    if (qLower.includes(issueName)) relevance += 16;
                    if (aLower.includes(issueName)) relevance += 10;

                    const nameTokens = this.tokenizeForSimilarity(issueName);
                    for (const nt of nameTokens) {
                        if (qTokens.has(nt)) relevance += 5;
                        if (aTokens.has(nt)) relevance += 3;
                    }
                }

                // check stance text overlaps
                for (let s = 1; s <= 7; s++) {
                    const stanceText = fields[`stance_${s}`];
                    if (stanceText) {
                        const sTokens = this.tokenizeForSimilarity(stanceText);
                        for (const st of sTokens) {
                            if (qTokens.has(st)) relevance += 1;
                            if (aTokens.has(st)) relevance += 1.8;
                        }
                    }
                }

                return {
                    pk: Number(issue.pk),
                    relevance
                };
            });

            scored.sort((left, right) => right.relevance - left.relevance);
            const top = scored.slice(0, Math.min(4, scored.length));

            if (top[0] && top[0].relevance > 0) {
                const weightSum = top.reduce((sum, entry) => sum + Math.max(0.2, entry.relevance), 0);
                let roll = rng() * weightSum;
                for (const entry of top) {
                    roll -= Math.max(0.2, entry.relevance);
                    if (roll <= 0) return entry.pk;
                }
                return top[0].pk;
            }

            return Number(issueEntries[Math.floor(rng() * issueEntries.length)].pk);
        },

        determineIssueStanceScore(issuePk, answerText, rng, issueCap) {
            const issue = this.$TCT.issues[issuePk];
            if (!issue) return Number(((rng() * 2 - 1) * issueCap).toFixed(3));

            const cleanAnswer = String(answerText || "").toLowerCase();
            const aTokens = new Set(this.tokenizeForSimilarity(cleanAnswer));
            const rawTokens = cleanAnswer.replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);

            let proCount = 0;
            let antiCount = 0;
            let modCount = 0;

            for (const token of rawTokens) {
                if (TCT_PRO_EXPANSION_WORDS.has(token)) proCount++;
                if (TCT_ANTI_RESTRICTION_WORDS.has(token)) antiCount++;
                if (TCT_MODERATE_WORDS.has(token)) modCount++;
            }

            // compare directly against each defined stance (1..7)
            const stanceScores = [];
            for (let i = 1; i <= 7; i++) {
                const stanceText = issue.fields?.[`stance_${i}`] || "";
                let score = 0;

                if (stanceText) {
                    const sTokens = this.tokenizeForSimilarity(stanceText);
                    for (const st of sTokens) {
                        if (aTokens.has(st)) score += 3;
                    }
                }

                // add directional alignment bonuses
                if (i <= 2) score += antiCount * 2;
                else if (i >= 6) score += proCount * 2;
                else if (i === 4) score += modCount * 3;

                stanceScores.push({ index: i, score });
            }

            stanceScores.sort((a, b) => b.score - a.score);
            let bestStanceIndex = stanceScores[0].index;

            // fallback if no specific stance keywords matched
            if (stanceScores[0].score === 0) {
                if (modCount > proCount && modCount > antiCount) bestStanceIndex = 4;
                else if (proCount > antiCount) bestStanceIndex = 6;
                else if (antiCount > proCount) bestStanceIndex = 2;
                else bestStanceIndex = rng() < 0.5 ? 3 : 5;
            }

            const baseScore = TCT_STANCE_BENCHMARKS[bestStanceIndex] ?? 0.0;
            const scaled = baseScore * (issueCap / 0.85);
            const jitter = (rng() - 0.5) * 0.05;
            return Number(this.clamp(scaled + jitter, -issueCap, issueCap).toFixed(3));
        },

        determineIssueImportance(issuePk, questionText, answerText, minImp, maxImp, rng) {
            const issue = this.$TCT.issues[issuePk];
            const issueName = String(issue?.fields?.name || "").toLowerCase().trim();
            const qLower = String(questionText || "").toLowerCase();

            let targetImportance = (minImp + maxImp) / 2;

            // if the issue is central to the question prompt, make it highly important
            if (issueName && qLower.includes(issueName)) {
                targetImportance = maxImp;
            } else if (qLower && this.tokenizeForSimilarity(issueName).some(t => qLower.includes(t))) {
                targetImportance = Math.min(maxImp, minImp + (maxImp - minImp) * 0.75);
            } else {
                targetImportance = minImp + rng() * (maxImp - minImp) * 0.5;
            }

            // snap to clean intervals (1, 1.5, 2, 2.5)
            const rounded = Math.round(targetImportance * 2) / 2;
            return this.clamp(rounded, minImp, maxImp);
        },

        upsertGlobalEffect(answerPk, playerCandidatePk, affectedCandidatePk, amount) {
            const existingGlobalScores = this.$TCT.getGlobalScoreForAnswer(answerPk);
            const existing = existingGlobalScores.find(s =>
                s.fields.affected_candidate === affectedCandidatePk &&
                s.fields.candidate === playerCandidatePk
            );

            if (existing) {
                existing.fields.global_multiplier = amount;
                return false;
            }

            const newPk = this.$TCT.getNewPk();
            this.$TCT.answer_score_global[newPk] = {
                "model": "campaign_trail.answer_score_global",
                "pk": newPk,
                "fields": {
                    "answer": answerPk,
                    "candidate": playerCandidatePk,
                    "affected_candidate": affectedCandidatePk,
                    "global_multiplier": amount
                }
            };
            return true;
        },

        upsertIssueEffect(answerPk, issuePk, scoreDelta, importanceScale) {
            const existingIssueScores = this.$TCT.getIssueScoreForAnswer(answerPk);
            const existing = existingIssueScores.find(s => s.fields.issue === issuePk);

            if (existing) {
                existing.fields.issue_score = this.clamp(scoreDelta, -1, 1);
                existing.fields.issue_importance = this.clamp(importanceScale, 0.1, 4);
                return false;
            }

            const newPk = this.$TCT.getNewPk();
            this.$TCT.answer_score_issue[newPk] = {
                "model": "campaign_trail.answer_score_issue",
                "pk": newPk,
                "fields": {
                    "answer": answerPk,
                    "issue": issuePk,
                    "issue_score": scoreDelta,
                    "issue_importance": this.clamp(importanceScale, 0.1, 4)
                }
            };
            return true;
        },

        applySmartRandomEffects: function () {
            if (this.selectedAnswerPks.length === 0) {
                alert("Please select at least one answer.");
                return;
            }

            const globalChance = this.clamp(Number(this.randomGlobalChance) || 0, 0, 1);
            const issueChance = this.clamp(Number(this.randomIssueChance) || 0, 0, 1);
            const globalCap = Math.max(0, Number(this.randomGlobalMax) || 0);
            const issueCap = Math.max(0, Number(this.randomIssueMaxDelta) || 0);
            const importanceMinRaw = Math.max(0.1, Number(this.randomIssueImportanceMin) || 0.1);
            const importanceMaxRaw = Math.max(0.1, Number(this.randomIssueImportanceMax) || 0.1);
            const importanceMin = Math.min(importanceMinRaw, importanceMaxRaw);
            const importanceMax = Math.max(importanceMinRaw, importanceMaxRaw);

            const runSeed = this.randomEffectsSeed.trim() || `${Date.now()}-${Math.random()}`;
            const rng = this.makeSeededRng(runSeed);

            const defaultCandidatePk = Number(this.$TCT.getDefaultCandidatePK());
            const candidateProfiles = this.getCandidateProfiles();

            let globalApplied = 0;
            let issueApplied = 0;
            let createdGlobal = 0;
            let createdIssue = 0;

            for (const answerPk of this.selectedAnswerPks) {
                const answerObj = this.$TCT.answers[answerPk];
                const questionPk = answerObj?.fields?.question;
                const questionObj = this.$TCT.questions.get(questionPk);
                const answerText = answerObj?.fields?.description || "";
                const questionText = questionObj?.fields?.description || "";

                const analysis = this.analyzePoliticalContent(answerText, questionText, candidateProfiles);

                // apply global multiplier
                if (globalCap > 0 && rng() <= globalChance) {
                    let affectedCandidatePk = defaultCandidatePk;
                    let sign = 1;
                    let magnitude = rng() * globalCap;

                    if (analysis.isGaffe) {
                        affectedCandidatePk = defaultCandidatePk;
                        sign = -1;
                        magnitude = Math.max(globalCap * 0.4, magnitude);
                    } else if (analysis.isAttack && analysis.targetCandidatePk) {
                        // attack explicitly targeting opponent
                        affectedCandidatePk = analysis.targetCandidatePk;
                        sign = -1; // hurts opponent's momentum
                        magnitude = Math.max(globalCap * 0.35, magnitude);
                    } else {
                        affectedCandidatePk = defaultCandidatePk;
                        if (analysis.polarity > 0.15) {
                            sign = 1;
                        } else if (analysis.polarity < -0.15) {
                            sign = -1;
                        } else {
                            sign = rng() < 0.5 ? 1 : -1;
                            magnitude *= 0.45;
                        }
                    }

                    const amount = Number((magnitude * sign).toFixed(6));
                    const isNew = this.upsertGlobalEffect(answerPk, defaultCandidatePk, affectedCandidatePk, amount);
                    if (isNew) createdGlobal++;
                    globalApplied++;
                }

                // apply issue effect
                if (issueCap > 0 && rng() <= issueChance) {
                    const issuePk = this.pickCoherentIssuePk(questionText, answerText, rng);
                    if (issuePk != null) {
                        const scoreDelta = this.determineIssueStanceScore(Number(issuePk), answerText, rng, issueCap);
                        const importanceScale = this.determineIssueImportance(Number(issuePk), questionText, answerText, importanceMin, importanceMax, rng);

                        const isNew = this.upsertIssueEffect(answerPk, Number(issuePk), scoreDelta, importanceScale);
                        if (isNew) createdIssue++;
                        issueApplied++;
                    }
                }
            }

            this.$TCT._invalidateCache('global_score_by_answer');
            this.$TCT._invalidateCache('issue_score_by_answer');
            this.$TCT._invalidateCache('answer_score_issue_by_issue');
            this.$globalData.dataVersion++;

            alert(
                `Smart random effects applied to ${this.selectedAnswerPks.length} answers.\n` +
                `- Global multipliers: ${globalApplied} (${createdGlobal} new)\n` +
                `- Issue stances: ${issueApplied} (${createdIssue} new)\n` +
                `- Seed: ${runSeed}`
            );
        },

        applyBulkAnswerEffects: function () {
            if (this.selectedAnswerPks.length === 0) {
                alert("Please select at least one answer.");
                return;
            }
            if (!this.naturalLanguageEffects.trim()) {
                alert("Please enter some effects.");
                return;
            }

            const effects = this.parseNaturalLanguageEffects(this.naturalLanguageEffects);
            if (effects.candidates.length === 0 && effects.issues.length === 0) {
                alert("No valid effects found in the input. Ensure nicknames/issue names match exactly (case insensitive).");
                return;
            }

            for (const aPk of this.selectedAnswerPks) {
                const existingGlobalScores = this.$TCT.getGlobalScoreForAnswer(aPk);
                const existingStateScores = this.$TCT.getStateScoreForAnswer(aPk);

                // apply candidate effects
                for (const eff of effects.candidates) {

                    if (eff.statePks && eff.statePks.length > 0) {
                        for (const sPk of eff.statePks) {
                            const existing = existingStateScores.find(s => s.fields.state === sPk && s.fields.affected_candidate === eff.affectedCandidatePk && s.fields.candidate === eff.playerCandidatePk);
                            if (existing) {
                                existing.fields.state_multiplier = eff.amount;
                            } else {
                                const newPk = this.$TCT.getNewPk();
                                this.$TCT.answer_score_state[newPk] = {
                                    "model": "campaign_trail.answer_score_state",
                                    "pk": newPk,
                                    "fields": {
                                        "answer": aPk,
                                        "state": sPk,
                                        "candidate": eff.playerCandidatePk,
                                        "affected_candidate": eff.affectedCandidatePk,
                                        "state_multiplier": eff.amount
                                    }
                                };
                                this.$TCT._invalidateCache('state_score_by_answer');
                            }
                        }
                    } else {
                        const existing = existingGlobalScores.find(s => s.fields.affected_candidate === eff.affectedCandidatePk && s.fields.candidate === eff.playerCandidatePk);
                        if (existing) {
                            existing.fields.global_multiplier = eff.amount;
                        } else {
                            const newPk = this.$TCT.getNewPk();
                            this.$TCT.answer_score_global[newPk] = {
                                "model": "campaign_trail.answer_score_global",
                                "pk": newPk,
                                "fields": {
                                    "answer": aPk,
                                    "candidate": eff.playerCandidatePk,
                                    "affected_candidate": eff.affectedCandidatePk,
                                    "global_multiplier": eff.amount
                                }
                            };
                            this.$TCT._invalidateCache('global_score_by_answer');
                        }
                    }
                }

                // apply issue effects
                const existingIssueScores = this.$TCT.getIssueScoreForAnswer(aPk);
                for (const eff of effects.issues) {
                    const existing = existingIssueScores.find(s => s.fields.issue === eff.issuePk);
                    if (existing) {
                        existing.fields.issue_score = eff.score;
                        existing.fields.issue_importance = eff.importance;
                    } else {
                        const newPk = this.$TCT.getNewPk();
                        this.$TCT.answer_score_issue[newPk] = {
                            "model": "campaign_trail.answer_score_issue",
                            "pk": newPk,
                            "fields": {
                                "answer": aPk,
                                "issue": eff.issuePk,
                                "issue_score": eff.score,
                                "issue_importance": eff.importance
                            }
                        };
                        this.$TCT._invalidateCache('issue_score_by_answer');
                        this.$TCT._invalidateCache('answer_score_issue_by_issue');
                    }
                }
            }

            this.$globalData.dataVersion++;
            alert("Applied effects to " + this.selectedAnswerPks.length + " answers!");
        },

        parseNaturalLanguageEffects: function (input) {
            const results = {
                candidates: [],
                issues: []
            };

            let str = input.trim();
            if (str.startsWith('(') && str.endsWith(')')) {
                str = str.substring(1, str.length - 1);
            }

            const parts = [];
            let currentPart = "";
            let parenDepth = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str[i];
                if (char === '(') parenDepth++;
                else if (char === ')') parenDepth--;

                if (char === ',' && parenDepth === 0) {
                    parts.push(currentPart.trim());
                    currentPart = "";
                } else {
                    currentPart += char;
                }
            }
            if (currentPart.trim()) parts.push(currentPart.trim());

            const nicknameToPk = {};
            if (this.$TCT.jet_data && this.$TCT.jet_data.nicknames) {
                for (const pk in this.$TCT.jet_data.nicknames) {
                    nicknameToPk[this.$TCT.jet_data.nicknames[pk].toLowerCase()] = Number(pk);
                }
            }

            const issueNameToPk = {};
            for (const pk in this.$TCT.issues) {
                const name = this.$TCT.issues[pk].fields.name;
                if (name) {
                    issueNameToPk[name.toLowerCase()] = Number(pk);
                }
            }

            const stateNameToPk = {};
            for (const pk in this.$TCT.states) {
                const name = this.$TCT.states[pk].fields.name;
                if (name) {
                    stateNameToPk[name.toLowerCase()] = Number(pk);
                }
            }

            const resolveCandidate = (text) => {
                const t = text.trim().toLowerCase();
                if (nicknameToPk[t] !== undefined) return nicknameToPk[t];
                const pk = parseInt(t);
                if (!isNaN(pk) && this.$TCT.getAllCandidatePKs().includes(pk)) return pk;
                return null;
            };

            const resolveState = (text) => {
                const t = text.trim().toLowerCase();
                if (stateNameToPk[t] !== undefined) return stateNameToPk[t];
                const pk = parseInt(t);
                if (!isNaN(pk) && this.$TCT.states[pk]) return pk;
                return null;
            };

            for (const part of parts) {
                const importanceMatch = part.match(/Importance\s+([+-]?\d*\.?\d+)/i);
                let importance = 1.0;
                let remainingPart = part;
                if (importanceMatch) {
                    importance = parseFloat(importanceMatch[1]);
                    remainingPart = part.replace(importanceMatch[0], '').trim();
                }

                // check for state list in parentheses at the end
                let statePks = [];
                const stateMatch = remainingPart.match(/\(([^)]+)\)$/);
                if (stateMatch) {
                    const stateNames = stateMatch[1].split(',').map(s => s.trim());
                    for (const name of stateNames) {
                        const sPk = resolveState(name);
                        if (sPk !== null) statePks.push(sPk);
                    }
                    remainingPart = remainingPart.replace(stateMatch[0], '').trim();
                }

                const numbers = remainingPart.match(/[+-]?\d*\.?\d+/g);
                if (!numbers) continue;

                const amount = parseFloat(numbers[0]);
                const text = remainingPart.replace(numbers[0], '').trim().toLowerCase();

                // check for "X to Y" syntax
                const toParts = text.split(/\s+to\s+/);
                if (toParts.length === 2) {
                    const affectedPk = resolveCandidate(toParts[0]);
                    const playerPk = resolveCandidate(toParts[1]);
                    if (affectedPk !== null && playerPk !== null) {
                        results.candidates.push({
                            affectedCandidatePk: affectedPk,
                            playerCandidatePk: playerPk,
                            amount: amount,
                            statePks: statePks
                        });
                        continue;
                    }
                }

                const possiblePk = parseInt(text);

                let issuePk = issueNameToPk[text];
                if (!issuePk && !isNaN(possiblePk) && this.$TCT.issues[possiblePk]) {
                    issuePk = possiblePk;
                }

                if (issuePk || (importanceMatch && text !== "")) {
                    results.issues.push({
                        issuePk: issuePk || 0,
                        score: amount,
                        importance: importance
                    });
                    continue;
                }

                const candidatePk = resolveCandidate(text);
                if (candidatePk !== null) {
                    results.candidates.push({
                        affectedCandidatePk: candidatePk,
                        playerCandidatePk: candidatePk, // default: X to X
                        amount: amount,
                        statePks: statePks
                    });
                }
            }

            return results;
        },

        importCampaignScriptFile: function (evt) {
            const file = evt?.target?.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = () => {
                this.campaignScriptInput = String(reader.result || "");
                this.campaignScriptFileName = file.name;
            };
            reader.onerror = () => {
                alert("Failed to read file.");
            };
            reader.readAsText(file);
        },

        parseCampaignScript: function (input) {
            const rawLines = String(input || "").split(/\r?\n/);
            const initialLines = rawLines
                .map(line => line.split("#")[0].trim())
                .filter(Boolean);

            const { config, aliases, warnings: configWarnings, scriptLines } = this.parseCampaignScriptConfig(initialLines);
            const lines = this.applyCampaignScriptAliases(scriptLines, aliases);

            const warnings = [...configWarnings];
            const parsed = {
                questions: [],
                warnings,
                config
            };

            const nicknameToPk = {};
            if (this.$TCT.jet_data?.nicknames) {
                for (const candidatePk in this.$TCT.jet_data.nicknames) {
                    nicknameToPk[String(this.$TCT.jet_data.nicknames[candidatePk]).toLowerCase()] = Number(candidatePk);
                }
            }

            const allCandidatePks = this.$TCT.getAllCandidatePKs().map(Number);
            const candidatePkSet = new Set(allCandidatePks);

            const issueNameToPk = {};
            for (const issuePk in this.$TCT.issues) {
                const issueName = this.$TCT.issues[issuePk]?.fields?.name;
                if (issueName) {
                    issueNameToPk[String(issueName).toLowerCase()] = Number(issuePk);
                    issueNameToPk[String(issueName).toLowerCase().replace(/\s+/g, "_")] = Number(issuePk);
                }
            }

            const stateNameToPk = {};
            for (const statePk in this.$TCT.states) {
                const stateName = this.$TCT.states[statePk]?.fields?.name;
                if (stateName) {
                    stateNameToPk[String(stateName).toLowerCase()] = Number(statePk);
                    stateNameToPk[String(stateName).toLowerCase().replace(/\s+/g, "_")] = Number(statePk);
                }
            }

            const resolveCandidate = (token) => {
                const value = String(token || "").trim().toLowerCase().replace(/\s+/g, "_");
                if (!value) return null;
                if (value === "self") return this.$TCT.getDefaultCandidatePK();
                const numeric = Number(value);
                if (!isNaN(numeric)) return candidatePkSet.has(numeric) ? numeric : null;
                if (nicknameToPk[value] != null) return nicknameToPk[value];
                return null;
            };

            const resolveState = (token) => {
                const value = String(token || "").trim().toLowerCase().replace(/\s+/g, "_");
                if (!value) return null;
                const numeric = Number(value);
                if (!isNaN(numeric)) return this.$TCT.states[numeric] ? numeric : null;
                return stateNameToPk[value] ?? null;
            };

            const resolveIssue = (token) => {
                const value = String(token || "").trim().toLowerCase().replace(/\s+/g, "_");
                if (!value) return null;
                const numeric = Number(value);
                if (!isNaN(numeric)) return this.$TCT.issues[numeric] ? numeric : null;
                return issueNameToPk[value] ?? null;
            };

            let currentQuestion = null;
            let currentAnswer = null;

            const makeError = (lineNumber, message, lineText) => ({
                error: `Line ${lineNumber}: ${message} (${lineText})`
            });

            for (let index = 0; index < lines.length; index++) {
                const line = lines[index];
                const interpretedLine = index + 1;
                const lower = line.toLowerCase();

                if (lower.startsWith("question")) {
                    const parts = line.split(":");
                    const questionText = parts.slice(1).join(":").trim();
                    currentQuestion = {
                        text: questionText,
                        answers: []
                    };
                    parsed.questions.push(currentQuestion);
                    currentAnswer = null;
                    continue;
                }

                if (line.startsWith("-")) {
                    if (!currentQuestion) return makeError(interpretedLine, "Answer declared before any question", line);
                    if (currentQuestion.answers.length >= 4) return makeError(interpretedLine, "More than 4 answers declared for one question", line);
                    currentAnswer = {
                        text: line.slice(1).trim(),
                        feedback: [],
                        globalEffects: [],
                        stateEffects: [],
                        issueEffects: []
                    };
                    currentQuestion.answers.push(currentAnswer);
                    continue;
                }

                if (line.startsWith("(") && line.endsWith(")")) {
                    if (!currentAnswer) return makeError(interpretedLine, "Feedback declared before any answer", line);
                    const inner = line.slice(1, -1).trim();
                    const match = inner.match(/^for\s+candidate\s+(\d+)\s*:\s*(.*)$/i);
                    if (match) {
                        const feedbackCandidate = Number(match[1]);
                        if (!candidatePkSet.has(feedbackCandidate)) {
                            warnings.push(`Line ${interpretedLine} skipped candidate-specific feedback: unknown candidate ${match[1]}.`);
                            continue;
                        }
                        currentAnswer.feedback.push({
                            candidate: feedbackCandidate,
                            text: match[2].trim()
                        });
                    } else {
                        currentAnswer.feedback.push({
                            candidate: null,
                            text: inner
                        });
                    }
                    continue;
                }

                if (line.startsWith("+-") || lower.startsWith("affects issue")) {
                    if (!currentAnswer) return makeError(interpretedLine, "Issue effect declared before any answer", line);

                    const tokenized = line.startsWith("+-")
                        ? line.slice(2).trim().split(/\s+/)
                        : line.replace(/^affects\s+issue\s+/i, "").trim().split(/\s+/);

                    if (tokenized.length < 3) return makeError(interpretedLine, "Issue effect requires issue, score, and importance", line);

                    const issueToken = tokenized[0];
                    const scoreToken = tokenized[1].toLowerCase() === "by" ? tokenized[2] : tokenized[1];
                    const importanceToken = tokenized[tokenized.length - 1];

                    const issuePk = resolveIssue(issueToken);
                    const issueScore = Number(scoreToken);
                    const issueImportance = Number(importanceToken);

                    if (isNaN(issueScore) || isNaN(issueImportance)) {
                        return makeError(interpretedLine, "Invalid issue effect format", line);
                    }
                    if (issuePk == null) {
                        warnings.push(`Line ${interpretedLine} skipped issue effect: unknown issue '${issueToken}'.`);
                        continue;
                    }

                    currentAnswer.issueEffects.push({
                        issuePk,
                        issueScore,
                        issueImportance
                    });
                    continue;
                }

                if (line.startsWith("+*") || lower.startsWith("affects state")) {
                    if (!currentAnswer) return makeError(interpretedLine, "State effect declared before any answer", line);

                    const tokenized = line.startsWith("+*")
                        ? line.slice(2).trim().split(/\s+/)
                        : line.replace(/^affects\s+state\s+/i, "").trim().split(/\s+/);

                    if (tokenized.length < 3) return makeError(interpretedLine, "State effect requires state, candidate, and multiplier", line);

                    let stateToken = tokenized[0];
                    let candidateToken = tokenized[1];
                    let amountToken = tokenized[2];

                    if (!line.startsWith("+*")) {
                        const byIdx = tokenized.findIndex(t => t.toLowerCase() === "by");
                        const forIdx = tokenized.findIndex(t => t.toLowerCase() === "for");
                        if (byIdx >= 0 && forIdx > byIdx + 1) {
                            stateToken = tokenized[0];
                            amountToken = tokenized[byIdx + 1];
                            candidateToken = tokenized[forIdx + 1];
                        }
                    }

                    const statePk = resolveState(stateToken);
                    const affectedCandidate = resolveCandidate(candidateToken);
                    const multiplier = Number(amountToken);

                    if (isNaN(multiplier)) {
                        return makeError(interpretedLine, "Invalid state effect format", line);
                    }
                    if (statePk == null) {
                        warnings.push(`Line ${interpretedLine} skipped state effect: unknown state '${stateToken}'.`);
                        continue;
                    }
                    if (affectedCandidate == null) {
                        warnings.push(`Line ${interpretedLine} skipped state effect: unknown candidate '${candidateToken}'.`);
                        continue;
                    }

                    currentAnswer.stateEffects.push({
                        statePk,
                        affectedCandidate,
                        stateMultiplier: multiplier
                    });
                    continue;
                }

                if ((line.startsWith("+") && !line.startsWith("+*") && !line.startsWith("+-")) || lower.startsWith("affects")) {
                    if (!currentAnswer) return makeError(interpretedLine, "Global effect declared before any answer", line);

                    const tokenized = line.startsWith("+")
                        ? line.slice(1).trim().split(/\s+/)
                        : line.replace(/^affects\s+/i, "").trim().split(/\s+/);

                    if (tokenized.length < 2) return makeError(interpretedLine, "Global effect requires candidate and multiplier", line);

                    let targetToken = tokenized[0];
                    let amountToken = tokenized[1];
                    if (amountToken && amountToken.toLowerCase() === "by") {
                        amountToken = tokenized[2];
                    }

                    const affectedCandidate = resolveCandidate(targetToken);
                    const globalMultiplier = Number(amountToken);
                    if (isNaN(globalMultiplier)) {
                        return makeError(interpretedLine, "Invalid global effect format", line);
                    }
                    if (affectedCandidate == null) {
                        warnings.push(`Line ${interpretedLine} skipped global effect: unknown candidate '${targetToken}'.`);
                        continue;
                    }

                    currentAnswer.globalEffects.push({
                        affectedCandidate,
                        globalMultiplier
                    });
                    continue;
                }

                warnings.push(`Line ${interpretedLine} ignored: ${line}`);
            }

            if (parsed.questions.length === 0) {
                return { error: "No questions found in CampaignScript." };
            }

            return parsed;
        },

        parseCampaignScriptConfig: function (lines) {
            const config = {};
            const aliases = [];
            const warnings = [];
            const scriptLines = [];
            let inConfig = false;

            lines.forEach((line, index) => {
                try {
                    if (index === 0 && line.toLowerCase() === "defaults") {
                        config.defaults = true;
                        return;
                    }

                    if (line.startsWith(";")) {
                        const command = line.slice(1).trim().toLowerCase();
                        inConfig = command.startsWith("config");
                        return;
                    }

                    if (inConfig) {
                        if (line.toLowerCase().startsWith("alias")) {
                            const aliasBody = line.slice(5).trim();
                            const eqIndex = aliasBody.indexOf("=");
                            if (eqIndex === -1) {
                                warnings.push(`Config line ${index + 1} ignored: invalid alias syntax.`);
                                return;
                            }

                            const aliasName = aliasBody.slice(0, eqIndex).trim();
                            const aliasValue = aliasBody.slice(eqIndex + 1).trim();
                            if (!aliasName || !aliasValue) {
                                warnings.push(`Config line ${index + 1} ignored: empty alias name/value.`);
                                return;
                            }

                            const normalizedAlias = aliasName.startsWith("%") ? aliasName : `%${aliasName}`;
                            aliases.push([normalizedAlias, aliasValue]);
                            return;
                        }

                        const eqIndex = line.indexOf("=");
                        if (eqIndex === -1) {
                            config[line.trim()] = true;
                        } else {
                            const key = line.slice(0, eqIndex).trim();
                            const value = line.slice(eqIndex + 1).trim();
                            if (!key) {
                                warnings.push(`Config line ${index + 1} ignored: empty config key.`);
                            } else {
                                config[key] = value;
                            }
                        }
                        return;
                    }

                    scriptLines.push(line);
                } catch (_error) {
                    warnings.push(`Config line ${index + 1} ignored: invalid syntax.`);
                }
            });

            return { config, aliases, warnings, scriptLines };
        },

        applyCampaignScriptAliases: function (lines, aliases) {
            if (!aliases || aliases.length === 0) return lines;
            let content = lines.join("\n");
            for (const [alias, replacement] of aliases) {
                content = content.replaceAll(alias, replacement);
            }
            return content.split("\n");
        },

        applyCampaignScript: function () {
            if (!this.campaignScriptInput.trim()) {
                alert("Please paste or import CampaignScript first.");
                return;
            }

            const parsed = this.parseCampaignScript(this.campaignScriptInput);
            if (parsed.error) {
                alert(parsed.error);
                return;
            }

            let questionCount = 0;
            let answerCount = 0;
            let feedbackCount = 0;
            let globalCount = 0;
            let stateCount = 0;
            let issueCount = 0;
            let firstQuestionPk = null;

            const defaultCandidatePk = this.$TCT.getDefaultCandidatePK();

            for (const parsedQuestion of parsed.questions) {
                const questionPk = this.$TCT.getNewPk();
                if (firstQuestionPk == null) firstQuestionPk = questionPk;
                this.$TCT.questions.set(questionPk, {
                    "model": "campaign_trail.question",
                    "pk": questionPk,
                    "fields": {
                        "description": parsedQuestion.text || ""
                    }
                });
                questionCount++;

                for (const parsedAnswer of parsedQuestion.answers) {
                    const answerPk = this.$TCT.getNewPk();
                    this.$TCT.answers[answerPk] = {
                        "model": "campaign_trail.answer",
                        "pk": answerPk,
                        "fields": {
                            "question": questionPk,
                            "description": parsedAnswer.text || ""
                        }
                    };
                    answerCount++;

                    for (const fb of parsedAnswer.feedback) {
                        const feedbackPk = this.$TCT.getNewPk();
                        this.$TCT.answer_feedback[feedbackPk] = {
                            "model": "campaign_trail.answer_feedback",
                            "pk": feedbackPk,
                            "fields": {
                                "answer": answerPk,
                                "candidate": fb.candidate == null ? defaultCandidatePk : Number(fb.candidate),
                                "answer_feedback": fb.text || ""
                            }
                        };
                        feedbackCount++;
                    }

                    for (const globalEff of parsedAnswer.globalEffects) {
                        const globalPk = this.$TCT.getNewPk();
                        this.$TCT.answer_score_global[globalPk] = {
                            "model": "campaign_trail.answer_score_global",
                            "pk": globalPk,
                            "fields": {
                                "answer": answerPk,
                                "candidate": defaultCandidatePk,
                                "affected_candidate": Number(globalEff.affectedCandidate),
                                "global_multiplier": Number(globalEff.globalMultiplier)
                            }
                        };
                        globalCount++;
                    }

                    for (const stateEff of parsedAnswer.stateEffects) {
                        const statePk = this.$TCT.getNewPk();
                        this.$TCT.answer_score_state[statePk] = {
                            "model": "campaign_trail.answer_score_state",
                            "pk": statePk,
                            "fields": {
                                "answer": answerPk,
                                "state": Number(stateEff.statePk),
                                "candidate": defaultCandidatePk,
                                "affected_candidate": Number(stateEff.affectedCandidate),
                                "state_multiplier": Number(stateEff.stateMultiplier)
                            }
                        };
                        stateCount++;
                    }

                    for (const issueEff of parsedAnswer.issueEffects) {
                        const issuePk = this.$TCT.getNewPk();
                        this.$TCT.answer_score_issue[issuePk] = {
                            "model": "campaign_trail.answer_score_issue",
                            "pk": issuePk,
                            "fields": {
                                "answer": answerPk,
                                "issue": Number(issueEff.issuePk),
                                "issue_score": Number(issueEff.issueScore),
                                "issue_importance": Number(issueEff.issueImportance)
                            }
                        };
                        issueCount++;
                    }
                }
            }

            this.$TCT._invalidateCache('answers_by_question');
            this.$TCT._invalidateCache('feedback_by_answer');
            this.$TCT._invalidateCache('global_score_by_answer');
            this.$TCT._invalidateCache('state_score_by_answer');
            this.$TCT._invalidateCache('issue_score_by_answer');
            this.$TCT._invalidateCache('answer_score_issue_by_issue');

            if (firstQuestionPk != null) {
                this.selectedQuestionPk = firstQuestionPk;
            }

            this.campaignScriptWarnings = parsed.warnings;
            this.$globalData.dataVersion++;
            alert(`CampaignScript imported! Added ${questionCount} questions, ${answerCount} answers, ${feedbackCount} feedbacks, ${globalCount} global effects, ${stateCount} state effects, and ${issueCount} issue effects.`);
        },

        checkAllStates: function () {
            this.multiplierItems.forEach(i => i.include = true);
        },

        uncheckAllStates: function () {
            this.multiplierItems.forEach(i => i.include = false);
        },

        checkAllIssues: function () {
            this.issueItems.forEach(i => i.include = true);
        },

        uncheckAllIssues: function () {
            this.issueItems.forEach(i => i.include = false);
        },

        checkAll: function () {
            this.stateItems.forEach(i => i.include = true);
        },

        invertAll: function () {
            this.stateItems.forEach(i => i.amount = -i.amount);
        },

        applyChangeElectionPk: function () {
            const newPk = Number(this.changeElectionPk);
            if (isNaN(newPk)) return;

            const msg = `This will change the election PK on ALL states and issues to ${newPk}.\n\nAre you sure?`;
            if (!confirm(msg)) return;

            for (const state of Object.values(this.$TCT.states)) {
                state.fields.election = newPk;
            }

            for (const issue of Object.values(this.$TCT.issues)) {
                issue.fields.election = newPk;
            }

            this.$globalData.dataVersion++;
            window.requestAutosaveIfEnabled?.();
            this.changeElectionPk = "";
            alert(`Election PK changed to ${newPk} on all states and issues.`);
        }
    },

    computed: {

        candidates: function () {
            return this.$TCT.getAllCandidatePKs().map((x) => {
                let nickname = this.$TCT.getNicknameForCandidate(x);
                if (nickname) nickname = " (" + nickname + ")"
                return {
                    pk: x,
                    nickname: nickname
                }
            });
        },

        issues: function () {
            return Object.values(this.$TCT.issues);
        },

        filteredIssueItems: function () {
            if (!this.issueFilter) return this.issueItems;
            const f = this.issueFilter.toLowerCase();
            return this.issueItems.filter(i => i.name.toLowerCase().includes(f));
        },

        states: function () {
            return Object.values(this.$TCT.states);
        },

        questionsList: function () {
            return Array.from(this.$TCT.questions.values());
        },

        answersForSelectedQuestion: function () {
            if (!this.selectedQuestionPk) return [];
            return this.$TCT.getAnswersForQuestion(this.selectedQuestionPk);
        },

        stateIssueScores: function () {
            return Object.values(this.$TCT.state_issue_scores).filter((x) => x.fields.issue == this.issuePk)
        },

        stateMultipliers: function () {
            return Object.values(this.$TCT.candidate_state_multiplier).filter((x) => x.fields.candidate == this.bulkCandidatePk)
        }
    }
});

registerComponent('bulk-state', {

    data() {
        return {
            include: false,
            amount: 0,
        };
    },

    props: ['pk', 'stateObject'],

    template: `
    <li class="flex items-center justify-between p-2 border-b">
        <div class="flex items-center space-x-3">
            <input type="checkbox" v-model="include" class="h-4 w-4">
            <span class="text-sm text-gray-700">{{stateObject.fields.name}}</span>
        </div>
        <input v-model="amount" name="name" type="number" class="ml-4 w-28 p-1 border border-gray-300 rounded-md text-sm">
    </li>
    `,

    computed: {

    }
});

registerComponent('bulk-issue', {

    data() {
        return {
            include: false,
        };
    },

    props: ['pk', 'issueScoreObject'],

    template: `
    <li class="flex items-center justify-between p-2 border-b">
        <div class="flex items-center space-x-3">
            <input type="checkbox" v-model="include" class="h-4 w-4">
            <span class="text-sm text-gray-700">{{stateName}}</span>
        </div>
    </li>
    `,

    computed: {
        stateName: function () {
            return this.$TCT.states[this.issueScoreObject.fields.state].fields.name;
        }
    }
});

registerComponent('bulk-state-multiplier', {

    data() {
        return {
            include: false,
        };
    },

    props: ['pk', 'stateMultiplierObject'],

    template: `
    <li class="flex items-center justify-between p-2 border-b">
        <div class="flex items-center space-x-3">
            <input type="checkbox" v-model="include" class="h-4 w-4">
            <span class="text-sm text-gray-700">{{stateName}}</span>
        </div>
    </li>
    `,

    computed: {
        stateName: function () {
            return this.$TCT.states[this.stateMultiplierObject.fields.state].fields.name;
        }
    }
});
