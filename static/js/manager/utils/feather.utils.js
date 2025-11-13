/**
 * Feather Icons Utility Service
 * Provides enhanced feather icons functionality with automatic updates,
 * performance optimization, and Vue 3 integration
 */

window.FeatherUtils = {
    /**
     * Initialize feather icons with retry logic
     */
    init() {
        if (typeof feather === 'undefined') {
            console.warn('Feather icons library not loaded');
            return false;
        }

        try {
            feather.replace({
                'stroke-width': 2,
                'width': 20,
                'height': 20
            });
            return true;
        } catch (error) {
            console.error('Error initializing feather icons:', error);
            return false;
        }
    },

    /**
     * Replace icons in a specific element or entire document
     * @param {HTMLElement|string} target - Element or selector to update icons in
     */
    replace(target = null) {
        if (typeof feather === 'undefined') {
            return;
        }

        try {
            if (target) {
                const element = typeof target === 'string'
                    ? document.querySelector(target)
                    : target;

                if (element) {
                    // Find all feather icon elements within target
                    const icons = element.querySelectorAll('[data-feather]');
                    icons.forEach(icon => {
                        feather.replace({
                            node: icon,
                            'stroke-width': icon.getAttribute('stroke-width') || 2,
                        });
                    });
                }
            } else {
                feather.replace();
            }
        } catch (error) {
            console.error('Error replacing feather icons:', error);
        }
    },

    /**
     * Update icons with a debounced approach for performance
     * Useful for frequent updates in reactive components
     */
    debouncedReplace: null,

    setupDebouncedReplace() {
        if (!this.debouncedReplace) {
            this.debouncedReplace = this.debounce(() => {
                this.replace();
            }, 100);
        }
        return this.debouncedReplace;
    },

    /**
     * Debounce utility
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Create a Vue 3 directive for automatic feather icon updates
     */
    createVueDirective() {
        return {
            mounted(el) {
                FeatherUtils.replace(el);
            },
            updated(el) {
                // Use requestAnimationFrame for better performance
                requestAnimationFrame(() => {
                    FeatherUtils.replace(el);
                });
            }
        };
    },

    /**
     * Create a Vue 3 mixin for component-level icon management
     */
    createVueMixin() {
        return {
            mounted() {
                this.$nextTick(() => {
                    FeatherUtils.replace(this.$el);
                });
            },
            updated() {
                this.$nextTick(() => {
                    FeatherUtils.replace(this.$el);
                });
            }
        };
    },

    /**
     * Observer-based automatic icon replacement
     * Watches for DOM changes and updates icons automatically
     */
    observer: null,

    startAutoReplace(target = document.body) {
        if (this.observer) {
            this.stopAutoReplace();
        }

        if (typeof feather === 'undefined') {
            console.warn('Feather icons not loaded, cannot start auto-replace');
            return;
        }

        // Create debounced replace function
        const debouncedReplace = this.setupDebouncedReplace();

        // Create mutation observer
        this.observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;

            for (const mutation of mutations) {
                // Check if any added nodes contain data-feather attributes
                if (mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1) { // Element node
                            if (node.hasAttribute && node.hasAttribute('data-feather')) {
                                shouldUpdate = true;
                                break;
                            }
                            if (node.querySelector && node.querySelector('[data-feather]')) {
                                shouldUpdate = true;
                                break;
                            }
                        }
                    }
                }

                if (shouldUpdate) break;
            }

            if (shouldUpdate) {
                debouncedReplace();
            }
        });

        // Start observing
        this.observer.observe(target, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['data-feather']
        });

        console.log('Feather icons auto-replace started');
    },

    /**
     * Stop automatic icon replacement
     */
    stopAutoReplace() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
            console.log('Feather icons auto-replace stopped');
        }
    },

    /**
     * Get icon SVG as string
     * @param {string} iconName - Name of the icon
     * @param {object} options - Icon options (width, height, etc.)
     */
    getIconSvg(iconName, options = {}) {
        if (typeof feather === 'undefined' || !feather.icons[iconName]) {
            return '';
        }

        const defaultOptions = {
            'stroke-width': 2,
            width: 20,
            height: 20,
            ...options
        };

        return feather.icons[iconName].toSvg(defaultOptions);
    },

    /**
     * Check if feather icons library is loaded
     */
    isLoaded() {
        return typeof feather !== 'undefined';
    },

    /**
     * Wait for feather icons to load with timeout
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise<boolean>}
     */
    async waitForLoad(timeout = 5000) {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            if (this.isLoaded()) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return false;
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        FeatherUtils.init();
    });
} else {
    FeatherUtils.init();
}

console.log('Feather Utils initialized');
