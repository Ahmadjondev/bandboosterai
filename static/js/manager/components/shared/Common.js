/**
 * Common Reusable Components
 */

// Loading Spinner
window.LoadingSpinner = {
  name: 'LoadingSpinner',
  props: {
    size: {
      type: String,
      default: 'medium', // small, medium, large
    },
  },
  template: `
    <div class="flex justify-center items-center">
      <div :class="spinnerClass" class="border-t-2 border-b-2 border-orange-500 rounded-full animate-spin"></div>
    </div>
  `,
  computed: {
    spinnerClass() {
      const sizes = {
        small: 'h-4 w-4',
        medium: 'h-8 w-8',
        large: 'h-12 w-12',
      };
      return sizes[this.size] || sizes.medium;
    },
  },
};

// Empty State
window.EmptyState = {
  name: 'EmptyState',
  mixins: [window.FeatherIconsMixin],
  props: {
    icon: {
      type: String,
      default: 'inbox',
    },
    title: {
      type: String,
      default: 'No data found',
    },
    description: {
      type: String,
      default: '',
    },
    actionText: {
      type: String,
      default: '',
    },
  },
  template: `
    <div class="text-center py-12">
      <i :data-feather="icon" class="mx-auto h-12 w-12 text-gray-400"></i>
      <h3 class="mt-2 text-sm font-medium text-gray-900">{{ title }}</h3>
      <p v-if="description" class="mt-1 text-sm text-gray-500">{{ description }}</p>
      <div v-if="actionText" class="mt-6">
        <button
          @click="$emit('action')"
          class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
        >
          {{ actionText }}
        </button>
      </div>
    </div>
  `,
};

// Modal
window.Modal = {
  name: 'Modal',
  mixins: [window.FeatherIconsMixin],
  props: {
    show: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      default: '',
    },
    size: {
      type: String,
      default: 'medium', // small, medium, large, xlarge
    },
  },
  template: `
    <div v-if="show" class="fixed z-50 inset-0 overflow-y-auto" @click.self="close">
      <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
        
        <span class="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        
        <div :class="modalClass" class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="flex items-start justify-between mb-4">
              <h3 class="text-lg leading-6 font-medium text-gray-900">{{ title }}</h3>
              <button @click="close" class="text-gray-400 hover:text-gray-500">
                <i data-feather="x" class="h-5 w-5"></i>
              </button>
            </div>
            <slot></slot>
          </div>
          <div v-if="$slots.footer" class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    </div>
  `,
  computed: {
    modalClass() {
      const sizes = {
        small: 'sm:max-w-md sm:w-full',
        medium: 'sm:max-w-lg sm:w-full',
        large: 'sm:max-w-2xl sm:w-full',
        xlarge: 'sm:max-w-4xl sm:w-full',
      };
      return sizes[this.size] || sizes.medium;
    },
  },
  methods: {
    close() {
      this.$emit('close');
    },
  },
};

// Pagination
window.Pagination = {
  name: 'Pagination',
  props: {
    currentPage: {
      type: Number,
      required: true,
    },
    totalPages: {
      type: Number,
      required: true,
    },
    hasNext: {
      type: Boolean,
      default: false,
    },
    hasPrevious: {
      type: Boolean,
      default: false,
    },
  },
  template: `
    <div class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
      <div class="flex flex-1 justify-between sm:hidden">
        <button
          @click="$emit('page-change', currentPage - 1)"
          :disabled="!hasPrevious"
          class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          @click="$emit('page-change', currentPage + 1)"
          :disabled="!hasNext"
          class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
      <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p class="text-sm text-gray-700">
            Page <span class="font-medium">{{ currentPage }}</span> of <span class="font-medium">{{ totalPages }}</span>
          </p>
        </div>
        <div>
          <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
            <button
              @click="$emit('page-change', currentPage - 1)"
              :disabled="!hasPrevious"
              class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i data-feather="chevron-left" class="h-5 w-5"></i>
            </button>
            <button
              @click="$emit('page-change', currentPage + 1)"
              :disabled="!hasNext"
              class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i data-feather="chevron-right" class="h-5 w-5"></i>
            </button>
          </nav>
        </div>
      </div>
    </div>
  `,
  mounted() {
    this.$nextTick(() => {
      if (window.feather) {
        feather.replace();
      }
    });
  },
  updated() {
    this.$nextTick(() => {
      if (window.feather) {
        feather.replace();
      }
    });
  },
};

// Badge Component
window.Badge = {
  name: 'Badge',
  props: {
    text: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      default: 'gray',
    },
  },
  template: `
    <span :class="badgeClass" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
      {{ text }}
    </span>
  `,
  computed: {
    badgeClass() {
      const colors = {
        gray: 'bg-gray-100 text-gray-800',
        red: 'bg-red-100 text-red-800',
        yellow: 'bg-yellow-100 text-yellow-800',
        green: 'bg-green-100 text-green-800',
        blue: 'bg-orange-100 text-orange-800',
        indigo: 'bg-orange-100 text-orange-800',
        purple: 'bg-purple-100 text-purple-800',
        pink: 'bg-pink-100 text-pink-800',
      };
      return colors[this.color] || colors.gray;
    },
  },
};

// Alert Component
window.Alert = {
  name: 'Alert',
  props: {
    type: {
      type: String,
      default: 'info', // success, error, warning, info
    },
    message: {
      type: String,
      required: true,
    },
    dismissible: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      show: true,
    };
  },
  template: `
    <div v-if="show" :class="alertClass" class="rounded-md p-4 mb-4">
      <div class="flex">
        <div class="flex-shrink-0">
          <i :data-feather="icon" class="h-5 w-5"></i>
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium">{{ message }}</p>
        </div>
        <div v-if="dismissible" class="ml-auto pl-3">
          <button @click="show = false" class="-mx-1.5 -my-1.5 rounded-md p-1.5 inline-flex focus:outline-none">
            <i data-feather="x" class="h-5 w-5"></i>
          </button>
        </div>
      </div>
    </div>
  `,
  computed: {
    alertClass() {
      const classes = {
        success: 'bg-green-50 text-green-800',
        error: 'bg-red-50 text-red-800',
        warning: 'bg-yellow-50 text-yellow-800',
        info: 'bg-orange-50 text-orange-800',
      };
      return classes[this.type] || classes.info;
    },
    icon() {
      const icons = {
        success: 'check-circle',
        error: 'x-circle',
        warning: 'alert-triangle',
        info: 'info',
      };
      return icons[this.type] || icons.info;
    },
  },
  mounted() {
    this.$nextTick(() => {
      if (window.feather) {
        feather.replace();
      }
    });
  },
};

// Toast Notification Component
window.ToastNotification = {
  name: 'ToastNotification',
  mixins: [window.FeatherIconsMixin],
  props: {
    id: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      default: 'info', // success, error, warning, info
    },
    title: {
      type: String,
      default: '',
    },
    message: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      default: 5000, // 5 seconds
    },
  },
  data() {
    return {
      show: false,
      removing: false,
    };
  },
  template: `
    <transition
      enter-active-class="transform transition-all duration-300 ease-out"
      enter-from-class="translate-x-full opacity-0"
      enter-to-class="translate-x-0 opacity-100"
      leave-active-class="transform transition-all duration-200 ease-in"
      leave-from-class="translate-x-0 opacity-100"
      leave-to-class="translate-x-full opacity-0"
    >
      <div
        v-if="show"
        :class="toastClass"
        class="pointer-events-auto w-full max-w-md overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 mb-4"
        @mouseenter="pauseTimer"
        @mouseleave="resumeTimer"
      >
        <div class="p-4">
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <i :data-feather="icon" :class="iconColorClass" class="h-6 w-6"></i>
            </div>
            <div class="ml-3 w-0 flex-1 pt-0.5">
              <p v-if="title" class="text-sm font-semibold" :class="titleColorClass">{{ title }}</p>
              <p class="text-sm" :class="[title ? 'mt-1' : '', messageColorClass]">{{ message }}</p>
            </div>
            <div class="ml-4 flex flex-shrink-0">
              <button
                @click="close"
                class="inline-flex rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2"
                :class="buttonColorClass"
              >
                <i data-feather="x" class="h-5 w-5"></i>
              </button>
            </div>
          </div>
        </div>
        <div v-if="duration > 0" class="h-1 bg-black bg-opacity-10">
          <div
            class="h-full transition-all ease-linear"
            :class="progressColorClass"
            :style="{ width: progressWidth + '%' }"
          ></div>
        </div>
      </div>
    </transition>
  `,
  computed: {
    toastClass() {
      const classes = {
        success: 'bg-white',
        error: 'bg-white',
        warning: 'bg-white',
        info: 'bg-white',
      };
      return classes[this.type] || classes.info;
    },
    icon() {
      const icons = {
        success: 'check-circle',
        error: 'alert-circle',
        warning: 'alert-triangle',
        info: 'info',
      };
      return icons[this.type] || icons.info;
    },
    iconColorClass() {
      const colors = {
        success: 'text-green-500',
        error: 'text-red-500',
        warning: 'text-yellow-500',
        info: 'text-orange-500',
      };
      return colors[this.type] || colors.info;
    },
    titleColorClass() {
      const colors = {
        success: 'text-green-900',
        error: 'text-red-900',
        warning: 'text-yellow-900',
        info: 'text-orange-900',
      };
      return colors[this.type] || colors.info;
    },
    messageColorClass() {
      const colors = {
        success: 'text-green-700',
        error: 'text-red-700',
        warning: 'text-yellow-700',
        info: 'text-orange-700',
      };
      return colors[this.type] || colors.info;
    },
    buttonColorClass() {
      const colors = {
        success: 'text-green-500 hover:text-green-600 focus:ring-green-500',
        error: 'text-red-500 hover:text-red-600 focus:ring-red-500',
        warning: 'text-yellow-500 hover:text-yellow-600 focus:ring-yellow-500',
        info: 'text-orange-500 hover:text-orange-600 focus:ring-orange-500',
      };
      return colors[this.type] || colors.info;
    },
    progressColorClass() {
      const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-orange-500',
      };
      return colors[this.type] || colors.info;
    },
  },
  data() {
    return {
      show: false,
      removing: false,
      progressWidth: 100,
      timer: null,
      progressTimer: null,
      isPaused: false,
      remainingTime: 0,
      startTime: 0,
    };
  },
  mounted() {
    this.$nextTick(() => {
      this.show = true;
      if (window.feather) {
        feather.replace();
      }
      if (this.duration > 0) {
        this.startTimer();
      }
    });
  },
  beforeUnmount() {
    this.clearTimers();
  },
  methods: {
    startTimer() {
      this.startTime = Date.now();
      this.remainingTime = this.duration;

      this.timer = setTimeout(() => {
        this.close();
      }, this.duration);

      this.updateProgress();
    },
    updateProgress() {
      const updateInterval = 50; // Update every 50ms for smooth animation

      this.progressTimer = setInterval(() => {
        if (!this.isPaused) {
          const elapsed = Date.now() - this.startTime;
          const remaining = Math.max(0, this.duration - elapsed);
          this.progressWidth = (remaining / this.duration) * 100;

          if (remaining <= 0) {
            clearInterval(this.progressTimer);
          }
        }
      }, updateInterval);
    },
    pauseTimer() {
      if (this.timer && !this.isPaused) {
        this.isPaused = true;
        clearTimeout(this.timer);
        this.remainingTime = this.duration - (Date.now() - this.startTime);
      }
    },
    resumeTimer() {
      if (this.isPaused && this.remainingTime > 0) {
        this.isPaused = false;
        this.startTime = Date.now();
        this.duration = this.remainingTime;

        this.timer = setTimeout(() => {
          this.close();
        }, this.remainingTime);
      }
    },
    clearTimers() {
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
      if (this.progressTimer) {
        clearInterval(this.progressTimer);
        this.progressTimer = null;
      }
    },
    close() {
      this.clearTimers();
      this.show = false;
      setTimeout(() => {
        this.$emit('close', this.id);
      }, 200); // Match the leave transition duration
    },
  },
};

// Toast Container Component
window.ToastContainer = {
  name: 'ToastContainer',
  components: {
    ToastNotification: window.ToastNotification,
  },
  data() {
    return {
      toasts: [],
    };
  },
  template: `
    <div class="fixed bottom-0 right-0 z-50 p-4 sm:p-6 space-y-4 pointer-events-none" style="max-width: 32rem; width: 100%;">
      <toast-notification
        v-for="toast in toasts"
        :key="toast.id"
        :id="toast.id"
        :type="toast.type"
        :title="toast.title"
        :message="toast.message"
        :duration="toast.duration"
        @close="removeToast"
      />
    </div>
  `,
  mounted() {
    // Listen for toast events
    window.addEventListener('show-toast', this.handleShowToast);
  },
  beforeUnmount() {
    window.removeEventListener('show-toast', this.handleShowToast);
  },
  methods: {
    handleShowToast(event) {
      this.addToast(event.detail);
    },
    addToast(toast) {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.toasts.push({
        id,
        type: toast.type || 'info',
        title: toast.title || '',
        message: toast.message || '',
        duration: toast.duration !== undefined ? toast.duration : 5000,
      });
    },
    removeToast(id) {
      const index = this.toasts.findIndex(t => t.id === id);
      if (index > -1) {
        this.toasts.splice(index, 1);
      }
    },
  },
};
