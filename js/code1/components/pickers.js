registerCode1Component('mode-picker', {
    template: `
    <div class="flex flex-wrap gap-2">
        <button v-for="m in modes" :key="m.id"
            @click="setMode(m.id)"
            :class="['px-3 py-1 rounded text-sm font-medium transition', $globalData.mode === m.id ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300']"
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
            this.$globalData.mode = mode;
        }
    }
});

registerCode1Component('election-editor', {
    template: `
    <div class="space-y-4">
        <h3 class="text-lg font-bold border-b pb-1">Election details</h3>
        <div v-for="(election, index) in $TCT.elections" :key="index" class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700">Display year</label>
                <input v-model="election.fields.display_year" type="text" class="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Year</label>
                    <input v-model.number="election.fields.year" type="number" class="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">PK (ID)</label>
                    <input :value="election.pk" @change="changeElectionPk(election, $event)" type="number" class="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Electoral votes to win</label>
                    <input v-model.number="election.fields.winning_electoral_vote_number" type="number" class="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Image URL</label>
                <input v-model="election.fields.image_url" type="text" class="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Summary (HTML)</label>
                <textarea v-model="election.fields.summary" rows="5" class="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"></textarea>
            </div>
            <div class="flex items-center gap-2">
                <input id="recommended_reading_enabled" type="checkbox" v-model="election.fields.recommended_reading_enabled" class="h-4 w-4 text-blue-600 border-gray-300 rounded">
                <label for="recommended_reading_enabled" class="text-sm font-medium text-gray-700">Enable Recommended Reading section</label>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Recommended reading (HTML)</label>
                <textarea v-model="election.fields.recommended_reading" :disabled="!election.fields.recommended_reading_enabled" rows="5" :class="['mt-1 block w-full rounded border shadow-sm focus:border-blue-500 focus:ring-blue-500', election.fields.recommended_reading_enabled ? 'border-gray-300 bg-white text-black' : 'border-gray-200 bg-gray-100 text-gray-500']"></textarea>
                <div v-if="!election.fields.recommended_reading_enabled" class="mt-2 rounded border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-500">
                    Recommended Reading is disabled. Enable it to display this tab's contents after finishing a playthrough.
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Credits</label>
                <input v-model="$TCT.credits" type="text" class="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
            </div>
        </div>
    </div>
    `,
    methods: {
        changeElectionPk(election, event) {
            const newPk = Number(event.target.value);
            const oldPk = election.pk;
            if (!isNaN(newPk) && newPk !== oldPk) {
                this.$TCT.changePk('election', oldPk, newPk);
            } else if (isNaN(newPk)) {
                event.target.value = oldPk;
            }
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

        <div v-if="visibleCandidates.length === 0" class="text-sm text-gray-500 italic py-4">
            No candidates defined. Running mates are shown in the Running Mates tab.
        </div>

        <div class="flex flex-wrap gap-2 mb-4">
            <button v-for="(cand, index) in visibleCandidates" :key="cand.pk"
                @click="selectedIdx = index"
                :class="['px-2 py-1 rounded text-xs', selectedIdx === index ? 'bg-blue-600 text-white' : 'bg-gray-200']"
            >
                {{ cand.fields.last_name || 'New Candidate' }} ({{ cand.pk }})
            </button>
        </div>

        <div v-if="currentCand" class="space-y-4 p-4 border rounded bg-gray-50 relative">
            <div class="flex gap-2 items-center mb-2">
                <label class="text-sm font-medium text-gray-700">PK:</label>
                <input :value="currentCand.pk" @change="changeCandidatePk($event)" type="number" class="w-24 rounded border-gray-300 text-sm">
                <button @click="deleteCandidate" class="ml-auto text-red-600 hover:text-red-800" title="Delete candidate">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">First name</label>
                    <input v-model="currentCand.fields.first_name" type="text" class="mt-1 block w-full rounded border-gray-300">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Last name</label>
                    <input v-model="currentCand.fields.last_name" type="text" class="mt-1 block w-full rounded border-gray-300">
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Party</label>
                    <input v-model="currentCand.fields.party" type="text" class="mt-1 block w-full rounded border-gray-300">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Home state</label>
                    <input v-model="currentCand.fields.state" type="text" class="mt-1 block w-full rounded border-gray-300">
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Color hex</label>
                    <div class="flex gap-2 items-center">
                        <input v-model="currentCand.fields.color_hex" type="text" class="mt-1 block w-full rounded border-gray-300 font-mono">
                        <input v-model="currentCand.fields.color_hex" type="color" class="mt-1 h-8 w-8 border rounded">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Secondary color hex</label>
                    <div class="flex gap-2 items-center">
                        <input v-model="currentCand.fields.secondary_color_hex" type="text" class="mt-1 block w-full rounded border-gray-300 font-mono">
                        <input v-model="currentCand.fields.secondary_color_hex" type="color" class="mt-1 h-8 w-8 border rounded">
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Candidate score</label>
                    <input v-model.number="currentCand.fields.candidate_score" type="number" step="0.1" class="mt-1 block w-full rounded border-gray-300">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Is playable?</label>
                    <select v-model.number="currentCand.fields.is_active" class="mt-1 block w-full rounded border-gray-300">
                        <option :value="1">Yes</option>
                        <option :value="0">No</option>
                    </select>
                </div>
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700">Image URL</label>
                <input v-model="currentCand.fields.image_url" type="text" class="mt-1 block w-full rounded border-gray-300">
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700">Description (HTML)</label>
                <textarea v-model="currentCand.fields.description" rows="4" class="mt-1 block w-full rounded border-gray-300"></textarea>
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700">Running mate description (HTML; if applicable)</label>
                <textarea v-model="currentCand.fields.description_as_running_mate" rows="4" class="mt-1 block w-full rounded border-gray-300"></textarea>
            </div>

             <div>
                <label class="block text-sm font-medium text-gray-700">Victory message</label>
                <textarea v-model="currentCand.fields.electoral_victory_message" rows="2" class="mt-1 block w-full rounded border-gray-300"></textarea>
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700">Loss message</label>
                <textarea v-model="currentCand.fields.electoral_loss_message" rows="2" class="mt-1 block w-full rounded border-gray-300"></textarea>
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
        visibleCandidates() {
            return this.$TCT.candidates.filter(c => !c.fields.running_mate);
        },
        currentCand() {
            return this.visibleCandidates[this.selectedIdx];
        }
    },
    methods: {
        addCandidate() {
            const maxPk = Math.max(...this.$TCT.candidates.map(c => c.pk), 0);
            this.$TCT.candidates.push({
                "model": "campaign_trail.candidate",
                "pk": maxPk + 1,
                "fields": {
                    "first_name": "New",
                    "last_name": "Candidate",
                    "election": this.$TCT.elections[0].pk,
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
            this.selectedIdx = this.visibleCandidates.length - 1;
        },
        deleteCandidate() {
            const cand = this.currentCand;
            if (!cand || this.visibleCandidates.length <= 1) return;
            if (confirm(`Are you sure you want to delete ${cand.fields.first_name} ${cand.fields.last_name}?`)) {
                const fullIdx = this.$TCT.candidates.indexOf(cand);
                if (fullIdx !== -1) this.$TCT.candidates.splice(fullIdx, 1);
                this.selectedIdx = Math.max(0, this.selectedIdx - 1);
            }
        },
        changeCandidatePk(event) {
            const cand = this.currentCand;
            if (!cand) return;
            const newPk = Number(event.target.value);
            const oldPk = cand.pk;
            if (!isNaN(newPk) && newPk !== oldPk) {
                this.$TCT.changePk('candidate', oldPk, newPk);
            } else if (isNaN(newPk)) {
                event.target.value = oldPk;
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

        <div class="flex flex-wrap gap-2 mb-4">
            <button v-for="(rm, index) in $TCT.running_mates" :key="rm.pk"
                @click="selectedIdx = index"
                :class="['px-2 py-1 rounded text-xs', selectedIdx === index ? 'bg-blue-600 text-white' : 'bg-gray-200']"
            >
                {{ runningMateName(rm) }} ({{ rm.pk }})
            </button>
        </div>

        <div v-if="currentRm" class="space-y-4 p-4 border rounded bg-gray-50 relative">
            <div class="flex gap-2 items-center mb-2">
                <label class="text-sm font-medium text-gray-700">PK:</label>
                <input :value="currentRm.pk" @change="changeRunningMatePk($event)" type="number" class="w-24 rounded border-gray-300 text-sm">
                <button @click="deleteRunningMate" class="ml-auto text-red-600 hover:text-red-800" title="Delete running mate link">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700">Running mate for?</label>
                <select v-model.number="currentRm.fields.candidate" class="mt-1 block w-full rounded border-gray-300 sm:text-sm">
                    <option v-for="c in actualCandidates" :key="c.pk" :value="c.pk">{{c.fields.first_name}} {{c.fields.last_name}} ({{c.pk}})</option>
                </select>
            </div>

            <div v-if="rmCandidate" class="border-t pt-4 mt-4 space-y-4">
                <h4 class="text-md font-semibold text-gray-800">Running mate details</h4>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">First name</label>
                        <input v-model="rmCandidate.fields.first_name" type="text" class="mt-1 block w-full rounded border-gray-300">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Last name</label>
                        <input v-model="rmCandidate.fields.last_name" type="text" class="mt-1 block w-full rounded border-gray-300">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Party</label>
                        <input v-model="rmCandidate.fields.party" type="text" class="mt-1 block w-full rounded border-gray-300">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Home state</label>
                        <input v-model="rmCandidate.fields.state" type="text" class="mt-1 block w-full rounded border-gray-300">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Color hex</label>
                        <div class="flex gap-2 items-center">
                            <input v-model="rmCandidate.fields.color_hex" type="text" class="mt-1 block w-full rounded border-gray-300 font-mono">
                            <input v-model="rmCandidate.fields.color_hex" type="color" class="mt-1 h-8 w-8 border rounded">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Candidate score</label>
                        <input v-model.number="rmCandidate.fields.candidate_score" type="number" step="0.1" class="mt-1 block w-full rounded border-gray-300">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Image URL</label>
                    <input v-model="rmCandidate.fields.image_url" type="text" class="mt-1 block w-full rounded border-gray-300">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Running mate description (HTML)</label>
                    <textarea v-model="rmCandidate.fields.description_as_running_mate" rows="3" class="mt-1 block w-full rounded border-gray-300"></textarea>
                </div>
            </div>

            <div class="mt-2 text-xs text-gray-500 italic">
                Note: Ensure the running mate candidate is marked as 'Not Active' in the Candidates tab to appear correctly in game.
            </div>
        </div>

        <div v-if="$TCT.running_mates.length === 0" class="text-sm text-gray-500 italic py-4">
            No running mate links defined. Add one to link a candidate with their running mate.
        </div>
    </div>
    `,
    data() {
        return {
            selectedIdx: 0
        };
    },
    computed: {
        candidates() { return this.$TCT.candidates; },
        actualCandidates() { return this.$TCT.candidates.filter(c => !c.fields.running_mate); },
        currentRm() {
            return this.$TCT.running_mates[this.selectedIdx];
        },
        rmCandidate() {
            if (!this.currentRm) return null;
            return this.$TCT.candidates.find(c => c.pk === this.currentRm.fields.running_mate);
        }
    },
    methods: {
        runningMateName(rm) {
            const cand = this.$TCT.candidates.find(c => c.pk === rm.fields.running_mate);
            return cand ? (cand.fields.last_name || 'Unknown') : 'Unknown';
        },
        addRunningMate() {
            const actualCands = this.actualCandidates;
            const maxPk = Math.max(...this.$TCT.running_mates.map(rm => rm.pk), 0);
            const runningMate = this.$TCT.candidates.find(c => c.fields.running_mate && !this.$TCT.running_mates.some(r => r.fields.running_mate === c.pk));
            this.$TCT.running_mates.push({
                "model": "campaign_trail.running_mate",
                "pk": maxPk + 1,
                "fields": {
                    "candidate": actualCands[0]?.pk,
                    "running_mate": runningMate?.pk || this.$TCT.candidates.find(c => c.fields.running_mate)?.pk || actualCands[1]?.pk || actualCands[0]?.pk
                }
            });
            this.selectedIdx = this.$TCT.running_mates.length - 1;
        },
        deleteRunningMate() {
            if (this.$TCT.running_mates.length === 0) return;
            if (confirm("Delete this running mate link?")) {
                this.$TCT.running_mates.splice(this.selectedIdx, 1);
                this.selectedIdx = Math.max(0, this.selectedIdx - 1);
            }
        },
        changeRunningMatePk(event) {
            const rm = this.currentRm;
            if (!rm) return;
            const newPk = Number(event.target.value);
            const oldPk = rm.pk;
            if (!isNaN(newPk) && newPk !== oldPk) {
                this.$TCT.changePk('running_mate', oldPk, newPk);
            } else if (isNaN(newPk)) {
                event.target.value = oldPk;
            }
        }
    }
});

registerCode1Component('theme-editor', {
    template: `
    <div class="space-y-4">
        <h3 class="text-lg font-bold border-b pb-1">Mod theme</h3>

        <div>
            <label class="block text-sm font-medium text-gray-700">Game title</label>
            <input v-model="jetData.gameTitle" type="text" class="mt-1 block w-full rounded border-gray-300">
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700">Custom quote (optional, appears below title)</label>
            <input v-model="jetData.customQuote" type="text" class="mt-1 block w-full rounded border-gray-300">
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700">Banner image URL</label>
            <input type="text" v-model="jetData.bannerImageUrl" placeholder="https://..." class="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200">
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">Background image URL</label>
            <input type="text" v-model="jetData.backgroundImageUrl" placeholder="https://..." class="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200">
        </div>

        <div class="grid grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-medium text-gray-700">Header color</label>
                <div class="flex gap-2">
                    <input v-model="jetData.headerColor" type="color" class="h-8 w-8 border rounded">
                    <input v-model="jetData.headerColor" type="text" class="flex-1 rounded border-gray-300 text-sm font-mono">
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Header text color</label>
                <div class="flex gap-2">
                    <input v-model="jetData.headerTextColor" type="color" class="h-8 w-8 border rounded">
                    <input v-model="jetData.headerTextColor" type="text" class="flex-1 rounded border-gray-300 text-sm font-mono">
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Container color</label>
                <div class="flex gap-2">
                    <input v-model="jetData.containerColor" type="color" class="h-8 w-8 border rounded">
                    <input v-model="jetData.containerColor" type="text" class="flex-1 rounded border-gray-300 text-sm font-mono">
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Window color</label>
                <div class="flex gap-2">
                    <input v-model="jetData.windowColor" type="color" class="h-8 w-8 border rounded">
                    <input v-model="jetData.windowColor" type="text" class="flex-1 rounded border-gray-300 text-sm font-mono">
                </div>
            </div>
             <div>
                <label class="block text-sm font-medium text-gray-700">Inner window color</label>
                <div class="flex gap-2">
                    <input v-model="jetData.innerWindowColor" type="color" class="h-8 w-8 border rounded">
                    <input v-model="jetData.innerWindowColor" type="text" class="flex-1 rounded border-gray-300 text-sm font-mono">
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Inner window text color</label>
                <div class="flex gap-2">
                    <input v-model="jetData.innerWindowTextColor" type="color" class="h-8 w-8 border rounded">
                    <input v-model="jetData.innerWindowTextColor" type="text" class="flex-1 rounded border-gray-300 text-sm font-mono">
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Ending text color</label>
                <div class="flex gap-2">
                    <input v-model="jetData.endingTextColor" type="color" class="h-8 w-8 border rounded">
                    <input v-model="jetData.endingTextColor" type="text" class="flex-1 rounded border-gray-300 text-sm font-mono">
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Description window color</label>
                <div class="flex gap-2">
                    <input v-model="jetData.descriptionWindowColor" type="color" class="h-8 w-8 border rounded">
                    <input v-model="jetData.descriptionWindowColor" type="text" class="flex-1 rounded border-gray-300 text-sm font-mono">
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Start button color</label>
                <div class="flex gap-2">
                    <input v-model="jetData.startButtonColor" type="color" class="h-8 w-8 border rounded">
                    <input v-model="jetData.startButtonColor" type="text" class="flex-1 rounded border-gray-300 text-sm font-mono">
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Description window text color</label>
                <div class="flex gap-2">
                    <input v-model="jetData.descriptionWindowTextColor" type="color" class="h-8 w-8 border rounded">
                    <input v-model="jetData.descriptionWindowTextColor" type="text" class="flex-1 rounded border-gray-300 text-sm font-mono">
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Quote text color</label>
                <div class="flex gap-2">
                    <input v-model="jetData.quoteTextColor" type="color" class="h-8 w-8 border rounded">
                    <input v-model="jetData.quoteTextColor" type="text" class="flex-1 rounded border-gray-300 text-sm font-mono">
                </div>
            </div>
        </div>
    </div>
    `,
    computed: {
        jetData() { return this.$TCT.jet_data; }
    }
});

registerCode1Component('settings-editor', {
    template: `
    <div class="space-y-4">
        <h3 class="text-lg font-bold border-b pb-1">Global parameters</h3>
        <p class="text-sm text-gray-500 italic">These parameters affect core game mechanics. In most cases, you should only change these if you know what you're doing or are trying to create a very custom mod.</p>
        <div v-for="gp in $TCT.global_parameters" :key="gp.pk" class="grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
                <label class="block text-xs font-medium text-gray-600">Vote variable</label>
                <input v-model.number="gp.fields.vote_variable" type="number" step="0.001" class="mt-1 block w-full rounded border-gray-300 text-sm">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-600">Max swing</label>
                <input v-model.number="gp.fields.max_swing" type="number" step="0.01" class="mt-1 block w-full rounded border-gray-300 text-sm">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-600">Start point</label>
                <input v-model.number="gp.fields.start_point" type="number" step="0.01" class="mt-1 block w-full rounded border-gray-300 text-sm">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-600">Question count</label>
                <input v-model.number="gp.fields.question_count" type="number" class="mt-1 block w-full rounded border-gray-300 text-sm">
            </div>
             <div>
                <label class="block text-xs font-medium text-gray-600">Global variance</label>
                <input v-model.number="gp.fields.global_variance" type="number" step="0.001" class="mt-1 block w-full rounded border-gray-300 text-sm">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-600">State variance</label>
                <input v-model.number="gp.fields.state_variance" type="number" step="0.001" class="mt-1 block w-full rounded border-gray-300 text-sm">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-600">Default map color</label>
                <input v-model="gp.fields.default_map_color_hex" type="text" class="mt-1 block w-full rounded border-gray-300 font-mono text-xs">
            </div>
             <div>
                <label class="block text-xs font-medium text-gray-600">No state map color</label>
                <input v-model="gp.fields.no_state_map_color_hex" type="text" class="mt-1 block w-full rounded border-gray-300 font-mono text-xs">
            </div>
        </div>
    </div>
    `
});
