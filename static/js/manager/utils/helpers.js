/**
 * Utility Helper Functions
 */

const Helpers = {
    /**
     * Format date to readable string
     */
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    },

    /**
     * Format datetime to readable string
     */
    formatDateTime(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    },

    /**
     * Format relative time (e.g., "2 hours ago")
     */
    formatRelativeTime(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

        return this.formatDate(dateString);
    },

    /**
     * Truncate text
     */
    truncate(text, length = 50) {
        if (!text) return '';
        if (text.length <= length) return text;
        return text.substring(0, length) + '...';
    },

    /**
     * Debounce function
     */
    debounce(func, wait = 300) {
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
     * Show toast notification (Enhanced with bottom-right positioning and icons)
     */
    showToast(message, type = 'success', duration = 3000) {
        // Create notification container if it doesn't exist
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none';
            container.style.maxWidth = '400px';
            document.body.appendChild(container);
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'pointer-events-auto transform transition-all duration-300 ease-out translate-x-0 opacity-100';

        // Get icon and colors based on type
        const config = {
            success: {
                bg: 'bg-green-500',
                icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>`
            },
            error: {
                bg: 'bg-red-500',
                icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>`
            },
            warning: {
                bg: 'bg-yellow-500',
                icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>`
            },
            info: {
                bg: 'bg-orange-500',
                icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>`
            }
        };

        const typeConfig = config[type] || config.info;

        toast.innerHTML = `
            <div class="flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl ${typeConfig.bg} text-white min-w-[300px] max-w-[400px]">
                <div class="flex-shrink-0">
                    ${typeConfig.icon}
                </div>
                <div class="flex-1 text-sm font-medium">
                    ${message}
                </div>
                <button class="flex-shrink-0 ml-2 hover:bg-white hover:bg-opacity-20 rounded p-1 transition-colors" onclick="this.closest('.transform').remove()">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `;

        // Add to container
        container.appendChild(toast);

        // Trigger entrance animation
        setTimeout(() => {
            toast.style.opacity = '1';
        }, 10);

        // Auto-remove after duration
        const autoRemove = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
                // Remove container if empty
                if (container.children.length === 0) {
                    container.remove();
                }
            }, 300);
        }, duration);

        // Cancel auto-remove on hover
        toast.addEventListener('mouseenter', () => {
            clearTimeout(autoRemove);
        });

        // Resume auto-remove on mouse leave
        toast.addEventListener('mouseleave', () => {
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.remove();
                    }
                    // Remove container if empty
                    if (container.children.length === 0) {
                        container.remove();
                    }
                }, 300);
            }, 1000);
        });
    },

    /**
     * Confirm dialog
     */
    async confirm(message) {
        return window.confirm(message);
    },

    /**
     * Copy to clipboard
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Copied to clipboard!', 'success', 2000);
            return true;
        } catch (err) {
            this.showToast('Failed to copy', 'error', 3000);
            return false;
        }
    },

    /**
     * Download JSON as file
     */
    downloadJSON(data, filename = 'data.json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    },

    /**
     * Get difficulty badge color
     */
    getDifficultyColor(difficulty) {
        const colors = {
            'BEGINNER': 'bg-green-100 text-green-800',
            'INTERMEDIATE': 'bg-orange-100 text-orange-800',
            'ADVANCED': 'bg-orange-100 text-orange-800',
            'EXPERT': 'bg-red-100 text-red-800',
        };
        return colors[difficulty] || 'bg-gray-100 text-gray-800';
    },

    /**
     * Get status badge color
     */
    getStatusColor(status) {
        const colors = {
            'IN_PROGRESS': 'bg-yellow-100 text-yellow-800',
            'COMPLETED': 'bg-green-100 text-green-800',
            'NOT_STARTED': 'bg-gray-100 text-gray-800',
            'ACTIVE': 'bg-green-100 text-green-800',
            'INACTIVE': 'bg-red-100 text-red-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    },

    /**
     * Format band score with color
     */
    getBandScoreColor(score) {
        if (score >= 8) return 'text-green-600 font-bold';
        if (score >= 7) return 'text-orange-600 font-bold';
        if (score >= 6) return 'text-yellow-600 font-bold';
        if (score >= 5) return 'text-orange-600 font-bold';
        return 'text-red-600 font-bold';
    },

    /**
     * Validate email
     */
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    /**
     * Generate random ID
     */
    generateId() {
        return Math.random().toString(36).substring(2, 9);
    },

    /**
     * Show toast notification
     * @param {string|object} message - Message string or options object
     * @param {string} type - Type of notification (success, error, warning, info)
     * @param {number} duration - Duration in milliseconds (0 for no auto-close)
     */
    showToast(message, type = 'info', duration = 5000) {
        if (window.showToast) {
            if (typeof message === 'string') {
                window.showToast({
                    message,
                    type,
                    duration,
                });
            } else {
                window.showToast(message);
            }
        } else {
            // Fallback to console if toast not available
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    },

    /**
     * Show success notification
     */
    showSuccess(message, title = 'Success', duration = 5000) {
        this.showToast({ message, type: 'success', title, duration });
    },

    /**
     * Show error notification
     */
    showError(message, title = 'Error', duration = 7000) {
        this.showToast({ message, type: 'error', title, duration });
    },

    /**
     * Show warning notification
     */
    showWarning(message, title = 'Warning', duration = 6000) {
        this.showToast({ message, type: 'warning', title, duration });
    },

    /**
     * Show info notification
     */
    showInfo(message, title = '', duration = 5000) {
        this.showToast({ message, type: 'info', title, duration });
    },
};

// Make Helpers available globally
window.Helpers = Helpers;

// Global shortcut for notifications - now uses toast
window.showNotification = (message, type = 'success', duration = 5000) => {
    Helpers.showToast(message, type, duration);
};

// Setup Axios with CSRF token
(function setupAxios() {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (csrfToken && window.axios) {
        axios.defaults.headers.common['X-CSRFToken'] = csrfToken;
        axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
        axios.defaults.withCredentials = true;
    }
})();
