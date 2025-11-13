/**
 * ExamForm Component - Create/Edit Scheduled Exams
 * Dedicated page for creating and editing exams with better UX
 */

window.ExamForm = {
    name: 'ExamFormComponent',

    mixins: [window.FeatherIconsMixin],

    props: {
        mode: {
            type: String,
            default: 'create', // 'create' or 'edit'
            validator: (value) => ['create', 'edit'].includes(value)
        },
        examId: {
            type: [Number, String],
            default: null
        }
    },

    data() {
        return {
            loading: false,
            saving: false,
            error: null,

            // Form data
            formData: {
                name: '',
                mock_test: null,
                price: '',
                start_date: '',
                expire_date: '',
                pin_code: '',
                max_students: '',
                status: 'SCHEDULED',
                description: '',
            },

            // Mock tests for dropdown
            mockTests: [],
            loadingMockTests: false,

            // Validation errors
            errors: {},
        };
    },

    computed: {
        pageTitle() {
            return this.mode === 'create' ? 'Create New Exam' : 'Edit Exam';
        },

        submitButtonText() {
            if (this.saving) return this.mode === 'create' ? 'Creating...' : 'Updating...';
            return this.mode === 'create' ? 'Create Exam' : 'Update Exam';
        },

        statusOptions() {
            return [
                { value: 'SCHEDULED', label: 'Scheduled', description: 'Exam is scheduled for future' },
                { value: 'ACTIVE', label: 'Active', description: 'Exam is currently active' },
                { value: 'COMPLETED', label: 'Completed', description: 'Exam has been completed' },
                { value: 'CANCELLED', label: 'Cancelled', description: 'Exam has been cancelled' },
            ];
        },

        isEditMode() {
            return this.mode === 'edit';
        },
    },

    async mounted() {
        await this.loadMockTests();

        if (this.isEditMode && this.examId) {
            await this.loadExam();
        } else {
            // Set default dates for create mode
            this.setDefaultDates();
        }
    },

    methods: {
        async loadMockTests() {
            this.loadingMockTests = true;
            try {
                const response = await ApiService.getMockTests();
                this.mockTests = response.tests || [];
            } catch (error) {
                toast.error('Failed to load mock tests', 'Error');
                this.error = 'Failed to load mock tests. Please refresh the page.';
            } finally {
                this.loadingMockTests = false;
            }
        },

        async loadExam() {
            this.loading = true;
            this.error = null;

            try {
                const exam = await ApiService.getExam(this.examId);

                // Populate form with exam data
                this.formData = {
                    name: exam.name,
                    mock_test: exam.mock_test,
                    price: exam.price,
                    start_date: this.formatDateForInput(exam.start_date),
                    expire_date: this.formatDateForInput(exam.expire_date),
                    pin_code: exam.pin_code,
                    max_students: exam.max_students,
                    status: exam.status,
                    description: exam.description || '',
                };
            } catch (error) {
                this.error = error.message || 'Failed to load exam details';
                toast.error(error.message || 'Failed to load exam details', 'Error');
            } finally {
                this.loading = false;
            }
        },

        setDefaultDates() {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(9, 0, 0, 0);

            const nextWeek = new Date(tomorrow);
            nextWeek.setDate(nextWeek.getDate() + 7);

            this.formData.start_date = this.formatDateForInput(tomorrow.toISOString());
            this.formData.expire_date = this.formatDateForInput(nextWeek.toISOString());
        },

        formatDateForInput(dateString) {
            if (!dateString) return '';
            const date = new Date(dateString);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        },

        validateForm() {
            this.errors = {};

            if (!this.formData.name?.trim()) {
                this.errors.name = 'Exam name is required';
            }

            if (!this.formData.mock_test) {
                this.errors.mock_test = 'Please select a mock test';
            }

            // Price is optional (can be empty for free exams)
            if (this.formData.price && parseFloat(this.formData.price) < 0) {
                this.errors.price = 'Price cannot be negative';
            }

            if (!this.formData.start_date) {
                this.errors.start_date = 'Start date is required';
            }

            if (!this.formData.expire_date) {
                this.errors.expire_date = 'Expire date is required';
            }

            if (this.formData.start_date && this.formData.expire_date) {
                if (new Date(this.formData.start_date) >= new Date(this.formData.expire_date)) {
                    this.errors.expire_date = 'Expire date must be after start date';
                }
            }

            if (!this.formData.pin_code?.trim()) {
                this.errors.pin_code = 'PIN code is required';
            } else if (this.formData.pin_code.length < 4) {
                this.errors.pin_code = 'PIN code must be at least 4 characters';
            }

            // Max students is optional (can be empty for unlimited)
            if (this.formData.max_students && parseInt(this.formData.max_students) < 1) {
                this.errors.max_students = 'Max students must be at least 1 or leave empty for unlimited';
            }

            return Object.keys(this.errors).length === 0;
        },

        async handleSubmit() {
            if (!this.validateForm()) {
                this.error = 'Please fix the errors in the form';
                toast.warning('Please fix the errors in the form', 'Validation');
                return;
            }

            this.saving = true;
            this.error = null;

            try {
                // Prepare data - convert empty strings to null for optional fields
                const submitData = {
                    ...this.formData,
                    price: this.formData.price === '' || this.formData.price === null ? null : this.formData.price,
                    max_students: this.formData.max_students === '' || this.formData.max_students === null ? null : this.formData.max_students,
                };

                if (this.isEditMode) {
                    await ApiService.updateExam(this.examId, submitData);
                    toast.success('Exam updated successfully!', 'Success');
                    this.$emit('navigate', 'exams');
                } else {
                    await ApiService.createExam(submitData);
                    toast.success('Exam created successfully!', 'Success');
                    this.$emit('navigate', 'exams');
                }
            } catch (error) {
                this.error = error.message || `Failed to ${this.mode} exam`;
                toast.error(error.message || `Failed to ${this.mode} exam`, 'Error');
            } finally {
                this.saving = false;
            }
        },

        handleCancel() {
            if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
                this.$emit('navigate', 'exams');
            }
        },

        generatePinCode() {
            this.formData.pin_code = Math.random().toString(36).substring(2, 10).toUpperCase();
            this.errors.pin_code = null;
            toast.success('PIN code generated!', 'Success', 2000);
        },

        handleFieldChange(field) {
            // Clear error when field is changed
            if (this.errors[field]) {
                delete this.errors[field];
            }
        },

        getMockTestInfo(mockTestId) {
            const test = this.mockTests.find(t => t.id === mockTestId);
            return test ? `${test.title} (${test.exam_type})` : '';
        },
    },

    template: `
        <div class="space-y-6">
            <!-- Header -->
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <button
                        @click="handleCancel"
                        class="inline-flex items-center justify-center w-10 h-10 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        <i data-feather="arrow-left" class="w-5 h-5"></i>
                    </button>
                    <div>
                        <h1 class="text-3xl font-bold text-gray-900">{{ pageTitle }}</h1>
                        <p class="mt-1 text-sm text-gray-500">
                            {{ isEditMode ? 'Update exam details and settings' : 'Create a new scheduled exam for students' }}
                        </p>
                    </div>
                </div>
            </div>
            
            <!-- Loading State -->
            <loading-spinner v-if="loading" />
            
            <!-- Error Alert -->
            <alert-component v-if="error" type="error" :message="error" @close="error = null" />
            
            <!-- Form -->
            <div v-if="!loading" class="bg-white rounded-lg shadow-sm border border-gray-200">
                <form @submit.prevent="handleSubmit" class="p-6 space-y-6">
                    <!-- Basic Information Section -->
                    <div class="space-y-4">
                        <h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <i data-feather="info" class="w-5 h-5 text-orange-600"></i>
                            Basic Information
                        </h2>
                        
                        <!-- Exam Name -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Exam Name <span class="text-red-500">*</span>
                            </label>
                            <input 
                                v-model="formData.name"
                                @input="handleFieldChange('name')"
                                type="text"
                                placeholder="e.g., IELTS Mock Test - January 2025"
                                :class="[
                                    'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors',
                                    errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                ]"
                            >
                            <p v-if="errors.name" class="mt-1 text-sm text-red-600">{{ errors.name }}</p>
                        </div>
                        
                        <!-- Mock Test Selection -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Mock Test <span class="text-red-500">*</span>
                            </label>
                            <select 
                                v-model="formData.mock_test"
                                @change="handleFieldChange('mock_test')"
                                :disabled="loadingMockTests"
                                :class="[
                                    'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors',
                                    errors.mock_test ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                ]"
                            >
                                <option :value="null">{{ loadingMockTests ? 'Loading...' : 'Select a mock test' }}</option>
                                <option v-for="test in mockTests" :key="test.id" :value="test.id">
                                    {{ test.title }} ({{ test.exam_type }})
                                </option>
                            </select>
                            <p v-if="errors.mock_test" class="mt-1 text-sm text-red-600">{{ errors.mock_test }}</p>
                            <p v-else class="mt-1 text-xs text-gray-500">
                                This is the test template that students will take
                            </p>
                        </div>
                        
                        <!-- Description -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Description
                            </label>
                            <textarea 
                                v-model="formData.description"
                                rows="4"
                                placeholder="Additional information about this exam..."
                                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            ></textarea>
                            <p class="mt-1 text-xs text-gray-500">
                                Optional: Provide any additional details or instructions
                            </p>
                        </div>
                    </div>
                    
                    <hr class="border-gray-200">
                    
                    <!-- Schedule Section -->
                    <div class="space-y-4">
                        <h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <i data-feather="calendar" class="w-5 h-5 text-orange-600"></i>
                            Schedule
                        </h2>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <!-- Start Date -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    Start Date & Time <span class="text-red-500">*</span>
                                </label>
                                <input 
                                    v-model="formData.start_date"
                                    @input="handleFieldChange('start_date')"
                                    type="datetime-local"
                                    :class="[
                                        'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors',
                                        errors.start_date ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                    ]"
                                >
                                <p v-if="errors.start_date" class="mt-1 text-sm text-red-600">{{ errors.start_date }}</p>
                                <p v-else class="mt-1 text-xs text-gray-500">
                                    When the exam becomes available
                                </p>
                            </div>
                            
                            <!-- Expire Date -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    Expire Date & Time <span class="text-red-500">*</span>
                                </label>
                                <input 
                                    v-model="formData.expire_date"
                                    @input="handleFieldChange('expire_date')"
                                    type="datetime-local"
                                    :class="[
                                        'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors',
                                        errors.expire_date ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                    ]"
                                >
                                <p v-if="errors.expire_date" class="mt-1 text-sm text-red-600">{{ errors.expire_date }}</p>
                                <p v-else class="mt-1 text-xs text-gray-500">
                                    When the exam is no longer available
                                </p>
                            </div>
                        </div>
                        
                        <!-- Status -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Status
                            </label>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div 
                                    v-for="option in statusOptions" 
                                    :key="option.value"
                                    @click="formData.status = option.value"
                                    :class="[
                                        'p-4 border-2 rounded-lg cursor-pointer transition-all',
                                        formData.status === option.value 
                                            ? 'border-orange-500 bg-orange-50' 
                                            : 'border-gray-200 hover:border-gray-300'
                                    ]"
                                >
                                    <div class="flex items-start gap-3">
                                        <input 
                                            type="radio" 
                                            :value="option.value"
                                            v-model="formData.status"
                                            class="mt-1"
                                        >
                                        <div class="flex-1">
                                            <div class="font-medium text-gray-900">{{ option.label }}</div>
                                            <div class="text-xs text-gray-500 mt-0.5">{{ option.description }}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <hr class="border-gray-200">
                    
                    <!-- Access & Pricing Section -->
                    <div class="space-y-4">
                        <h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <i data-feather="lock" class="w-5 h-5 text-orange-600"></i>
                            Access & Pricing
                        </h2>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <!-- Price -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    Price (so'm)
                                </label>
                                <div class="relative">
                                    <input 
                                        v-model="formData.price"
                                        @input="handleFieldChange('price')"
                                        type="number"
                                        min="0"
                                        step="1000"
                                        placeholder="Leave empty for free exam"
                                        :class="[
                                            'w-full pl-4 pr-16 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors',
                                            errors.price ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                        ]"
                                    >
                                    <span class="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">so'm</span>
                                </div>
                                <p v-if="errors.price" class="mt-1 text-sm text-red-600">{{ errors.price }}</p>
                                <p v-else class="mt-1 text-xs text-gray-500">
                                    <i class="fas fa-info-circle text-orange-500"></i>
                                    Cost for students. Leave empty for free exam
                                </p>
                            </div>
                            
                            <!-- Max Students -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    Maximum Students
                                </label>
                                <input 
                                    v-model="formData.max_students"
                                    @input="handleFieldChange('max_students')"
                                    type="number"
                                    min="1"
                                    placeholder="Leave empty for unlimited"
                                    :class="[
                                        'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors',
                                        errors.max_students ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                    ]"
                                >
                                <p v-if="errors.max_students" class="mt-1 text-sm text-red-600">{{ errors.max_students }}</p>
                                <p v-else class="mt-1 text-xs text-gray-500">
                                    <i class="fas fa-info-circle text-orange-500"></i>
                                    Maximum capacity. Leave empty for unlimited enrollment
                                </p>
                            </div>
                        </div>
                        
                        <!-- PIN Code -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                PIN Code <span class="text-red-500">*</span>
                            </label>
                            <div class="flex gap-2">
                                <input 
                                    v-model="formData.pin_code"
                                    @input="handleFieldChange('pin_code')"
                                    type="text"
                                    placeholder="Enter or generate PIN"
                                    :class="[
                                        'flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors font-mono',
                                        errors.pin_code ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                    ]"
                                >
                                <button
                                    @click.prevent="generatePinCode"
                                    type="button"
                                    class="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                                >
                                    <i data-feather="refresh-cw" class="w-5 h-5"></i>
                                    Generate
                                </button>
                            </div>
                            <p v-if="errors.pin_code" class="mt-1 text-sm text-red-600">{{ errors.pin_code }}</p>
                            <p v-else class="mt-1 text-xs text-gray-500">
                                Students will use this PIN to access the exam
                            </p>
                        </div>
                    </div>
                    
                    <!-- Action Buttons -->
                    <div class="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
                        <button 
                            @click.prevent="handleCancel"
                            type="button"
                            class="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            :disabled="saving || loadingMockTests"
                            class="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                        >
                            <i v-if="!saving" data-feather="save" class="w-5 h-5"></i>
                            <i v-else data-feather="loader" class="w-5 h-5 animate-spin"></i>
                            {{ submitButtonText }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `,
};
