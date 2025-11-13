/**
 * Feather Icons Mixin
 * Vue 3 mixin for automatic feather icons management in components
 * 
 * Usage:
 * Add to component: mixins: [window.FeatherIconsMixin]
 */

window.FeatherIconsMixin = {
    mounted() {
        this.updateFeatherIcons();
    },
    updated() {
        this.updateFeatherIcons();
    },
    methods: {
        /**
         * Update feather icons in the component
         * Uses nextTick and requestAnimationFrame for optimal performance
         */
        updateFeatherIcons() {
            this.$nextTick(() => {
                requestAnimationFrame(() => {
                    if (FeatherUtils && FeatherUtils.isLoaded()) {
                        FeatherUtils.replace(this.$el);
                    }
                });
            });
        },

        /**
         * Force immediate icon update
         * Useful after dynamic content changes
         */
        forceUpdateIcons() {
            if (FeatherUtils && FeatherUtils.isLoaded()) {
                FeatherUtils.replace(this.$el);
            }
        }
    }
};

console.log('Feather Icons Mixin loaded');
