/**
 * Global Axios Configuration for Django + Vue.js
 * Handles CSRF tokens and credentials for all API requests
 */

(function () {
    'use strict';

    // CSRF Token Helper Function
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    // Get CSRF token
    const csrfToken = getCookie('csrftoken');

    if (!csrfToken) {
        console.warn('[Axios Config] CSRF token not found in cookies. Make sure {% csrf_token %} is in your template or request a page that sets the CSRF cookie first.');
    }

    // Configure Axios defaults
    if (typeof axios !== 'undefined') {
        // Send cookies with every request
        axios.defaults.withCredentials = true;

        // Set CSRF token header for all requests
        axios.defaults.headers.common['X-CSRFToken'] = csrfToken;

        // Set default headers for POST, PUT, PATCH, DELETE
        axios.defaults.headers.post['X-CSRFToken'] = csrfToken;
        axios.defaults.headers.put['X-CSRFToken'] = csrfToken;
        axios.defaults.headers.patch['X-CSRFToken'] = csrfToken;
        axios.defaults.headers.delete['X-CSRFToken'] = csrfToken;

        // Add request interceptor to refresh CSRF token if needed
        axios.interceptors.request.use(
            function (config) {
                // Get fresh CSRF token for each request
                const freshCsrfToken = getCookie('csrftoken');
                if (freshCsrfToken) {
                    config.headers['X-CSRFToken'] = freshCsrfToken;
                }
                return config;
            },
            function (error) {
                return Promise.reject(error);
            }
        );

        // Add response interceptor for better error handling
        axios.interceptors.response.use(
            function (response) {
                return response;
            },
            function (error) {
                if (error.response) {
                    // Handle 403 Forbidden errors
                    if (error.response.status === 403) {
                        console.error('[Axios] 403 Forbidden:', error.response.data);

                        // Check if it's a CSRF error
                        if (error.response.data && typeof error.response.data === 'object') {
                            const errorDetail = error.response.data.detail || '';
                            if (errorDetail.includes('CSRF') || errorDetail.includes('csrf')) {
                                console.error('[Axios] CSRF token error detected. Try refreshing the page.');
                            }
                        }
                    }

                    // Handle 401 Unauthorized (session expired)
                    if (error.response.status === 401) {
                        console.error('[Axios] 401 Unauthorized: Session may have expired');
                        // Optionally redirect to login
                        // window.location.href = '/login/';
                    }
                }
                return Promise.reject(error);
            }
        );

        console.log('[Axios Config] Axios configured successfully with CSRF protection and credentials');
    } else {
        console.error('[Axios Config] Axios is not loaded. Make sure to include Axios before this script.');
    }

    // Make getCookie available globally for other scripts
    window.getCookie = getCookie;
})();
