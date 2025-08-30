window.defineComponent('endings', {

    data() {
        return {
            temp_endings: [],
            showManageModal: false,
            manageTab: 'list', // 'list' | 'reorder'
            orderList: [],       // [{ id, text }]
            dragIndex: null
        };
    },

    template: `
    <div class="mx-auto p-3">

        <h1 class="text-xl font-semibold mb-3">Custom endings</h1>

        <div class="flex flex-wrap gap-2 mb-4">
            <button v-if="!enabled" class="bg-green-500 text-white p-2 rounded-sm hover:bg-green-600" v-on:click="toggleEnabled()">Enable custom endings</button>
            <button v-if="enabled" class="bg-red-500 text-white p-2 rounded-sm hover:bg-red-600" v-on:click="toggleEnabled()">Disable custom endings</button>

            <button v-if="enabled" class="bg-green-500 text-white p-2 rounded-sm hover:bg-green-600" v-on:click="addEnding()">Add custom ending</button>
            <button v-if="enabled && endings.length > 1" class="bg-gray-500 text-white p-2 rounded-sm hover:bg-gray-600" @click="openManageModal('reorder')">
                Manage endings
            </button>
            <button v-if="enabled && endings.length > 1" class="bg-blue-500 text-white p-2 rounded-sm hover:bg-blue-600" @click="autoOrder()">
                Auto order
            </button>
        </div>

        <div v-if="enabled && endings.length > 0" class="space-y-4">
            <ending @deleteEvent="deleteEnding" :id="x.id" :key="x.id" v-for="x in endings"></ending>
        </div>

        <div v-if="enabled && endings.length === 0" class="text-gray-500 italic p-4 text-center">
            No custom endings yet. Click "Add custom ending" to get started.
        </div>

        <!-- Endings Manager Modal -->
        <div v-if="showManageModal" class="fixed inset-0 z-50">
            <div class="absolute inset-0 bg-black/50" @click="closeManageModal()"></div>
            <div class="absolute inset-0 flex items-center justify-center p-4">
                <div class="bg-white rounded-sm shadow-lg w-full max-w-3xl max-h-[80vh] flex flex-col">
                    <div class="p-3 border-b flex justify-between items-center">
                        <div class="flex gap-2">
                            <button class="px-3 py-1 rounded-sm text-sm"
                                    :class="manageTab==='list' ? 'bg-gray-800 text-white' : 'bg-gray-200 hover:bg-gray-300'"
                                    @click="manageTab='list'">List</button>
                            <button class="px-3 py-1 rounded-sm text-sm"
                                    :class="manageTab==='reorder' ? 'bg-gray-800 text-white' : 'bg-gray-200 hover:bg-gray-300'"
                                    @click="manageTab='reorder' || resetOrderFromMap(); manageTab='reorder'">Reorder</button>
                        </div>
                        <button class="text-gray-600 hover:text-black text-xl leading-none" @click="closeManageModal()">✕</button>
                    </div>

                    <div class="p-3 overflow-auto">
                        <!-- List tab -->
                        <div v-if="manageTab==='list'">
                            <ul class="divide-y">
                                <li v-for="ending in endings" :key="ending.id"
                                    class="py-2 px-2 hover:bg-gray-50 flex items-center justify-between">
                                    <span>
                                        <span class="font-mono text-gray-700">#{{ ending.id }}</span>
                                        <span class="text-gray-700"> - {{ endingDescription(ending) }}</span>
                                    </span>
                                    <button class="text-xs bg-red-500 text-white px-2 py-1 rounded-sm hover:bg-red-600" @click="deleteEnding(ending.id)">Delete</button>
                                </li>
                            </ul>
                        </div>

                        <!-- Reorder tab -->
                        <div v-else>
                            <div class="flex justify-between items-center mb-2">
                                <h3 class="font-semibold text-sm">Drag to reorder (top = highest priority)</h3>
                                <div class="flex gap-2">
                                    <button class="bg-gray-200 px-2 py-1 rounded-sm text-sm hover:bg-gray-300" @click="resetOrderFromMap()">Reset</button>
                                    <button class="bg-blue-500 text-white px-2 py-1 rounded-sm text-sm hover:bg-blue-600" @click="autoOrder()">Auto order</button>
                                    <button class="bg-green-500 text-white px-2 py-1 rounded-sm text-sm hover:bg-green-600" @click="applyOrder()">Save order</button>
                                </div>
                            </div>
                            <ul class="divide-y">
                                <li v-for="(item, idx) in orderList"
                                    :key="item.id"
                                    class="py-2 px-2 flex items-center gap-3 hover:bg-gray-50"
                                    draggable="true"
                                    @dragstart="onDragStart(idx)"
                                    @dragover.prevent
                                    @drop="onDrop(idx)"
                                    @dragend="onDragEnd">
                                    <span class="w-6 text-xs text-gray-500">{{ idx + 1 }}</span>
                                    <span class="cursor-move select-none inline-flex items-center text-xs text-gray-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M7 4a1 1 0 100-2 1 1 0 000 2zm6-1a1 1 0 110 2 1 1 0 010-2zM7 9a1 1 0 100-2 1 1 0 000 2zm6-1a1 1 0 110 2 1 1 0 010-2zM7 14a1 1 0 100-2 1 1 0 000 2zm6-1a1 1 0 110 2 1 1 0 010-2z"/>
                                        </svg>
                                        Drag
                                    </span>
                                    <span class="text-sm">
                                        <span class="font-mono text-gray-700">#{{ item.id }}</span>
                                        <span class="text-gray-700">- {{ item.text }}</span>
                                    </span>
                                </li>
                            </ul>
                            <div class="text-xs text-gray-500 mt-2">Tip: Auto order sorts by variable type and amount in descending order. This is to avoid most issues with broken or unobtainable endings.</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    </div>
    `,

    methods: {

        toggleEnabled: function(evt) {
            Vue.prototype.$TCT.jet_data.endings_enabled = !Vue.prototype.$TCT.jet_data.endings_enabled;

            const temp = Vue.prototype.$globalData.filename;
            Vue.prototype.$globalData.filename = "";
            Vue.prototype.$globalData.filename = temp;
        },

        addEnding: function(evt) {
            let id = Date.now();
            Vue.prototype.$TCT.jet_data.ending_data[id] = {
                'id':id,
                'variable':0,
                'operator':'>',
                'amount':0,
                'endingImage':"",
                'endingText':"Put ending text here, you can and should use <p>HTML tags</p>!"
            }
            this.temp_endings = [];
        },

        deleteEnding: function(id) {
            delete Vue.prototype.$TCT.jet_data.ending_data[id];
            this.temp_endings = [];
        },

        openManageModal(tab = 'list') {
            this.manageTab = tab;
            if (tab === 'reorder') {
                this.resetOrderFromMap();
            }
            this.showManageModal = true;
        },

        closeManageModal() {
            this.showManageModal = false;
        },

        resetOrderFromMap() {
            const list = this.endings;
            this.orderList = list.map(ending => ({
                id: ending.id,
                text: this.endingDescription(ending)
            }));
        },

        onDragStart(index) {
            this.dragIndex = index;
        },

        onDrop(index) {
            if (this.dragIndex === null || this.dragIndex === index) return;
            const moved = this.orderList.splice(this.dragIndex, 1)[0];
            this.orderList.splice(index, 0, moved);
            this.dragIndex = null;
        },

        onDragEnd() {
            this.dragIndex = null;
        },

        applyOrder() {
            // create ordered array of IDs
            const orderedIds = this.orderList.map(x => {
                const n = Number(x.id);
                return Number.isFinite(n) ? n : x.id;
            });

            try {
                // persist explicit ordering to jet_data.endings_order
                // this avoids relying on object insertion order
                if (!Vue.prototype.$TCT.jet_data) Vue.prototype.$TCT.jet_data = {};
                Vue.prototype.$TCT.jet_data.endings_order = orderedIds;

                // force re-render of the component list by clearing any temp cache
                this.temp_endings = [];

                // autosave if enabled
                if (localStorage.getItem("autosaveEnabled") === "true") {
                    window.requestAutosaveDebounced?.(0);
                }
            } catch (e) {
                console.error("Failed to reorder endings:", e);
                alert("There was an error applying the new order. See console for details.");
                return;
            }

            // Close modal after saving
            this.showManageModal = false;
        },

        autoOrder() {
            // Sort endings by variable type priority and amount in descending order
            const priorityMap = { 0: 3, 1: 2, 2: 1 }; // EVs=3, Pop%=2, Raw=1
            const sorted = [...this.endings].sort((a, b) => {
                const aPriority = priorityMap[a.variable] || 0;
                const bPriority = priorityMap[b.variable] || 0;
                // First sort by variable type priority
                if (aPriority !== bPriority) {
                    return bPriority - aPriority;
                }
                // Then by amount in descending order
                return (b.amount || 0) - (a.amount || 0);
            });

            this.orderList = sorted.map(ending => ({
                id: ending.id,
                text: this.endingDescription(ending)
            }));

            // apply the new order
            this.applyOrder();
        },

        endingDescription(ending) {
            const varNames = ['Electoral Votes', 'Popular Vote %', 'Raw Vote Total'];
            const varName = varNames[ending.variable] || 'Unknown';
            const operator = ending.operator || '>';
            const amount = ending.amount || 0;
            const preview = (ending.endingText || '').substring(0, 50) + '...';
            return `${varName} ${operator} ${amount} - ${preview}`;
        }

    },

    computed: {

        endings: function() {
            return this.temp_endings.concat(Vue.prototype.$TCT.getAllEndings());
        },

        enabled: function() {
            if(Vue.prototype.$TCT.jet_data.endings_enabled == null) {
                Vue.prototype.$TCT.jet_data.endings_enabled = false;
            }

            if(Vue.prototype.$TCT.jet_data.ending_data == null) {
                Vue.prototype.$TCT.jet_data.ending_data = {};
            }

            const temp = Vue.prototype.$globalData.filename;
            Vue.prototype.$globalData.filename = "";
            Vue.prototype.$globalData.filename = temp;

            return Vue.prototype.$TCT.jet_data.endings_enabled;
        }
    }
})

window.defineComponent('ending', {

    props: ['id'],

    template: `
    <div class="mx-auto bg-white border border-gray-300 rounded-sm shadow-sm p-4 mb-4">
        <div class="flex justify-between items-start mb-3">
            <h3 class="font-semibold text-sm text-gray-700">Ending #{{ id }}</h3>
            <button @click="deleteEvent()" class="bg-red-500 text-white px-2 py-1 text-xs rounded-sm hover:bg-red-600">
                Delete
            </button>
        </div>
        
        <div class="grid grid-cols-3 gap-2 mb-3">
            <select @change="onChange($event)" :value="getVariable" name="variable" class="border rounded-sm px-2 py-1">
                <option value="0">Player electoral votes (EVs)</option>
                <option value="1">Player popular vote (%)</option>
                <option value="2">Player raw vote total</option>
            </select>

            <select @change="onChange($event)" :value="getOperator" name="operator" class="border rounded-sm px-2 py-1">
                <option value=">">Greater than</option>
                <option value="==">Equal to</option>
                <option value="<">Less than</option>
            </select>

            <input @input="onInput($event)" :value="getAmount" name="amount" type="number" class="border rounded-sm px-2 py-1">
        </div>

        <div class="mb-3">
            <label class="block text-sm font-medium text-gray-700 mb-1">Ending text:</label>
            <textarea @input="onInput($event)" :value="getEndingText" name="endingText" rows="4" 
                      class="w-full border rounded-sm px-2 py-1" 
                      placeholder="Put ending text here, you can and should use HTML tags!"></textarea>
        </div>

        <div class="mb-3">
            <label class="block text-sm font-medium text-gray-700 mb-1">Custom ending image (optional):</label>
            <input @input="onInput($event)" :value="endingImage" name="endingImage" type="url" 
                   class="w-full border rounded-sm px-2 py-1" placeholder="Enter image URL">
        </div>

        <div v-if="endingImage" class="mt-3">
            <img :src="endingImage" class="max-w-xs rounded border" alt="Ending preview">
            <p class="text-xs text-gray-500 mt-1">Make sure this image is a multiple of 1100x719</p>
        </div>

    </div>
    `,

    methods: {
        deleteEvent: function() {
            this.$emit('deleteEvent', this.id)
        },

        onChange: function(evt) {
            Vue.prototype.$TCT.jet_data.ending_data[this.id][evt.target.name] = evt.target.value;
        },

        onInput: function(evt) {
            Vue.prototype.$TCT.jet_data.ending_data[this.id][evt.target.name] = evt.target.value;
        },
    },

    computed: {

        endingImage: function() {
            return Vue.prototype.$TCT.jet_data.ending_data[this.id].endingImage;
        },

        getVariable: function() {
            console.log(Vue.prototype.$TCT.jet_data.ending_data)
            return Vue.prototype.$TCT.jet_data.ending_data[this.id].variable;
        },

        getOperator: function() {
            return Vue.prototype.$TCT.jet_data.ending_data[this.id].operator;
        },

        getAmount: function() {
            return Vue.prototype.$TCT.jet_data.ending_data[this.id].amount;
        },

        getEndingText: function() {
            return Vue.prototype.$TCT.jet_data.ending_data[this.id].endingText;
        }
    }
})