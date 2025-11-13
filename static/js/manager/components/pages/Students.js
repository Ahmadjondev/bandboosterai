/**
 * Students Component - Full CRUD with Bulk Operations
 */

window.Students = {
  name: 'Students',
  data() {
    return {
      loading: true,
      students: [],
      pagination: null,
      searchQuery: '',
      filterActive: 'all',
      sortBy: 'date_joined',
      error: null,

      // Modal states
      showAddModal: false,
      showEditModal: false,
      showBulkAddModal: false,
      showExcelUploadModal: false,

      // Form data
      studentForm: {
        first_name: '',
        last_name: '',
        phone: '',
        password: '',
        is_active: true,
      },

      // Bulk add
      bulkStudents: '',
      bulkAddErrors: [],

      // Excel upload
      excelFile: null,
      excelUploadResults: null,
      uploadingExcel: false,

      // Edit mode
      editingStudent: null,
      formErrors: {},
      submitting: false,
    };
  },
  template: `
    <div class="space-y-6">
      <!-- Enhanced Header Section -->
      <div class="bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl shadow-lg p-6 text-white">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div class="flex-1">
            <h1 class="text-3xl font-bold flex items-center gap-3">
              <div class="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                <i data-feather="users" class="h-7 w-7"></i>
              </div>
              Students Management
            </h1>
            <p class="mt-2 text-orange-100">Manage student accounts and track their progress</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              @click="openExcelUploadModal"
              class="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-all duration-200 text-white shadow-lg"
            >
              <i data-feather="file-text" class="h-4 w-4"></i>
              Excel Upload
            </button>
            <button
              @click="openBulkAddModal"
              class="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-lg font-medium transition-all duration-200 border border-white/20"
            >
              <i data-feather="upload" class="h-4 w-4"></i>
              Bulk Import
            </button>
            <button
              @click="openAddModal"
              class="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-orange-600 hover:bg-orange-50 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <i data-feather="user-plus" class="h-4 w-4"></i>
              Add Student
            </button>
          </div>
        </div>
      </div>

      <!-- Enhanced Filters and Search -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Enhanced Search -->
          <div class="lg:col-span-2">
            <label class="block text-sm font-semibold text-gray-700 mb-2">Search Students</label>
            <div class="relative group">
              <div class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                <i data-feather="search" class="h-5 w-5 text-gray-400 group-focus-within:text-orange-500 transition-colors"></i>
              </div>
              <input
                v-model="searchQuery"
                @input="debouncedSearch"
                type="text"
                placeholder="Search by name, email, or phone..."
                class="block w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
              />
              <div v-if="searchQuery" class="absolute inset-y-0 right-0 flex items-center pr-3">
                <button @click="searchQuery = ''; loadStudents(1)" class="text-gray-400 hover:text-gray-600 transition-colors">
                  <i data-feather="x" class="h-4 w-4"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- Enhanced Status Filter -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Status</label>
            <div class="relative">
              <select
                v-model="filterActive"
                @change="loadStudents(1)"
                class="block w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 bg-white"
              >
                <option value="all">All Students</option>
                <option value="active">✓ Active Only</option>
                <option value="inactive">✕ Inactive Only</option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <i data-feather="chevron-down" class="h-4 w-4 text-gray-400"></i>
              </div>
            </div>
          </div>

          <!-- Enhanced Sort By -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Sort By</label>
            <div class="relative">
              <select
                v-model="sortBy"
                @change="loadStudents(1)"
                class="block w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 bg-white"
              >
                <option value="date_joined">📅 Date Joined</option>
                <option value="first_name">👤 First Name</option>
                <option value="last_name">👤 Last Name</option>
                <option value="email">📧 Email</option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <i data-feather="chevron-down" class="h-4 w-4 text-gray-400"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <loading-spinner v-if="loading" size="large" class="mt-8" />

      <!-- Error State -->
      <div v-else-if="error" class="mt-8 rounded-md bg-red-50 p-4">
        <div class="flex">
          <i data-feather="alert-circle" class="h-5 w-5 text-red-400"></i>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Error loading students</h3>
            <p class="mt-2 text-sm text-red-700">{{ error }}</p>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <empty-state
        v-else-if="students.length === 0"
        icon="users"
        title="No students found"
        :description="searchQuery ? 'No students match your search criteria' : 'Get started by adding your first student'"
      >
        <button
          v-if="!searchQuery"
          @click="openAddModal"
          class="mt-4 inline-flex items-center rounded-md bg-orange-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-500"
        >
          <i data-feather="plus" class="w-4 h-4 mr-2"></i>
          Add Student
        </button>
      </empty-state>

      <!-- Enhanced Students Table -->
      <div v-else class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Student
                </th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Contact
                </th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Joined
                </th>
                <th class="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-100">
              <tr 
                v-for="student in students" 
                :key="student.id" 
                class="hover:bg-orange-50/50 transition-colors duration-150 group"
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center gap-3">
                    <div class="flex-shrink-0">
                      <div class="h-11 w-11 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-sm ring-2 ring-white">
                        <span class="text-sm font-bold text-white">
                          {{ getInitials(student.first_name, student.last_name) }}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div class="text-sm font-semibold text-gray-900">
                        {{ student.first_name }} {{ student.last_name }}
                      </div>
                      <div class="text-xs text-gray-500">ID: #{{ student.id }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex flex-col gap-1">
                    <div class="flex items-center gap-2 text-sm text-gray-900">
                      <i data-feather="user" class="w-3.5 h-3.5 text-gray-400"></i>
                      <span class="font-mono">{{ student.username }}</span>
                    </div>
                    <div class="flex items-center gap-2 text-xs text-gray-500">
                      <i data-feather="phone" class="w-3.5 h-3.5 text-gray-400"></i>
                      {{ student.phone || 'No phone' }}
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span 
                    :class="student.is_active 
                      ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-600/20' 
                      : 'bg-gray-100 text-gray-700 ring-1 ring-gray-600/20'" 
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                  >
                    <span :class="student.is_active ? 'bg-emerald-500' : 'bg-gray-400'" class="w-1.5 h-1.5 rounded-full"></span>
                    {{ student.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  <div class="flex items-center gap-2">
                    <i data-feather="calendar" class="w-3.5 h-3.5 text-gray-400"></i>
                    {{ formatDate(student.date_joined) }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right">
                  <div class="flex items-center justify-end gap-1">
                    <button
                      @click="viewStudent(student)"
                      class="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-all duration-200 group/btn"
                      title="View Details"
                    >
                      <i data-feather="eye" class="w-4 h-4 group-hover/btn:scale-110 transition-transform"></i>
                    </button>
                    <button
                      @click="openEditModal(student)"
                      class="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-all duration-200 group/btn"
                      title="Edit"
                    >
                      <i data-feather="edit-2" class="w-4 h-4 group-hover/btn:scale-110 transition-transform"></i>
                    </button>
                    <button
                      @click="toggleActive(student)"
                      :class="student.is_active 
                        ? 'text-red-600 hover:bg-red-50' 
                        : 'text-green-600 hover:bg-green-50'"
                      class="p-2 rounded-lg transition-all duration-200 group/btn"
                      :title="student.is_active ? 'Deactivate' : 'Activate'"
                    >
                      <i :data-feather="student.is_active ? 'user-x' : 'user-check'" class="w-4 h-4 group-hover/btn:scale-110 transition-transform"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Pagination -->
      <pagination
        v-if="pagination && pagination.total_pages > 1"
        :current-page="pagination.current_page"
        :total-pages="pagination.total_pages"
        @page-change="loadStudents"
      />

      <!-- Add/Edit Student Modal -->
      <modal-component
        :show="showAddModal || showEditModal"
        :title="editingStudent ? 'Edit Student' : 'Add New Student'"
        @close="closeStudentModal"
        size="large"
      >
        <form @submit.prevent="saveStudent" class="p-6 space-y-6">
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <!-- First Name -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                First Name <span class="text-red-500">*</span>
              </label>
              <input
                v-model="studentForm.first_name"
                type="text"
                required
                class="block w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 shadow-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200 sm:text-sm"
                :class="{ 'border-red-300 focus:border-red-500 focus:ring-red-500/20': formErrors.first_name }"
                placeholder="Enter first name"
              />
              <p v-if="formErrors.first_name" class="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                <i data-feather="alert-circle" class="w-3.5 h-3.5"></i>
                {{ formErrors.first_name }}
              </p>
            </div>

            <!-- Last Name -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                Last Name <span class="text-red-500">*</span>
              </label>
              <input
                v-model="studentForm.last_name"
                type="text"
                required
                class="block w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 shadow-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200 sm:text-sm"
                :class="{ 'border-red-300 focus:border-red-500 focus:ring-red-500/20': formErrors.last_name }"
                placeholder="Enter last name"
              />
              <p v-if="formErrors.last_name" class="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                <i data-feather="alert-circle" class="w-3.5 h-3.5"></i>
                {{ formErrors.last_name }}
              </p>
            </div>

            <!-- Phone -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                Phone <span class="text-red-500">*</span>
              </label>
              <input
                v-model="studentForm.phone"
                type="tel"
                required
                class="block w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 shadow-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200 sm:text-sm"
                :class="{ 'border-red-300 focus:border-red-500 focus:ring-red-500/20': formErrors.phone }"
                placeholder="+998 91 123 45 67"
              />
              <p v-if="formErrors.phone" class="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                <i data-feather="alert-circle" class="w-3.5 h-3.5"></i>
                {{ formErrors.phone }}
              </p>
              <p v-else class="mt-1.5 text-sm text-gray-500 flex items-center gap-1">
                <i data-feather="info" class="w-3.5 h-3.5"></i>
                Username will be auto-generated from name
              </p>
            </div>

            <!-- Password (only for new students) -->
            <div v-if="!editingStudent" class="sm:col-span-2">
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                Password <span class="text-red-500">*</span>
              </label>
              <input
                v-model="studentForm.password"
                type="password"
                required
                minlength="8"
                class="block w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 shadow-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200 sm:text-sm"
                :class="{ 'border-red-300 focus:border-red-500 focus:ring-red-500/20': formErrors.password }"
                placeholder="Minimum 8 characters"
              />
              <p v-if="formErrors.password" class="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                <i data-feather="alert-circle" class="w-3.5 h-3.5"></i>
                {{ formErrors.password }}
              </p>
              <p v-else class="mt-1.5 text-sm text-gray-500 flex items-center gap-1">
                <i data-feather="info" class="w-3.5 h-3.5"></i>
                Minimum 8 characters required
              </p>
            </div>

            <!-- Active Status -->
            <div class="sm:col-span-2">
              <div class="flex items-center p-4 rounded-lg bg-orange-50 border-2 border-orange-100">
                <input
                  v-model="studentForm.is_active"
                  type="checkbox"
                  class="h-5 w-5 rounded border-2 border-orange-300 text-orange-600 focus:ring-2 focus:ring-orange-500/20 transition-all"
                />
                <label class="ml-3 flex flex-col">
                  <span class="text-sm font-semibold text-gray-900">Active Account</span>
                  <span class="text-xs text-gray-600">Student can log in and access the platform</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="flex justify-end gap-3 pt-6 border-t-2 border-gray-100">
            <button
              type="button"
              @click="closeStudentModal"
              class="px-5 py-2.5 rounded-lg bg-white text-gray-700 font-semibold shadow-sm ring-2 ring-inset ring-gray-200 hover:bg-gray-50 hover:ring-gray-300 transition-all duration-200"
              :disabled="submitting"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-orange-600 to-orange-700 text-white font-semibold shadow-lg hover:shadow-xl hover:from-orange-700 hover:to-orange-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="submitting"
            >
              <i v-if="submitting" data-feather="loader" class="w-4 h-4 animate-spin"></i>
              <i v-else :data-feather="editingStudent ? 'check' : 'user-plus'" class="w-4 h-4"></i>
              <span>{{ submitting ? 'Saving...' : (editingStudent ? 'Update Student' : 'Add Student') }}</span>
            </button>
          </div>
        </form>
      </modal-component>

      <!-- Bulk Add Modal -->
      <modal-component
        :show="showBulkAddModal"
        title="Bulk Add Students"
        @close="closeBulkAddModal"
        size="large"
      >
        <div class="p-6 space-y-6">
          <div class="rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 p-5 border-2 border-orange-200">
            <div class="flex gap-4">
              <div class="flex-shrink-0">
                <div class="p-2 bg-orange-500 rounded-lg">
                  <i data-feather="info" class="h-5 w-5 text-white"></i>
                </div>
              </div>
              <div class="flex-1">
                <h3 class="text-base font-bold text-orange-900 mb-2">Format Instructions</h3>
                <div class="space-y-3 text-sm text-orange-800">
                  <p class="font-medium">Enter one student per line in the following format:</p>
                  <code class="block bg-white p-3 rounded-lg text-xs font-mono border-2 border-orange-200 shadow-sm">
                    first_name, last_name, phone, password
                  </code>
                  <p class="font-medium">Example:</p>
                  <code class="block bg-white p-3 rounded-lg text-xs font-mono border-2 border-orange-200 shadow-sm leading-relaxed">
                    John, Doe, +998911234567, password123<br>
                    Jane, Smith, +998907654321, securepass456
                  </code>
                  <p class="mt-2 text-xs text-gray-600">
                    <i data-feather="info" class="w-3 h-3 inline"></i>
                    Username will be auto-generated as "firstname.lastname"
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label class="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <i data-feather="file-text" class="w-4 h-4 text-orange-600"></i>
              Student Data
            </label>
            <textarea
              v-model="bulkStudents"
              rows="10"
              placeholder="Enter student data here, one per line..."
              class="block w-full px-4 py-3 rounded-lg border-2 border-gray-200 shadow-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200 sm:text-sm font-mono resize-y"
            ></textarea>
            <p class="mt-2 text-xs text-gray-500 flex items-center gap-1">
              <i data-feather="layers" class="w-3.5 h-3.5"></i>
              You can paste multiple lines at once
            </p>
          </div>

          <!-- Bulk Add Errors -->
          <div v-if="bulkAddErrors.length > 0" class="rounded-xl bg-red-50 p-5 border-2 border-red-200">
            <div class="flex gap-4">
              <div class="flex-shrink-0">
                <div class="p-2 bg-red-500 rounded-lg">
                  <i data-feather="alert-circle" class="h-5 w-5 text-white"></i>
                </div>
              </div>
              <div class="flex-1">
                <h3 class="text-base font-bold text-red-900 mb-2">Errors Found</h3>
                <div class="mt-2 text-sm text-red-800">
                  <ul class="space-y-1.5">
                    <li v-for="(error, index) in bulkAddErrors" :key="index" class="flex items-start gap-2">
                      <span class="text-red-500 font-bold mt-0.5">•</span>
                      <span>{{ error }}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-6 border-t-2 border-gray-100">
            <button
              type="button"
              @click="closeBulkAddModal"
              class="px-5 py-2.5 rounded-lg bg-white text-gray-700 font-semibold shadow-sm ring-2 ring-inset ring-gray-200 hover:bg-gray-50 hover:ring-gray-300 transition-all duration-200"
              :disabled="submitting"
            >
              Cancel
            </button>
            <button
              @click="processBulkAdd"
              class="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-orange-600 to-orange-700 text-white font-semibold shadow-lg hover:shadow-xl hover:from-orange-700 hover:to-orange-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="submitting || !bulkStudents.trim()"
            >
              <i v-if="submitting" data-feather="loader" class="w-4 h-4 animate-spin"></i>
              <i v-else data-feather="upload-cloud" class="w-4 h-4"></i>
              <span>{{ submitting ? 'Processing...' : 'Add Students' }}</span>
            </button>
          </div>
        </div>
      </modal-component>

      <!-- Excel Upload Modal -->
      <modal-component
        :show="showExcelUploadModal"
        title="Upload Students from Excel"
        @close="closeExcelUploadModal"
        size="large"
      >
        <div class="p-6 space-y-6">
          <!-- Download Template Section -->
          <div class="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-5 border-2 border-blue-200">
            <div class="flex gap-4">
              <div class="flex-shrink-0">
                <div class="p-2 bg-blue-500 rounded-lg">
                  <i data-feather="download" class="h-5 w-5 text-white"></i>
                </div>
              </div>
              <div class="flex-1">
                <h3 class="text-base font-bold text-blue-900 mb-2">Download Template</h3>
                <p class="text-sm text-blue-800 mb-3">
                  First, download the Excel template, fill it with student information, then upload it here.
                </p>
                <button
                  @click="downloadTemplate"
                  class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <i data-feather="download-cloud" class="w-4 h-4"></i>
                  Download Template
                </button>
              </div>
            </div>
          </div>

          <!-- File Upload Section -->
          <div>
            <label class="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <i data-feather="file" class="w-4 h-4 text-green-600"></i>
              Select Excel File
            </label>
            <div class="mt-2">
              <label class="flex flex-col items-center px-4 py-6 bg-white rounded-lg border-2 border-dashed border-gray-300 cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all duration-200">
                <i data-feather="upload-cloud" class="w-10 h-10 text-gray-400 mb-2"></i>
                <span class="text-sm text-gray-600">
                  <span class="font-semibold text-green-600">Click to upload</span> or drag and drop
                </span>
                <span class="text-xs text-gray-500 mt-1">Excel files only (.xlsx, .xls)</span>
                <input
                  type="file"
                  @change="handleFileSelect"
                  accept=".xlsx,.xls"
                  class="hidden"
                />
              </label>
            </div>
            <div v-if="excelFile" class="mt-3 flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
              <i data-feather="file-text" class="w-5 h-5 text-green-600"></i>
              <span class="text-sm font-medium text-green-800">{{ excelFile.name }}</span>
              <button @click="excelFile = null" class="ml-auto text-green-600 hover:text-green-800">
                <i data-feather="x" class="w-4 h-4"></i>
              </button>
            </div>
          </div>

          <!-- Upload Results -->
          <div v-if="excelUploadResults" class="rounded-xl p-5 border-2" :class="{
            'bg-green-50 border-green-200': excelUploadResults.created > 0 && excelUploadResults.failed === 0,
            'bg-yellow-50 border-yellow-200': excelUploadResults.created > 0 && excelUploadResults.failed > 0,
            'bg-red-50 border-red-200': excelUploadResults.created === 0 && excelUploadResults.failed > 0
          }">
            <div class="flex gap-4">
              <div class="flex-shrink-0">
                <div class="p-2 rounded-lg" :class="{
                  'bg-green-500': excelUploadResults.created > 0 && excelUploadResults.failed === 0,
                  'bg-yellow-500': excelUploadResults.created > 0 && excelUploadResults.failed > 0,
                  'bg-red-500': excelUploadResults.created === 0 && excelUploadResults.failed > 0
                }">
                  <i :data-feather="excelUploadResults.created > 0 ? 'check-circle' : 'alert-circle'" class="h-5 w-5 text-white"></i>
                </div>
              </div>
              <div class="flex-1">
                <h3 class="text-base font-bold mb-2" :class="{
                  'text-green-900': excelUploadResults.created > 0 && excelUploadResults.failed === 0,
                  'text-yellow-900': excelUploadResults.created > 0 && excelUploadResults.failed > 0,
                  'text-red-900': excelUploadResults.created === 0 && excelUploadResults.failed > 0
                }">
                  Upload Results
                </h3>
                <div class="text-sm mb-2" :class="{
                  'text-green-800': excelUploadResults.created > 0 && excelUploadResults.failed === 0,
                  'text-yellow-800': excelUploadResults.created > 0 && excelUploadResults.failed > 0,
                  'text-red-800': excelUploadResults.created === 0 && excelUploadResults.failed > 0
                }">
                  <p class="font-semibold">✓ Created: {{ excelUploadResults.created }} students</p>
                  <p v-if="excelUploadResults.failed > 0" class="font-semibold">✗ Failed: {{ excelUploadResults.failed }} students</p>
                </div>
                
                <!-- Errors List -->
                <div v-if="excelUploadResults.errors && excelUploadResults.errors.length > 0" class="mt-3">
                  <p class="font-semibold text-sm mb-2">Errors:</p>
                  <ul class="space-y-1 text-sm">
                    <li v-for="(error, index) in excelUploadResults.errors" :key="index" class="flex items-start gap-2">
                      <span class="font-bold mt-0.5">•</span>
                      <span>{{ error }}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-6 border-t-2 border-gray-100">
            <button
              type="button"
              @click="closeExcelUploadModal"
              class="px-5 py-2.5 rounded-lg bg-white text-gray-700 font-semibold shadow-sm ring-2 ring-inset ring-gray-200 hover:bg-gray-50 hover:ring-gray-300 transition-all duration-200"
              :disabled="uploadingExcel"
            >
              {{ excelUploadResults ? 'Close' : 'Cancel' }}
            </button>
            <button
              v-if="!excelUploadResults"
              @click="uploadExcelFile"
              class="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold shadow-lg hover:shadow-xl hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="uploadingExcel || !excelFile"
            >
              <i v-if="uploadingExcel" data-feather="loader" class="w-4 h-4 animate-spin"></i>
              <i v-else data-feather="upload" class="w-4 h-4"></i>
              <span>{{ uploadingExcel ? 'Uploading...' : 'Upload File' }}</span>
            </button>
          </div>
        </div>
      </modal-component>
    </div>
  `,
  methods: {
    async loadStudents(page = 1) {
      try {
        this.loading = true;
        this.error = null;

        const params = { page };

        if (this.searchQuery) {
          params.search = this.searchQuery;
        }

        if (this.filterActive !== 'all') {
          params.active = this.filterActive === 'active' ? 'true' : 'false';
        }

        if (this.sortBy) {
          params.sort = this.sortBy;
        }

        const data = await API.getStudents(params);
        this.students = data.students;
        this.pagination = data.pagination;

        // Reinitialize feather icons
        this.$nextTick(() => {
          if (window.feather) feather.replace();
        });
      } catch (error) {
        toast.error('Error loading students:', 'Error');
        this.error = error.message || 'Failed to load students';
      } finally {
        this.loading = false;
      }
    },

    debouncedSearch: Helpers.debounce(function () {
      this.loadStudents(1);
    }, 500),

    // Modal management
    openAddModal() {
      this.editingStudent = null;
      this.studentForm = {
        first_name: '',
        last_name: '',
        phone: '',
        password: '',
        is_active: true,
      };
      this.formErrors = {};
      this.showAddModal = true;
      this.$nextTick(() => {
        if (window.feather) feather.replace();
      });
    },

    openEditModal(student) {
      this.editingStudent = student;
      this.studentForm = {
        first_name: student.first_name,
        last_name: student.last_name,
        phone: student.phone || '',
        is_active: student.is_active,
      };
      this.formErrors = {};
      this.showEditModal = true;
      this.$nextTick(() => {
        if (window.feather) feather.replace();
      });
    },

    closeStudentModal() {
      this.showAddModal = false;
      this.showEditModal = false;
      this.editingStudent = null;
      this.studentForm = {
        first_name: '',
        last_name: '',
        phone: '',
        password: '',
        is_active: true,
      };
      this.formErrors = {};
    },

    openBulkAddModal() {
      this.bulkStudents = '';
      this.bulkAddErrors = [];
      this.showBulkAddModal = true;
      this.$nextTick(() => {
        if (window.feather) feather.replace();
      });
    },

    closeBulkAddModal() {
      this.showBulkAddModal = false;
      this.bulkStudents = '';
      this.bulkAddErrors = [];
    },

    // CRUD operations
    async saveStudent() {
      this.formErrors = {};
      this.submitting = true;

      try {
        if (this.editingStudent) {
          // Update existing student
          await API.updateStudent(this.editingStudent.id, this.studentForm);
          Helpers.showToast('Student updated successfully', 'success');
        } else {
          // Create new student
          await API.createStudent(this.studentForm);
          Helpers.showToast('Student added successfully', 'success');
        }

        this.closeStudentModal();
        this.loadStudents(this.pagination?.current_page || 1);
      } catch (error) {
        toast.error('Error saving student:', 'Error');

        // Handle validation errors
        if (error.message && typeof error.message === 'object') {
          this.formErrors = error.message;
        } else {
          Helpers.showToast(error.message || 'Failed to save student', 'error');
        }
      } finally {
        this.submitting = false;
      }
    },

    async processBulkAdd() {
      this.bulkAddErrors = [];
      this.submitting = true;

      try {
        // Parse CSV data
        const lines = this.bulkStudents.trim().split('\n');
        const students = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const parts = line.split(',').map(p => p.trim());

          if (parts.length < 4) {
            this.bulkAddErrors.push(`Line ${i + 1}: Invalid format (requires first_name, last_name, phone, password)`);
            continue;
          }

          students.push({
            first_name: parts[0],
            last_name: parts[1],
            phone: parts[2],
            password: parts[3],
            is_active: true,
          });
        }

        if (this.bulkAddErrors.length > 0) {
          this.submitting = false;
          return;
        }

        if (students.length === 0) {
          Helpers.showToast('No valid student data found', 'warning');
          this.submitting = false;
          return;
        }

        // Send to API
        const result = await window.API.bulkCreateStudents({ students });

        Helpers.showToast(
          `Successfully added ${result.created} student(s)${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
          result.failed > 0 ? 'warning' : 'success'
        );

        if (result.errors && result.errors.length > 0) {
          this.bulkAddErrors = result.errors;
        } else {
          this.closeBulkAddModal();
        }

        this.loadStudents(1);
      } catch (error) {
        console.error('Error bulk adding students:', error);
        Helpers.showToast(error.message || 'Failed to add students', 'error');
      } finally {
        this.submitting = false;
      }
    },

    async toggleActive(student) {
      const action = student.is_active ? 'deactivate' : 'activate';

      if (!confirm(`Are you sure you want to ${action} ${student.first_name} ${student.last_name}?`)) {
        return;
      }

      try {
        await API.toggleStudentActive(student.id);
        Helpers.showToast(`Student ${action}d successfully`, 'success');
        this.loadStudents(this.pagination?.current_page || 1);
      } catch (error) {
        Helpers.showToast(error.message || `Failed to ${action} student`, 'error');
      }
    },

    async deleteStudent(student) {
      if (!confirm(`Are you sure you want to delete ${student.first_name} ${student.last_name}? This action cannot be undone.`)) {
        return;
      }

      try {
        await API.deleteStudent(student.id);
        Helpers.showToast('Student deleted successfully', 'success');
        this.loadStudents(this.pagination?.current_page || 1);
      } catch (error) {
        Helpers.showToast(error.message || 'Failed to delete student', 'error');
      }
    },

    viewStudent(student) {
      // Extract the raw ID value from the reactive proxy
      const userId = parseInt(student.id);
      console.log('Navigating to student detail:', userId);
      this.$emit('navigate', 'student-detail', { userId: userId });
    },

    getInitials(firstName, lastName) {
      const first = firstName ? firstName.charAt(0).toUpperCase() : '';
      const last = lastName ? lastName.charAt(0).toUpperCase() : '';
      return first + last || '?';
    },

    formatDate(date) {
      return Helpers.formatDate(date);
    },

    // Excel Upload Methods
    openExcelUploadModal() {
      this.excelFile = null;
      this.excelUploadResults = null;
      this.showExcelUploadModal = true;
      this.$nextTick(() => {
        if (window.feather) window.feather.replace();
      });
    },

    closeExcelUploadModal() {
      this.showExcelUploadModal = false;
      this.excelFile = null;
      this.excelUploadResults = null;
      // Reload students if any were created
      if (this.excelUploadResults && this.excelUploadResults.created > 0) {
        this.loadStudents();
      }
    },

    handleFileSelect(event) {
      const file = event.target.files[0];
      if (file) {
        // Validate file type
        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
          Helpers.showToast('Please select an Excel file (.xlsx or .xls)', 'error');
          return;
        }
        this.excelFile = file;
      }
    },

    async downloadTemplate() {
      try {
        await window.API.downloadExcelTemplate();
        Helpers.showToast('Template downloaded successfully', 'success');
      } catch (error) {
        console.error('Download template error:', error);
        Helpers.showToast('Failed to download template', 'error');
      }
    },

    async uploadExcelFile() {
      if (!this.excelFile) {
        Helpers.showToast('Please select a file first', 'error');
        return;
      }

      try {
        this.uploadingExcel = true;
        this.excelUploadResults = null;

        const formData = new FormData();
        formData.append('file', this.excelFile);

        const response = await window.API.uploadStudentsExcel(formData);

        this.excelUploadResults = response;

        if (response.created > 0) {
          Helpers.showToast(`Successfully created ${response.created} student(s)`, 'success');
          this.loadStudents();
        }

        if (response.failed > 0) {
          Helpers.showToast(`${response.failed} student(s) failed to create`, 'warning');
        }

        // Wait for DOM update, then replace icons safely
        await this.$nextTick();
        setTimeout(() => {
          if (window.feather) {
            try {
              window.feather.replace();
            } catch (e) {
              console.warn('Feather icons update failed:', e);
            }
          }
        }, 100);
      } catch (error) {
        console.error('Excel upload error:', error);

        // Try to extract error message from response
        let errorMessage = 'Failed to upload file';
        if (error.message) {
          errorMessage = error.message;
        }

        Helpers.showToast(errorMessage, 'error');

        // Even on error, we might have partial results in the response
        // Check if the error contains response data
        if (error.response) {
          try {
            const data = await error.response.json();
            if (data.created !== undefined) {
              this.excelUploadResults = data;
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
        }
      } finally {
        this.uploadingExcel = false;
      }
    },
  },

  mounted() {
    this.loadStudents();
  },
};
