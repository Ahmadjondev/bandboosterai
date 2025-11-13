window.Sidebar = {
  name: 'Sidebar',
  mixins: [window.FeatherIconsMixin],
  emits: ['navigate', 'close-sidebar'],
  props: {
    currentRoute: {
      type: String,
      required: true,
    },
    sidebarOpen: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      sections: {
        overview: true,
        users: true,
        tests: true,
        mockTests: true,
        results: true,
      },
    };
  },
  methods: {
    navigate(route) {
      this.$emit('navigate', route);
    },
    closeSidebar() {
      this.$emit('close-sidebar');
    },
  },
  template: `
    <div class="h-screen">
      <div 
        v-show="sidebarOpen" 
        @click="closeSidebar"
        class="fixed inset-0 z-40 bg-gray-900/60 backdrop-blur-sm transition-opacity xl:hidden"
      ></div>

      <aside
        class="h-screen fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-white shadow-2xl border-r border-gray-200 transition-transform duration-300 xl:static xl:translate-x-0"
        :class="{'translate-x-0': sidebarOpen, '-translate-x-full': !sidebarOpen}"
        role="navigation" 
        aria-label="Manager navigation"
      >
        <div class="h-16 px-5 flex items-center gap-3 border-b border-gray-200 bg-gradient-to-r from-orange-50/50 to-transparent">
          <a href="/manager/" @click.prevent="navigate('dashboard')" class="flex items-center gap-3 group flex-1">
            <div class="relative h-10 w-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 shadow-lg shadow-orange-900/20 ring-2 ring-orange-400/30 group-hover:ring-orange-400/50 transition-all duration-300 group-hover:scale-110">
              <i data-feather="activity" class="w-5 h-5 text-white"></i>
              <div class="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <div class="flex flex-col">
              <span class="text-base font-bold tracking-tight text-gray-900 group-hover:text-orange-600 transition-colors">Manager</span>
              <span class="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Admin Panel</span>
            </div>
          </a>
          <button 
            type="button" 
            @click="closeSidebar" 
            class="xl:hidden inline-flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-all duration-200" 
            aria-label="Close sidebar"
          >
            <i data-feather="x" class="w-5 h-5"></i>
          </button>
        </div>

        <nav class="flex-1 overflow-y-auto px-3 py-6 space-y-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400">
          <div>
            <p class="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
              <span class="w-1 h-1 rounded-full bg-gray-400"></span>
              Overview
            </p>
            <ul class="space-y-0.5">
              <li>
                <a
                  href="/manager/"
                  @click.prevent="navigate('dashboard')"
                  data-nav-link="dashboard"
                  :class="[
                    currentRoute === 'dashboard'
                      ? 'bg-orange-50 text-orange-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
                    'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:translate-x-0.5'
                  ]"
                >
                  <div 
                    :class="[
                      currentRoute === 'dashboard' ? 'bg-orange-100' : 'bg-gray-100 group-hover:bg-orange-50',
                      'flex items-center justify-center w-8 h-8 rounded-lg transition-colors'
                    ]"
                  >
                    <i 
                      data-feather="activity" 
                      :class="[currentRoute === 'dashboard' ? 'text-orange-600' : 'text-gray-500']"
                      class="w-4 h-4"
                    ></i>
                  </div>
                  <span>Dashboard</span>
                  <i data-feather="chevron-right" class="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"></i>
                </a>
              </li>
            </ul>
          </div>

          <div>
            <button 
              @click="sections.users = !sections.users" 
              class="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-gray-700 transition-colors group"
            >
              <span class="flex items-center gap-2">
                <span class="w-1 h-1 rounded-full bg-gray-400 group-hover:bg-gray-600 transition-colors"></span>
                <i data-feather="users" class="w-3.5 h-3.5"></i> 
                Users
              </span>
              <i data-feather="chevron-down" class="w-3.5 h-3.5 transition-transform duration-300" :class="{'rotate-180': sections.users}"></i>
            </button>
            <ul v-show="sections.users" class="mt-1 space-y-0.5 pl-3 border-l border-gray-200">
              <li>
                <a
                  href="/manager/students"
                  @click.prevent="navigate('students')"
                  data-nav-link="students"
                  :class="[
                    currentRoute === 'students'
                      ? 'bg-orange-50 text-orange-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
                    'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:translate-x-0.5'
                  ]"
                >
                  <div 
                    :class="[
                      currentRoute === 'students' ? 'bg-orange-100' : 'bg-gray-100 group-hover:bg-orange-50',
                      'flex items-center justify-center w-8 h-8 rounded-lg transition-colors'
                    ]"
                  >
                    <i 
                      data-feather="users" 
                      :class="[currentRoute === 'students' ? 'text-orange-600' : 'text-gray-500']"
                      class="w-4 h-4"
                    ></i>
                  </div>
                  <span>Students</span>
                  <i data-feather="chevron-right" class="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"></i>
                </a>
              </li>
            </ul>
          </div>

          <div>
            <button 
              @click="sections.tests = !sections.tests" 
              class="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-gray-700 transition-colors group"
            >
              <span class="flex items-center gap-2">
                <span class="w-1 h-1 rounded-full bg-gray-400 group-hover:bg-gray-600 transition-colors"></span>
                <i data-feather="layers" class="w-3.5 h-3.5"></i> 
                Test Management
              </span>
              <i data-feather="chevron-down" class="w-3.5 h-3.5 transition-transform duration-300" :class="{'rotate-180': sections.tests}"></i>
            </button>
            <ul v-show="sections.tests" class="mt-1 space-y-0.5 pl-3 border-l border-gray-200">
              <li>
                <a
                  href="/manager/reading-tests"
                  @click.prevent="navigate('reading-tests')"
                  data-nav-link="reading-tests"
                  :class="[
                    currentRoute === 'reading-tests'
                      ? 'bg-orange-50 text-orange-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
                    'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:translate-x-0.5'
                  ]"
                >
                  <div 
                    :class="[
                      currentRoute === 'reading-tests' ? 'bg-orange-100' : 'bg-gray-100 group-hover:bg-orange-50',
                      'flex items-center justify-center w-8 h-8 rounded-lg transition-colors'
                    ]"
                  >
                    <i 
                      data-feather="book-open" 
                      :class="[currentRoute === 'reading-tests' ? 'text-orange-600' : 'text-gray-500']"
                      class="w-4 h-4"
                    ></i>
                  </div>
                  <span>Reading</span>
                  <i data-feather="chevron-right" class="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"></i>
                </a>
              </li>
              <li>
                <a
                  href="/manager/listening-tests"
                  @click.prevent="navigate('listening-tests')"
                  data-nav-link="listening-tests"
                  :class="[
                    currentRoute === 'listening-tests'
                      ? 'bg-orange-50 text-orange-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
                    'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:translate-x-0.5'
                  ]"
                >
                  <div 
                    :class="[
                      currentRoute === 'listening-tests' ? 'bg-orange-100' : 'bg-gray-100 group-hover:bg-orange-50',
                      'flex items-center justify-center w-8 h-8 rounded-lg transition-colors'
                    ]"
                  >
                    <i 
                      data-feather="headphones" 
                      :class="[currentRoute === 'listening-tests' ? 'text-orange-600' : 'text-gray-500']"
                      class="w-4 h-4"
                    ></i>
                  </div>
                  <span>Listening</span>
                  <i data-feather="chevron-right" class="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"></i>
                </a>
              </li>
              <li>
                <a
                  href="/manager/writing-tasks"
                  @click.prevent="navigate('writing-tasks')"
                  data-nav-link="writing-tasks"
                  :class="[
                    currentRoute === 'writing-tasks'
                      ? 'bg-orange-50 text-orange-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
                    'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:translate-x-0.5'
                  ]"
                >
                  <div 
                    :class="[
                      currentRoute === 'writing-tasks' ? 'bg-orange-100' : 'bg-gray-100 group-hover:bg-orange-50',
                      'flex items-center justify-center w-8 h-8 rounded-lg transition-colors'
                    ]"
                  >
                    <i 
                      data-feather="edit-3" 
                      :class="[currentRoute === 'writing-tasks' ? 'text-orange-600' : 'text-gray-500']"
                      class="w-4 h-4"
                    ></i>
                  </div>
                  <span>Writing</span>
                  <i data-feather="chevron-right" class="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"></i>
                </a>
              </li>
              <li>
                <a
                  href="/manager/speaking-topics"
                  @click.prevent="navigate('speaking-topics')"
                  data-nav-link="speaking-topics"
                  :class="[
                    currentRoute === 'speaking-topics'
                      ? 'bg-orange-50 text-orange-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
                    'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:translate-x-0.5'
                  ]"
                >
                  <div 
                    :class="[
                      currentRoute === 'speaking-topics' ? 'bg-orange-100' : 'bg-gray-100 group-hover:bg-orange-50',
                      'flex items-center justify-center w-8 h-8 rounded-lg transition-colors'
                    ]"
                  >
                    <i 
                      data-feather="mic" 
                      :class="[currentRoute === 'speaking-topics' ? 'text-orange-600' : 'text-gray-500']"
                      class="w-4 h-4"
                    ></i>
                  </div>
                  <span>Speaking</span>
                  <i data-feather="chevron-right" class="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"></i>
                </a>
              </li>
              <li class="mt-3 pt-3 border-t border-gray-200">
                <a
                  href="/manager/ai-generator"
                  @click.prevent="navigate('ai-generator')"
                  data-nav-link="ai-generator"
                  :class="[
                    currentRoute === 'ai-generator'
                      ? 'bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 ring-2 ring-purple-200'
                      : 'text-gray-700 hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-indigo-50/50 hover:text-purple-600',
                    'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:translate-x-0.5'
                  ]"
                >
                  <div 
                    :class="[
                      currentRoute === 'ai-generator' ? 'bg-gradient-to-br from-purple-100 to-indigo-100' : 'bg-gray-100 group-hover:bg-gradient-to-br group-hover:from-purple-50 group-hover:to-indigo-50',
                      'flex items-center justify-center w-8 h-8 rounded-lg transition-all relative overflow-hidden'
                    ]"
                  >
                    <i 
                      data-feather="cpu" 
                      :class="[currentRoute === 'ai-generator' ? 'text-purple-600' : 'text-gray-500 group-hover:text-purple-500']"
                      class="w-4 h-4 relative z-10"
                    ></i>
                    <div 
                      v-if="currentRoute === 'ai-generator'"
                      class="absolute inset-0 bg-gradient-to-br from-purple-400/10 to-indigo-400/10 animate-pulse"
                    ></div>
                  </div>
                  <span class="flex items-center gap-1.5">
                    AI Generator
                    <span class="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded uppercase tracking-wide">New</span>
                  </span>
                  <i data-feather="chevron-right" class="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"></i>
                </a>
              </li>
            </ul>
          </div>

          <div>
            <button 
              @click="sections.mockTests = !sections.mockTests" 
              class="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-gray-700 transition-colors group"
            >
              <span class="flex items-center gap-2">
                <span class="w-1 h-1 rounded-full bg-gray-400 group-hover:bg-gray-600 transition-colors"></span>
                <i data-feather="package" class="w-3.5 h-3.5"></i> 
                Mock Test Builder
              </span>
              <i data-feather="chevron-down" class="w-3.5 h-3.5 transition-transform duration-300" :class="{'rotate-180': sections.mockTests}"></i>
            </button>
            <ul v-show="sections.mockTests" class="mt-1 space-y-0.5 pl-3 border-l border-gray-200">
              <li>
                <a
                  href="/manager/mock-tests"
                  @click.prevent="navigate('mock-tests')"
                  data-nav-link="mock-tests"
                  :class="[
                    currentRoute === 'mock-tests'
                      ? 'bg-orange-50 text-orange-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
                    'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:translate-x-0.5'
                  ]"
                >
                  <div 
                    :class="[
                      currentRoute === 'mock-tests' ? 'bg-orange-100' : 'bg-gray-100 group-hover:bg-orange-50',
                      'flex items-center justify-center w-8 h-8 rounded-lg transition-colors'
                    ]"
                  >
                    <i 
                      data-feather="package" 
                      :class="[currentRoute === 'mock-tests' ? 'text-orange-600' : 'text-gray-500']"
                      class="w-4 h-4"
                    ></i>
                  </div>
                  <span>Mock Tests</span>
                  <i data-feather="chevron-right" class="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"></i>
                </a>
              </li>
              <li>
                <a
                  href="/manager/exams"
                  @click.prevent="navigate('exams')"
                  data-nav-link="exams"
                  :class="[
                    currentRoute === 'exams'
                      ? 'bg-orange-50 text-orange-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
                    'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:translate-x-0.5'
                  ]"
                >
                  <div 
                    :class="[
                      currentRoute === 'exams' ? 'bg-orange-100' : 'bg-gray-100 group-hover:bg-orange-50',
                      'flex items-center justify-center w-8 h-8 rounded-lg transition-colors'
                    ]"
                  >
                    <i 
                      data-feather="calendar" 
                      :class="[currentRoute === 'exams' ? 'text-orange-600' : 'text-gray-500']"
                      class="w-4 h-4"
                    ></i>
                  </div>
                  <span>Scheduled Exams</span>
                  <i data-feather="chevron-right" class="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"></i>
                </a>
              </li>
            </ul>
          </div>
        </nav>
      </aside>
    </div>
  `,
};
