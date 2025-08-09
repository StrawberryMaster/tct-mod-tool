// Example: Modern Vue 3 Component Using Composition API
// This demonstrates how to create components using Vue 3 patterns

// Example 1: Simple component with reactive data
window.defineComponentWithSetup('vue3-example', function() {
    const { ref, reactive, computed } = Vue;
    
    // Reactive state
    const count = ref(0);
    const user = reactive({
        name: 'TCT User',
        preferences: {
            autosave: true
        }
    });
    
    // Computed properties
    const doubleCount = computed(() => count.value * 2);
    
    // Methods
    const increment = () => count.value++;
    const decrement = () => count.value--;
    
    // Return reactive data and methods for template
    return {
        count,
        user,
        doubleCount,
        increment,
        decrement
    };
}, `
    <div class="vue3-example p-4 bg-blue-50 border rounded">
        <h3 class="font-bold">Vue 3 Composition API Example</h3>
        <p>Count: {{ count }}</p>
        <p>Double Count: {{ doubleCount }}</p>
        <p>User: {{ user.name }}</p>
        <div class="flex gap-2 mt-2">
            <button @click="increment" class="bg-blue-500 text-white px-2 py-1 rounded">+</button>
            <button @click="decrement" class="bg-red-500 text-white px-2 py-1 rounded">-</button>
        </div>
    </div>
`);

// Example 2: Traditional Options API component (still supported)
window.defineComponent('vue2-style-example', {
    data() {
        return {
            message: 'This component uses traditional Vue 2 patterns'
        };
    },
    methods: {
        updateMessage() {
            this.message = 'Message updated at ' + new Date().toLocaleTimeString();
        }
    },
    template: `
        <div class="vue2-example p-4 bg-green-50 border rounded">
            <h3 class="font-bold">Vue 2 Style Component (Still Supported)</h3>
            <p>{{ message }}</p>
            <button @click="updateMessage" class="bg-green-500 text-white px-2 py-1 rounded">
                Update Message
            </button>
        </div>
    `
});

console.log('Vue 3 component examples loaded - both patterns are now supported!');