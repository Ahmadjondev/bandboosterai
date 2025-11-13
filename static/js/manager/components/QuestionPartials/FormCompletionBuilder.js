/**
 * Form Completion Builder Component
 * 
 * Advanced builder for creating Form Completion questions with hierarchical structure:
 * - Main title for the entire form
 * - Sections with titles
 * - Items (fields/rows with labels)
 * - Sub-items within items (nested fields)
 * - <input> blanks for answers
 * 
 * Features:
 * - Visual form editor with drag & drop
 * - Add/remove/reorder items and sections
 * - Insert blanks with button click
 * - Auto-generate questions from <input> tags
 * - Save structured data to question_data field
 * - Edit mode support
 */

const FormCompletionBuilderComponent = {
    template: `
        <div class="bg-white rounded-lg p-6 shadow-sm">
            <!-- Header -->
            <div class="mb-6 pb-4 border-b-2 border-gray-200">
                <h3 class="text-2xl font-semibold text-gray-800 mb-2">📋 Form Completion Builder</h3>
                <p class="text-gray-500 text-sm">Create structured forms with sections, fields, and blanks</p>
            </div>

            <!-- Step 1: Structure Editor -->
            <div v-if="currentStep === 1">
                <div class="flex flex-col gap-5">
                    <!-- Main Title -->
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">
                            Form Title
                            <span class="text-red-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition" 
                            v-model="formStructure.title"
                            placeholder="e.g., Customer Registration Form"
                            @input="markAsModified"
                        >
                    </div>

                    <!-- Sections -->
                    <div class="bg-gray-50 rounded-lg p-5">
                        <div class="flex justify-between items-center mb-4">
                            <label class="text-base font-semibold text-gray-700">Form Sections</label>
                            <button 
                                type="button" 
                                class="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition flex items-center gap-1"
                                @click="addSection"
                            >
                                <i data-feather="plus" class="w-4 h-4"></i> Add Section
                            </button>
                        </div>

                        <!-- Empty State -->
                        <div v-if="formStructure.items.length === 0" class="text-center py-10 text-gray-500">
                            <i data-feather="file-text" class="w-12 h-12 mx-auto mb-4 opacity-30"></i>
                            <p class="text-sm">No sections yet. Click "Add Section" to start building your form.</p>
                        </div>

                        <!-- Section List -->
                        <div 
                            v-for="(section, sIndex) in formStructure.items" 
                            :key="'section-' + sIndex"
                            class="bg-white border border-gray-200 rounded-lg p-4 mb-4 hover:shadow-md transition-shadow"
                        >
                            <!-- Section Header -->
                            <div class="mb-4">
                                <div class="flex gap-3 items-center flex-wrap">
                                    <input 
                                        type="text" 
                                        class="flex-1 px-3 py-2 border border-gray-300 rounded-md font-semibold text-base focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none" 
                                        v-model="section.title"
                                        placeholder="Section title (e.g., Personal Information)"
                                        @input="markAsModified"
                                    >
                                    <div class="flex gap-1">
                                        <button 
                                            type="button" 
                                            class="px-2.5 py-1.5 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                            @click="moveSectionUp(sIndex)"
                                            :disabled="sIndex === 0"
                                            title="Move up"
                                        >
                                            <i data-feather="arrow-up" class="w-4 h-4"></i>
                                        </button>
                                        <button 
                                            type="button" 
                                            class="px-2.5 py-1.5 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                            @click="moveSectionDown(sIndex)"
                                            :disabled="sIndex === formStructure.items.length - 1"
                                            title="Move down"
                                        >
                                            <i data-feather="arrow-down" class="w-4 h-4"></i>
                                        </button>
                                        <button 
                                            type="button" 
                                            class="px-2.5 py-1.5 text-red-600 border border-red-300 rounded hover:bg-red-50 transition"
                                            @click="removeSection(sIndex)"
                                            title="Delete section"
                                        >
                                            <i data-feather="trash-2" class="w-4 h-4"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Items in Section (Form Fields) -->
                            <div class="bg-gray-50 rounded-md p-3">
                                <div class="flex justify-between items-center mb-3">
                                    <span class="text-xs text-gray-500">Form Fields</span>
                                    <button 
                                        type="button" 
                                        class="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 transition flex items-center gap-1"
                                        @click="addItem(sIndex)"
                                    >
                                        <i data-feather="plus" class="w-3 h-3"></i> Add Field
                                    </button>
                                </div>

                                <div v-if="section.items.length === 0" class="text-center py-5">
                                    <p class="text-xs text-gray-500">No fields. Click "Add Field" to start.</p>
                                </div>

                                <div 
                                    v-for="(item, iIndex) in section.items" 
                                    :key="'item-' + sIndex + '-' + iIndex"
                                    class="mb-3 p-3 bg-white border border-gray-200 rounded-md"
                                >
                                    <!-- Simple Field Item -->
                                    <div v-if="typeof item === 'string'" class="flex gap-3 items-start">
                                        <span class="text-2xl font-bold text-gray-600 mt-1">•</span>
                                        <div class="flex-1 flex flex-col gap-2">
                                            <textarea 
                                                class="w-full px-3 py-2 border border-gray-300 rounded text-sm resize-y focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                                                v-model="section.items[iIndex]"
                                                placeholder="Field label (use <input> for blanks, e.g., Name: <input>)"
                                                rows="2"
                                                @input="markAsModified"
                                            ></textarea>
                                            <div class="flex gap-2 flex-wrap">
                                                <button 
                                                    type="button" 
                                                    class="px-2 py-1 text-xs text-orange-600 border border-orange-300 rounded hover:bg-orange-50 transition flex items-center gap-1"
                                                    @click="insertBlankInItem(sIndex, iIndex)"
                                                >
                                                    <i data-feather="edit-3" class="w-3 h-3"></i> Insert Blank
                                                </button>
                                                <button 
                                                    type="button" 
                                                    class="px-2 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition flex items-center gap-1"
                                                    @click="convertToNested(sIndex, iIndex)"
                                                >
                                                    <i data-feather="list" class="w-3 h-3"></i> Add Sub-fields
                                                </button>
                                                <button 
                                                    type="button" 
                                                    class="px-2 py-1 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50 transition flex items-center gap-1"
                                                    @click="removeItem(sIndex, iIndex)"
                                                >
                                                    <i data-feather="x" class="w-3 h-3"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Nested Field with Sub-fields -->
                                    <div v-else class="flex gap-3 items-start">
                                        <span class="text-2xl font-bold text-gray-600 mt-1">•</span>
                                        <div class="flex-1 flex flex-col gap-3">
                                            <input 
                                                type="text" 
                                                class="w-full px-3 py-2 border border-orange-300 rounded font-semibold bg-orange-50 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                                                v-model="item.prefix"
                                                placeholder="Field group label (e.g., Contact Details:)"
                                                @input="markAsModified"
                                            >
                                            <div class="bg-gray-100 rounded-md p-3 ml-5">
                                                <div 
                                                    v-for="(subItem, siIndex) in item.items" 
                                                    :key="'sub-' + sIndex + '-' + iIndex + '-' + siIndex"
                                                    class="flex gap-2 items-center mb-2"
                                                >
                                                    <span class="text-lg text-gray-500">◦</span>
                                                    <textarea 
                                                        class="flex-1 px-2 py-1 border border-gray-300 rounded text-sm resize-y focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                                                        v-model="item.items[siIndex]"
                                                        placeholder="Sub-field (use <input> for blanks)"
                                                        rows="1"
                                                        @input="markAsModified"
                                                    ></textarea>
                                                    <button 
                                                        type="button" 
                                                        class="px-2 py-1 text-xs text-orange-600 border border-orange-300 rounded hover:bg-orange-50 transition"
                                                        @click="insertBlankInSubItem(sIndex, iIndex, siIndex)"
                                                    >
                                                        <i data-feather="edit-3" class="w-3 h-3"></i>
                                                    </button>
                                                    <button 
                                                        type="button" 
                                                        class="px-2 py-1 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50 transition"
                                                        @click="removeSubItem(sIndex, iIndex, siIndex)"
                                                    >
                                                        <i data-feather="x" class="w-3 h-3"></i>
                                                    </button>
                                                </div>
                                                <button 
                                                    type="button" 
                                                    class="mt-2 px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 transition flex items-center gap-1"
                                                    @click="addSubItem(sIndex, iIndex)"
                                                >
                                                    <i data-feather="plus" class="w-3 h-3"></i> Add Sub-field
                                                </button>
                                            </div>
                                            <div class="flex gap-2">
                                                <button 
                                                    type="button" 
                                                    class="px-2 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition flex items-center gap-1"
                                                    @click="convertToSimple(sIndex, iIndex)"
                                                >
                                                    <i data-feather="type" class="w-3 h-3"></i> Convert to Simple
                                                </button>
                                                <button 
                                                    type="button" 
                                                    class="px-2 py-1 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50 transition flex items-center gap-1"
                                                    @click="removeItem(sIndex, iIndex)"
                                                >
                                                    <i data-feather="trash-2" class="w-3 h-3"></i> Delete Field Group
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Preview -->
                    <div class="bg-gray-50 border border-gray-200 rounded-lg p-5">
                        <h5 class="text-base font-semibold text-gray-700 mb-4">Form Preview</h5>
                        <div class="bg-white border border-gray-200 rounded-md p-5 min-h-[200px]" v-html="renderPreview()"></div>
                    </div>

                    <!-- Actions -->
                    <div class="flex justify-between gap-3 pt-5 border-t border-gray-200">
                        <button type="button" class="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition" @click="cancel">
                            Cancel
                        </button>
                        <button 
                            type="button" 
                            class="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center gap-2" 
                            @click="generateQuestions"
                            :disabled="!canGenerate"
                        >
                            Generate Questions <i data-feather="arrow-right" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Step 2: Review & Set Answers -->
            <div v-if="currentStep === 2">
                <div class="flex flex-col gap-5">
                    <div class="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg text-orange-700">
                        <i data-feather="info" class="w-5 h-5 flex-shrink-0"></i>
                        <span class="text-sm">{{ generatedQuestions.length }} question(s) generated from form blanks. Set the correct answers below.</span>
                    </div>

                    <div class="flex flex-col gap-4">
                        <div 
                            v-for="(q, index) in generatedQuestions" 
                            :key="'q-' + index"
                            class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                            <div class="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
                                <span class="font-semibold text-gray-700 text-base">Question {{ q.order }}</span>
                                <span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">{{ q.points }} point(s)</span>
                            </div>
                            <div class="mb-4 p-3 bg-gray-50 rounded-md leading-relaxed">
                                <div v-html="q.question_text"></div>
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="font-semibold text-gray-700 text-sm">Correct Answer:</label>
                                <input 
                                    type="text" 
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none" 
                                    v-model="q.correct_answer_text"
                                    placeholder="Enter the correct answer"
                                >
                            </div>
                        </div>
                    </div>

                    <div class="flex justify-between gap-3 pt-5 border-t border-gray-200">
                        <button type="button" class="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition flex items-center gap-2" @click="goBackToEdit">
                            <i data-feather="arrow-left" class="w-4 h-4"></i> Back to Edit
                        </button>
                        <button 
                            type="button" 
                            class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center gap-2" 
                            @click="saveQuestions"
                            :disabled="!canSave"
                        >
                            <i data-feather="check" class="w-4 h-4"></i> Save Questions
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `,

    props: {
        questionType: {
            type: String,
            required: true
        },
        existingQuestions: {
            type: Array,
            default: () => []
        },
        formData: {
            type: String,
            default: ''
        }
    },

    data() {
        return {
            currentStep: 1,
            formStructure: {
                title: '',
                items: []
            },
            generatedQuestions: [],
            isModified: false
        };
    },

    computed: {
        canGenerate() {
            if (!this.formStructure.title.trim()) return false;
            if (this.formStructure.items.length === 0) return false;

            // Check if there's at least one <input> tag
            const hasInputs = this.countInputTags() > 0;
            return hasInputs;
        },

        canSave() {
            return this.generatedQuestions.every(q =>
                q.correct_answer_text && q.correct_answer_text.trim() !== ''
            );
        }
    },

    mounted() {
        this.initializeFeatherIcons();

        // Load existing data if in edit mode
        if (this.formData) {
            try {
                const parsed = JSON.parse(this.formData);
                this.formStructure = parsed;

                // Load existing questions if provided
                if (this.existingQuestions && this.existingQuestions.length > 0) {
                    this.generatedQuestions = this.existingQuestions.map(q => ({
                        question_text: q.question_text,
                        correct_answer_text: q.correct_answer_text || '',
                        order: q.order,
                        points: q.points || 1
                    }));
                }
            } catch (e) {
                console.error('Failed to parse form data:', e);
            }
        }
    },

    updated() {
        this.$nextTick(() => {
            this.initializeFeatherIcons();
        });
    },

    methods: {
        initializeFeatherIcons() {
            if (window.feather) {
                window.feather.replace();
            }
        },

        markAsModified() {
            this.isModified = true;
        },

        // ============================================================================
        // SECTION MANAGEMENT
        // ============================================================================

        addSection() {
            this.formStructure.items.push({
                title: '',
                items: []
            });
            this.markAsModified();
            this.$nextTick(() => this.initializeFeatherIcons());
        },

        removeSection(sIndex) {
            if (confirm('Are you sure you want to delete this section?')) {
                this.formStructure.items.splice(sIndex, 1);
                this.markAsModified();
            }
        },

        moveSectionUp(sIndex) {
            if (sIndex > 0) {
                const temp = this.formStructure.items[sIndex];
                this.formStructure.items.splice(sIndex, 1);
                this.formStructure.items.splice(sIndex - 1, 0, temp);
                this.markAsModified();
            }
        },

        moveSectionDown(sIndex) {
            if (sIndex < this.formStructure.items.length - 1) {
                const temp = this.formStructure.items[sIndex];
                this.formStructure.items.splice(sIndex, 1);
                this.formStructure.items.splice(sIndex + 1, 0, temp);
                this.markAsModified();
            }
        },

        // ============================================================================
        // ITEM MANAGEMENT
        // ============================================================================

        addItem(sIndex) {
            this.formStructure.items[sIndex].items.push('');
            this.markAsModified();
        },

        removeItem(sIndex, iIndex) {
            this.formStructure.items[sIndex].items.splice(iIndex, 1);
            this.markAsModified();
        },

        convertToNested(sIndex, iIndex) {
            const currentText = this.formStructure.items[sIndex].items[iIndex];
            this.formStructure.items[sIndex].items.splice(iIndex, 1, {
                prefix: '',
                items: [currentText || '']
            });
            this.markAsModified();
        },

        convertToSimple(sIndex, iIndex) {
            const nestedItem = this.formStructure.items[sIndex].items[iIndex];
            const text = nestedItem.prefix || (nestedItem.items[0] || '');
            this.formStructure.items[sIndex].items.splice(iIndex, 1, text);
            this.markAsModified();
        },

        addSubItem(sIndex, iIndex) {
            const item = this.formStructure.items[sIndex].items[iIndex];
            if (item && typeof item === 'object' && item.items) {
                item.items.push('');
                this.markAsModified();
            }
        },

        removeSubItem(sIndex, iIndex, siIndex) {
            const item = this.formStructure.items[sIndex].items[iIndex];
            if (item && typeof item === 'object' && item.items) {
                item.items.splice(siIndex, 1);
                this.markAsModified();
            }
        },

        // ============================================================================
        // BLANK INSERTION
        // ============================================================================

        insertBlankInItem(sIndex, iIndex) {
            const currentText = this.formStructure.items[sIndex].items[iIndex];
            this.formStructure.items[sIndex].items[iIndex] = currentText + ' <input> ';
            this.markAsModified();
        },

        insertBlankInSubItem(sIndex, iIndex, siIndex) {
            const item = this.formStructure.items[sIndex].items[iIndex];
            if (item && typeof item === 'object' && item.items) {
                item.items[siIndex] = item.items[siIndex] + ' <input> ';
                this.markAsModified();
            }
        },

        // ============================================================================
        // QUESTION GENERATION
        // ============================================================================

        countInputTags() {
            let count = 0;
            const jsonStr = JSON.stringify(this.formStructure);
            const matches = jsonStr.match(/<input>/gi);
            return matches ? matches.length : 0;
        },

        generateQuestions() {
            if (!this.canGenerate) {
                alert('Please add a form title and at least one <input> blank.');
                return;
            }

            const questions = [];
            let orderNumber = 1;

            // Traverse the structure and find all <input> tags
            this.formStructure.items.forEach((section, sIndex) => {
                section.items.forEach((item, iIndex) => {
                    if (typeof item === 'string') {
                        // Simple field
                        const inputCount = (item.match(/<input>/gi) || []).length;
                        for (let i = 0; i < inputCount; i++) {
                            const context = this.extractContext(item, i);
                            questions.push({
                                question_text: context,
                                correct_answer_text: '',
                                order: orderNumber++,
                                points: 1
                            });
                        }
                    } else if (item.items) {
                        // Nested field with sub-fields
                        item.items.forEach((subItem, siIndex) => {
                            const inputCount = (subItem.match(/<input>/gi) || []).length;
                            for (let i = 0; i < inputCount; i++) {
                                const prefix = item.prefix ? `<strong>${item.prefix}</strong><br>` : '';
                                const context = this.extractContext(subItem, i);
                                questions.push({
                                    question_text: prefix + context,
                                    correct_answer_text: '',
                                    order: orderNumber++,
                                    points: 1
                                });
                            }
                        });
                    }
                });
            });

            this.generatedQuestions = questions;
            this.currentStep = 2;
            this.$nextTick(() => this.initializeFeatherIcons());
        },

        extractContext(text, inputIndex) {
            // Find the nth <input> occurrence and extract context around it
            const parts = text.split(/<input>/i);
            if (inputIndex >= parts.length - 1) return text;

            const before = parts[inputIndex];
            const after = parts[inputIndex + 1];

            // Get last 100 chars before and first 100 chars after
            const beforeContext = before.length > 100 ? '...' + before.slice(-100) : before;
            const afterContext = after.length > 100 ? after.slice(0, 100) + '...' : after;

            return beforeContext + ' <strong>_____</strong> ' + afterContext;
        },

        // ============================================================================
        // PREVIEW
        // ============================================================================

        renderPreview() {
            if (!this.formStructure.title && this.formStructure.items.length === 0) {
                return '<p class="text-gray-500">No content to preview</p>';
            }

            let html = '<div class="max-w-2xl">';

            if (this.formStructure.title) {
                html += `<h4 class="text-xl font-bold text-gray-800 mb-6 pb-3 border-b-2 border-gray-200">${this.escapeHtml(this.formStructure.title)}</h4>`;
            }

            this.formStructure.items.forEach((section, sIndex) => {
                if (section.title) {
                    html += `<h5 class="text-base font-semibold text-gray-700 mt-5 mb-3 bg-gray-100 px-3 py-2 rounded">${this.escapeHtml(section.title)}</h5>`;
                }

                html += '<div class="space-y-3 mb-6">';
                section.items.forEach((item, iIndex) => {
                    if (typeof item === 'string') {
                        const rendered = item.replace(/<input>/gi, '<span class="inline-block border-b-2 border-orange-500 min-w-[120px] px-2 text-orange-600 font-semibold">_____</span>');
                        html += `<div class="flex items-start gap-2 py-2">
                            <span class="text-gray-600 mt-1">•</span>
                            <div class="flex-1">${rendered}</div>
                        </div>`;
                    } else if (item.items) {
                        html += '<div class="py-2">';
                        html += '<div class="flex items-start gap-2">';
                        html += '<span class="text-gray-600 mt-1">•</span>';
                        html += '<div class="flex-1">';
                        if (item.prefix) {
                            html += `<strong class="text-gray-700">${this.escapeHtml(item.prefix)}</strong>`;
                        }
                        html += '<div class="ml-6 mt-2 space-y-2">';
                        item.items.forEach(subItem => {
                            const rendered = subItem.replace(/<input>/gi, '<span class="inline-block border-b-2 border-orange-500 min-w-[120px] px-2 text-orange-600 font-semibold">_____</span>');
                            html += `<div class="flex items-start gap-2">
                                <span class="text-gray-400 text-sm">◦</span>
                                <div class="flex-1">${rendered}</div>
                            </div>`;
                        });
                        html += '</div></div></div></div>';
                    }
                });
                html += '</div>';
            });

            html += '</div>';
            return html;
        },

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        // ============================================================================
        // NAVIGATION
        // ============================================================================

        goBackToEdit() {
            this.currentStep = 1;
            this.$nextTick(() => this.initializeFeatherIcons());
        },

        cancel() {
            if (this.isModified) {
                if (!confirm('You have unsaved changes. Are you sure you want to cancel?')) {
                    return;
                }
            }
            this.$emit('cancel');
        },

        // ============================================================================
        // SAVE
        // ============================================================================

        saveQuestions() {
            if (!this.canSave) {
                alert('Please set answers for all questions.');
                return;
            }

            // Emit the questions and structure
            this.$emit('questions-ready', this.generatedQuestions);
            this.$emit('update:form-data', JSON.stringify(this.formStructure, null, 2));
        }
    }
};

// Register component globally
if (window.app) {
    window.app.component('form-completion-builder', FormCompletionBuilderComponent);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormCompletionBuilderComponent;
}

// Expose to window for direct script tag usage
window.FormCompletionBuilderComponent = FormCompletionBuilderComponent;
