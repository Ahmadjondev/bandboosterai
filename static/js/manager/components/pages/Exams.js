/**
 * Exams Component - Manage Scheduled Exams
 * Allows managers to create, edit, and manage scheduled exams
 */

window.Exams = {
    name: 'ExamsComponent',

    mixins: [window.FeatherIconsMixin],

    data() {
        return {
            exams: [],
            loading: false,
            error: null,

            // Filters
            searchQuery: '',
            statusFilter: '',

            // Pagination
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,

            // Modal state
            showDetailModal: false,
            showDeleteModal: false,

            // Current exam
            currentExam: null,

            // Statistics
            statistics: null,
        };
    },

    computed: {
        filteredExams() {
            return this.exams;
        },

        statusOptions() {
            return [
                { value: '', label: 'All Status' },
                { value: 'SCHEDULED', label: 'Scheduled' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'CANCELLED', label: 'Cancelled' },
            ];
        },

        formattedStartDate() {
            if (!this.formData.start_date) return '';
            return new Date(this.formData.start_date).toISOString().slice(0, 16);
        },

        formattedExpireDate() {
            if (!this.formData.expire_date) return '';
            return new Date(this.formData.expire_date).toISOString().slice(0, 16);
        },
    },

    mounted() {
        this.loadExams();
        this.loadStatistics();
    },

    methods: {
        async loadExams() {
            this.loading = true;
            this.error = null;

            try {
                const params = {
                    page: this.currentPage,
                    search: this.searchQuery,
                    status: this.statusFilter,
                };

                const response = await ApiService.getExams(params);

                this.exams = response.exams || [];
                this.currentPage = response.pagination?.current_page || 1;
                this.totalPages = response.pagination?.total_pages || 1;
                this.totalItems = response.pagination?.total_items || 0;
            } catch (error) {
                this.error = error.message || 'Failed to load exams';
                toast.error('Failed to load exams: ' + error.message, 'Error');
            } finally {
                this.loading = false;
            }
        },

        async loadStatistics() {
            try {
                const response = await ApiService.getExamStatistics();
                this.statistics = response;
            } catch (error) {
                toast.error('Failed to load statistics', 'Error');
            }
        },

        handleSearch() {
            this.currentPage = 1;
            this.loadExams();
        },

        handleStatusFilter() {
            this.currentPage = 1;
            this.loadExams();
        },

        handlePageChange(page) {
            this.currentPage = page;
            this.loadExams();
        },

        openCreateModal() {
            // Navigate to create page instead of modal
            this.$emit('navigate', 'exam-form', { mode: 'create' });
        },

        openEditModal(exam) {
            // Navigate to edit page instead of modal
            this.$emit('navigate', 'exam-form', { mode: 'edit', examId: exam.id });
        },

        openDetailModal(exam) {
            // Navigate to details page
            this.$emit('navigate', 'exam-details', { examId: exam.id });
        },

        async openDetailModalOld(exam) {
            this.loading = true;
            try {
                const response = await ApiService.getExam(exam.id);
                this.currentExam = response;
                this.showDetailModal = true;
            } catch (error) {
                toast.error('Failed to load exam details', 'Error');
            } finally {
                this.loading = false;
            }
        },

        closeDetailModal() {
            this.showDetailModal = false;
            this.currentExam = null;
        },

        openDeleteModal(exam) {
            this.currentExam = exam;
            this.showDeleteModal = true;
        },

        closeDeleteModal() {
            this.showDeleteModal = false;
            this.currentExam = null;
        },

        async handleDeleteExam() {
            this.loading = true;
            try {
                await ApiService.deleteExam(this.currentExam.id);
                this.closeDeleteModal();
                this.loadExams();
                this.loadStatistics();
                toast.success('Exam deleted successfully!', 'Success');
            } catch (error) {
                toast.error(error.message || 'Failed to delete exam', 'Error');
            } finally {
                this.loading = false;
            }
        },

        async toggleStatus(exam, newStatus) {
            try {
                await ApiService.toggleExamStatus(exam.id, newStatus);
                this.loadExams();
                toast.success('Status updated successfully!', 'Success');
            } catch (error) {
                toast.error('Failed to update status', 'Error');
            }
        },

        async removeStudent(studentId) {
            if (!confirm('Are you sure you want to remove this student?')) return;

            try {
                await ApiService.removeStudentFromExam(this.currentExam.id, studentId);
                this.openDetailModal(this.currentExam);
                toast.success('Student removed successfully!', 'Success');
            } catch (error) {
                toast.error(error.message || 'Failed to remove student', 'Error');
            }
        },

        getStatusBadgeClass(status) {
            const classes = {
                'SCHEDULED': 'bg-orange-100 text-orange-800',
                'ACTIVE': 'bg-green-100 text-green-800',
                'COMPLETED': 'bg-gray-100 text-gray-800',
                'CANCELLED': 'bg-red-100 text-red-800',
            };
            return classes[status] || 'bg-gray-100 text-gray-800';
        },

        formatDate(dateString) {
            if (!dateString) return '-';
            return new Date(dateString).toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },

        formatPrice(price) {
            return new Intl.NumberFormat('uz-UZ', {
                style: 'decimal',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(price) + " so'm";
        },
    },

    template: `
        <div class="space-y-6">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 class="text-3xl font-bold text-gray-900">Scheduled Exams</h1>
                    <p class="mt-1 text-sm text-gray-500">
                        Manage exam sessions that students can attend with PIN codes
                    </p>
                </div>
                <button 
                    @click="openCreateModal"
                    class="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
                >
                    <i data-feather="plus" class="w-5 h-5 mr-2"></i>
                    Create Exam
                </button>
            </div>
            
            <!-- Statistics Cards -->
            <div v-if="statistics" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600">Total Exams</p>
                            <p class="text-2xl font-bold text-gray-900 mt-1">{{ statistics.total_exams }}</p>
                        </div>
                        <i data-feather="file-text" class="w-8 h-8 text-orange-500"></i>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600">Active</p>
                            <p class="text-2xl font-bold text-green-600 mt-1">{{ statistics.active_exams }}</p>
                        </div>
                        <i data-feather="check-circle" class="w-8 h-8 text-green-500"></i>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600">Upcoming</p>
                            <p class="text-2xl font-bold text-orange-600 mt-1">{{ statistics.upcoming_exams }}</p>
                        </div>
                        <i data-feather="calendar" class="w-8 h-8 text-orange-500"></i>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600">Completed</p>
                            <p class="text-2xl font-bold text-gray-600 mt-1">{{ statistics.completed_exams }}</p>
                        </div>
                        <i data-feather="check-square" class="w-8 h-8 text-gray-500"></i>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600">Total Enrolled</p>
                            <p class="text-2xl font-bold text-purple-600 mt-1">{{ statistics.total_enrolled }}</p>
                        </div>
                        <i data-feather="users" class="w-8 h-8 text-purple-500"></i>
                    </div>
                </div>
            </div>
            
            <!-- Filters -->
            <div class="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Search</label>
                        <div class="relative">
                            <input 
                                v-model="searchQuery"
                                @input="handleSearch"
                                type="text" 
                                placeholder="Search exams, PIN codes..."
                                class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            >
                            <i data-feather="search" class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2"></i>
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <select 
                            v-model="statusFilter"
                            @change="handleStatusFilter"
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        >
                            <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                                {{ option.label }}
                            </option>
                        </select>
                    </div>
                </div>
            </div>
            
            <!-- Loading State -->
            <loading-spinner v-if="loading && exams.length === 0" />
            
            <!-- Error State -->
            <alert-component v-if="error" type="error" :message="error" />
            
            <!-- Exams List -->
            <div v-if="!loading || exams.length > 0" class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div v-if="exams.length === 0" class="p-12 text-center">
                    <i data-feather="inbox" class="w-16 h-16 text-gray-400 mx-auto mb-4"></i>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">No exams found</h3>
                    <p class="text-gray-500 mb-6">Get started by creating your first scheduled exam.</p>
                    <button 
                        @click="openCreateModal"
                        class="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                    >
                        <i data-feather="plus" class="w-5 h-5 mr-2"></i>
                        Create Exam
                    </button>
                </div>
                
                <div v-else class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Exam Details
                                </th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Mock Test
                                </th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Schedule
                                </th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    PIN Code
                                </th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Enrolled
                                </th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Price
                                </th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            <tr v-for="exam in exams" :key="exam.id" class="hover:bg-gray-50 transition-colors">
                                <td class="px-6 py-4">
                                    <div class="flex items-center">
                                        <div>
                                            <div class="text-sm font-medium text-gray-900">{{ exam.name }}</div>
                                            <div class="text-xs text-gray-500">Created {{ formatDate(exam.created_at) }}</div>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-6 py-4">
                                    <div class="text-sm text-gray-900">{{ exam.mock_test_title }}</div>
                                    <div class="text-xs text-gray-500">{{ exam.mock_test_type }}</div>
                                </td>
                                <td class="px-6 py-4">
                                    <div class="text-sm text-gray-900">{{ formatDate(exam.start_date) }}</div>
                                    <div class="text-xs text-gray-500">to {{ formatDate(exam.expire_date) }}</div>
                                </td>
                                <td class="px-6 py-4">
                                    <code class="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm font-mono">
                                        {{ exam.pin_code }}
                                    </code>
                                </td>
                                <td class="px-6 py-4">
                                    <div class="text-sm font-medium text-gray-900">
                                        {{ exam.enrolled_count }} / {{ exam.max_students }}
                                    </div>
                                    <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                                        <div 
                                            class="bg-orange-600 h-2 rounded-full" 
                                            :style="{width: (exam.enrolled_count / exam.max_students * 100) + '%'}"
                                        ></div>
                                    </div>
                                </td>
                                <td class="px-6 py-4 text-sm font-medium text-gray-900">
                                    {{ formatPrice(exam.price) }}
                                </td>
                                <td class="px-6 py-4">
                                    <span 
                                        :class="getStatusBadgeClass(exam.status)"
                                        class="px-2 py-1 text-xs font-medium rounded-full"
                                    >
                                        {{ exam.status }}
                                    </span>
                                </td>
                                <td class="px-6 py-4 text-right text-sm font-medium">
                                    <div class="flex items-center justify-end gap-2">
                                        <button 
                                            @click="openDetailModal(exam)"
                                            class="text-orange-600 hover:text-orange-900"
                                            title="View Details"
                                        >
                                            <i data-feather="eye" class="w-4 h-4"></i>
                                        </button>
                                        <button 
                                            @click="openEditModal(exam)"
                                            class="text-yellow-600 hover:text-yellow-900"
                                            title="Edit"
                                        >
                                            <i data-feather="edit" class="w-4 h-4"></i>
                                        </button>
                                        <button 
                                            @click="openDeleteModal(exam)"
                                            class="text-red-600 hover:text-red-900"
                                            title="Delete"
                                            :disabled="exam.enrolled_count > 0"
                                        >
                                            <i data-feather="trash-2" class="w-4 h-4"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <!-- Pagination -->
                <div v-if="totalPages > 1" class="border-t border-gray-200 px-6 py-4">
                    <pagination
                        :current-page="currentPage"
                        :total-pages="totalPages"
                        @page-change="handlePageChange"
                    ></pagination>
                </div>
            </div>
            
            <!-- Detail Modal -->
            <modal-component
                v-if="showDetailModal && currentExam"
                title="Exam Details"
                size="large"
                @close="closeDetailModal"
            >
                <div class="space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-500">Exam Name</label>
                            <p class="text-base font-medium text-gray-900 mt-1">{{ currentExam.name }}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-500">Status</label>
                            <span 
                                :class="getStatusBadgeClass(currentExam.status)"
                                class="inline-block px-3 py-1 text-sm font-medium rounded-full mt-1"
                            >
                                {{ currentExam.status }}
                            </span>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-500">Mock Test</label>
                            <p class="text-base text-gray-900 mt-1">{{ currentExam.mock_test_title }}</p>
                            <p class="text-sm text-gray-500">{{ currentExam.mock_test_type }}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-500">Price</label>
                            <p class="text-base font-medium text-gray-900 mt-1">{{ formatPrice(currentExam.price) }}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-500">Start Date</label>
                            <p class="text-base text-gray-900 mt-1">{{ formatDate(currentExam.start_date) }}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-500">Expire Date</label>
                            <p class="text-base text-gray-900 mt-1">{{ formatDate(currentExam.expire_date) }}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-500">PIN Code</label>
                            <code class="inline-block px-3 py-1 bg-gray-100 text-gray-800 rounded text-base font-mono mt-1">
                                {{ currentExam.pin_code }}
                            </code>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-500">Enrollment</label>
                            <p class="text-base font-medium text-gray-900 mt-1">
                                {{ currentExam.enrolled_count }} / {{ currentExam.max_students }}
                            </p>
                            <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
                                <div 
                                    class="bg-orange-600 h-2 rounded-full transition-all" 
                                    :style="{width: (currentExam.enrolled_count / currentExam.max_students * 100) + '%'}"
                                ></div>
                            </div>
                        </div>
                    </div>
                    
                    <div v-if="currentExam.description">
                        <label class="block text-sm font-medium text-gray-500 mb-2">Description</label>
                        <p class="text-base text-gray-900 whitespace-pre-wrap">{{ currentExam.description }}</p>
                    </div>
                    
                    <div v-if="currentExam.enrolled_students && currentExam.enrolled_students.length > 0">
                        <label class="block text-sm font-medium text-gray-900 mb-3">Enrolled Students</label>
                        <div class="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                            <div v-for="student in currentExam.enrolled_students" :key="student.id" 
                                 class="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                                <div>
                                    <p class="font-medium text-gray-900">{{ student.first_name }} {{ student.last_name }}</p>
                                    <p class="text-sm text-gray-500">{{ student.email }}</p>
                                </div>
                                <button
                                    @click="removeStudent(student.id)"
                                    class="text-red-600 hover:text-red-900 text-sm"
                                    :disabled="currentExam.start_date <= new Date().toISOString()"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <template #footer>
                    <div class="flex justify-end">
                        <button 
                            @click="closeDetailModal"
                            class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </template>
            </modal-component>
            
            <!-- Delete Modal -->
            <modal-component
                v-if="showDeleteModal && currentExam"
                title="Delete Exam"
                @close="closeDeleteModal"
            >
                <div class="space-y-4">
                    <div class="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
                        <i data-feather="alert-triangle" class="w-6 h-6 text-red-600"></i>
                    </div>
                    <div class="text-center">
                        <h3 class="text-lg font-medium text-gray-900 mb-2">
                            Are you sure you want to delete this exam?
                        </h3>
                        <p class="text-sm text-gray-500 mb-4">
                            This action cannot be undone. The exam "{{ currentExam.name }}" will be permanently deleted.
                        </p>
                        <div v-if="currentExam.enrolled_count > 0" class="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p class="text-sm text-red-800">
                                <i data-feather="alert-circle" class="w-4 h-4 inline mr-1"></i>
                                This exam has {{ currentExam.enrolled_count }} enrolled student(s) and cannot be deleted.
                            </p>
                        </div>
                    </div>
                </div>
                
                <template #footer>
                    <div class="flex justify-end gap-3">
                        <button 
                            @click="closeDeleteModal"
                            class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            @click="handleDeleteExam"
                            :disabled="loading || currentExam.enrolled_count > 0"
                            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                            {{ loading ? 'Deleting...' : 'Delete' }}
                        </button>
                    </div>
                </template>
            </modal-component>
        </div>
    `,
};
