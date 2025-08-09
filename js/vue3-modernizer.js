// Vue 3 Modernization Helper
// This provides utilities to modernize Vue 2 component patterns to Vue 3

(function() {
    'use strict';
    
    // Global app instance for component registration
    window.TCTApp = null;
    
    // Component registration queue for before app is created
    window.TCTComponentQueue = [];
    
    // Modern component registration function
    window.registerComponent = function(name, definition) {
        if (window.TCTApp && window.TCTApp._mounted) {
            // App exists and is mounted, register immediately
            window.TCTApp.component(name, definition);
        } else {
            // Queue for later registration
            window.TCTComponentQueue.push({ name, definition });
        }
    };
    
    // Initialize app and register queued components
    window.initializeTCTApp = function(appInstance) {
        window.TCTApp = appInstance;
        
        // Register all queued components
        window.TCTComponentQueue.forEach(({ name, definition }) => {
            appInstance.component(name, definition);
        });
        
        // Clear the queue
        window.TCTComponentQueue = [];
    };
    
    // Modernized component helper that works with both patterns
    window.defineComponent = function(name, definition) {
        // Try modern approach first
        if (window.registerComponent) {
            window.registerComponent(name, definition);
        } else {
            // Fallback to Vue 2 global registration
            Vue.component(name, definition);
        }
    };
    
    // Vue 3 Composition API helper for components
    window.defineComponentWithSetup = function(name, setupFunction, template) {
        const definition = {
            template: template,
            setup: setupFunction
        };
        
        window.defineComponent(name, definition);
    };
    
    // Helper to create reactive refs for easier Vue 3 patterns
    window.createReactiveData = function(initialData) {
        const { reactive, ref, computed } = Vue;
        
        const reactiveData = {};
        for (const [key, value] of Object.entries(initialData)) {
            if (typeof value === 'object' && value !== null) {
                reactiveData[key] = reactive(value);
            } else {
                reactiveData[key] = ref(value);
            }
        }
        
        return reactiveData;
    };
    
    console.log('Vue 3 modernization helper loaded');
})();