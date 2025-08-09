// Vue 3 Compatibility and Enhancement Layer
// This provides proper Vue 3 patterns and backward compatibility

(function() {
    'use strict';
    
    if (typeof Vue === 'undefined') {
        console.error('Vue must be loaded before the compatibility layer');
        return;
    }
    
    // Store references for compatibility
    const OriginalVue = Vue;
    let currentApp = null;
    
    // Enhanced createApp function for better Vue 3 compatibility
    Vue.createApp = function(rootComponent) {
        const app = {
            config: {
                globalProperties: {}
            },
            
            _components: {},
            _mounted: false,
            
            component: function(name, definition) {
                if (definition) {
                    this._components[name] = definition;
                    
                    // If app is already mounted, register immediately
                    if (this._mounted) {
                        OriginalVue.component(name, definition);
                    }
                    return this;
                }
                return this._components[name] || (OriginalVue.options && OriginalVue.options.components[name]);
            },
            
            mount: function(selector) {
                currentApp = this;
                this._mounted = true;
                
                // Register all components that were added before mounting
                for (const [name, definition] of Object.entries(this._components)) {
                    OriginalVue.component(name, definition);
                }
                
                // Copy global properties to Vue.prototype for compatibility
                for (const key in this.config.globalProperties) {
                    OriginalVue.prototype[key] = this.config.globalProperties[key];
                }
                
                // Create Vue 2 instance with improved compatibility
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
            },
            
            // Add unmount method for completeness
            unmount: function() {
                if (this._instance && this._instance.$destroy) {
                    this._instance.$destroy();
                }
                this._mounted = false;
                currentApp = null;
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
    
    // Vue 3 style computed function
    Vue.computed = function(getterOrOptions) {
        if (typeof getterOrOptions === 'function') {
            return Vue.observable({
                get value() {
                    return getterOrOptions();
                }
            });
        }
        // Handle getter/setter case
        return Vue.observable({
            get value() {
                return getterOrOptions.get();
            },
            set value(newValue) {
                if (getterOrOptions.set) {
                    getterOrOptions.set(newValue);
                }
            }
        });
    };
    
    // Vue 3 style watch function (simplified)
    Vue.watch = function(source, callback, options = {}) {
        if (currentApp && currentApp._instance) {
            return currentApp._instance.$watch(source, callback, options);
        }
        // Fallback for before mount
        return Vue.prototype.$watch ? Vue.prototype.$watch(source, callback, options) : null;
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