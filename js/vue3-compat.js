// Vue 3 Compatibility Extension for Vue 2.7
// This adds Vue 3 APIs to the existing Vue 2 installation

(function() {
    'use strict';
    
    if (typeof Vue === 'undefined') {
        console.error('Vue 2 must be loaded before the compatibility layer');
        return;
    }
    
    // Store original Vue constructor
    const OriginalVue = Vue;
    let currentApp = null;
    
    // Vue 3 style createApp function
    Vue.createApp = function(rootComponent) {
        const app = {
            config: {
                globalProperties: {}
            },
            
            _components: {},
            
            component: function(name, definition) {
                if (definition) {
                    this._components[name] = definition;
                    // Also register globally for Vue 2 compatibility
                    Vue.component(name, definition);
                    return this;
                }
                return this._components[name] || Vue.options.components[name];
            },
            
            mount: function(selector) {
                currentApp = this;
                
                // Copy global properties to Vue.prototype for compatibility
                for (const key in this.config.globalProperties) {
                    Vue.prototype[key] = this.config.globalProperties[key];
                }
                
                // Create Vue 2 instance
                const instance = new OriginalVue(rootComponent || {});
                
                // Mount to selector
                if (typeof selector === 'string') {
                    instance.$mount(selector);
                } else {
                    instance.$mount();
                    if (selector) {
                        selector.appendChild(instance.$el);
                    }
                }
                
                return instance;
            }
        };
        
        return app;
    };
    
    // Vue 3 style reactive function (using Vue 2's observable)
    Vue.reactive = function(obj) {
        return Vue.observable(obj);
    };
    
    // Vue 3 style ref function  
    Vue.ref = function(value) {
        return Vue.observable({ value: value });
    };
    
    // Ensure global properties sync with prototype
    function syncGlobalProperties() {
        if (currentApp) {
            for (const key in currentApp.config.globalProperties) {
                if (Vue.prototype[key] !== currentApp.config.globalProperties[key]) {
                    Vue.prototype[key] = currentApp.config.globalProperties[key];
                }
            }
        }
    }
    
    // Watch for changes and sync
    setInterval(syncGlobalProperties, 100);
    
    console.log('Vue 3 compatibility layer loaded successfully');
})();