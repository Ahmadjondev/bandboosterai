/**
 * Header Component - Enhanced UX/UI
 */

window.Header = {
  name: 'Header',
  mixins: [window.FeatherIconsMixin],
  props: {
    sidebarOpen: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      searchQuery: '',
      showUserMenu: false,
      showNotifications: false,
      notifications: [],
      userInfo: {
        name: 'Manager',
        email: 'manager@example.com',
        role: 'Manager',
      },
    };
  },
  template: `
    <header class="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm backdrop-blur-sm bg-white/95">
      <div class="px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 items-center justify-between gap-4">
          <!-- Left side - Logo & Menu -->
          <div class="flex items-center">
            <!-- Mobile menu button -->
            <button 
              @click="$emit('toggle-sidebar')" 
              class="xl:hidden -ml-2 mr-2 rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150"
              aria-label="Toggle sidebar"
            >
              <i data-feather="menu" class="h-6 w-6"></i>
            </button>
          </div>


          <!-- Right side - Actions & User Menu -->
          <div class="flex items-center space-x-1 sm:space-x-2">

            <!-- Notifications -->
            <div class="relative">
              <button 
                @click.stop="showNotifications = !showNotifications"
                class="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150"
                aria-label="Notifications"
              >
                <i data-feather="bell" class="h-5 w-5"></i>
                <span v-if="notifications.length > 0" class="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              </button>

              <!-- Notifications dropdown -->
              <div 
                v-if="showNotifications" 
                @click.stop
                class="absolute right-0 mt-2 w-80 origin-top-right rounded-lg bg-white shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none"
              >
                <div class="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                  <div class="flex items-center justify-between">
                    <h3 class="text-sm font-semibold text-gray-900">Notifications</h3>
                    <span v-if="notifications.length > 0" class="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                      {{ notifications.length }} new
                    </span>
                  </div>
                </div>
                <div class="max-h-96 overflow-y-auto">
                  <div v-if="notifications.length === 0" class="p-8 text-center">
                    <i data-feather="inbox" class="h-12 w-12 text-gray-300 mx-auto mb-3"></i>
                    <p class="text-sm text-gray-500 font-medium">No new notifications</p>
                    <p class="text-xs text-gray-400 mt-1">You're all caught up!</p>
                  </div>
                  <div v-else v-for="(notif, index) in notifications" :key="index" class="p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors">
                    <div class="flex items-start gap-3">
                      <div class="flex-shrink-0">
                        <div class="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                          <i data-feather="bell" class="h-4 w-4 text-orange-600"></i>
                        </div>
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm text-gray-900">{{ notif.message }}</p>
                        <p class="text-xs text-gray-500 mt-1 flex items-center">
                          <i data-feather="clock" class="h-3 w-3 mr-1"></i>
                          {{ notif.time }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="p-2 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                  <button class="w-full text-center text-xs font-medium text-orange-600 hover:text-orange-700 py-2 rounded-md hover:bg-orange-50 transition-colors">
                    View all notifications
                  </button>
                </div>
              </div>
            </div>

            <!-- User menu -->
            <div class="relative ml-2">
              <button 
                @click.stop="showUserMenu = !showUserMenu"
                class="flex items-center space-x-2 rounded-lg p-1.5 pr-3 hover:bg-gray-100 transition-colors duration-150 border border-transparent hover:border-gray-200"
                aria-label="User menu"
              >
                <div class="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white font-semibold text-sm shadow-sm">
                  {{ userInfo.name.charAt(0) }}
                </div>
                <div class="hidden lg:block text-left">
                  <p class="text-sm font-semibold text-gray-900">{{ userInfo.name }}</p>
                  <p class="text-xs text-gray-500">{{ userInfo.role }}</p>
                </div>
                <i data-feather="chevron-down" class="hidden lg:block h-4 w-4 text-gray-400 transition-transform" :class="{ 'rotate-180': showUserMenu }"></i>
              </button>

              <!-- User dropdown -->
              <div 
                v-if="showUserMenu" 
                @click.stop
                class="absolute right-0 mt-2 w-56 origin-top-right rounded-lg bg-white shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none divide-y divide-gray-100"
              >
                <div class="p-4">
                  <p class="text-sm font-semibold text-gray-900">{{ userInfo.name }}</p>
                  <p class="text-xs text-gray-500 mt-1">{{ userInfo.email }}</p>
                  <div class="mt-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    <i data-feather="shield" class="h-3 w-3 mr-1"></i>
                    {{ userInfo.role }}
                  </div>
                </div>
                <div class="py-1">
                  <a href="/logout/" @click="handleLogout" class="flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium">
                    <i data-feather="log-out" class="mr-3 h-4 w-4"></i>
                    Sign out
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  `,
  methods: {
    handleLogout(event) {
      // Clear JWT tokens from localStorage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      // Let the default navigation happen
    },
    handleSearch() {
      if (this.searchQuery.trim()) {
        console.log('Searching for:', this.searchQuery);
        // Implement search functionality
        Helpers.showNotification('Search functionality coming soon!', 'info');
      }
    },
    showMobileSearch() {
      Helpers.showNotification('Mobile search coming soon!', 'info');
    },
    closeDropdowns() {
      this.showUserMenu = false;
      this.showNotifications = false;
    },
  },
  mounted() {
    // Close dropdowns when clicking outside
    document.addEventListener('click', this.closeDropdowns);

    // Load user info (you can fetch from API)
    // this.loadUserInfo();
  },
  beforeUnmount() {
    document.removeEventListener('click', this.closeDropdowns);
  },
};
