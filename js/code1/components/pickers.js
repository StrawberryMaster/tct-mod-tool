registerCode1Component('mode-picker', {
    template: `
    <div class="flex flex-wrap gap-2">
        <button v-for="m in modes" :key="m.id" 
            @click="setMode(m.id)"
            :class="['px-3 py-1 rounded text-sm font-medium transition', $globalData1.mode === m.id ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300']"
        >
            {{ m.label }}
        </button>
    </div>
    `,
    data() {
        return {
            modes: [
                { id: 'ELECTION', label: 'Election' },
                { id: 'CANDIDATE', label: 'Candidates' },
                { id: 'RUNNING_MATE', label: 'Running Mates' },
                { id: 'THEME', label: 'Theme' },
                { id: 'SETTINGS', label: 'Global Params' }
            ]
        };
    },
    methods: {
        setMode(mode) {
            this.$globalData1.mode = mode;
        }
    }
});

registerCode1Component('election-editor', {
    template: `
    <div class="space-y-4">
        <h3 class="text-lg font-bold border-b pb-1">Election details</h3>
        <div v-for="(election, index) in $TCT1.elections" :key="index" class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700">Display year</label>
                <input v-model="election.fields.display_year" @input="onInput" type="text" class="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Year</label>
                    <input v-model.number="election.fields.year" @input="onInput" type="number" class="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">PK (ID)</label>
                    <input v-model.number="election.pk" @input="onInput" type="number" class="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Electoral votes to win</label>
                    <input v-model.number="election.fields.winning_electoral_vote_number" @input="onInput" type="number" class="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Image URL</label>
                <input v-model="election.fields.image_url" @input="onInput" type="text" class="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Summary (HTML)</label>
                <textarea v-model="election.fields.summary" @input="onInput" rows="5" class="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"></textarea>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Recommended reading (HTML)</label>
                <textarea v-model="election.fields.recommended_reading" @input="onInput" rows="5" class="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"></textarea>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Credits</label>
                <input v-model="$TCT1.credits" @input="onInput" type="text" class="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
            </div>
        </div>
    </div>
    `,
    methods: {
        onInput() {
            // Sync with temp_election_list
            const election = this.$TCT1.elections[0];
            const temp = this.$TCT1.temp_election_list[0];
            if (election && temp) {
                temp.id = Number(election.pk);
                temp.year = Number(election.fields.year);
                temp.display_year = election.fields.display_year;
            }
            window.requestCode1AutosaveDebounced();
        }
    }
});

registerCode1Component('candidate-editor', {
    template: `
    <div class="space-y-4">
        <div class="flex justify-between items-center border-b pb-1">
            <h3 class="text-lg font-bold">Candidates</h3>
            <button @click="addCandidate" class="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">+ Add</button>
        </div>
        
        <div class="flex flex-wrap gap-2 mb-4">
            <button v-for="(cand, index) in $TCT1.candidates" :key="cand.pk" 
                @click="selectedIdx = index"
                :class="['px-2 py-1 rounded text-xs', selectedIdx === index ? 'bg-blue-600 text-white' : 'bg-gray-200']"
            >
                {{ cand.fields.last_name || 'New Candidate' }} ({{ cand.pk }})
            </button>
        </div>

        <div v-if="currentCand" class="space-y-4 p-4 border rounded bg-gray-50 relative">
            <button @click="deleteCandidate" class="absolute top-2 right-2 text-red-600 hover:text-red-800" title="Delete candidate">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
            </button>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">First name</label>
                    <input v-model="currentCand.fields.first_name" @input="onInput" type="text" class="mt-1 block w-full rounded border-gray-300">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Last name</label>
                    <input v-model="currentCand.fields.last_name" @input="onInput" type="text" class="mt-1 block w-full rounded border-gray-300">
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Party</label>
                    <input v-model="currentCand.fields.party" @input="onInput" type="text" class="mt-1 block w-full rounded border-gray-300">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Home state</label>
                    <input v-model="currentCand.fields.state" @input="onInput" type="text" class="mt-1 block w-full rounded border-gray-300">
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Color hex</label>
                    <div class="flex gap-2 items-center">
                        <input v-model="currentCand.fields.color_hex" @input="onInput" type="text" class="mt-1 block w-full rounded border-gray-300 font-mono">
                        <input v-model="currentCand.fields.color_hex" @input="onInput" type="color" class="mt-1 h-8 w-8 border rounded">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Secondary color hex</label>
                    <div class="flex gap-2 items-center">
                        <input v-model="currentCand.fields.secondary_color_hex" @input="onInput" type="text" class="mt-1 block w-full rounded border-gray-300 font-mono">
                        <input v-model="currentCand.fields.secondary_color_hex" @input="onInput" type="color" class="mt-1 h-8 w-8 border rounded">
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Candidate score</label>
                    <input v-model.number="currentCand.fields.candidate_score" @input="onInput" type="number" step="0.1" class="mt-1 block w-full rounded border-gray-300">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Is playable?</label>
                    <select v-model.number="currentCand.fields.is_active" @change="onInput" class="mt-1 block w-full rounded border-gray-300">
                        <option :value="1">Yes</option>
                        <option :value="0">No</option>
                    </select>
                </div>
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700">Image URL</label>
                <input v-model="currentCand.fields.image_url" @input="onInput" type="text" class="mt-1 block w-full rounded border-gray-300">
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700">Description (HTML)</label>
                <textarea v-model="currentCand.fields.description" @input="onInput" rows="4" class="mt-1 block w-full rounded border-gray-300"></textarea>
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700">Running mate description (HTML; if applicable)</label>
                <textarea v-model="currentCand.fields.description_as_running_mate" @input="onInput" rows="4" class="mt-1 block w-full rounded border-gray-300"></textarea>
            </div>
            
             <div>
                <label class="block text-sm font-medium text-gray-700">Victory message</label>
                <textarea v-model="currentCand.fields.electoral_victory_message" @input="onInput" rows="2" class="mt-1 block w-full rounded border-gray-300"></textarea>
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700">Loss message</label>
                <textarea v-model="currentCand.fields.electoral_loss_message" @input="onInput" rows="2" class="mt-1 block w-full rounded border-gray-300"></textarea>
            </div>
        </div>
    </div>
    `,
    data() {
        return {
            selectedIdx: 0
        };
    },
    computed: {
        currentCand() {
            return this.$TCT1.candidates[this.selectedIdx];
        }
    },
    methods: {
        onInput() {
            window.requestCode1AutosaveDebounced();
        },
        addCandidate() {
            const maxPk = Math.max(...this.$TCT1.candidates.map(c => c.pk), 0);
            this.$TCT1.candidates.push({
                "model": "campaign_trail.candidate",
                "pk": maxPk + 1,
                "fields": {
                    "first_name": "New",
                    "last_name": "Candidate",
                    "election": this.$TCT1.elections[0].pk,
                    "party": "Party",
                    "state": "State",
                    "priority": 1,
                    "description": "Candidate description here.",
                    "color_hex": "#CCCCCC",
                    "secondary_color_hex": null,
                    "is_active": 1,
                    "image_url": "",
                    "electoral_victory_message": "Winner!",
                    "electoral_loss_message": "Loser!",
                    "no_electoral_majority_message": "Majority?",
                    "description_as_running_mate": null,
                    "candidate_score": 1,
                    "running_mate": false
                }
            });
            this.selectedIdx = this.$TCT1.candidates.length - 1;
            this.onInput();
        },
        deleteCandidate() {
            if (this.$TCT1.candidates.length <= 1) return;
            if (confirm("Are you sure you want to delete this candidate?")) {
                this.$TCT1.candidates.splice(this.selectedIdx, 1);
                this.selectedIdx = Math.max(0, this.selectedIdx - 1);
                this.onInput();
            }
        }
    }
});

registerCode1Component('running-mate-editor', {
    template: `
    <div class="space-y-4">
        <div class="flex justify-between items-center border-b pb-1">
            <h3 class="text-lg font-bold">Running Mates</h3>
            <button @click="addRunningMate" class="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">+ Add link</button>
        </div>

        <div v-for="(rm, index) in $TCT1.running_mates" :key="index" class="p-3 border rounded bg-white shadow-sm relative">
             <button @click="deleteRunningMate(index)" class="absolute top-2 right-2 text-red-600 hover:text-red-800">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
            </button>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Main candidate</label>
                    <select v-model.number="rm.fields.candidate" @change="onInput" class="mt-1 block w-full rounded border-gray-300 sm:text-sm">
                        <option v-for="c in candidates" :key="c.pk" :value="c.pk">{{c.fields.first_name}} {{c.fields.last_name}} ({{c.pk}})</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Running mate</label>
                     <select v-model.number="rm.fields.running_mate" @change="onInput" class="mt-1 block w-full rounded border-gray-300 sm:text-sm">
                        <option v-for="c in candidates" :key="c.pk" :value="c.pk">{{c.fields.first_name}} {{c.fields.last_name}} ({{c.pk}})</option>
                    </select>
                </div>
            </div>
            
            <div class="mt-2 text-xs text-gray-500 italic">
                Note: Ensure the running mate is marked as 'Not Active' in the Candidates tab to appear correctly in game.
            </div>
        </div>
    </div>
    `,
    computed: {
        candidates() { return this.$TCT1.candidates; }
    },
    methods: {
        onInput() {
            window.requestCode1AutosaveDebounced();
        },
        addRunningMate() {
            const maxPk = Math.max(...this.$TCT1.running_mates.map(rm => rm.pk), 0);
            this.$TCT1.running_mates.push({
                "model": "campaign_trail.running_mate",
                "pk": maxPk + 1,
                "fields": {
                    "candidate": this.candidates[0]?.pk,
                    "running_mate": this.candidates[1]?.pk || this.candidates[0]?.pk
                }
            });
            this.onInput();
        },
        deleteRunningMate(index) {
            if (confirm("Delete this running mate link?")) {
                this.$TCT1.running_mates.splice(index, 1);
                this.onInput();
            }
        }
    }
});

registerCode1Component('theme-editor', {
    template: `
    <div class="space-y-4">
        <h3 class="text-lg font-bold border-b pb-1">Theme (Jet Data)</h3>
        
        <div>
            <label class="block text-sm font-medium text-gray-700">Game title</label>
            <input v-model="jetData.gameTitle" @input="onInput" type="text" class="mt-1 block w-full rounded border-gray-300">
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700">Custom quote (optional, appears below title)</label>
            <input v-model="jetData.customQuote" @input="onInput" type="text" class="mt-1 block w-full rounded border-gray-300">
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700">Banner image URL</label>
            <input type="text" v-model="jetData.bannerImageUrl" @input="onInput" placeholder="https://..." class="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200">
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">Background image URL</label>
            <input type="text" v-model="jetData.backgroundImageUrl" @input="onInput" placeholder="https://..." class="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200">
        </div>

        <div class="grid grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-medium text-gray-700">Header color</label>
                <div class="flex gap-2">
                    <input v-model="jetData.headerColor" @input="onInput" type="color" class="h-8 w-8 border rounded">
                    <input v-model="jetData.headerColor" @input="onInput" type="text" class="flex-1 rounded border-gray-300 text-sm font-mono">
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Container color</label>
                <div class="flex gap-2">
                    <input v-model="jetData.containerColor" @input="onInput" type="color" class="h-8 w-8 border rounded">
                    <input v-model="jetData.containerColor" @input="onInput" type="text" class="flex-1 rounded border-gray-300 text-sm font-mono">
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Window color</label>
                <div class="flex gap-2">
                    <input v-model="jetData.windowColor" @input="onInput" type="color" class="h-8 w-8 border rounded">
                    <input v-model="jetData.windowColor" @input="onInput" type="text" class="flex-1 rounded border-gray-300 text-sm font-mono">
                </div>
            </div>
             <div>
                <label class="block text-sm font-medium text-gray-700">Inner window color</label>
                <div class="flex gap-2">
                    <input v-model="jetData.innerWindowColor" @input="onInput" type="color" class="h-8 w-8 border rounded">
                    <input v-model="jetData.innerWindowColor" @input="onInput" type="text" class="flex-1 rounded border-gray-300 text-sm font-mono">
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Ending text color</label>
                <div class="flex gap-2">
                    <input v-model="jetData.endingTextColor" @input="onInput" type="color" class="h-8 w-8 border rounded">
                    <input v-model="jetData.endingTextColor" @input="onInput" type="text" class="flex-1 rounded border-gray-300 text-sm font-mono">
                </div>
            </div>
        </div>
    </div>
    `,
    computed: {
        jetData() { return this.$TCT1.jet_data; }
    },
    methods: {
        onInput() {
            window.requestCode1AutosaveDebounced();
        }
    }
});

registerCode1Component('settings-editor', {
    template: `
    <div class="space-y-4">
        <h3 class="text-lg font-bold border-b pb-1">Global parameters</h3>
        <p class="text-sm text-gray-500 italic">These parameters affect core game mechanics. In most cases, you should only change these if you know what you're doing or are trying to create a very custom mod.</p>
        <div v-for="gp in $TCT1.global_parameters" :key="gp.pk" class="grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
                <label class="block text-xs font-medium text-gray-600">Vote variable</label>
                <input v-model.number="gp.fields.vote_variable" @input="onInput" type="number" step="0.001" class="mt-1 block w-full rounded border-gray-300 text-sm">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-600">Max swing</label>
                <input v-model.number="gp.fields.max_swing" @input="onInput" type="number" step="0.01" class="mt-1 block w-full rounded border-gray-300 text-sm">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-600">Start point</label>
                <input v-model.number="gp.fields.start_point" @input="onInput" type="number" step="0.01" class="mt-1 block w-full rounded border-gray-300 text-sm">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-600">Question count</label>
                <input v-model.number="gp.fields.question_count" @input="onInput" type="number" class="mt-1 block w-full rounded border-gray-300 text-sm">
            </div>
             <div>
                <label class="block text-xs font-medium text-gray-600">Global variance</label>
                <input v-model.number="gp.fields.global_variance" @input="onInput" type="number" step="0.001" class="mt-1 block w-full rounded border-gray-300 text-sm">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-600">State variance</label>
                <input v-model.number="gp.fields.state_variance" @input="onInput" type="number" step="0.001" class="mt-1 block w-full rounded border-gray-300 text-sm">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-600">Default map color</label>
                <input v-model="gp.fields.default_map_color_hex" @input="onInput" type="text" class="mt-1 block w-full rounded border-gray-300 font-mono text-xs">
            </div>
             <div>
                <label class="block text-xs font-medium text-gray-600">No state map color</label>
                <input v-model="gp.fields.no_state_map_color_hex" @input="onInput" type="text" class="mt-1 block w-full rounded border-gray-300 font-mono text-xs">
            </div>
        </div>
    </div>
    `,
    methods: {
        onInput() {
            window.requestCode1AutosaveDebounced();
        }
    }
});

