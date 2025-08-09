// Vue 3 Modernization Helper
// This provides utilities to modernize Vue 2 component patterns to Vue 3
// Works with both Vue 2 + compatibility layer and direct Vue 3

(function() {
    'use strict';
    
    // Detect Vue 3 direct usage vs Vue 2 + compat layer
    const isVue3Direct = typeof Vue !== 'undefined' && Vue.version && Vue.version.startsWith('3.');
    const isVue2WithCompat = typeof Vue !== 'undefined' && Vue.version && Vue.version.startsWith('2.');
    
    // Global app instance for component registration
    window.TCTApp = null;
    
    // Component registration queue for before app is created
    window.TCTComponentQueue = [];
    
    // Modern component registration function
    window.registerComponent = function(name, definition) {
        if (window.TCTApp && (window.TCTApp._mounted || window.TCTApp.mount)) {
            // App exists and is ready, register immediately
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
        if (isVue3Direct) {
            // Direct Vue 3 usage - use modern registration pattern
            window.registerComponent(name, definition);
        } else if (isVue2WithCompat && window.registerComponent) {
            // Vue 2 with compatibility layer - use modern approach
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
    
    // Polyfills for Vue 3 when using direct Vue 3 without compatibility layer
    if (isVue3Direct) {
        // Provide Vue.prototype compatibility for existing code
        if (!Vue.prototype) {
            Vue.prototype = {};
        }
        
        // Provide Vue.observable compatibility
        if (!Vue.observable) {
            Vue.observable = Vue.reactive;
        }
        
        // Enhanced createApp for Vue 3 direct usage
        const originalCreateApp = Vue.createApp;
        Vue.createApp = function(rootComponent) {
            const app = originalCreateApp(rootComponent);
            
            // Sync global properties with Vue.prototype for compatibility
            const originalMount = app.mount;
            app.mount = function(selector) {
                // Copy global properties to Vue.prototype for compatibility with existing code
                Object.assign(Vue.prototype, app.config.globalProperties);
                return originalMount.call(this, selector);
            };
            
            return app;
        };
    }
    
    console.log(`Vue 3 modernization helper loaded (Vue ${Vue.version}, ${isVue3Direct ? 'Direct Vue 3' : isVue2WithCompat ? 'Vue 2 + Compat' : 'Unknown'})`);
})();