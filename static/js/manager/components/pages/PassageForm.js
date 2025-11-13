/**
 * Passage Form Component - Minimal Version
 * Simple form for creating and editing reading passages
 */

window.PassageForm = {
    name: 'PassageForm',
    props: {
        mode: {
            type: String,
            default: 'create'
        },
        id: {
            type: [String, Number],
            default: null
        }
    },
    data() {
        return {
            loading: false,
            saving: false,
            form: {
                passage_number: 1,
                title: '',
                content: ''
            },
            errors: {}
        };
    },

    computed: {
        isEditMode() {
            return this.mode === 'edit' && !!this.id;
        },

        pageTitle() {
            return this.isEditMode ? 'Edit Passage' : 'New Passage';
        },

        wordCount() {
            if (!this.form.content) return 0;
            return this.form.content.trim().split(/\s+/).filter(word => word.length > 0).length;
        },

        canSubmit() {
            return this.form.passage_number && this.form.title && this.form.content;
        }
    },

    async mounted() {
        if (this.isEditMode && this.id) {
            await this.loadPassage();
        }
    },

    methods: {
        async loadPassage() {
            this.loading = true;
            try {
                const passage = await API.getReadingPassage(this.id);
                this.form = {
                    passage_number: passage.passage_number,
                    title: passage.title || '',
                    content: passage.content || ''
                };
            } catch (error) {
                console.error('Error loading passage:', error);
                this.showNotification('Failed to load passage', 'error');
                this.$emit('navigate', 'reading-tests');
            } finally {
                this.loading = false;
            }
        },

        async savePassage() {
            if (!this.canSubmit || this.saving) return;

            this.saving = true;
            this.errors = {};

            try {
                if (this.isEditMode) {
                    await API.updateReadingPassage(this.id, this.form);
                } else {
                    await API.createReadingPassage(this.form);
                }

                this.showNotification(
                    this.isEditMode ? 'Passage updated' : 'Passage created',
                    'success'
                );
                this.$emit('navigate', 'reading-tests');
            } catch (error) {
                console.error('Error saving passage:', error);
                if (error.response && error.response.data) {
                    this.errors = error.response.data;
                }
                this.showNotification('Failed to save passage', 'error');
            } finally {
                this.saving = false;
            }
        },

        cancel() {
            this.$emit('navigate', 'reading-tests');
        },

        showNotification(message, type = 'info') {
            // Use toast notification system
            if (window.toast && window.toast[type]) {
                window.toast[type](message);
            } else if (window.showToast) {
                window.showToast({ message, type });
            } else {
                alert(message);
            }
        },

        getFieldError(field) {
            return this.errors[field] ? this.errors[field][0] : null;
        },

        hasError(field) {
            return !!this.errors[field];
        }
    },

    template: `
    <div class="max-w-4xl mx-auto px-4 py-8">
        <!-- Header -->
        <div class="mb-6">
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                    <button @click="cancel" class="text-gray-600 hover:text-gray-900">
                        <i data-feather="arrow-left" class="h-5 w-5"></i>
                    </button>
                    <h1 class="text-2xl font-bold text-gray-900">{{ pageTitle }}</h1>
                </div>
                
                <button
                    @click="savePassage"
                    :disabled="saving || !canSubmit"
                    class="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {{ saving ? 'Saving...' : 'Save' }}
                </button>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-2 border-orange-600 border-t-transparent"></div>
        </div>

        <!-- Form -->
        <div v-else class="bg-white rounded-lg border border-gray-200 p-6">
            <div class="space-y-6">
                <!-- Passage Number -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        Passage Number <span class="text-red-500">*</span>
                    </label>
                    <select
                        v-model="form.passage_number"
                        class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        :class="{ 'border-red-300': hasError('passage_number') }"
                    >
                        <option :value="1">Passage 1</option>
                        <option :value="2">Passage 2</option>
                        <option :value="3">Passage 3</option>
                    </select>
                    <p v-if="hasError('passage_number')" class="mt-1 text-sm text-red-600">
                        {{ getFieldError('passage_number') }}
                    </p>
                </div>

                <!-- Title -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        Title <span class="text-red-500">*</span>
                    </label>
                    <input
                        v-model="form.title"
                        type="text"
                        placeholder="Enter passage title"
                        class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        :class="{ 'border-red-300': hasError('title') }"
                    />
                    <p v-if="hasError('title')" class="mt-1 text-sm text-red-600">
                        {{ getFieldError('title') }}
                    </p>
                </div>

                <!-- Content -->
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <label class="block text-sm font-medium text-gray-700">
                            Content <span class="text-red-500">*</span>
                        </label>
                        <span class="text-xs text-gray-500">{{ wordCount }} words</span>
                    </div>
                    <textarea
                        v-model="form.content"
                        rows="18"
                        placeholder="Enter passage content..."
                        class="w-full px-3 py-2 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        :class="{ 'border-red-300': hasError('content') }"
                    ></textarea>
                    <p v-if="hasError('content')" class="mt-1 text-sm text-red-600">
                        {{ getFieldError('content') }}
                    </p>
                </div>
            </div>
        </div>
    </div>
    `,
};
