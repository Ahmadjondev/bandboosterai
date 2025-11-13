/**
 * Map Labeling Builder Component
 * 
 * Advanced builder for creating Map Labeling questions:
 * - Upload map/floor plan image
 * - Place clickable label markers on the map
 * - Auto-generate questions from labels
 * - Visual interactive map editor
 * 
 * Features:
 * - Image upload with preview
 * - Click-to-place labels on map
 * - Drag-and-drop label positioning
 * - Auto-number labels
 * - Question generation from labels
 * - Edit mode support
 * - Responsive image scaling
 */

const MapLabelingBuilderComponent = {
    template: `
        <div class="bg-white rounded-lg p-6 shadow-sm">
            <!-- Header -->
            <div class="mb-6 pb-4 border-b-2 border-gray-200">
                <h3 class="text-2xl font-semibold text-gray-800 mb-2">🗺️ Map Labeling Builder</h3>
                <p class="text-gray-500 text-sm">Upload a map with numbered labels and specify the location names for each number</p>
            </div>

            <!-- Step 1: Upload Map & Add Labels -->
            <div v-if="currentStep === 1">
                <div class="flex flex-col gap-5">
                    <!-- Map Title -->
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">
                            Map Title
                            <span class="text-red-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition" 
                            v-model="mapData.title"
                            placeholder="e.g., Campus Map, Shopping Mall Layout, City Center Map"
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
                            v-model="mapData.description"
                            placeholder="Add context or instructions for the map (e.g., 'Listen to the directions and label the map')"
                            rows="2"
                            @input="markAsModified"
                        ></textarea>
                    </div>

                    <!-- Image Upload Section -->
                    <div class="bg-gray-50 border border-gray-200 rounded-lg p-5">
                        <label class="block text-sm font-semibold text-gray-700 mb-3">
                            Map Image (with numbered labels)
                            <span class="text-red-500">*</span>
                        </label>

                        <!-- Upload Area (shown when no image) -->
                        <div v-if="!mapData.imageUrl && !imagePreview" 
                             class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-400 transition cursor-pointer"
                             @click="triggerFileUpload"
                             @dragover.prevent="onDragOver"
                             @dragleave.prevent="onDragLeave"
                             @drop.prevent="onDrop"
                             :class="{'border-orange-400 bg-orange-50': isDragging}">
                            <i data-feather="upload-cloud" class="w-12 h-12 mx-auto mb-4 text-gray-400"></i>
                            <p class="text-gray-600 mb-2">Click to upload or drag and drop</p>
                            <p class="text-sm text-gray-500">PNG, JPG, GIF up to 5MB - Map should have numbered labels (1, 2, 3...)</p>
                            <input 
                                type="file" 
                                ref="fileInput" 
                                accept="image/*" 
                                class="hidden"
                                @change="onFileSelect"
                            >
                        </div>

                        <!-- Image Preview -->
                        <div v-else class="space-y-4">
                            <!-- Image Container -->
                            <div class="relative bg-gray-100 rounded-lg overflow-hidden" 
                                 style="max-width: 100%; max-height: 600px;">
                                <img 
                                    :src="imagePreview || mapData.imageUrl" 
                                    ref="mapImage"
                                    class="w-full h-auto"
                                    @load="onImageLoad"
                                    alt="Map"
                                >
                                <!-- Badge showing if image is new -->
                                <div v-if="imagePreview && !mapData.imageUrl" class="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                                    New Image
                                </div>
                                <div v-else-if="imagePreview && mapData.imageUrl" class="absolute top-2 right-2 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                                    Image Changed
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
                                    {{ mapData.imageUrl ? 'Change Image' : 'Upload Image' }}
                                </button>
                            </div>

                            <!-- Instructions -->
                            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div class="flex gap-3">
                                    <i data-feather="info" class="w-5 h-5 text-blue-600 flex-shrink-0"></i>
                                    <div class="text-sm text-blue-800">
                                        <p class="font-semibold mb-1">Important:</p>
                                        <ul class="list-disc pl-5 space-y-1">
                                            <li>Your map image should already have numbered labels (1, 2, 3, etc.)</li>
                                            <li>Below, you'll specify the location name and answer for each number</li>
                                            <li>Students will see the map and need to write the correct answers</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Number of Labels Input -->
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">
                            How many labels are on the map?
                            <span class="text-red-500">*</span>
                        </label>
                        <input 
                            type="number" 
                            min="1" 
                            max="20"
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition" 
                            v-model.number="mapData.labelCount"
                            placeholder="e.g., 6"
                            @input="updateLabelCount"
                        >
                        <p class="text-sm text-gray-500 mt-1">Enter the number of labeled locations on your map (1-20)</p>
                    </div>

                    <!-- Label Names Input (appears when labelCount is set) -->
                    <div v-if="mapData.labelCount > 0" class="bg-white border border-gray-200 rounded-lg p-6">
                        <h5 class="text-sm font-semibold text-gray-700 mb-4">Enter Label Names and Correct Answers</h5>
                        <p class="text-sm text-gray-500 mb-4">Students will see: "11. Shop _________" and must write the correct answer (e.g., H)</p>
                        <div class="space-y-3">
                            <div 
                                v-for="(label, index) in mapData.labels" 
                                :key="'label-' + index"
                                class="flex items-center gap-3"
                            >
                                <span class="w-12 text-right font-semibold text-gray-700">{{ index + 1 }}.</span>
                                <div class="flex-1">
                                    <input 
                                        type="text" 
                                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none" 
                                        v-model="label.name"
                                        :placeholder="'Label name (e.g., Shop, Playground)'"
                                        @input="markAsModified"
                                    >
                                </div>
                                <span class="text-gray-500 font-medium whitespace-nowrap">Answer:</span>
                                <input 
                                    type="text" 
                                    class="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-center" 
                                    v-model="label.correctAnswer"
                                    :placeholder="'H'"
                                    @input="markAsModified"
                                >
                            </div>
                        </div>
                        <p class="text-xs text-gray-500 mt-4">
                            <i data-feather="info" class="w-4 h-4 inline"></i>
                            Example: Label name "Shop" with answer "H" → Student sees "11. Shop _________" and writes "H"
                        </p>
                    </div>

                    <!-- Actions -->
                    <div class="flex justify-between gap-3 pt-5 border-t border-gray-200">
                        <button type="button" class="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition" @click="cancel">
                            Cancel
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
        mapDataProp: {
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
            mapData: {
                title: '',
                description: '',
                imageUrl: '',
                imageFile: null,
                labelCount: 0, // Number of labels on the map
                labels: [], // Array of {name: 'Shop'} objects
                imageDimensions: { width: 0, height: 0 }
            },
            imagePreview: null,
            isModified: false,
            isDragging: false
        };
    },

    computed: {
        canSave() {
            if (!this.mapData.title.trim()) return false;
            if (!this.imagePreview && !this.mapData.imageUrl) return false;
            if (!this.mapData.labelCount || this.mapData.labelCount < 1) return false;
            // Check all labels have names and correct answers
            return this.mapData.labels.every(label =>
                label.name && label.name.trim() !== '' &&
                label.correctAnswer && label.correctAnswer.trim() !== ''
            );
        }
    },

    mounted() {
        this.initializeFeatherIcons();

        // Load existing data if in edit mode
        if (this.mapDataProp) {
            try {
                const parsed = JSON.parse(this.mapDataProp);
                // Deep merge to preserve reactivity
                this.mapData.title = parsed.title || '';
                this.mapData.description = parsed.description || '';
                this.mapData.labelCount = parsed.labelCount || 0;
                this.mapData.labels = parsed.labels || [];
                this.mapData.imageDimensions = parsed.imageDimensions || { width: 0, height: 0 };

                console.log('Loaded map data from prop:', this.mapData);
            } catch (e) {
                console.error('Failed to parse map data:', e);
            }
        }

        if (this.existingImageUrl) {
            this.mapData.imageUrl = this.existingImageUrl;
            console.log('Loaded existing image URL:', this.existingImageUrl);
        }

        // Load existing questions if provided (override mapDataProp if present)
        if (this.existingQuestions && this.existingQuestions.length > 0) {
            this.mapData.labelCount = this.existingQuestions.length;
            this.mapData.labels = this.existingQuestions.map(q => ({
                name: q.question_text || '',
                correctAnswer: q.correct_answer_text || ''
            }));
            console.log('Loaded questions into labels:', this.mapData.labels);
        }

        // Trigger icon initialization after data is loaded
        this.$nextTick(() => {
            this.initializeFeatherIcons();
        });
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

            this.mapData.imageFile = file;

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

        },

        onImageLoad() {
            if (this.$refs.mapImage) {
                this.mapData.imageDimensions = {
                    width: this.$refs.mapImage.naturalWidth,
                    height: this.$refs.mapImage.naturalHeight
                };
            }
        },

        // ============================================================================
        // LABEL COUNT MANAGEMENT
        // ============================================================================

        updateLabelCount() {
            this.markAsModified();
            const count = parseInt(this.mapData.labelCount) || 0;

            // Adjust labels array to match count
            if (count > this.mapData.labels.length) {
                // Add new empty labels
                for (let i = this.mapData.labels.length; i < count; i++) {
                    this.mapData.labels.push({ name: '', correctAnswer: '' });
                }
            } else if (count < this.mapData.labels.length) {
                // Remove extra labels
                this.mapData.labels = this.mapData.labels.slice(0, count);
            }

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
                // Provide specific error messages
                if (!this.mapData.title.trim()) {
                    alert('Please enter a map title.');
                } else if (!this.imagePreview && !this.mapData.imageUrl) {
                    alert('Please upload a map image.');
                } else if (!this.mapData.labelCount || this.mapData.labelCount < 1) {
                    alert('Please specify the number of labels on your map.');
                } else {
                    // Check which labels are incomplete
                    const incompleteLabels = [];
                    this.mapData.labels.forEach((label, index) => {
                        if (!label.name || !label.name.trim()) {
                            incompleteLabels.push(`${index + 1} (missing label name)`);
                        } else if (!label.correctAnswer || !label.correctAnswer.trim()) {
                            incompleteLabels.push(`${index + 1} (missing answer)`);
                        }
                    });

                    if (incompleteLabels.length > 0) {
                        alert(`Please complete all label information.\n\nIncomplete labels: ${incompleteLabels.join(', ')}`);
                    } else {
                        alert('Please complete all required fields.');
                    }
                }
                return;
            }

            // Generate questions from labels
            const questions = this.mapData.labels.map((label, index) => ({
                question_text: label.name,
                correct_answer_text: label.correctAnswer,
                order: index + 1,
                points: 1
            }));

            console.log('Generated questions:', questions);

            // Emit the questions and map data
            this.$emit('questions-ready', questions);

            const mapDataToSave = {
                title: this.mapData.title,
                description: this.mapData.description,
                labelCount: this.mapData.labelCount,
                labels: this.mapData.labels,
                imageDimensions: this.mapData.imageDimensions
            };

            console.log('Emitting map data:', mapDataToSave);
            this.$emit('map-data-updated', JSON.stringify(mapDataToSave, null, 2));

            // Emit image file separately if there's a new upload
            if (this.mapData.imageFile) {
                console.log('Emitting map image file:', this.mapData.imageFile.name);
                this.$emit('map-image-updated', this.mapData.imageFile);
            } else {
                console.log('No new image file to emit');
            }
        }
    }
};

// Register component globally
if (window.app) {
    window.app.component('map-labeling-builder', MapLabelingBuilderComponent);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MapLabelingBuilderComponent;
}

// Expose to window for direct script tag usage
window.MapLabelingBuilderComponent = MapLabelingBuilderComponent;
