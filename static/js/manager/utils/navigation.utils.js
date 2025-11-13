window.NavigationUtils = {
    navigateToRoute(route, params = {}) {
        const app = document.querySelector('#manager-app').__vueParentComponent;
        if (app && app.ctx.navigateTo) {
            app.ctx.navigateTo(route, params);
        } else {
            console.warn('Navigation utility: Vue app instance not found');
        }
    },

    getCurrentRoute() {
        const path = window.location.pathname;
        const basePath = '/manager/';
        return path.replace(basePath, '').replace(/^\/+|\/+$/g, '') || 'dashboard';
    },

    buildUrl(route, params = {}) {
        let path = `/manager/${route}`;

        if (route === 'student-detail' && params.userId) {
            path = `/manager/students/${params.userId}`;
        } else if (route === 'passage-form') {
            path = params.mode === 'create'
                ? '/manager/reading-tests/passage/new'
                : `/manager/reading-tests/passage/${params.id}`;
        }

        return path;
    },

    parseUrl(url) {
        const basePath = '/manager/';
        const routePath = url.replace(basePath, '').replace(/^\/+|\/+$/g, '') || 'dashboard';
        const segments = routePath.split('/');

        return {
            route: segments[0],
            segments,
            params: segments.slice(1)
        };
    },

    isValidRoute(route) {
        const validRoutes = [
            'dashboard',
            'students',
            'student-detail',
            'reading-tests',
            'passage-form',
            'listening-tests',
            'writing-tasks',
            'speaking-topics',
            'mock-tests',
            'results'
        ];
        return validRoutes.includes(route);
    }
};

window.RouterMixin = {
    methods: {
        navigateToRoute(route, params = {}) {
            this.$emit('navigate', route, params);
        },

        goBack() {
            window.history.back();
        },

        goForward() {
            window.history.forward();
        },

        reloadRoute() {
            const route = NavigationUtils.getCurrentRoute();
            this.$emit('navigate', route, {});
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NavigationUtils, RouterMixin };
}
