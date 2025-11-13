/**
 * ExamDetails Component - View Detailed Exam Information
 * Shows comprehensive exam details, enrolled students, results, and management options
 */

window.ExamDetails = {
    name: 'ExamDetailsComponent',

    mixins: [window.FeatherIconsMixin],

    props: {
        examId: {
            type: [Number, String],
            required: true
        }
    },

    data() {
        return {
            exam: null,
            results: null,
            loading: false,
            loadingResults: false,
            error: null,

            // Modal states
            showDeleteModal: false,
            showRemoveStudentModal: false,
            studentToRemove: null,

            // Actions
            processing: false,

            // Active tab - default to 'results' if exam has results
            activeTab: null, // Will be set in mounted
        };
    },

    computed: {
        statusBadgeClass() {
            if (!this.exam) return '';
            const classes = {
                'SCHEDULED': 'bg-orange-100 text-orange-800',
                'ACTIVE': 'bg-green-100 text-green-800',
                'COMPLETED': 'bg-gray-100 text-gray-800',
                'CANCELLED': 'bg-red-100 text-red-800',
            };
            return classes[this.exam.status] || 'bg-gray-100 text-gray-800';
        },

        enrollmentPercentage() {
            if (!this.exam) return 0;
            return (this.exam.enrolled_count / this.exam.max_students * 100).toFixed(1);
        },

        canEdit() {
            if (!this.exam) return false;
            // Can edit if not started yet, or started but no students enrolled
            return !this.exam.is_expired && (this.exam.enrolled_count === 0 || this.exam.is_upcoming);
        },

        canDelete() {
            if (!this.exam) return false;
            return this.exam.enrolled_count === 0;
        },

        statusOptions() {
            return [
                { value: 'SCHEDULED', label: 'Scheduled', color: 'blue' },
                { value: 'ACTIVE', label: 'Active', color: 'green' },
                { value: 'COMPLETED', label: 'Completed', color: 'gray' },
                { value: 'CANCELLED', label: 'Cancelled', color: 'red' },
            ];
        },
    },

    async mounted() {
        await this.loadExam();

        // Set default active tab based on exam status
        if (this.exam) {
            if (this.exam.is_active || this.exam.is_expired) {
                // If exam has started or completed, show results by default
                this.activeTab = 'results';
                await this.loadResults();
            } else {
                // Otherwise show students tab by default
                this.activeTab = 'students';
            }
        } else {
            this.activeTab = 'students'; // Fallback
        }
    },

    methods: {
        async loadExam() {
            this.loading = true;
            this.error = null;

            try {
                this.exam = await ApiService.getExam(this.examId);
            } catch (error) {
                this.error = error.message || 'Failed to load exam details';
                toast.error('Load exam error:', 'Error');
            } finally {
                this.loading = false;
            }
        },

        async loadResults() {
            if (!this.exam) return;

            this.loadingResults = true;
            try {
                this.results = await ApiService.getExamResults(this.examId);
            } catch (error) {
                toast.error('Load results error:', 'Error');
                // Don't show error to user, results might not be available yet
            } finally {
                this.loadingResults = false;
            }
        },

        setActiveTab(tab) {
            this.activeTab = tab;
            if (tab === 'results' && !this.results) {
                this.loadResults();
            }
        },

        downloadExcel() {
            const url = ApiService.getExamExportUrl(this.examId);
            window.location.href = url;
        },

        handleBack() {
            this.$emit('navigate', 'exams');
        },

        handleEdit() {
            this.$emit('navigate', 'exam-form', { mode: 'edit', examId: this.examId });
        },

        openDeleteModal() {
            this.showDeleteModal = true;
        },

        closeDeleteModal() {
            this.showDeleteModal = false;
        },

        async handleDelete() {
            this.processing = true;
            try {
                await ApiService.deleteExam(this.examId);
                toast.success('Exam deleted successfully!', 'Success');
                this.$emit('navigate', 'exams');
            } catch (error) {
                toast.error(error.message || 'Failed to delete exam', 'Error');
            } finally {
                this.processing = false;
                this.showDeleteModal = false;
            }
        },

        async handleStatusChange(newStatus) {
            if (!confirm(`Are you sure you want to change status to ${newStatus}?`)) return;

            this.processing = true;
            try {
                await ApiService.toggleExamStatus(this.examId, newStatus);
                await this.loadExam();
                toast.success('Status updated successfully!', 'Success');
            } catch (error) {
                toast.error(error.message || 'Failed to update status', 'Error');
            } finally {
                this.processing = false;
            }
        },

        openRemoveStudentModal(student) {
            this.studentToRemove = student;
            this.showRemoveStudentModal = true;
        },

        closeRemoveStudentModal() {
            this.showRemoveStudentModal = false;
            this.studentToRemove = null;
        },

        async handleRemoveStudent() {
            if (!this.studentToRemove) return;

            this.processing = true;
            try {
                await ApiService.removeStudentFromExam(this.examId, this.studentToRemove.id);
                await this.loadExam();
                toast.success('Student removed successfully!', 'Success');
            } catch (error) {
                toast.error(error.message || 'Failed to remove student', 'Error');
            } finally {
                this.processing = false;
                this.closeRemoveStudentModal();
            }
        },

        copyPinCode() {
            if (!this.exam) return;
            navigator.clipboard.writeText(this.exam.pin_code);
            toast.success('PIN code copied to clipboard!', 'Success');
        },

        formatDate(dateString) {
            if (!dateString) return '-';
            return new Date(dateString).toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
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

        formatScore(score) {
            // Format IELTS band scores to always show one decimal place (e.g., 3.0, 7.5)
            if (score === null || score === undefined || score === '-') return '-';
            return Number(score).toFixed(1);
        },

        getStatusColor(status) {
            const option = this.statusOptions.find(opt => opt.value === status);
            return option ? option.color : 'gray';
        },

        viewStudentResult(attemptId) {
            this.$emit('navigate', 'student-result-detail', { 
                attemptId: attemptId,
                examId: this.examId 
            });
        },
    },

    template: `
        <div class="space-y-6">
            <!-- Header -->
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <button
                        @click="handleBack"
                        class="inline-flex items-center justify-center w-10 h-10 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        <i data-feather="arrow-left" class="w-5 h-5"></i>
                    </button>
                    <div>
                        <h1 class="text-3xl font-bold text-gray-900">Exam Details</h1>
                        <p class="mt-1 text-sm text-gray-500">
                            View and manage scheduled exam information
                        </p>
                    </div>
                </div>
                
                <div v-if="exam && !loading" class="flex items-center gap-3">
                    <button
                        v-if="exam.is_active || exam.is_expired"
                        @click="downloadExcel"
                        class="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        :disabled="!results || loadingResults"
                    >
                        <i data-feather="download" class="w-4 h-4 mr-2"></i>
                        {{ loadingResults ? 'Loading...' : 'Export Results' }}
                    </button>
                    <button
                        v-if="canEdit"
                        @click="handleEdit"
                        class="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                    >
                        <i data-feather="edit" class="w-4 h-4 mr-2"></i>
                        Edit Exam
                    </button>
                    <button
                        v-if="canDelete"
                        @click="openDeleteModal"
                        class="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        <i data-feather="trash-2" class="w-4 h-4 mr-2"></i>
                        Delete
                    </button>
                </div>
            </div>
            
            <!-- Loading State -->
            <loading-spinner v-if="loading" />
            
            <!-- Error State -->
            <alert-component v-if="error" type="error" :message="error" @close="error = null" />
            
            <!-- Exam Details -->
            <div v-if="exam && !loading" class="space-y-6">
                <!-- Main Information Card -->
                <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div class="bg-gradient-to-r from-orange-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                        <div class="flex items-start justify-between">
                            <div class="flex-1">
                                <h2 class="text-2xl font-bold text-gray-900">{{ exam.name }}</h2>
                                <p v-if="exam.description" class="mt-2 text-gray-600">{{ exam.description }}</p>
                            </div>
                            <span 
                                :class="statusBadgeClass"
                                class="px-4 py-2 text-sm font-semibold rounded-full"
                            >
                                {{ exam.status }}
                            </span>
                        </div>
                    </div>
                    
                    <div class="p-6">
                        <!-- Status Change Actions -->
                        <div class="mb-6 pb-6 border-b border-gray-200">
                            <label class="block text-sm font-medium text-gray-700 mb-3">Change Status</label>
                            <div class="flex flex-wrap gap-2">
                                <button
                                    v-for="option in statusOptions"
                                    :key="option.value"
                                    @click="handleStatusChange(option.value)"
                                    :disabled="exam.status === option.value || processing"
                                    :class="[
                                        exam.status === option.value 
                                            ? 'bg-' + option.color + '-100 text-' + option.color + '-800 cursor-not-allowed'
                                            : 'bg-gray-100 text-gray-700 hover:bg-' + option.color + '-50',
                                        'px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50'
                                    ]"
                                >
                                    {{ option.label }}
                                </button>
                            </div>
                        </div>
                        
                        <!-- Details Grid -->
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <!-- Mock Test -->
                            <div>
                                <label class="block text-sm font-medium text-gray-500 mb-2">
                                    <i data-feather="package" class="w-4 h-4 inline mr-1"></i>
                                    Mock Test
                                </label>
                                <p class="text-base font-semibold text-gray-900">{{ exam.mock_test_title }}</p>
                                <p class="text-sm text-gray-500">{{ exam.mock_test_type }}</p>
                            </div>
                            
                            <!-- Price -->
                            <div>
                                <label class="block text-sm font-medium text-gray-500 mb-2">
                                    <i data-feather="dollar-sign" class="w-4 h-4 inline mr-1"></i>
                                    Price
                                </label>
                                <p class="text-base font-semibold text-gray-900">{{ formatPrice(exam.price) }}</p>
                            </div>
                            
                            <!-- PIN Code -->
                            <div>
                                <label class="block text-sm font-medium text-gray-500 mb-2">
                                    <i data-feather="lock" class="w-4 h-4 inline mr-1"></i>
                                    PIN Code
                                </label>
                                <div class="flex items-center gap-2">
                                    <code class="px-3 py-1 bg-gray-100 text-gray-800 rounded text-base font-mono font-bold">
                                        {{ exam.pin_code }}
                                    </code>
                                    <button
                                        @click="copyPinCode"
                                        class="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                        title="Copy PIN"
                                    >
                                        <i data-feather="copy" class="w-4 h-4"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Start Date -->
                            <div>
                                <label class="block text-sm font-medium text-gray-500 mb-2">
                                    <i data-feather="calendar" class="w-4 h-4 inline mr-1"></i>
                                    Start Date
                                </label>
                                <p class="text-base text-gray-900">{{ formatDate(exam.start_date) }}</p>
                            </div>
                            
                            <!-- Expire Date -->
                            <div>
                                <label class="block text-sm font-medium text-gray-500 mb-2">
                                    <i data-feather="calendar" class="w-4 h-4 inline mr-1"></i>
                                    Expire Date
                                </label>
                                <p class="text-base text-gray-900">{{ formatDate(exam.expire_date) }}</p>
                            </div>
                            
                            <!-- Created By -->
                            <div>
                                <label class="block text-sm font-medium text-gray-500 mb-2">
                                    <i data-feather="user" class="w-4 h-4 inline mr-1"></i>
                                    Created By
                                </label>
                                <p class="text-base text-gray-900">{{ exam.created_by_name || 'N/A' }}</p>
                                <p class="text-sm text-gray-500">{{ formatDate(exam.created_at) }}</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Enrollment Information -->
                <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900">
                            <i data-feather="users" class="w-5 h-5 inline mr-2"></i>
                            Enrollment Status
                        </h3>
                        <span class="text-2xl font-bold text-orange-600">
                            {{ exam.enrolled_count }} / {{ exam.max_students }}
                        </span>
                    </div>
                    
                    <div class="space-y-2">
                        <div class="flex justify-between text-sm text-gray-600">
                            <span>Enrolled Students</span>
                            <span>{{ enrollmentPercentage }}%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-4">
                            <div 
                                class="bg-gradient-to-r from-orange-500 to-indigo-600 h-4 rounded-full transition-all duration-500"
                                :style="{width: enrollmentPercentage + '%'}"
                            ></div>
                        </div>
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-600">Available Slots:</span>
                            <span class="font-semibold" :class="exam.available_slots > 0 ? 'text-green-600' : 'text-red-600'">
                                {{ exam.available_slots }}
                            </span>
                        </div>
                    </div>
                </div>
                
                <!-- Tabs Navigation -->
                <div class="border-b border-gray-200">
                    <nav class="-mb-px flex space-x-8">
                        <button
                            v-if="exam.is_active || exam.is_expired"
                            @click="setActiveTab('results')"
                            :class="[
                                activeTab === 'results'
                                    ? 'border-orange-500 text-orange-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                                'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors'
                            ]"
                        >
                            <i data-feather="bar-chart-2" class="w-4 h-4 inline mr-2"></i>
                            Results & Statistics
                        </button>
                        <button
                            @click="setActiveTab('students')"
                            :class="[
                                activeTab === 'students'
                                    ? 'border-orange-500 text-orange-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                                'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors'
                            ]"
                        >
                            <i data-feather="users" class="w-4 h-4 inline mr-2"></i>
                            Enrolled Students ({{ exam.enrolled_students?.length || 0 }})
                        </button>
                    </nav>
                </div>
                
                <!-- Students Tab -->
                <div v-show="activeTab === 'students'" class="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div v-if="!exam.enrolled_students || exam.enrolled_students.length === 0" class="p-12 text-center">
                        <i data-feather="user-x" class="w-16 h-16 text-gray-400 mx-auto mb-4"></i>
                        <p class="text-gray-500">No students enrolled yet</p>
                    </div>
                    
                    <div v-else class="divide-y divide-gray-200">
                        <div
                            v-for="student in exam.enrolled_students"
                            :key="student.id"
                            class="px-6 py-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
                        >
                            <div class="flex items-center gap-4">
                                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                                    {{ student.first_name?.charAt(0) || 'S' }}{{ student.last_name?.charAt(0) || '' }}
                                </div>
                                <div>
                                    <p class="font-medium text-gray-900">
                                        {{ student.first_name }} {{ student.last_name }}
                                    </p>
                                    <p class="text-sm text-gray-500">{{ student.email }}</p>
                                </div>
                            </div>
                            
                            <button
                                v-if="exam.is_upcoming"
                                @click="openRemoveStudentModal(student)"
                                class="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
                            >
                                <i data-feather="x" class="w-4 h-4 inline mr-1"></i>
                                Remove
                            </button>
                            <span v-else class="text-sm text-gray-500">
                                <i data-feather="check-circle" class="w-4 h-4 inline text-green-600 mr-1"></i>
                                Enrolled
                            </span>
                        </div>
                    </div>
                </div>
                
                <!-- Results Tab -->
                <div v-show="activeTab === 'results'">
                    <loading-spinner v-if="loadingResults" />
                    
                    <div v-else-if="results" class="space-y-6">
                        <!-- Statistics Cards -->
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-sm font-medium text-gray-500">Completed</span>
                                    <i data-feather="check-circle" class="w-5 h-5 text-green-600"></i>
                                </div>
                                <p class="text-2xl font-bold text-gray-900">{{ results.statistics.completed }}</p>
                                <p class="text-xs text-gray-500 mt-1">of {{ results.statistics.total_enrolled }} students</p>
                            </div>
                            
                            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-sm font-medium text-gray-500">Avg Total</span>
                                    <i data-feather="trending-up" class="w-5 h-5 text-orange-600"></i>
                                </div>
                                <p class="text-2xl font-bold text-gray-900">{{ formatScore(results.statistics.avg_total_score) }}</p>
                                <p class="text-xs text-gray-500 mt-1">out of 9.0</p>
                            </div>
                            
                            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-sm font-medium text-gray-500">Listening</span>
                                    <i data-feather="headphones" class="w-5 h-5 text-purple-600"></i>
                                </div>
                                <p class="text-2xl font-bold text-gray-900">{{ formatScore(results.statistics.avg_listening) }}</p>
                            </div>
                            
                            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-sm font-medium text-gray-500">Reading</span>
                                    <i data-feather="book-open" class="w-5 h-5 text-orange-600"></i>
                                </div>
                                <p class="text-2xl font-bold text-gray-900">{{ formatScore(results.statistics.avg_reading) }}</p>
                            </div>
                            
                            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-sm font-medium text-gray-500">Writing</span>
                                    <i data-feather="edit-3" class="w-5 h-5 text-orange-600"></i>
                                </div>
                                <p class="text-2xl font-bold text-gray-900">{{ formatScore(results.statistics.avg_writing) }}</p>
                            </div>
                        </div>
                        
                        <!-- Results Table -->
                        <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                            <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                                <h3 class="text-lg font-semibold text-gray-900">Student Results</h3>
                                <button
                                    @click="downloadExcel"
                                    class="inline-flex items-center px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    <i data-feather="download" class="w-4 h-4 mr-1.5"></i>
                                    Export Excel
                                </button>
                            </div>
                            
                            <div class="overflow-x-auto">
                                <table class="min-w-full divide-y divide-gray-200">
                                    <thead class="bg-gray-50">
                                        <tr>
                                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Listening</th>
                                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reading</th>
                                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Writing</th>
                                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Speaking</th>
                                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody class="bg-white divide-y divide-gray-200">
                                        <!-- Completed Results -->
                                        <tr v-for="result in results.completed_results" :key="result.id" class="hover:bg-gray-50">
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <p class="text-sm font-medium text-gray-900">{{ result.student_name }}</p>
                                                    <p class="text-xs text-gray-500">{{ result.student_email }}</p>
                                                </div>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                                    {{ formatScore(result.total_score) }}
                                                </span>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ formatScore(result.listening_score) }}</td>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ formatScore(result.reading_score) }}</td>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ formatScore(result.writing_score) }}</td>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ formatScore(result.speaking_score) }}</td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    <i data-feather="check" class="w-3 h-3 mr-1"></i>
                                                    Completed
                                                </span>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {{ formatDate(result.completed_at) }}
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    @click="viewStudentResult(result.id)"
                                                    class="text-orange-600 hover:text-orange-900"
                                                    title="View Details"
                                                >
                                                    <i data-feather="eye" class="w-4 h-4"></i>
                                                </button>
                                            </td>
                                        </tr>
                                        <!-- Pending Students -->
                                        <tr v-for="student in results.pending_students" :key="'pending-' + student.student_email" class="hover:bg-gray-50 bg-gray-50">
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <p class="text-sm font-medium text-gray-900">{{ student.student_name }}</p>
                                                    <p class="text-xs text-gray-500">{{ student.student_email }}</p>
                                                </div>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">-</td>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">-</td>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">-</td>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">-</td>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">-</td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                    <i data-feather="clock" class="w-3 h-3 mr-1"></i>
                                                    Pending
                                                </span>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">-</td>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">-</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            
                            <div v-if="results.completed_results.length === 0 && results.pending_students.length === 0" class="p-12 text-center">
                                <i data-feather="file-text" class="w-16 h-16 text-gray-400 mx-auto mb-4"></i>
                                <p class="text-gray-500">No results available yet</p>
                            </div>
                        </div>
                    </div>
                    
                    <div v-else class="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                        <i data-feather="bar-chart-2" class="w-16 h-16 text-gray-400 mx-auto mb-4"></i>
                        <p class="text-gray-500">Results data not available</p>
                    </div>
                </div>
            </div>
            
            <!-- Delete Confirmation Modal -->
            <modal-component
                v-if="showDeleteModal"
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
                            This action cannot be undone. The exam "{{ exam?.name }}" will be permanently deleted.
                        </p>
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
                            @click="handleDelete"
                            :disabled="processing"
                            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                            {{ processing ? 'Deleting...' : 'Delete Exam' }}
                        </button>
                    </div>
                </template>
            </modal-component>
            
            <!-- Remove Student Confirmation Modal -->
            <modal-component
                v-if="showRemoveStudentModal && studentToRemove"
                title="Remove Student"
                @close="closeRemoveStudentModal"
            >
                <div class="space-y-4">
                    <div class="flex items-center justify-center w-12 h-12 mx-auto bg-yellow-100 rounded-full">
                        <i data-feather="user-minus" class="w-6 h-6 text-yellow-600"></i>
                    </div>
                    <div class="text-center">
                        <h3 class="text-lg font-medium text-gray-900 mb-2">
                            Remove Student from Exam?
                        </h3>
                        <p class="text-sm text-gray-500 mb-4">
                            Are you sure you want to remove <strong>{{ studentToRemove.first_name }} {{ studentToRemove.last_name }}</strong> from this exam?
                        </p>
                    </div>
                </div>
                
                <template #footer>
                    <div class="flex justify-end gap-3">
                        <button 
                            @click="closeRemoveStudentModal"
                            class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            @click="handleRemoveStudent"
                            :disabled="processing"
                            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                            {{ processing ? 'Removing...' : 'Remove Student' }}
                        </button>
                    </div>
                </template>
            </modal-component>
        </div>
    `,
};
