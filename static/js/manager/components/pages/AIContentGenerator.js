/**
 * AI Content Generator Component
 * Allows managers to upload PDF files and generate IELTS test content using AI
 * Adapted from BandBooster with current project's UI/UX design
 */

window.AIContentGenerator = {
    name: 'AIContentGenerator',

    data() {
        return {
            // Step management
            currentStep: 1,
            steps: [
                { number: 1, title: 'Upload Content', icon: 'upload' },
                { number: 2, title: 'Review Content', icon: 'eye' },
                { number: 3, title: 'Save to Database', icon: 'database' }
            ],

            // Upload mode
            uploadMode: 'pdf', // 'pdf' or 'json'

            // Upload state
            selectedFile: null,
            selectedJsonFile: null,
            contentType: 'auto',
            isUploading: false,
            uploadProgress: 0,

            // Generated content
            extractedData: null,
            contentTypes: [
                { value: 'auto', label: 'Auto-detect', icon: 'zap' },
                { value: 'reading', label: 'Reading', icon: 'book-open' },
                { value: 'listening', label: 'Listening', icon: 'headphones' },
                { value: 'writing', label: 'Writing', icon: 'edit' },
                { value: 'speaking', label: 'Speaking', icon: 'mic' }
            ],

            // Edit state
            editingItem: null,
            editBuffer: {},

            // Save state
            isSaving: false,
            saveProgress: 0,
            savedItems: [],

            // Notifications
            notification: null,
        };
    },

    computed: {
        canProceedToReview() {
            if (this.uploadMode === 'pdf') {
                return this.selectedFile && !this.isUploading;
            } else {
                return this.selectedJsonFile && !this.isUploading;
            }
        },

        canSaveContent() {
            return this.extractedData && this.extractedData.success;
        },

        hasValidationWarnings() {
            if (!this.extractedData || !this.extractedData.data) return false;
            const errors = this.validateContent();
            return errors.length > 0;
        }
    },

    methods: {
        // Upload mode toggle
        setUploadMode(mode) {
            this.uploadMode = mode;
            this.selectedFile = null;
            this.selectedJsonFile = null;
            this.extractedData = null;
        },

        // File upload
        selectFile(event) {
            const file = event.target.files[0];
            if (!file) return;

            if (!file.type.includes('pdf')) {
                this.showNotification('Please select a PDF file', 'error');
                return;
            }

            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                this.showNotification('File size must be less than 10MB', 'error');
                return;
            }

            this.selectedFile = file;
        },

        // JSON file upload
        selectJsonFile(event) {
            const file = event.target.files[0];
            if (!file) return;

            if (!file.name.endsWith('.json')) {
                this.showNotification('Please select a JSON file', 'error');
                return;
            }

            if (file.size > 5 * 1024 * 1024) { // 5MB limit for JSON
                this.showNotification('File size must be less than 5MB', 'error');
                return;
            }

            this.selectedJsonFile = file;
        },

        triggerFileInput() {
            this.$refs.fileInput.click();
        },

        triggerJsonFileInput() {
            this.$refs.jsonFileInput.click();
        },

        // Generate content
        async generateContent() {
            if (this.uploadMode === 'pdf') {
                await this.generateFromPdf();
            } else {
                await this.processJsonFile();
            }
        },

        async generateFromPdf() {
            if (!this.selectedFile) return;

            this.isUploading = true;
            this.uploadProgress = 0;

            const formData = new FormData();
            formData.append('pdf_file', this.selectedFile);
            formData.append('content_type', this.contentType);

            try {
                const response = await fetch('/manager/api/tests/ai-generate/', {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': this.getCSRFToken()
                    },
                    body: formData
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    this.extractedData = result.data;
                    this.currentStep = 2;
                    this.showNotification('Content extracted successfully!', 'success');
                } else {
                    this.showNotification(result.error || 'Failed to extract content', 'error');
                }
            } catch (error) {
                this.showNotification('Upload error: ' + error.message, 'error');
            } finally {
                this.isUploading = false;
                this.uploadProgress = 0;
            }
        },

        async processJsonFile() {
            if (!this.selectedJsonFile) return;

            this.isUploading = true;
            this.uploadProgress = 0;

            try {
                const fileContent = await this.selectedJsonFile.text();
                const jsonData = JSON.parse(fileContent);

                // Validate JSON structure
                if (!jsonData.success || !jsonData.content_type) {
                    this.showNotification('Invalid JSON format. Must have "success" and "content_type" fields.', 'error');
                    return;
                }

                // Check if content type matches (if not auto)
                if (this.contentType !== 'auto' && jsonData.content_type !== this.contentType) {
                    this.showNotification(
                        `Content type mismatch. Expected ${this.contentType}, got ${jsonData.content_type}`,
                        'error'
                    );
                    return;
                }

                // Set the extracted data
                this.extractedData = jsonData;
                this.currentStep = 2;
                this.showNotification('JSON content loaded successfully!', 'success');

            } catch (error) {
                if (error instanceof SyntaxError) {
                    this.showNotification('Invalid JSON format: ' + error.message, 'error');
                } else {
                    this.showNotification('Error processing JSON: ' + error.message, 'error');
                }
            } finally {
                this.isUploading = false;
                this.uploadProgress = 0;
            }
        },

        // Save content to database
        async saveContentToDatabase() {
            if (!this.extractedData) return;

            this.isSaving = true;
            this.saveProgress = 0;
            this.savedItems = [];

            try {
                const response = await fetch('/manager/api/tests/ai-save/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': this.getCSRFToken()
                    },
                    body: JSON.stringify({
                        content_type: this.extractedData.content_type,
                        data: this.extractedData
                    })
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    this.savedItems = result.passages || result.parts || result.tasks || result.topics || [];
                    this.currentStep = 3;
                    this.showNotification(result.message, 'success');
                } else {
                    this.showNotification(result.error || 'Failed to save content', 'error');
                }
            } catch (error) {
                this.showNotification('Save error: ' + error.message, 'error');
            } finally {
                this.isSaving = false;
                this.saveProgress = 0;
            }
        },

        // Edit functions
        startEdit(key, currentValue) {
            this.editingItem = key;
            this.editBuffer[key] = currentValue;
        },

        startEditPassage(pIdx, passage) {
            this.editingItem = 'passage-title-' + pIdx;
            this.editBuffer['passage-title-' + pIdx] = passage.title;
            this.editBuffer['passage-summary-' + pIdx] = passage.summary;
        },

        saveEditPassage(pIdx) {
            this.extractedData.passages[pIdx].title = this.editBuffer['passage-title-' + pIdx];
            this.extractedData.passages[pIdx].summary = this.editBuffer['passage-summary-' + pIdx];
            this.editingItem = null;
            this.editBuffer = {};
            this.showNotification('Passage updated', 'success');
        },

        startEditPart(pIdx, part) {
            this.editingItem = 'part-title-' + pIdx;
            this.editBuffer['part-title-' + pIdx] = part.title;
            this.editBuffer['part-desc-' + pIdx] = part.description;
        },

        saveEditPart(pIdx) {
            this.extractedData.parts[pIdx].title = this.editBuffer['part-title-' + pIdx];
            this.extractedData.parts[pIdx].description = this.editBuffer['part-desc-' + pIdx];
            this.editingItem = null;
            this.editBuffer = {};
            this.showNotification('Part updated', 'success');
        },

        startEditGroup(pIdx, gIdx, group) {
            this.editingItem = 'group-title-' + pIdx + '-' + gIdx;
            this.editBuffer['group-title-' + pIdx + '-' + gIdx] = group.title;
            this.editBuffer['group-desc-' + pIdx + '-' + gIdx] = group.description;
        },

        saveEditGroup(pIdx, gIdx) {
            const passages = this.extractedData.passages || this.extractedData.parts;
            passages[pIdx].question_groups[gIdx].title = this.editBuffer['group-title-' + pIdx + '-' + gIdx];
            passages[pIdx].question_groups[gIdx].description = this.editBuffer['group-desc-' + pIdx + '-' + gIdx];
            this.editingItem = null;
            this.editBuffer = {};
            this.showNotification('Test head updated', 'success');
        },

        startEditQuestion(pIdx, gIdx, qIdx, question) {
            this.editingItem = 'question-' + pIdx + '-' + gIdx + '-' + qIdx;
            this.editBuffer['question-text-' + pIdx + '-' + gIdx + '-' + qIdx] = question.text;
            this.editBuffer['question-answer-' + pIdx + '-' + gIdx + '-' + qIdx] = question.correct_answer;
        },

        saveEditQuestion(pIdx, gIdx, qIdx) {
            const passages = this.extractedData.passages || this.extractedData.parts;
            passages[pIdx].question_groups[gIdx].questions[qIdx].text =
                this.editBuffer['question-text-' + pIdx + '-' + gIdx + '-' + qIdx];
            passages[pIdx].question_groups[gIdx].questions[qIdx].correct_answer =
                this.editBuffer['question-answer-' + pIdx + '-' + gIdx + '-' + qIdx];
            this.editingItem = null;
            this.editBuffer = {};
            this.showNotification('Question updated', 'success');
        },

        startEditTask(tIdx, task) {
            this.editingItem = 'task-' + tIdx;
            this.editBuffer['task-title-' + tIdx] = task.title;
            this.editBuffer['task-desc-' + tIdx] = task.description;
            this.editBuffer['task-limit-' + tIdx] = task.word_limit;
        },

        saveEditTask(tIdx) {
            this.extractedData.tasks[tIdx].title = this.editBuffer['task-title-' + tIdx];
            this.extractedData.tasks[tIdx].description = this.editBuffer['task-desc-' + tIdx];
            this.extractedData.tasks[tIdx].word_limit = this.editBuffer['task-limit-' + tIdx];
            this.editingItem = null;
            this.editBuffer = {};
            this.showNotification('Task updated', 'success');
        },

        cancelEdit() {
            this.editingItem = null;
            this.editBuffer = {};
        },

        saveEdit(key, path) {
            const newValue = this.editBuffer[key];
            this.updateNestedValue(path, newValue);
            this.editingItem = null;
            this.showNotification('Changes saved', 'success');
        },

        isEditing(key) {
            return this.editingItem === key;
        },

        getEditValue(key) {
            return this.editBuffer[key];
        },

        updateNestedValue(path, value) {
            let obj = this.extractedData;

            for (let i = 0; i < path.length - 1; i++) {
                obj = obj[path[i]];
            }

            obj[path[path.length - 1]] = value;
        },

        countTotalQuestions(items) {
            if (!items) return 0;
            let total = 0;
            items.forEach(item => {
                if (item.question_groups) {
                    item.question_groups.forEach(group => {
                        total += group.questions ? group.questions.length : 0;
                    });
                }
            });
            return total;
        },

        // Validation
        validateContent() {
            const errors = [];
            const data = this.extractedData;

            if (!data || !data.success) {
                errors.push('Invalid content data');
                return errors;
            }

            if (data.passages) {
                data.passages.forEach((passage, pIndex) => {
                    if (!passage.content || passage.content.trim().length < 100) {
                        errors.push(`Passage ${pIndex + 1}: Content too short`);
                    }

                    if (!passage.question_groups || passage.question_groups.length === 0) {
                        errors.push(`Passage ${pIndex + 1}: No question groups found`);
                    }
                });
            }

            return errors;
        },

        // Navigation
        goToStep(step) {
            if (step === 2 && !this.extractedData) return;
            if (step === 3 && !this.savedItems.length) return;
            this.currentStep = step;
        },

        resetGenerator() {
            this.currentStep = 1;
            this.selectedFile = null;
            this.contentType = 'auto';
            this.extractedData = null;
            this.savedItems = [];
            this.editingItem = null;
            this.editBuffer = {};
        },

        // Utilities
        getCSRFToken() {
            const meta = document.querySelector('meta[name="csrf-token"]');
            return meta ? meta.getAttribute('content') : '';
        },

        showNotification(message, type = 'info') {
            // Use toast notification system
            if (window.toast && window.toast[type]) {
                window.toast[type](message);
            } else if (window.showToast) {
                window.showToast({ message, type });
            } else {
                // Fallback to old system
                this.notification = { message, type };
                setTimeout(() => {
                    this.notification = null;
                }, 5000);
            }
        },

        formatQuestionType(type) {
            const types = {
                'MCQ': 'Multiple Choice',
                'MCMA': 'Multiple Choice (Multiple Answers)',
                'SA': 'Short Answer',
                'SC': 'Sentence Completion',
                'TFNG': 'True/False/Not Given',
                'YNNG': 'Yes/No/Not Given',
                'MF': 'Matching Features',
                'MI': 'Matching Information',
                'MH': 'Matching Headings',
                'SUC': 'Summary Completion',
                'NC': 'Note Completion',
                'FC': 'Form Completion',
                'TC': 'Table Completion',
                'FCC': 'Flow Chart Completion',
                'DL': 'Diagram Labeling',
                'ML': 'Map Labeling'
            };
            return types[type] || type;
        },

        getContentTypeIcon(type) {
            const item = this.contentTypes.find(ct => ct.value === type);
            return item ? item.icon : 'file';
        },

        // Group speaking topics by sets (part 1, 2, 3)
        groupSpeakingTopics(topics) {
            if (!topics || !Array.isArray(topics)) return [];

            const groups = [];
            let currentGroup = {};

            topics.forEach(topic => {
                const partNumber = topic.part_number;

                if (partNumber === 1) {
                    // Start new group with Part 1
                    if (Object.keys(currentGroup).length > 0) {
                        groups.push(currentGroup);
                    }
                    currentGroup = {
                        part1: topic
                    };
                } else if (partNumber === 2) {
                    // Add Part 2 to current group
                    currentGroup.part2 = topic;
                } else if (partNumber === 3) {
                    // Add Part 3 to current group
                    currentGroup.part3 = topic;
                }
            });

            // Push the last group
            if (Object.keys(currentGroup).length > 0) {
                groups.push(currentGroup);
            }

            return groups;
        }
    },

    template: `
        <div class="max-w-7xl mx-auto">
            <!-- Header -->
            <div class="mb-8">
                <h1 class="text-3xl font-bold text-slate-900 mb-2">
                    AI Content Generator
                </h1>
                <p class="text-slate-600">
                    Upload IELTS test content via PDF (AI extraction) or JSON (pre-formatted AI response)
                </p>
            </div>
            
            <!-- Notification -->
            <div v-if="notification" 
                 class="mb-6 p-4 rounded-lg flex items-center gap-3"
                 :class="{
                     'bg-green-50 text-green-800 border border-green-200': notification.type === 'success',
                     'bg-red-50 text-red-800 border border-red-200': notification.type === 'error',
                     'bg-orange-50 text-orange-800 border border-orange-200': notification.type === 'info'
                 }">
                <i :data-feather="notification.type === 'success' ? 'check-circle' : notification.type === 'error' ? 'alert-circle' : 'info'" class="w-5 h-5"></i>
                <span>{{ notification.message }}</span>
            </div>
            
            <!-- Progress Steps -->
            <div class="mb-8">
                <div class="flex items-center justify-between">
                    <div v-for="(step, index) in steps" :key="step.number" class="flex items-center" :class="{'flex-1': index < steps.length - 1}">
                        <div class="flex items-center gap-3">
                            <div class="flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all"
                                 :class="{
                                     'bg-orange-600 border-orange-600 text-white': currentStep >= step.number,
                                     'border-slate-300 text-slate-400': currentStep < step.number
                                 }">
                                <i :data-feather="step.icon" class="w-5 h-5"></i>
                            </div>
                            <div>
                                <div class="text-sm font-medium" :class="currentStep >= step.number ? 'text-slate-900' : 'text-slate-400'">
                                    Step {{ step.number }}
                                </div>
                                <div class="text-xs text-slate-500">{{ step.title }}</div>
                            </div>
                        </div>
                        <div v-if="index < steps.length - 1" class="flex-1 h-0.5 mx-4 bg-slate-200"
                             :class="{'bg-orange-600': currentStep > step.number}"></div>
                    </div>
                </div>
            </div>
            
            <!-- Step 1: Upload -->
            <div v-if="currentStep === 1" class="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                <div class="max-w-2xl mx-auto">
                    <h2 class="text-xl font-semibold text-slate-900 mb-6">Upload Content</h2>
                    
                    <!-- Upload Mode Selection -->
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-slate-700 mb-3">Upload Method</label>
                        <div class="flex gap-3">
                            <button @click="setUploadMode('pdf')"
                                    class="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all"
                                    :class="uploadMode === 'pdf' ? 'border-orange-600 bg-orange-50 text-orange-600' : 'border-slate-200 text-slate-700 hover:border-orange-300'">
                                <i data-feather="file-text" class="w-5 h-5"></i>
                                <span class="font-medium">Upload PDF (AI Extract)</span>
                            </button>
                            <button @click="setUploadMode('json')"
                                    class="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all"
                                    :class="uploadMode === 'json' ? 'border-orange-600 bg-orange-50 text-orange-600' : 'border-slate-200 text-slate-700 hover:border-orange-300'">
                                <i data-feather="code" class="w-5 h-5"></i>
                                <span class="font-medium">Upload JSON (Pre-formatted)</span>
                            </button>
                        </div>
                        <p class="mt-2 text-xs text-slate-500">
                            <span v-if="uploadMode === 'pdf'">AI will extract content from PDF file</span>
                            <span v-else>Upload pre-formatted JSON response from AI</span>
                        </p>
                    </div>
                    
                    <!-- Content Type Selection (for PDF mode or JSON validation) -->
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-slate-700 mb-3">Content Type</label>
                        <div class="grid grid-cols-5 gap-3">
                            <div v-for="ct in contentTypes" :key="ct.value"
                                 @click="contentType = ct.value"
                                 class="flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-orange-500"
                                 :class="contentType === ct.value ? 'border-orange-600 bg-orange-50' : 'border-slate-200'">
                                <i :data-feather="ct.icon" class="w-6 h-6" :class="contentType === ct.value ? 'text-orange-600' : 'text-slate-400'"></i>
                                <span class="text-sm font-medium" :class="contentType === ct.value ? 'text-orange-600' : 'text-slate-700'">
                                    {{ ct.label }}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- PDF File Upload Area -->
                    <div v-if="uploadMode === 'pdf'" 
                         class="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center hover:border-orange-400 transition-colors cursor-pointer"
                         @click="triggerFileInput"
                         @dragover.prevent
                         @drop.prevent="selectFile($event.dataTransfer.files[0])">
                        <input type="file" ref="fileInput" accept=".pdf" @change="selectFile" class="hidden">
                        
                        <i data-feather="upload-cloud" class="w-16 h-16 mx-auto text-slate-400 mb-4"></i>
                        
                        <div v-if="!selectedFile">
                            <p class="text-lg font-medium text-slate-700 mb-2">
                                Drop your PDF file here or click to browse
                            </p>
                            <p class="text-sm text-slate-500">
                                Maximum file size: 10MB
                            </p>
                        </div>
                        
                        <div v-else class="flex items-center justify-center gap-3">
                            <i data-feather="file-text" class="w-6 h-6 text-orange-600"></i>
                            <span class="text-lg font-medium text-slate-900">{{ selectedFile.name }}</span>
                            <button @click.stop="selectedFile = null" class="text-red-600 hover:text-red-700">
                                <i data-feather="x" class="w-5 h-5"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- JSON File Upload Area -->
                    <div v-else
                         class="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center hover:border-orange-400 transition-colors cursor-pointer"
                         @click="triggerJsonFileInput"
                         @dragover.prevent
                         @drop.prevent="selectJsonFile($event.dataTransfer.files[0])">
                        <input type="file" ref="jsonFileInput" accept=".json" @change="selectJsonFile" class="hidden">
                        
                        <i data-feather="code" class="w-16 h-16 mx-auto text-slate-400 mb-4"></i>
                        
                        <div v-if="!selectedJsonFile">
                            <p class="text-lg font-medium text-slate-700 mb-2">
                                Drop your JSON file here or click to browse
                            </p>
                            <p class="text-sm text-slate-500">
                                JSON format from AI response • Maximum file size: 5MB
                            </p>
                            <div class="mt-4 text-left inline-block">
                                <p class="text-xs text-slate-600 mb-2 font-medium">Expected JSON structure:</p>
                                <pre class="text-xs bg-slate-100 p-3 rounded border border-slate-200 text-slate-700">
{
  "success": true,
  "content_type": "reading|listening|writing|speaking",
  "passages": [...], // for reading
  "parts": [...],    // for listening
  "tasks": [...],    // for writing
  "topics": [...]    // for speaking
}</pre>
                            </div>
                        </div>
                        
                        <div v-else class="flex items-center justify-center gap-3">
                            <i data-feather="code" class="w-6 h-6 text-orange-600"></i>
                            <span class="text-lg font-medium text-slate-900">{{ selectedJsonFile.name }}</span>
                            <button @click.stop="selectedJsonFile = null" class="text-red-600 hover:text-red-700">
                                <i data-feather="x" class="w-5 h-5"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Generate/Process Button -->
                    <div class="mt-6 flex justify-end">
                        <button @click="generateContent"
                                :disabled="!canProceedToReview || isUploading"
                                class="px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
                            <i :data-feather="uploadMode === 'pdf' ? 'cpu' : 'upload'" class="w-5 h-5"></i>
                            <span v-if="!isUploading">
                                {{ uploadMode === 'pdf' ? 'Generate with AI' : 'Process JSON' }}
                            </span>
                            <span v-else>Processing...</span>
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Step 2: Review Content with Editing -->
            <div v-if="currentStep === 2" class="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                <h2 class="text-xl font-semibold text-slate-900 mb-6">Review Extracted Content</h2>
                
                <div v-if="extractedData && extractedData.success" class="space-y-6">
                    <!-- Content Summary -->
                    <div class="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-orange-100">
                        <div class="flex items-center gap-3">
                            <i :data-feather="getContentTypeIcon(extractedData.content_type)" class="w-6 h-6 text-orange-600"></i>
                            <div>
                                <p class="font-medium text-slate-900">{{ extractedData.content_type.toUpperCase() }} Test</p>
                                <p class="text-sm text-slate-600">
                                    <span v-if="extractedData.passages">{{ extractedData.passages.length }} passage(s), {{ countTotalQuestions(extractedData.passages) }} questions</span>
                                    <span v-if="extractedData.parts">{{ extractedData.parts.length }} part(s), {{ countTotalQuestions(extractedData.parts) }} questions</span>
                                    <span v-if="extractedData.tasks">{{ extractedData.tasks.length }} task(s)</span>
                                    <span v-if="extractedData.topics">{{ extractedData.topics.length }} topic(s)</span>
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Reading Passages Review -->
                    <div v-if="extractedData.passages" class="space-y-6">
                        <div v-for="(passage, pIdx) in extractedData.passages" :key="'passage-' + pIdx" 
                             class="border border-slate-200 rounded-lg overflow-hidden">
                            <!-- Passage Header -->
                            <div class="bg-slate-50 px-6 py-4 border-b border-slate-200">
                                <div class="flex items-center justify-between">
                                    <div class="flex-1">
                                        <div class="flex items-center gap-2 mb-2">
                                            <span class="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
                                                Passage {{ passage.passage_number }}
                                            </span>
                                        </div>
                                        <div v-if="!isEditing('passage-title-' + pIdx)">
                                            <h3 class="text-lg font-semibold text-slate-900">{{ passage.title }}</h3>
                                            <p class="text-sm text-slate-600 mt-1">{{ passage.summary }}</p>
                                        </div>
                                        <div v-else class="space-y-2">
                                            <input v-model="editBuffer['passage-title-' + pIdx]" 
                                                   class="w-full px-3 py-2 border border-slate-300 rounded-lg text-lg font-semibold"
                                                   placeholder="Passage title">
                                            <textarea v-model="editBuffer['passage-summary-' + pIdx]"
                                                      class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                                      rows="2"
                                                      placeholder="Passage summary"></textarea>
                                        </div>
                                    </div>
                                    <div class="flex gap-2">
                                        <button v-if="!isEditing('passage-title-' + pIdx)"
                                                @click="startEditPassage(pIdx, passage)"
                                                class="p-2 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg">
                                            <i data-feather="edit-2" class="w-4 h-4"></i>
                                        </button>
                                        <template v-else>
                                            <button @click="saveEditPassage(pIdx)"
                                                    class="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                                                <i data-feather="check" class="w-4 h-4"></i>
                                            </button>
                                            <button @click="cancelEdit()"
                                                    class="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                                                <i data-feather="x" class="w-4 h-4"></i>
                                            </button>
                                        </template>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Passage Content -->
                            <div class="px-6 py-4 bg-white border-b border-slate-200">
                                <div v-if="!isEditing('passage-content-' + pIdx)">
                                    <p class="text-sm text-slate-700 whitespace-pre-wrap line-clamp-4">{{ passage.content }}</p>
                                    <button @click="startEdit('passage-content-' + pIdx, passage.content)"
                                            class="mt-2 text-xs text-orange-600 hover:text-orange-700">
                                        Edit content
                                    </button>
                                </div>
                                <div v-else>
                                    <textarea v-model="editBuffer['passage-content-' + pIdx]"
                                              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                              rows="6"
                                              placeholder="Passage content"></textarea>
                                    <div class="flex gap-2 mt-2">
                                        <button @click="saveEdit('passage-content-' + pIdx, ['passages', pIdx, 'content'])"
                                                class="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                                            Save
                                        </button>
                                        <button @click="cancelEdit()"
                                                class="px-3 py-1 bg-slate-300 text-slate-700 text-xs rounded hover:bg-slate-400">
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Question Groups -->
                            <div class="px-6 py-4 space-y-4">
                                <div v-for="(group, gIdx) in passage.question_groups" :key="'group-' + gIdx"
                                     class="border border-slate-200 rounded-lg p-4">
                                    <!-- Group Header -->
                                    <div class="flex items-start justify-between mb-3">
                                        <div class="flex-1">
                                            <div v-if="!isEditing('group-title-' + pIdx + '-' + gIdx)">
                                                <div class="flex items-center gap-2 mb-1">
                                                    <span class="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                                                        {{ formatQuestionType(group.question_type) }}
                                                    </span>
                                                </div>
                                                <h4 class="font-medium text-slate-900">{{ group.title }}</h4>
                                                <p class="text-xs text-slate-500 mt-1">{{ group.description }}</p>
                                            </div>
                                            <div v-else class="space-y-2">
                                                <input v-model="editBuffer['group-title-' + pIdx + '-' + gIdx]"
                                                       class="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                                                       placeholder="Group title">
                                                <textarea v-model="editBuffer['group-desc-' + pIdx + '-' + gIdx]"
                                                          class="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                                                          rows="2"
                                                          placeholder="Group description"></textarea>
                                            </div>
                                        </div>
                                        <div class="flex gap-1">
                                            <button v-if="!isEditing('group-title-' + pIdx + '-' + gIdx)"
                                                    @click="startEditGroup(pIdx, gIdx, group)"
                                                    class="p-1 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded">
                                                <i data-feather="edit-2" class="w-3 h-3"></i>
                                            </button>
                                            <template v-else>
                                                <button @click="saveEditGroup(pIdx, gIdx)"
                                                        class="p-1 text-green-600 hover:bg-green-50 rounded">
                                                    <i data-feather="check" class="w-3 h-3"></i>
                                                </button>
                                                <button @click="cancelEdit()"
                                                        class="p-1 text-red-600 hover:bg-red-50 rounded">
                                                    <i data-feather="x" class="w-3 h-3"></i>
                                                </button>
                                            </template>
                                        </div>
                                    </div>
                                    
                                    <!-- Questions -->
                                    <div class="space-y-2">
                                        <div v-for="(question, qIdx) in group.questions" :key="'question-' + qIdx"
                                             class="pl-4 border-l-2 border-slate-200 py-2">
                                            <div v-if="!isEditing('question-' + pIdx + '-' + gIdx + '-' + qIdx)">
                                                <div class="flex items-start justify-between">
                                                    <div class="flex-1">
                                                        <p class="text-sm text-slate-700">
                                                            <span class="font-medium text-slate-500">Q{{ question.order }}:</span>
                                                            {{ question.text }}
                                                        </p>
                                                        <p class="text-xs text-green-600 mt-1">
                                                            <i data-feather="check-circle" class="w-3 h-3 inline"></i>
                                                            Answer: {{ question.correct_answer }}
                                                        </p>
                                                        <!-- Choices for MCQ -->
                                                        <div v-if="question.choices && question.choices.length" class="mt-2 space-y-1">
                                                            <div v-for="(choice, cIdx) in question.choices" :key="'choice-' + cIdx"
                                                                 class="text-xs text-slate-600 flex items-center gap-2">
                                                                <span class="font-medium">{{ choice.key }}.</span>
                                                                <span>{{ choice.text }}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button @click="startEditQuestion(pIdx, gIdx, qIdx, question)"
                                                            class="p-1 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded">
                                                        <i data-feather="edit-2" class="w-3 h-3"></i>
                                                    </button>
                                                </div>
                                            </div>
                                            <div v-else class="space-y-2">
                                                <textarea v-model="editBuffer['question-text-' + pIdx + '-' + gIdx + '-' + qIdx]"
                                                          class="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                                                          rows="2"
                                                          placeholder="Question text"></textarea>
                                                <input v-model="editBuffer['question-answer-' + pIdx + '-' + gIdx + '-' + qIdx]"
                                                       class="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                                                       placeholder="Correct answer">
                                                <div class="flex gap-2">
                                                    <button @click="saveEditQuestion(pIdx, gIdx, qIdx)"
                                                            class="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                                                        Save
                                                    </button>
                                                    <button @click="cancelEdit()"
                                                            class="px-2 py-1 bg-slate-300 text-slate-700 text-xs rounded hover:bg-slate-400">
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Listening Parts Review -->
                    <div v-if="extractedData.parts" class="space-y-6">
                        <div v-for="(part, pIdx) in extractedData.parts" :key="'part-' + pIdx"
                             class="border border-slate-200 rounded-lg overflow-hidden">
                            <!-- Part Header -->
                            <div class="bg-slate-50 px-6 py-4 border-b border-slate-200">
                                <div class="flex items-center justify-between">
                                    <div class="flex-1">
                                        <div class="flex items-center gap-2 mb-2">
                                            <span class="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
                                                Part {{ part.part_number }}
                                            </span>
                                        </div>
                                        <div v-if="!isEditing('part-title-' + pIdx)">
                                            <h3 class="text-lg font-semibold text-slate-900">{{ part.title }}</h3>
                                            <p class="text-sm text-slate-600 mt-1">{{ part.description }}</p>
                                        </div>
                                        <div v-else class="space-y-2">
                                            <input v-model="editBuffer['part-title-' + pIdx]"
                                                   class="w-full px-3 py-2 border border-slate-300 rounded-lg text-lg font-semibold"
                                                   placeholder="Part title">
                                            <textarea v-model="editBuffer['part-desc-' + pIdx]"
                                                      class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                                      rows="2"
                                                      placeholder="Part description"></textarea>
                                        </div>
                                    </div>
                                    <div class="flex gap-2">
                                        <button v-if="!isEditing('part-title-' + pIdx)"
                                                @click="startEditPart(pIdx, part)"
                                                class="p-2 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg">
                                            <i data-feather="edit-2" class="w-4 h-4"></i>
                                        </button>
                                        <template v-else>
                                            <button @click="saveEditPart(pIdx)"
                                                    class="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                                                <i data-feather="check" class="w-4 h-4"></i>
                                            </button>
                                            <button @click="cancelEdit()"
                                                    class="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                                                <i data-feather="x" class="w-4 h-4"></i>
                                            </button>
                                        </template>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Question Groups (similar to reading) -->
                            <div class="px-6 py-4 space-y-4">
                                <div v-for="(group, gIdx) in part.question_groups" :key="'group-' + gIdx"
                                     class="border border-slate-200 rounded-lg p-4">
                                    <div class="flex items-start justify-between mb-3">
                                        <div class="flex-1">
                                            <div class="flex items-center gap-2 mb-1">
                                                <span class="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                                                    {{ formatQuestionType(group.question_type) }}
                                                </span>
                                            </div>
                                            <h4 class="font-medium text-slate-900">{{ group.title }}</h4>
                                        </div>
                                    </div>
                                    <div class="space-y-2">
                                        <div v-for="(question, qIdx) in group.questions" :key="'question-' + qIdx"
                                             class="pl-4 border-l-2 border-slate-200 py-2">
                                            <p class="text-sm text-slate-700">
                                                <span class="font-medium text-slate-500">Q{{ question.order }}:</span>
                                                {{ question.text }}
                                            </p>
                                            <p class="text-xs text-green-600 mt-1">
                                                <i data-feather="check-circle" class="w-3 h-3 inline"></i>
                                                Answer: {{ question.correct_answer }}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Writing Tasks Review -->
                    <div v-if="extractedData.tasks" class="space-y-4">
                        <div v-for="(task, tIdx) in extractedData.tasks" :key="'task-' + tIdx"
                             class="border border-slate-200 rounded-lg p-6">
                            <div class="flex items-start justify-between mb-3">
                                <div class="flex-1">
                                    <div class="flex items-center gap-2 mb-3">
                                        <span class="px-2 py-1 text-xs font-medium rounded"
                                              :class="task.task_type === 'TASK_1' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'">
                                            {{ task.task_type }}
                                        </span>
                                        <span class="text-xs text-slate-500">
                                            Min {{ task.min_words || 150 }} words
                                        </span>
                                        <span v-if="task.has_visual" class="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded flex items-center gap-1">
                                            <i data-feather="image" class="w-3 h-3"></i>
                                            Visual Required
                                        </span>
                                    </div>
                                    
                                    <!-- Task Prompt -->
                                    <div class="bg-slate-50 p-4 rounded-lg">
                                        <p class="text-sm text-slate-900 whitespace-pre-wrap">{{ task.prompt }}</p>
                                    </div>
                                    
                                    <!-- Visual Description (if available) -->
                                    <div v-if="task.visual_description" class="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                        <p class="text-xs font-medium text-amber-900 mb-1">Visual Description:</p>
                                        <p class="text-xs text-amber-800">{{ task.visual_description }}</p>
                                    </div>
                                    
                                    <!-- Additional Data (if available) -->
                                    <div v-if="task.data" class="mt-3 flex flex-wrap gap-2">
                                        <span v-if="task.data.chart_type" class="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                            <strong>Type:</strong> {{ task.data.chart_type }}
                                        </span>
                                        <span v-if="task.data.time_period" class="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                            <strong>Period:</strong> {{ task.data.time_period }}
                                        </span>
                                        <span v-if="task.data.question_type" class="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                            <strong>Question:</strong> {{ task.data.question_type }}
                                        </span>
                                        <span v-if="task.data.topic" class="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                            <strong>Topic:</strong> {{ task.data.topic }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Speaking Topics Review -->
                    <div v-if="extractedData.topics" class="space-y-4">
                        <!-- Group topics by sets (each set contains parts 1, 2, 3) -->
                        <template v-if="contentType === 'speaking'">
                            <!-- Get unique topic themes (group consecutive parts 1, 2, 3) -->
                            <div v-for="(topicGroup, groupIdx) in groupSpeakingTopics(extractedData.topics)" 
                                 :key="'group-' + groupIdx"
                                 class="border border-slate-200 rounded-lg p-6">
                                
                                <h3 class="text-lg font-semibold text-slate-900 mb-4">
                                    Topic Set {{ groupIdx + 1 }}
                                </h3>
                                
                                <!-- Part 1 -->
                                <div v-if="topicGroup.part1" class="mb-4">
                                    <h4 class="font-medium text-slate-700 mb-2 flex items-center gap-2">
                                        <span class="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded">Part 1</span>
                                        {{ topicGroup.part1.topic }}
                                    </h4>
                                    <ul class="space-y-1 ml-4">
                                        <li v-for="(q, qIdx) in topicGroup.part1.questions" :key="'p1-' + qIdx"
                                            class="text-sm text-slate-600">• {{ q }}</li>
                                    </ul>
                                </div>
                                
                                <!-- Part 2 -->
                                <div v-if="topicGroup.part2" class="mb-4">
                                    <h4 class="font-medium text-slate-700 mb-2 flex items-center gap-2">
                                        <span class="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">Part 2</span>
                                        {{ topicGroup.part2.topic }}
                                    </h4>
                                    <div class="bg-slate-50 p-4 rounded-lg">
                                        <p class="text-sm font-medium text-slate-900 mb-2">
                                            {{ topicGroup.part2.cue_card.main_prompt }}
                                        </p>
                                        <p class="text-xs text-slate-500 mb-2">
                                            You should say:
                                        </p>
                                        <ul class="space-y-1 ml-4">
                                            <li v-for="(point, pIdx) in topicGroup.part2.cue_card.bullet_points" :key="'p2-' + pIdx"
                                                class="text-sm text-slate-600">• {{ point }}</li>
                                        </ul>
                                        <p class="text-xs text-slate-500 mt-3">
                                            <strong>Preparation:</strong> {{ topicGroup.part2.cue_card.preparation_time || '1 minute' }} | 
                                            <strong>Speaking:</strong> {{ topicGroup.part2.cue_card.speaking_time || '2 minutes' }}
                                        </p>
                                    </div>
                                </div>
                                
                                <!-- Part 3 -->
                                <div v-if="topicGroup.part3">
                                    <h4 class="font-medium text-slate-700 mb-2 flex items-center gap-2">
                                        <span class="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">Part 3</span>
                                        {{ topicGroup.part3.topic }}
                                    </h4>
                                    <ul class="space-y-1 ml-4">
                                        <li v-for="(q, qIdx) in topicGroup.part3.questions" :key="'p3-' + qIdx"
                                            class="text-sm text-slate-600">• {{ q }}</li>
                                    </ul>
                                </div>
                            </div>
                        </template>
                    </div>
                    
                    <!-- Validation Warnings -->
                    <div v-if="hasValidationWarnings" class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div class="flex items-start gap-3">
                            <i data-feather="alert-triangle" class="w-5 h-5 text-yellow-600 mt-0.5"></i>
                            <div class="flex-1">
                                <p class="font-medium text-yellow-900 mb-2">Please review the following:</p>
                                <ul class="space-y-1">
                                    <li v-for="(error, idx) in validateContent()" :key="idx"
                                        class="text-sm text-yellow-800">• {{ error }}</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Action Buttons -->
                    <div class="flex justify-between pt-6 border-t">
                        <button @click="currentStep = 1" class="px-4 py-2 text-slate-600 hover:text-slate-800 flex items-center gap-2">
                            <i data-feather="arrow-left" class="w-5 h-5"></i>
                            Back
                        </button>
                        <button @click="saveContentToDatabase"
                                :disabled="!canSaveContent || isSaving"
                                class="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2">
                            <i data-feather="database" class="w-5 h-5"></i>
                            <span v-if="!isSaving">Save to Database</span>
                            <span v-else>Saving...</span>
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Step 3: Success -->
            <div v-if="currentStep === 3" class="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                <div class="text-center max-w-2xl mx-auto">
                    <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <i data-feather="check-circle" class="w-12 h-12 text-green-600"></i>
                    </div>
                    
                    <h2 class="text-2xl font-bold text-slate-900 mb-3">Content Saved Successfully!</h2>
                    <p class="text-slate-600 mb-8">
                        Your IELTS test content has been extracted and saved to the database.
                    </p>
                    
                    <div class="flex gap-4 justify-center">
                        <button @click="resetGenerator" class="px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700">
                            <i data-feather="upload" class="w-5 h-5 inline mr-2"></i>
                            Generate More Content
                        </button>
                        <button @click="$emit('navigate', extractedData.content_type === 'reading' ? 'reading-tests' : 'mock-tests')" 
                                class="px-6 py-3 bg-slate-600 text-white font-medium rounded-lg hover:bg-slate-700">
                            <i data-feather="arrow-right" class="w-5 h-5 inline mr-2"></i>
                            View Content
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `
};
