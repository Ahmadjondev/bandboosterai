/**
 * Diagram Labeling Builder Component
 * 
 * Advanced builder for creating Diagram Labeling questions:
 * - Upload diagram/image
 * - Place clickable label markers on the image
 * - Auto-generate questions from labels
 * - Visual interactive diagram editor
 * 
 * Features:
 * - Image upload with preview
 * - Click-to-place labels on diagram
 * - Drag-and-drop label positioning
 * - Auto-number labels
 * - Question generation from labels
 * - Edit mode support
 * - Responsive image scaling
 */

const DiagramLabelingBuilderComponent = {
    template: `
        <div class="bg-white rounded-lg p-6 shadow-sm">
            <!-- Header -->
            <div class="mb-6 pb-4 border-b-2 border-gray-200">
                <h3 class="text-2xl font-semibold text-gray-800 mb-2">🖼️ Diagram Labeling Builder</h3>
                <p class="text-gray-500 text-sm">Upload a diagram and place numbered labels for students to complete</p>
            </div>

            <!-- Step 1: Upload & Label Diagram -->
            <div v-if="currentStep === 1">
                <div class="flex flex-col gap-5">
                    <!-- Diagram Title -->
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">
                            Diagram Title
                            <span class="text-red-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition" 
                            v-model="diagramData.title"
                            placeholder="e.g., Parts of a Plant, Water Cycle Diagram"
                            @input="markAsModified"
                        >
                    </div>

                    <!-- Description (Optional) -->
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">
                            Description (Optional)
                        </label>
                        <textarea 
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition resize-y" 
                            v-model="diagramData.description"
                            placeholder="Add instructions or context for the diagram..."
                            rows="2"
                            @input="markAsModified"
                        ></textarea>
                    </div>

                    <!-- Image Upload Section -->
                    <div class="bg-gray-50 border border-gray-200 rounded-lg p-5">
                        <label class="block text-sm font-semibold text-gray-700 mb-3">
                            Diagram Image
                            <span class="text-red-500">*</span>
                        </label>

                        <!-- Upload Area (shown when no image) -->
                        <div v-if="!diagramData.imageUrl && !imagePreview" 
                             class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-400 transition cursor-pointer"
                             @click="triggerFileUpload"
                             @dragover.prevent="onDragOver"
                             @dragleave.prevent="onDragLeave"
                             @drop.prevent="onDrop"
                             :class="{'border-orange-400 bg-orange-50': isDragging}">
                            <i data-feather="upload-cloud" class="w-12 h-12 mx-auto mb-4 text-gray-400"></i>
                            <p class="text-gray-600 mb-2">Click to upload or drag and drop</p>
                            <p class="text-sm text-gray-500">PNG, JPG, GIF up to 5MB</p>
                            <input 
                                type="file" 
                                ref="fileInput" 
                                accept="image/*" 
                                class="hidden"
                                @change="onFileSelect"
                            >
                        </div>

                        <!-- Image Preview with Label Editor -->
                        <div v-else class="space-y-4">
                            <!-- Image Container with Labels -->
                            <div class="relative bg-gray-100 rounded-lg overflow-hidden" 
                                 style="max-width: 100%; max-height: 600px;">
                                <img 
                                    :src="imagePreview || diagramData.imageUrl" 
                                    ref="diagramImage"
                                    class="w-full h-auto cursor-crosshair"
                                    @click="addLabelAtClick"
                                    @load="onImageLoad"
                                    alt="Diagram"
                                >
                                
                                <!-- Label Markers -->
                                <div 
                                    v-for="(label, index) in diagramData.labels" 
                                    :key="'label-' + index"
                                    class="absolute cursor-move group"
                                    :style="getLabelStyle(label)"
                                    @mousedown="startDrag(index, $event)"
                                    @click.stop
                                >
                                    <div class="relative">
                                        <!-- Label Number Circle -->
                                        <div class="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg border-2 border-white group-hover:bg-red-600 transition">
                                            {{ index + 1 }}
                                        </div>
                                        <!-- Delete Button (on hover) -->
                                        <button 
                                            type="button"
                                            class="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                                            @click="removeLabel(index)"
                                            title="Remove label"
                                        >
                                            <i data-feather="x" class="w-3 h-3"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Controls -->
                            <div class="flex gap-3 flex-wrap">
                                <button 
                                    type="button" 
                                    class="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition flex items-center gap-2"
                                    @click="triggerFileUpload"
                                >
                                    <i data-feather="upload" class="w-4 h-4"></i>
                                    Change Image
                                </button>
                                <button 
                                    type="button" 
                                    class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                                    @click="addLabelAtCenter"
                                >
                                    <i data-feather="plus" class="w-4 h-4"></i>
                                    Add Label
                                </button>
                                <button 
                                    type="button" 
                                    class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2"
                                    @click="clearAllLabels"
                                    v-if="diagramData.labels.length > 0"
                                >
                                    <i data-feather="trash-2" class="w-4 h-4"></i>
                                    Clear All Labels
                                </button>
                            </div>

                            <!-- Instructions -->
                            <div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                <div class="flex gap-3">
                                    <i data-feather="info" class="w-5 h-5 text-orange-600 flex-shrink-0"></i>
                                    <div class="text-sm text-orange-800">
                                        <p class="font-semibold mb-1">How to add labels:</p>
                                        <ul class="list-disc pl-5 space-y-1">
                                            <li>Click anywhere on the diagram to place a numbered label</li>
                                            <li>Drag labels to reposition them</li>
                                            <li>Hover over a label and click the X to remove it</li>
                                            <li>Each label will generate one question</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <!-- Label Count -->
                            <div class="text-sm text-gray-600">
                                <strong>{{ diagramData.labels.length }}</strong> label(s) placed on diagram
                            </div>
                        </div>
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
                    <!-- Info Banner -->
                    <div class="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg text-orange-700">
                        <i data-feather="info" class="w-5 h-5 flex-shrink-0"></i>
                        <span class="text-sm">{{ generatedQuestions.length }} question(s) generated from diagram labels. Set the correct answers below.</span>
                    </div>

                    <!-- Diagram Preview (smaller) -->
                    <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h5 class="text-sm font-semibold text-gray-700 mb-3">Diagram Preview</h5>
                        <div class="relative inline-block max-w-md">
                            <img 
                                :src="imagePreview || diagramData.imageUrl" 
                                class="w-full h-auto rounded border border-gray-300"
                                alt="Diagram"
                            >
                            <!-- Small Label Markers -->
                            <div 
                                v-for="(label, index) in diagramData.labels" 
                                :key="'preview-label-' + index"
                                class="absolute"
                                :style="getLabelStyle(label)"
                            >
                                <div class="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-lg border-2 border-white">
                                    {{ index + 1 }}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Questions List -->
                    <div class="flex flex-col gap-4">
                        <div 
                            v-for="(q, index) in generatedQuestions" 
                            :key="'q-' + index"
                            class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                            <div class="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
                                <div class="flex items-center gap-3">
                                    <span class="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                                        {{ index + 1 }}
                                    </span>
                                    <span class="font-semibold text-gray-700 text-base">Label {{ index + 1 }}</span>
                                </div>
                                <span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">{{ q.points }} point(s)</span>
                            </div>
                            <div class="mb-4 p-3 bg-gray-50 rounded-md">
                                <p class="text-sm text-gray-600">What is label {{ index + 1 }} on the diagram?</p>
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="font-semibold text-gray-700 text-sm">Correct Answer:</label>
                                <input 
                                    type="text" 
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none" 
                                    v-model="q.correct_answer_text"
                                    placeholder="Enter the correct label/part name"
                                >
                            </div>
                        </div>
                    </div>

                    <!-- Actions -->
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
        diagramDataProp: {
            type: String,
            default: ''
        },
        existingImageUrl: {
            type: String,
            default: ''
        }
    },

    data() {
        return {
            currentStep: 1,
            diagramData: {
                title: '',
                description: '',
                imageUrl: '',
                imageFile: null,
                labels: [], // [{x: 0.5, y: 0.3}] - stored as percentages
                imageDimensions: { width: 0, height: 0 }
            },
            imagePreview: null,
            generatedQuestions: [],
            isModified: false,
            isDragging: false,
            draggedLabelIndex: null,
            dragStartPos: { x: 0, y: 0 }
        };
    },

    computed: {
        canGenerate() {
            if (!this.diagramData.title.trim()) return false;
            if (!this.imagePreview && !this.diagramData.imageUrl) return false;
            if (this.diagramData.labels.length === 0) return false;
            return true;
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
        if (this.diagramDataProp) {
            try {
                const parsed = JSON.parse(this.diagramDataProp);
                this.diagramData = { ...this.diagramData, ...parsed };
            } catch (e) {
                console.error('Failed to parse diagram data:', e);
            }
        }

        if (this.existingImageUrl) {
            this.diagramData.imageUrl = this.existingImageUrl;
        }

        // Load existing questions if provided
        if (this.existingQuestions && this.existingQuestions.length > 0) {
            this.generatedQuestions = this.existingQuestions.map(q => ({
                question_text: q.question_text,
                correct_answer_text: q.correct_answer_text || '',
                order: q.order,
                points: q.points || 1
            }));
        }

        // Add global mouse event listeners for dragging
        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('mouseup', this.onMouseUp);
    },

    beforeUnmount() {
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mouseup', this.onMouseUp);
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
        // FILE UPLOAD HANDLING
        // ============================================================================

        triggerFileUpload() {
            this.$refs.fileInput.click();
        },

        onFileSelect(event) {
            const file = event.target.files[0];
            if (file) {
                this.handleFile(file);
            }
        },

        onDragOver(event) {
            this.isDragging = true;
        },

        onDragLeave(event) {
            this.isDragging = false;
        },

        onDrop(event) {
            this.isDragging = false;
            const file = event.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.handleFile(file);
            }
        },

        handleFile(file) {
            // Validate file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                alert('File size must be less than 5MB');
                return;
            }

            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please upload an image file');
                return;
            }

            this.diagramData.imageFile = file;

            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                this.imagePreview = e.target.result;
                this.markAsModified();
                this.$nextTick(() => {
                    this.initializeFeatherIcons();
                });
            };
            reader.readAsDataURL(file);

            // Clear previous labels when changing image
            if (this.diagramData.labels.length > 0) {
                if (confirm('Changing the image will remove all placed labels. Continue?')) {
                    this.diagramData.labels = [];
                } else {
                    // Revert
                    this.diagramData.imageFile = null;
                    this.imagePreview = null;
                }
            }
        },

        onImageLoad() {
            if (this.$refs.diagramImage) {
                this.diagramData.imageDimensions = {
                    width: this.$refs.diagramImage.naturalWidth,
                    height: this.$refs.diagramImage.naturalHeight
                };
            }
        },

        // ============================================================================
        // LABEL MANAGEMENT
        // ============================================================================

        addLabelAtClick(event) {
            const rect = event.target.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width;
            const y = (event.clientY - rect.top) / rect.height;

            this.diagramData.labels.push({ x, y });
            this.markAsModified();
            this.$nextTick(() => {
                this.initializeFeatherIcons();
            });
        },

        addLabelAtCenter() {
            this.diagramData.labels.push({ x: 0.5, y: 0.5 });
            this.markAsModified();
            this.$nextTick(() => {
                this.initializeFeatherIcons();
            });
        },

        removeLabel(index) {
            if (confirm('Remove this label?')) {
                this.diagramData.labels.splice(index, 1);
                this.markAsModified();
            }
        },

        clearAllLabels() {
            if (confirm('Remove all labels from the diagram?')) {
                this.diagramData.labels = [];
                this.markAsModified();
            }
        },

        getLabelStyle(label) {
            return {
                left: `${label.x * 100}%`,
                top: `${label.y * 100}%`,
                transform: 'translate(-50%, -50%)'
            };
        },

        // ============================================================================
        // LABEL DRAGGING
        // ============================================================================

        startDrag(index, event) {
            this.draggedLabelIndex = index;
            this.dragStartPos = {
                x: event.clientX,
                y: event.clientY
            };
            event.preventDefault();
        },

        onMouseMove(event) {
            if (this.draggedLabelIndex === null) return;

            const image = this.$refs.diagramImage;
            if (!image) return;

            const rect = image.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width;
            const y = (event.clientY - rect.top) / rect.height;

            // Clamp to 0-1 range
            const clampedX = Math.max(0, Math.min(1, x));
            const clampedY = Math.max(0, Math.min(1, y));

            this.diagramData.labels[this.draggedLabelIndex].x = clampedX;
            this.diagramData.labels[this.draggedLabelIndex].y = clampedY;
            this.markAsModified();
        },

        onMouseUp() {
            if (this.draggedLabelIndex !== null) {
                this.draggedLabelIndex = null;
            }
        },

        // ============================================================================
        // QUESTION GENERATION
        // ============================================================================

        generateQuestions() {
            if (!this.canGenerate) {
                alert('Please add a title, upload an image, and place at least one label.');
                return;
            }

            const questions = [];
            this.diagramData.labels.forEach((label, index) => {
                questions.push({
                    question_text: `Label ${index + 1}`,
                    correct_answer_text: '',
                    order: index + 1,
                    points: 1
                });
            });

            this.generatedQuestions = questions;
            this.currentStep = 2;
            this.$nextTick(() => this.initializeFeatherIcons());
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

            // Emit the questions and diagram data
            this.$emit('questions-ready', this.generatedQuestions);

            const diagramDataToSave = {
                title: this.diagramData.title,
                description: this.diagramData.description,
                labels: this.diagramData.labels,
                imageDimensions: this.diagramData.imageDimensions
            };

            this.$emit('diagram-data-updated', JSON.stringify(diagramDataToSave, null, 2));

            // Emit image file separately if there's a new upload
            if (this.diagramData.imageFile) {
                console.log('Emitting diagram image file:', this.diagramData.imageFile.name);
                this.$emit('diagram-image-updated', this.diagramData.imageFile);
            } else {
                console.log('No new diagram image file to emit');
            }
        }
    }
};

// Register component globally
if (window.app) {
    window.app.component('diagram-labeling-builder', DiagramLabelingBuilderComponent);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DiagramLabelingBuilderComponent;
}

// Expose to window for direct script tag usage
window.DiagramLabelingBuilderComponent = DiagramLabelingBuilderComponent;
