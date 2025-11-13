/**
 * Results Component
 * View and analyze student exam results with filtering and detailed views
 */

window.Results = {
  name: 'Results',
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white shadow">
        <div class="px-4 sm:px-6 lg:px-8 py-6">
          <div class="md:flex md:items-center md:justify-between">
            <div class="flex-1 min-w-0">
              <h1 class="text-2xl font-bold text-gray-900">Exam Results</h1>
              <p class="mt-1 text-sm text-gray-500">View and analyze student exam results</p>
            </div>
            <div class="mt-4 flex md:mt-0 md:ml-4 space-x-3">
              <button
                @click="exportResults"
                class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
              >
                <i data-feather="download" class="w-4 h-4 mr-2"></i>
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters Section -->
      <div class="px-4 sm:px-6 lg:px-8 py-6">
        <div class="bg-white rounded-lg shadow p-6">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <!-- Student Filter -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Student</label>
              <select
                v-model="filters.student_id"
                @change="loadResults"
                class="block w-full px-3 py-2 rounded-lg border border-gray-300 shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm transition-colors"
              >
                <option value="">All Students</option>
                <option v-for="student in students" :key="student.id" :value="student.id">
                  {{ student.first_name }} {{ student.last_name }} ({{ student.username }})
                </option>
              </select>
            </div>

            <!-- Exam Filter -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Exam</label>
              <select
                v-model="filters.exam_id"
                @change="loadResults"
                class="block w-full px-3 py-2 rounded-lg border border-gray-300 shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm transition-colors"
              >
                <option value="">All Exams</option>
                <option v-for="exam in exams" :key="exam.id" :value="exam.id">
                  {{ exam.title }}
                </option>
              </select>
            </div>

            <!-- Status Filter -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                v-model="filters.status"
                @change="loadResults"
                class="block w-full px-3 py-2 rounded-lg border border-gray-300 shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm transition-colors"
              >
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="in_progress">In Progress</option>
              </select>
            </div>

            <!-- Search -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div class="relative">
                <input
                  v-model="searchQuery"
                  @input="debouncedSearch"
                  type="text"
                  placeholder="Search student or exam..."
                  class="block w-full px-3 py-2 rounded-lg border border-gray-300 shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm pr-10 transition-colors"
                />
                <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <i data-feather="search" class="w-4 h-4 text-gray-400"></i>
                </div>
              </div>
            </div>
          </div>

          <!-- Clear Filters Button -->
          <div class="mt-4 flex justify-end">
            <button
              @click="clearFilters"
              v-if="hasActiveFilters"
              class="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <i data-feather="x" class="w-4 h-4 mr-1"></i>
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="px-4 sm:px-6 lg:px-8 pb-6">
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <!-- Total Results -->
          <div class="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <i data-feather="file-text" class="w-6 h-6 text-orange-600"></i>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Total Results</dt>
                    <dd class="flex items-baseline">
                      <div class="text-2xl font-semibold text-gray-900">{{ stats.total }}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <!-- Completed -->
          <div class="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <i data-feather="check-circle" class="w-6 h-6 text-green-600"></i>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Completed</dt>
                    <dd class="flex items-baseline">
                      <div class="text-2xl font-semibold text-gray-900">{{ stats.completed }}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <!-- Average Score -->
          <div class="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <i data-feather="trending-up" class="w-6 h-6 text-yellow-600"></i>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Average Score</dt>
                    <dd class="flex items-baseline">
                      <div class="text-2xl font-semibold text-gray-900">{{ stats.averageScore }}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <!-- In Progress -->
          <div class="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <i data-feather="clock" class="w-6 h-6 text-purple-600"></i>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">In Progress</dt>
                    <dd class="flex items-baseline">
                      <div class="text-2xl font-semibold text-gray-900">{{ stats.inProgress }}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Results Table -->
      <div class="px-4 sm:px-6 lg:px-8 pb-8">
        <div class="bg-white shadow rounded-lg overflow-hidden">
          <!-- Loading State -->
          <div v-if="loading" class="flex items-center justify-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
          </div>

          <!-- Empty State -->
          <div v-else-if="results.length === 0" class="text-center py-12">
            <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i data-feather="inbox" class="w-8 h-8 text-gray-400"></i>
            </div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">No results found</h3>
            <p class="text-sm text-gray-500">Try adjusting your filters or search query</p>
          </div>

          <!-- Results Table -->
          <div v-else class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exam
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Overall Score
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scores Breakdown
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="result in results" :key="result.id" class="hover:bg-gray-50 transition-colors">
                  <!-- Student -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="flex-shrink-0 h-10 w-10">
                        <div class="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                          {{ getInitials(result.student_name) }}
                        </div>
                      </div>
                      <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">{{ result.student_name }}</div>
                      </div>
                    </div>
                  </td>

                  <!-- Exam -->
                  <td class="px-6 py-4">
                    <div class="text-sm text-gray-900">{{ result.exam_title }}</div>
                  </td>

                  <!-- Overall Score -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="text-lg font-bold" :class="getScoreColor(result.overall_score)">
                        {{ result.overall_score ? result.overall_score.toFixed(1) : 'N/A' }}
                      </div>
                      <span class="ml-1 text-sm text-gray-500">/9.0</span>
                    </div>
                  </td>

                  <!-- Scores Breakdown -->
                  <td class="px-6 py-4">
                    <div class="flex flex-wrap gap-2">
                      <span v-if="result.listening_score" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        L: {{ result.listening_score.toFixed(1) }}
                      </span>
                      <span v-if="result.reading_score" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        R: {{ result.reading_score.toFixed(1) }}
                      </span>
                      <span v-if="result.writing_score" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        W: {{ result.writing_score.toFixed(1) }}
                      </span>
                      <span v-if="result.speaking_score" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        S: {{ result.speaking_score.toFixed(1) }}
                      </span>
                    </div>
                  </td>

                  <!-- Status -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span v-if="result.completed_at" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <i data-feather="check-circle" class="w-3 h-3 mr-1"></i>
                      Completed
                    </span>
                    <span v-else class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <i data-feather="clock" class="w-3 h-3 mr-1"></i>
                      In Progress
                    </span>
                  </td>

                  <!-- Date -->
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ formatDate(result.completed_at || result.created_at) }}
                  </td>

                  <!-- Actions -->
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      @click="viewDetails(result)"
                      class="text-orange-600 hover:text-orange-900 transition-colors mr-3"
                      title="View Details"
                    >
                      <i data-feather="eye" class="w-4 h-4"></i>
                    </button>
                    <button
                      v-if="result.completed_at"
                      @click="downloadResult(result)"
                      class="text-green-600 hover:text-green-900 transition-colors"
                      title="Download"
                    >
                      <i data-feather="download" class="w-4 h-4"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div v-if="!loading && results.length > 0" class="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div class="flex items-center justify-between">
              <div class="flex-1 flex justify-between sm:hidden">
                <button
                  @click="previousPage"
                  :disabled="pagination.currentPage === 1"
                  :class="[
                    'relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md transition-colors',
                    pagination.currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  ]"
                >
                  Previous
                </button>
                <button
                  @click="nextPage"
                  :disabled="!pagination.hasNext"
                  :class="[
                    'ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md transition-colors',
                    !pagination.hasNext
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  ]"
                >
                  Next
                </button>
              </div>
              <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p class="text-sm text-gray-700">
                    Showing
                    <span class="font-medium">{{ (pagination.currentPage - 1) * pagination.pageSize + 1 }}</span>
                    to
                    <span class="font-medium">{{ Math.min(pagination.currentPage * pagination.pageSize, pagination.total) }}</span>
                    of
                    <span class="font-medium">{{ pagination.total }}</span>
                    results
                  </p>
                </div>
                <div>
                  <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      @click="previousPage"
                      :disabled="pagination.currentPage === 1"
                      :class="[
                        'relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 text-sm font-medium transition-colors',
                        pagination.currentPage === 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-500 hover:bg-gray-50'
                      ]"
                    >
                      <i data-feather="chevron-left" class="w-5 h-5"></i>
                    </button>
                    <button
                      v-for="page in visiblePages"
                      :key="page"
                      @click="goToPage(page)"
                      :class="[
                        'relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors',
                        page === pagination.currentPage
                          ? 'z-10 bg-orange-50 border-orange-500 text-orange-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      ]"
                    >
                      {{ page }}
                    </button>
                    <button
                      @click="nextPage"
                      :disabled="!pagination.hasNext"
                      :class="[
                        'relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 text-sm font-medium transition-colors',
                        !pagination.hasNext
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-500 hover:bg-gray-50'
                      ]"
                    >
                      <i data-feather="chevron-right" class="w-5 h-5"></i>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Details Modal -->
      <div v-if="showDetailsModal" class="fixed z-50 inset-0 overflow-y-auto" @click.self="closeDetailsModal">
        <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <!-- Background overlay -->
          <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="closeDetailsModal"></div>

          <!-- Modal panel -->
          <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
            <!-- Header -->
            <div class="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-medium text-white">Result Details</h3>
                <button @click="closeDetailsModal" class="text-white hover:text-gray-200 transition-colors">
                  <i data-feather="x" class="w-6 h-6"></i>
                </button>
              </div>
            </div>

            <!-- Content -->
            <div class="px-6 py-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div v-if="selectedResult">
                <!-- Student & Exam Info -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 class="text-sm font-medium text-gray-500 mb-2">Student Information</h4>
                    <div class="bg-gray-50 rounded-lg p-4">
                      <p class="text-lg font-semibold text-gray-900">{{ selectedResult.student_name }}</p>
                      <p class="text-sm text-gray-600 mt-1">Student ID: {{ selectedResult.student }}</p>
                    </div>
                  </div>
                  <div>
                    <h4 class="text-sm font-medium text-gray-500 mb-2">Exam Information</h4>
                    <div class="bg-gray-50 rounded-lg p-4">
                      <p class="text-lg font-semibold text-gray-900">{{ selectedResult.exam_title }}</p>
                      <p class="text-sm text-gray-600 mt-1">
                        Completed: {{ selectedResult.completed_at ? formatDate(selectedResult.completed_at) : 'In Progress' }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Overall Score -->
                <div class="mb-6">
                  <h4 class="text-sm font-medium text-gray-500 mb-3">Overall Band Score</h4>
                  <div class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-6 text-center">
                    <div class="text-5xl font-bold" :class="getScoreColor(selectedResult.overall_score)">
                      {{ selectedResult.overall_score ? selectedResult.overall_score.toFixed(1) : 'N/A' }}
                    </div>
                    <div class="text-sm text-gray-600 mt-2">out of 9.0</div>
                  </div>
                </div>

                <!-- Skills Breakdown -->
                <div class="mb-6">
                  <h4 class="text-sm font-medium text-gray-500 mb-3">Skills Breakdown</h4>
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <!-- Listening -->
                    <div v-if="selectedResult.listening_score !== null" class="bg-orange-50 rounded-lg p-4">
                      <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-medium text-orange-900">Listening</span>
                        <i data-feather="headphones" class="w-4 h-4 text-orange-600"></i>
                      </div>
                      <div class="text-2xl font-bold text-orange-900">{{ selectedResult.listening_score.toFixed(1) }}</div>
                      <div v-if="selectedResult.listening_correct" class="text-xs text-orange-700 mt-1">
                        {{ selectedResult.listening_correct }} correct
                      </div>
                    </div>

                    <!-- Reading -->
                    <div v-if="selectedResult.reading_score !== null" class="bg-green-50 rounded-lg p-4">
                      <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-medium text-green-900">Reading</span>
                        <i data-feather="book-open" class="w-4 h-4 text-green-600"></i>
                      </div>
                      <div class="text-2xl font-bold text-green-900">{{ selectedResult.reading_score.toFixed(1) }}</div>
                      <div v-if="selectedResult.reading_correct" class="text-xs text-green-700 mt-1">
                        {{ selectedResult.reading_correct }} correct
                      </div>
                    </div>

                    <!-- Writing -->
                    <div v-if="selectedResult.writing_score !== null" class="bg-yellow-50 rounded-lg p-4">
                      <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-medium text-yellow-900">Writing</span>
                        <i data-feather="edit-3" class="w-4 h-4 text-yellow-600"></i>
                      </div>
                      <div class="text-2xl font-bold text-yellow-900">{{ selectedResult.writing_score.toFixed(1) }}</div>
                      <div v-if="selectedResult.writing_task1_score || selectedResult.writing_task2_score" class="text-xs text-yellow-700 mt-1">
                        <span v-if="selectedResult.writing_task1_score">T1: {{ selectedResult.writing_task1_score.toFixed(1) }}</span>
                        <span v-if="selectedResult.writing_task1_score && selectedResult.writing_task2_score"> · </span>
                        <span v-if="selectedResult.writing_task2_score">T2: {{ selectedResult.writing_task2_score.toFixed(1) }}</span>
                      </div>
                    </div>

                    <!-- Speaking -->
                    <div v-if="selectedResult.speaking_score !== null" class="bg-purple-50 rounded-lg p-4">
                      <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-medium text-purple-900">Speaking</span>
                        <i data-feather="mic" class="w-4 h-4 text-purple-600"></i>
                      </div>
                      <div class="text-2xl font-bold text-purple-900">{{ selectedResult.speaking_score.toFixed(1) }}</div>
                    </div>
                  </div>
                </div>

                <!-- Feedback -->
                <div v-if="selectedResult.feedback || selectedResult.detailed_feedback" class="mb-6">
                  <h4 class="text-sm font-medium text-gray-500 mb-3">Feedback</h4>
                  <div class="bg-gray-50 rounded-lg p-4">
                    <p v-if="selectedResult.feedback" class="text-sm text-gray-700 mb-3">{{ selectedResult.feedback }}</p>
                    <div v-if="selectedResult.detailed_feedback" class="text-sm text-gray-600 whitespace-pre-wrap">
                      {{ selectedResult.detailed_feedback }}
                    </div>
                    <p v-if="!selectedResult.feedback && !selectedResult.detailed_feedback" class="text-sm text-gray-500 italic">
                      No feedback provided yet
                    </p>
                  </div>
                </div>

                <!-- Evaluation Info -->
                <div v-if="selectedResult.evaluated_at" class="border-t border-gray-200 pt-4">
                  <p class="text-xs text-gray-500">
                    Evaluated on {{ formatDate(selectedResult.evaluated_at) }}
                    <span v-if="selectedResult.evaluated_by"> by evaluator ID: {{ selectedResult.evaluated_by }}</span>
                  </p>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
              <button
                @click="closeDetailsModal"
                class="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                v-if="selectedResult.completed_at"
                @click="downloadResult(selectedResult)"
                class="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
              >
                <i data-feather="download" class="w-4 h-4 inline mr-2"></i>
                Download Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,

  data() {
    return {
      loading: true,
      results: [],
      students: [],
      exams: [],
      filters: {
        student_id: '',
        exam_id: '',
        status: '',
      },
      searchQuery: '',
      searchTimeout: null,
      pagination: {
        currentPage: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      },
      stats: {
        total: 0,
        completed: 0,
        inProgress: 0,
        averageScore: '0.0',
      },
      showDetailsModal: false,
      selectedResult: null,
    };
  },

  computed: {
    hasActiveFilters() {
      return this.filters.student_id || this.filters.exam_id || this.filters.status || this.searchQuery;
    },

    visiblePages() {
      const pages = [];
      const total = this.pagination.totalPages;
      const current = this.pagination.currentPage;

      if (total <= 7) {
        for (let i = 1; i <= total; i++) {
          pages.push(i);
        }
      } else {
        if (current <= 4) {
          for (let i = 1; i <= 5; i++) pages.push(i);
          pages.push('...');
          pages.push(total);
        } else if (current >= total - 3) {
          pages.push(1);
          pages.push('...');
          for (let i = total - 4; i <= total; i++) pages.push(i);
        } else {
          pages.push(1);
          pages.push('...');
          for (let i = current - 1; i <= current + 1; i++) pages.push(i);
          pages.push('...');
          pages.push(total);
        }
      }

      return pages;
    },
  },

  async mounted() {
    await Promise.all([
      this.loadStudents(),
      this.loadExams(),
      this.loadResults(),
    ]);
    this.$nextTick(() => {
      if (window.feather) {
        window.feather.replace();
      }
    });
  },

  updated() {
    this.$nextTick(() => {
      if (window.feather) {
        window.feather.replace();
      }
    });
  },

  methods: {
    async loadResults() {
      this.loading = true;
      try {
        const params = new URLSearchParams({
          page: this.pagination.currentPage,
          page_size: this.pagination.pageSize,
        });

        if (this.filters.student_id) params.append('student_id', this.filters.student_id);
        if (this.filters.exam_id) params.append('exam_id', this.filters.exam_id);
        if (this.filters.status) params.append('status', this.filters.status);
        if (this.searchQuery) params.append('search', this.searchQuery);

        const response = await axios.get(`/manager/api/results/students/?${params.toString()}`);

        if (response.data.success) {
          this.results = response.data.results;
          this.pagination = {
            ...this.pagination,
            ...response.data.pagination,
          };
          this.calculateStats();
        }
      } catch (error) {
        toast.error('Error loading results:', 'Error');
        toast.error('Failed to load results', 'error');
      } finally {
        this.loading = false;
      }
    },

    async loadStudents() {
      try {
        const response = await axios.get('/manager/api/users/students/?page_size=1000');
        this.students = response.data.students;
      } catch (error) {
        toast.error('Error loading students:', 'Error');
      }
    },

    async loadExams() {
      try {
        const response = await axios.get('/manager/api/mock-tests/?page_size=1000');
        this.exams = response.data.exams;
      } catch (error) {
        toast.error('Error loading exams:', 'Error');
      }
    },

    calculateStats() {
      const total = this.pagination.total;
      const completed = this.results.filter(r => r.completed_at).length;
      const inProgress = this.results.filter(r => !r.completed_at).length;

      const completedResults = this.results.filter(r => r.overall_score);
      const avgScore = completedResults.length > 0
        ? completedResults.reduce((sum, r) => sum + parseFloat(r.overall_score), 0) / completedResults.length
        : 0;

      this.stats = {
        total,
        completed,
        inProgress,
        averageScore: avgScore.toFixed(1),
      };
    },

    debouncedSearch() {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.pagination.currentPage = 1;
        this.loadResults();
      }, 500);
    },

    clearFilters() {
      this.filters = {
        student_id: '',
        exam_id: '',
        status: '',
      };
      this.searchQuery = '';
      this.pagination.currentPage = 1;
      this.loadResults();
    },

    previousPage() {
      if (this.pagination.currentPage > 1) {
        this.pagination.currentPage--;
        this.loadResults();
      }
    },

    nextPage() {
      if (this.pagination.hasNext) {
        this.pagination.currentPage++;
        this.loadResults();
      }
    },

    goToPage(page) {
      if (page !== '...' && page !== this.pagination.currentPage) {
        this.pagination.currentPage = page;
        this.loadResults();
      }
    },

    viewDetails(result) {
      this.selectedResult = result;
      this.showDetailsModal = true;
    },

    closeDetailsModal() {
      this.showDetailsModal = false;
      this.selectedResult = null;
    },

    downloadResult(result) {
      toast.info('Download functionality will be implemented soon', 'info');
      // TODO: Implement PDF export functionality
    },

    exportResults() {
      toast.info('Export functionality will be implemented soon', 'info');
      // TODO: Implement CSV/Excel export functionality
    },

    getScoreColor(score) {
      if (!score) return 'text-gray-400';
      if (score >= 7.0) return 'text-green-600';
      if (score >= 5.5) return 'text-yellow-600';
      return 'text-red-600';
    },

    getInitials(name) {
      if (!name) return '?';
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    },

    formatDate(dateString) {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    },
  },
};
