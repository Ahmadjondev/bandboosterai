/**
 * StudentResultDetail Component - View Detailed Student Result
 * Shows comprehensive exam result with section breakdown and analysis
 */

window.StudentResultDetail = {
    name: 'StudentResultDetailComponent',

    mixins: [window.FeatherIconsMixin],

    props: {
        attemptId: {
            type: [Number, String],
            required: true
        },
        examId: {
            type: [Number, String],
            required: false
        }
    },

    data() {
        return {
            loading: true,
            error: null,
            result: null,
            showAnswersDialog: false,
            dialogSection: null,
            evaluationMode: {},  // Track which tasks are in evaluation mode
            evaluationData: {},  // Store evaluation form data
            evaluating: {},      // Track which tasks are being saved
            bandScoreOptions: [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0],
        };
    },

    computed: {
        hasSections() {
            return this.result && this.result.sections;
        },

        hasListening() {
            return this.hasSections && this.result.sections.listening;
        },

        hasReading() {
            return this.hasSections && this.result.sections.reading;
        },

        hasWriting() {
            return this.hasSections && this.result.sections.writing;
        },

        hasSpeaking() {
            return this.hasSections && this.result.sections.speaking;
        },

        overallScore() {
            return this.result ? this.result.overall_score : null;
        },

        bandScoreColor() {
            const score = this.overallScore;
            if (!score) return 'gray';
            if (score >= 8.0) return 'green';
            if (score >= 7.0) return 'blue';
            if (score >= 6.0) return 'orange';
            if (score >= 5.0) return 'yellow';
            return 'red';
        }
    },

    mounted() {
        this.fetchResult();
    },

    methods: {
        async fetchResult() {
            this.loading = true;
            this.error = null;

            try {
                // Use ApiService (which is aliased to managerAPI)
                this.result = await window.ApiService.getStudentResultDetail(this.attemptId);
            } catch (error) {
                console.error('Error fetching result:', error);
                this.error = error.message || 'Failed to load result details';
            } finally {
                this.loading = false;
            }
        },

        handleBack() {
            if (this.examId) {
                this.$emit('navigate', 'exam-details', { examId: this.examId });
            } else {
                this.$emit('navigate', 'results');
            }
        },

        formatScore(score) {
            if (score === null || score === undefined) return '-';
            return parseFloat(score).toFixed(1);
        },

        formatDate(date) {
            if (!date) return '-';
            return new Date(date).toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },

        formatDuration(minutes) {
            if (!minutes) return '-';
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            if (hours > 0) {
                return `${hours}h ${mins}m`;
            }
            return `${mins}m`;
        },

        getAccuracyPercent(correct, total) {
            if (!total) return 0;
            return Math.round((correct / total) * 100);
        },

        getAccuracyColor(percent) {
            if (percent >= 80) return 'text-green-600';
            if (percent >= 60) return 'text-blue-600';
            if (percent >= 40) return 'text-yellow-600';
            return 'text-red-600';
        },

        downloadReport() {
            // Generate PDF report or detailed Excel export
            this.$emit('show-notification', {
                type: 'info',
                message: 'Report download feature coming soon!'
            });
        },

        printResult() {
            window.print();
        },

        openAnswersDialog(section) {
            // Validate section has data before opening
            if (section === 'writing' && (!this.result.sections.writing || !this.result.sections.writing.tasks || this.result.sections.writing.tasks.length === 0)) {
                return;
            }
            if (section === 'speaking' && (!this.result.sections.speaking || !this.result.sections.speaking.parts || this.result.sections.speaking.parts.length === 0)) {
                return;
            }
            if (section === 'listening' && (!this.result.sections.listening || !this.result.sections.listening.answer_groups || this.result.sections.listening.answer_groups.length === 0)) {
                return;
            }
            if (section === 'reading' && (!this.result.sections.reading || !this.result.sections.reading.answer_groups || this.result.sections.reading.answer_groups.length === 0)) {
                return;
            }

            this.dialogSection = section;
            this.showAnswersDialog = true;

            // Re-initialize feather icons in dialog after Vue renders it
            this.$nextTick(() => {
                this.initFeatherIcons();
            });
        },

        closeAnswersDialog() {
            this.showAnswersDialog = false;
            this.dialogSection = null;
        },

        formatCriterion(criterion) {
            // Convert snake_case to Title Case
            return criterion.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        },

        enableEvaluationMode(task) {
            // Initialize evaluation data with existing scores or defaults
            const taskKey = `task-${task.id}`;
            this.evaluationMode[taskKey] = true;

            // Pre-fill with existing data if available
            this.evaluationData[taskKey] = {
                task_response_or_achievement: task.criteria?.task_response_or_achievement || 0,
                coherence_and_cohesion: task.criteria?.coherence_and_cohesion || 0,
                lexical_resource: task.criteria?.lexical_resource || 0,
                grammatical_range_and_accuracy: task.criteria?.grammatical_range_and_accuracy || 0,
                feedback_task_response_or_achievement: task.feedback?.task_response_or_achievement || '',
                feedback_coherence_and_cohesion: task.feedback?.coherence_and_cohesion || '',
                feedback_lexical_resource: task.feedback?.lexical_resource || '',
                feedback_grammatical_range_and_accuracy: task.feedback?.grammatical_range_and_accuracy || '',
                feedback_overall: task.feedback?.overall || ['', '', ''],
            };
        },

        cancelEvaluation(task) {
            const taskKey = `task-${task.id}`;
            this.evaluationMode[taskKey] = false;
            delete this.evaluationData[taskKey];
        },

        async saveEvaluation(task, index) {
            const taskKey = `task-${task.id}`;
            const data = this.evaluationData[taskKey];

            if (!data) {
                this.$emit('show-notification', {
                    type: 'error',
                    message: 'No evaluation data found'
                });
                return;
            }

            // Validate scores
            const criteria = [
                'task_response_or_achievement',
                'coherence_and_cohesion',
                'lexical_resource',
                'grammatical_range_and_accuracy'
            ];

            for (const criterion of criteria) {
                const score = data[criterion];

                // Check if score is selected
                if (score === '' || score === null || score === undefined) {
                    this.$emit('show-notification', {
                        type: 'error',
                        message: `Please select a band score for ${this.formatCriterion(criterion)}`
                    });
                    return;
                }

                const scoreValue = parseFloat(score);
                if (isNaN(scoreValue) || scoreValue < 0 || scoreValue > 9) {
                    this.$emit('show-notification', {
                        type: 'error',
                        message: `${this.formatCriterion(criterion)} must be between 0 and 9`
                    });
                    return;
                }
            }

            this.evaluating[taskKey] = true;

            try {
                const response = await window.ApiService.evaluateWritingSubmission(
                    this.attemptId,
                    task.id,
                    data
                );

                // Update the task in the result data
                this.result.sections.writing.tasks[index].band_score = response.band_score;
                this.result.sections.writing.tasks[index].criteria = {
                    task_response_or_achievement: data.task_response_or_achievement,
                    coherence_and_cohesion: data.coherence_and_cohesion,
                    lexical_resource: data.lexical_resource,
                    grammatical_range_and_accuracy: data.grammatical_range_and_accuracy,
                };
                this.result.sections.writing.tasks[index].feedback = {
                    task_response_or_achievement: data.feedback_task_response_or_achievement,
                    coherence_and_cohesion: data.feedback_coherence_and_cohesion,
                    lexical_resource: data.feedback_lexical_resource,
                    grammatical_range_and_accuracy: data.feedback_grammatical_range_and_accuracy,
                    overall: data.feedback_overall,
                };

                // Recalculate overall writing band score
                const allScores = this.result.sections.writing.tasks.map(t => parseFloat(t.band_score)).filter(s => !isNaN(s));
                if (allScores.length > 0) {
                    const avg = allScores.reduce((a, b) => a + b, 0) / allScores.length;
                    this.result.sections.writing.overall_band_score = Math.round(avg * 2) / 2;
                }

                this.$emit('show-notification', {
                    type: 'success',
                    message: response.message || 'Evaluation saved successfully'
                });

                // Exit evaluation mode
                this.evaluationMode[taskKey] = false;
                delete this.evaluationData[taskKey];

                // Re-initialize feather icons
                this.$nextTick(() => {
                    this.initFeatherIcons();
                });
            } catch (error) {
                console.error('Error saving evaluation:', error);
                this.$emit('show-notification', {
                    type: 'error',
                    message: error.message || 'Failed to save evaluation'
                });
            } finally {
                this.evaluating[taskKey] = false;
            }
        }
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
                        <h1 class="text-3xl font-bold text-gray-900">Student Result Details</h1>
                        <p v-if="result" class="mt-1 text-sm text-gray-500">
                            {{ result.student_name }} ({{ result.student_email }})
                        </p>
                        <p v-else class="mt-1 text-sm text-gray-500">
                            Comprehensive exam performance analysis
                        </p>
                    </div>
                </div>
                
                <div v-if="result && !loading" class="flex items-center gap-3">
                    <button
                        @click="printResult"
                        class="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        <i data-feather="printer" class="w-4 h-4 mr-2"></i>
                        Print
                    </button>
                    <button
                        @click="downloadReport"
                        class="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                    >
                        <i data-feather="download" class="w-4 h-4 mr-2"></i>
                        Download Report
                    </button>
                </div>
            </div>
            
            <!-- Loading State -->
            <loading-spinner v-if="loading" />
            
            <!-- Error State -->
            <alert-component v-if="error" type="error" :message="error" @close="error = null" />
            
            <!-- Result Content -->
            <div v-if="result && !loading" class="space-y-6">
                <!-- Exam Info Card -->
                <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-500 mb-1">
                                <i data-feather="book" class="w-4 h-4 inline mr-1"></i>
                                Exam Title
                            </label>
                            <p class="text-lg font-semibold text-gray-900">{{ result.exam_title }}</p>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-500 mb-1">
                                <i data-feather="layers" class="w-4 h-4 inline mr-1"></i>
                                Exam Type
                            </label>
                            <p class="text-lg font-semibold text-gray-900">{{ result.exam_type.replace('_', ' ') }}</p>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-500 mb-1">
                                <i data-feather="calendar" class="w-4 h-4 inline mr-1"></i>
                                Completed At
                            </label>
                            <p class="text-base text-gray-900">{{ formatDate(result.completed_at) }}</p>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-500 mb-1">
                                <i data-feather="clock" class="w-4 h-4 inline mr-1"></i>
                                Duration
                            </label>
                            <p class="text-base text-gray-900">{{ formatDuration(result.duration_minutes) }}</p>
                        </div>
                    </div>
                </div>

                <!-- Overall Score Card -->
                <div v-if="overallScore" class="bg-gradient-to-r from-orange-50 to-indigo-50 rounded-lg shadow-sm border border-gray-200 p-8">
                    <div class="text-center">
                        <h2 class="text-lg font-medium text-gray-600 mb-4">Overall Band Score</h2>
                        <div class="inline-flex items-center justify-center w-32 h-32 rounded-full bg-white shadow-lg">
                            <span :class="'text-5xl font-bold text-' + bandScoreColor + '-600'">
                                {{ formatScore(overallScore) }}
                            </span>
                        </div>
                        <p class="mt-4 text-sm text-gray-600">
                            Average across all completed sections
                        </p>
                    </div>
                </div>

                <!-- Section Scores Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <!-- Listening Score -->
                    <div v-if="hasListening" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-sm font-medium text-gray-500">Listening</span>
                            <i data-feather="headphones" class="w-5 h-5 text-purple-600"></i>
                        </div>
                        <p class="text-3xl font-bold text-gray-900 mb-2">
                            {{ formatScore(result.sections.listening.band_score) }}
                        </p>
                        <div class="text-sm text-gray-600">
                            {{ result.sections.listening.correct_answers }}/{{ result.sections.listening.total_questions }} correct
                        </div>
                        <div class="mt-2 text-xs text-gray-500">
                            {{ getAccuracyPercent(result.sections.listening.correct_answers, result.sections.listening.total_questions) }}% accuracy
                        </div>
                    </div>

                    <!-- Reading Score -->
                    <div v-if="hasReading" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-sm font-medium text-gray-500">Reading</span>
                            <i data-feather="book-open" class="w-5 h-5 text-orange-600"></i>
                        </div>
                        <p class="text-3xl font-bold text-gray-900 mb-2">
                            {{ formatScore(result.sections.reading.band_score) }}
                        </p>
                        <div class="text-sm text-gray-600">
                            {{ result.sections.reading.correct_answers }}/{{ result.sections.reading.total_questions }} correct
                        </div>
                        <div class="mt-2 text-xs text-gray-500">
                            {{ getAccuracyPercent(result.sections.reading.correct_answers, result.sections.reading.total_questions) }}% accuracy
                        </div>
                    </div>

                    <!-- Writing Score -->
                    <div v-if="hasWriting" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-sm font-medium text-gray-500">Writing</span>
                            <i data-feather="edit-3" class="w-5 h-5 text-orange-600"></i>
                        </div>
                        <p class="text-3xl font-bold text-gray-900 mb-2">
                            {{ formatScore(result.sections.writing.overall_band_score) }}
                        </p>
                        <div class="text-sm text-gray-600">
                            {{ result.sections.writing.tasks.length }} task(s) evaluated
                        </div>
                    </div>

                    <!-- Speaking Score -->
                    <div v-if="hasSpeaking" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-sm font-medium text-gray-500">Speaking</span>
                            <i data-feather="mic" class="w-5 h-5 text-indigo-600"></i>
                        </div>
                        <p class="text-3xl font-bold text-gray-900 mb-2">
                            {{ formatScore(result.sections.speaking.overall_band_score) }}
                        </p>
                        <div class="text-sm text-gray-600">
                            {{ result.sections.speaking.parts.length }} part(s) evaluated
                        </div>
                    </div>
                </div>

                <!-- Answer Review Cards -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                    <!-- Listening Card -->
                    <div v-if="hasListening" class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col items-center text-center">
                        <div class="bg-purple-100 text-purple-600 rounded-full w-14 h-14 flex items-center justify-center mb-3">
                            <i data-feather="headphones" class="w-6 h-6"></i>
                        </div>
                        <h5 class="font-semibold text-gray-800">Listening Answers</h5>
                        <p class="text-sm text-gray-500 mt-1 flex-grow">
                            Review student's answers and see correct responses for the listening section.
                        </p>
                        <button
                            @click="openAnswersDialog('listening')"
                            class="mt-4 text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors"
                        >
                            View Details <i data-feather="arrow-right" class="w-3 h-3 inline ml-1"></i>
                        </button>
                    </div>

                    <!-- Reading Card -->
                    <div v-if="hasReading" class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col items-center text-center">
                        <div class="bg-orange-100 text-orange-600 rounded-full w-14 h-14 flex items-center justify-center mb-3">
                            <i data-feather="book-open" class="w-6 h-6"></i>
                        </div>
                        <h5 class="font-semibold text-gray-800">Reading Answers</h5>
                        <p class="text-sm text-gray-500 mt-1 flex-grow">
                            Compare student's answers against the correct ones for the reading passages.
                        </p>
                        <button
                            @click="openAnswersDialog('reading')"
                            class="mt-4 text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors"
                        >
                            View Details <i data-feather="arrow-right" class="w-3 h-3 inline ml-1"></i>
                        </button>
                    </div>

                    <!-- Writing Card -->
                    <div v-if="hasWriting" class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col items-center text-center">
                        <div class="bg-yellow-100 text-yellow-600 rounded-full w-14 h-14 flex items-center justify-center mb-3">
                            <i data-feather="edit-3" class="w-6 h-6"></i>
                        </div>
                        <h5 class="font-semibold text-gray-800">Writing Submissions</h5>
                        <p class="text-sm text-gray-500 mt-1 flex-grow">
                            Read student's submitted essays and the detailed feedback.
                        </p>
                        <button
                            @click="openAnswersDialog('writing')"
                            :class="result.sections.writing.tasks && result.sections.writing.tasks.length > 0 ? 'text-orange-600 hover:text-orange-700' : 'text-gray-400 cursor-not-allowed'"
                            :disabled="!result.sections.writing.tasks || result.sections.writing.tasks.length === 0"
                            class="mt-4 text-sm font-semibold transition-colors"
                        >
                            {{ result.sections.writing.tasks && result.sections.writing.tasks.length > 0 ? 'View Details' : 'No submissions' }} 
                            <i v-if="result.sections.writing.tasks && result.sections.writing.tasks.length > 0" data-feather="arrow-right" class="w-3 h-3 inline ml-1"></i>
                        </button>
                    </div>

                    <!-- Speaking Card -->
                    <div v-if="hasSpeaking" class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col items-center text-center">
                        <div class="bg-indigo-100 text-indigo-600 rounded-full w-14 h-14 flex items-center justify-center mb-3">
                            <i data-feather="mic" class="w-6 h-6"></i>
                        </div>
                        <h5 class="font-semibold text-gray-800">Speaking Attempt</h5>
                        <p class="text-sm text-gray-500 mt-1 flex-grow">
                            Listen to student's recording and review the evaluation and transcript.
                        </p>
                        <button
                            @click="openAnswersDialog('speaking')"
                            :class="result.sections.speaking.parts && result.sections.speaking.parts.length > 0 ? 'text-orange-600 hover:text-orange-700' : 'text-gray-400 cursor-not-allowed'"
                            :disabled="!result.sections.speaking.parts || result.sections.speaking.parts.length === 0"
                            class="mt-4 text-sm font-semibold transition-colors"
                        >
                            {{ result.sections.speaking.parts && result.sections.speaking.parts.length > 0 ? 'View Details' : 'Processing...' }}
                            <i v-if="result.sections.speaking.parts && result.sections.speaking.parts.length > 0" data-feather="arrow-right" class="w-3 h-3 inline ml-1"></i>
                        </button>
                    </div>
                </div>

                <!-- Overview Section -->
                <div class="space-y-6">
                    <!-- Performance by Question Type (if available) -->
                    <div v-if="hasListening || hasReading" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">Performance by Question Type</h3>
                        
                        <div class="space-y-6">
                            <!-- Listening Types -->
                            <div v-if="hasListening && result.sections.listening.type_stats">
                                <h4 class="text-sm font-medium text-gray-700 mb-3 flex items-center">
                                    <i data-feather="headphones" class="w-4 h-4 mr-2 text-purple-600"></i>
                                    Listening
                                </h4>
                                <div class="space-y-2">
                                    <div v-for="(stats, type) in result.sections.listening.type_stats" :key="'listening-' + type" class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <span class="text-sm font-medium text-gray-700 flex-1">{{ type }}</span>
                                        <span class="text-sm font-bold text-purple-600 ml-4">
                                            {{ stats.correct }}/{{ stats.total }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Reading Types -->
                            <div v-if="hasReading && result.sections.reading.type_stats">
                                <h4 class="text-sm font-medium text-gray-700 mb-3 flex items-center">
                                    <i data-feather="book-open" class="w-4 h-4 mr-2 text-orange-600"></i>
                                    Reading
                                </h4>
                                <div class="space-y-2">
                                    <div v-for="(stats, type) in result.sections.reading.type_stats" :key="'reading-' + type" class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <span class="text-sm font-medium text-gray-700 flex-1">{{ type }}</span>
                                        <span class="text-sm font-bold text-orange-600 ml-4">
                                            {{ stats.correct }}/{{ stats.total }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Listening Dialog Modal -->
                <div v-if="showAnswersDialog && dialogSection === 'listening'" class="fixed inset-0 z-50 overflow-y-auto" @click.self="closeAnswersDialog">
                    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <!-- Background overlay -->
                        <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" @click="closeAnswersDialog"></div>

                        <!-- Center modal -->
                        <span class="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

                        <!-- Modal panel -->
                        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full max-h-[90vh]">
                            <div class="flex flex-col max-h-[90vh]">
                                <!-- Modal Header -->
                                <div class="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
                                    <div class="flex items-center gap-3">
                                        <div class="bg-white/20 rounded-full p-2">
                                            <i data-feather="headphones" class="w-5 h-5 text-white"></i>
                                        </div>
                                        <h3 class="text-xl font-bold text-white">Listening Answers</h3>
                                    </div>
                                    <button @click="closeAnswersDialog" class="text-white hover:bg-white/20 rounded-full p-2 transition-colors">
                                        <i data-feather="x" class="w-5 h-5"></i>
                                    </button>
                                </div>

                                <!-- Modal Body - Scrollable -->
                                <div class="flex-1 overflow-y-auto p-6">
                                    <div v-if="result.sections.listening.answer_groups && result.sections.listening.answer_groups.length > 0">
                                        <div class="space-y-4">
                                            <div
                                                v-for="group in result.sections.listening.answer_groups"
                                                :key="'modal-listening-' + group.id"
                                                class="border border-gray-200 rounded-lg overflow-hidden"
                                            >
                                                <!-- Group Header -->
                                                <div class="bg-gray-50 px-6 py-4 border-b border-gray-200">
                                                    <h4 class="text-lg font-semibold text-gray-900">{{ group.title }}</h4>
                                                </div>

                                                <!-- Answers Table -->
                                                <div class="overflow-x-auto">
                                                    <table class="min-w-full divide-y divide-gray-200">
                                                        <thead class="bg-gray-50">
                                                            <tr>
                                                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Q#</th>
                                                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                                                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Answer</th>
                                                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correct Answer</th>
                                                                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody class="bg-white divide-y divide-gray-200">
                                                            <tr v-for="answer in group.answers" :key="'modal-answer-' + answer.question_number"
                                                                :class="answer.is_correct ? 'bg-green-50' : 'bg-red-50'">
                                                                <td class="px-4 py-3 text-sm font-bold text-gray-900">{{ answer.question_number }}</td>
                                                                <td class="px-4 py-3 text-sm text-gray-700">{{ answer.question_text }}</td>
                                                                <td class="px-4 py-3">
                                                                    <span v-if="answer.user_answer" class="font-mono font-semibold"
                                                                        :class="answer.is_correct ? 'text-green-700' : 'text-red-700'">
                                                                        {{ answer.user_answer }}
                                                                    </span>
                                                                    <span v-else class="text-gray-400 italic">Not answered</span>
                                                                    
                                                                    <!-- MCMA Breakdown -->
                                                                    <div v-if="answer.is_mcma && answer.mcma_breakdown" class="mt-2 text-xs text-gray-600">
                                                                        <div v-for="(item, idx) in answer.mcma_breakdown" :key="idx" 
                                                                             class="text-xs font-mono"
                                                                             :class="item.startsWith('✓') ? 'text-green-700' : 'text-red-700'">
                                                                            {{ item }}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td class="px-4 py-3">
                                                                    <span v-if="answer.correct_answer" class="font-mono font-semibold text-gray-900 bg-green-50 px-2 py-1 rounded">
                                                                        {{ answer.correct_answer }}
                                                                    </span>
                                                                    <span v-else class="text-gray-400 italic">Not available</span>
                                                                </td>
                                                                <td class="px-4 py-3 text-center">
                                                                    <span 
                                                                        v-if="answer.is_correct"
                                                                        class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-100 text-green-700"
                                                                    >
                                                                        <i data-feather="check" class="w-4 h-4"></i>
                                                                    </span>
                                                                    <span 
                                                                        v-else
                                                                        class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-700"
                                                                    >
                                                                        <i data-feather="x" class="w-4 h-4"></i>
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Modal Footer -->
                                <div class="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                                    <button
                                        @click="closeAnswersDialog"
                                        class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Reading Dialog Modal -->
                <div v-if="showAnswersDialog && dialogSection === 'reading'" class="fixed inset-0 z-50 overflow-y-auto" @click.self="closeAnswersDialog">
                    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <!-- Background overlay -->
                        <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" @click="closeAnswersDialog"></div>

                        <!-- Center modal -->
                        <span class="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

                        <!-- Modal panel -->
                        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full max-h-[90vh]">
                            <div class="flex flex-col max-h-[90vh]">
                                <!-- Modal Header -->
                                <div class="bg-gradient-to-r from-orange-600 to-red-600 px-6 py-4 flex items-center justify-between">
                                    <div class="flex items-center gap-3">
                                        <div class="bg-white/20 rounded-full p-2">
                                            <i data-feather="book-open" class="w-5 h-5 text-white"></i>
                                        </div>
                                        <h3 class="text-xl font-bold text-white">Reading Answers</h3>
                                    </div>
                                    <button @click="closeAnswersDialog" class="text-white hover:bg-white/20 rounded-full p-2 transition-colors">
                                        <i data-feather="x" class="w-5 h-5"></i>
                                    </button>
                                </div>

                                <!-- Modal Body - Scrollable -->
                                <div class="flex-1 overflow-y-auto p-6">
                                    <div v-if="result.sections.reading.answer_groups && result.sections.reading.answer_groups.length > 0">
                                        <div class="space-y-4">
                                            <div
                                                v-for="group in result.sections.reading.answer_groups"
                                                :key="'modal-reading-' + group.id"
                                                class="border border-gray-200 rounded-lg overflow-hidden"
                                            >
                                                <!-- Group Header -->
                                                <div class="bg-gray-50 px-6 py-4 border-b border-gray-200">
                                                    <h4 class="text-lg font-semibold text-gray-900">{{ group.title }}</h4>
                                                </div>

                                                <!-- Answers Table -->
                                                <div class="overflow-x-auto">
                                                    <table class="min-w-full divide-y divide-gray-200">
                                                        <thead class="bg-gray-50">
                                                            <tr>
                                                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Q#</th>
                                                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                                                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Answer</th>
                                                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correct Answer</th>
                                                                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody class="bg-white divide-y divide-gray-200">
                                                            <tr v-for="answer in group.answers" :key="'modal-answer-' + answer.question_number"
                                                                :class="answer.is_correct ? 'bg-green-50' : 'bg-red-50'">
                                                                <td class="px-4 py-3 text-sm font-bold text-gray-900">{{ answer.question_number }}</td>
                                                                <td class="px-4 py-3 text-sm text-gray-700">{{ answer.question_text }}</td>
                                                                <td class="px-4 py-3">
                                                                    <span v-if="answer.user_answer" class="font-mono font-semibold"
                                                                        :class="answer.is_correct ? 'text-green-700' : 'text-red-700'">
                                                                        {{ answer.user_answer }}
                                                                    </span>
                                                                    <span v-else class="text-gray-400 italic">Not answered</span>
                                                                    
                                                                    <!-- MCMA Breakdown -->
                                                                    <div v-if="answer.is_mcma && answer.mcma_breakdown" class="mt-2 text-xs text-gray-600">
                                                                        <div v-for="(item, idx) in answer.mcma_breakdown" :key="idx" 
                                                                             class="text-xs font-mono"
                                                                             :class="item.startsWith('✓') ? 'text-green-700' : 'text-red-700'">
                                                                            {{ item }}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td class="px-4 py-3">
                                                                    <span v-if="answer.correct_answer" class="font-mono font-semibold text-gray-900 bg-green-50 px-2 py-1 rounded">
                                                                        {{ answer.correct_answer }}
                                                                    </span>
                                                                    <span v-else class="text-gray-400 italic">Not available</span>
                                                                </td>
                                                                <td class="px-4 py-3 text-center">
                                                                    <span 
                                                                        v-if="answer.is_correct"
                                                                        class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-100 text-green-700"
                                                                    >
                                                                        <i data-feather="check" class="w-4 h-4"></i>
                                                                    </span>
                                                                    <span 
                                                                        v-else
                                                                        class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-700"
                                                                    >
                                                                        <i data-feather="x" class="w-4 h-4"></i>
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Modal Footer -->
                                <div class="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                                    <button
                                        @click="closeAnswersDialog"
                                        class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Writing Dialog Modal -->
                <div v-if="showAnswersDialog && dialogSection === 'writing'" class="fixed inset-0 z-50 overflow-y-auto" @click.self="closeAnswersDialog">
                    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <!-- Background overlay -->
                        <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" @click="closeAnswersDialog"></div>

                        <!-- Center modal -->
                        <span class="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

                        <!-- Modal panel -->
                        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full max-h-[90vh]">
                            <div class="flex flex-col max-h-[90vh]">
                                <!-- Modal Header -->
                                <div class="bg-gradient-to-r from-yellow-600 to-orange-600 px-6 py-4 flex items-center justify-between">
                                    <div class="flex items-center gap-3">
                                        <div class="bg-white/20 rounded-full p-2">
                                            <i data-feather="edit-3" class="w-5 h-5 text-white"></i>
                                        </div>
                                        <h3 class="text-xl font-bold text-white">Writing Assessment & Feedback</h3>
                                    </div>
                                    <button @click="closeAnswersDialog" class="text-white hover:bg-white/20 rounded-full p-2 transition-colors">
                                        <i data-feather="x" class="w-5 h-5"></i>
                                    </button>
                                </div>

                                <!-- Modal Body - Scrollable -->
                                <div class="flex-1 overflow-y-auto p-6">
                                    <div v-if="result.sections.writing.tasks && result.sections.writing.tasks.length > 0">
                                        <!-- Overall Writing Band -->
                                        <div class="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-6 mb-6">
                                            <div class="flex items-center justify-center gap-6">
                                                <div class="text-center">
                                                    <div class="text-sm text-gray-600 mb-1">Overall Writing Band</div>
                                                    <div class="text-4xl font-bold text-yellow-600">{{ formatScore(result.sections.writing.overall_band_score) }}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Tasks -->
                                        <div class="space-y-6">
                                            <div
                                                v-for="(task, index) in result.sections.writing.tasks"
                                                :key="'task-' + index"
                                                class="border border-gray-200 rounded-lg overflow-hidden"
                                            >
                                                <!-- Task Header -->
                                                <div class="bg-gray-50 px-6 py-4 border-b border-gray-200">
                                                    <div class="flex items-center justify-between">
                                                        <h4 class="text-lg font-semibold text-gray-900">{{ task.task_name }}</h4>
                                                        <div class="flex items-center gap-3">
                                                            <div class="text-2xl font-bold text-yellow-600">Band {{ formatScore(task.band_score) }}</div>
                                                            <button
                                                                v-if="!evaluationMode['task-' + task.id]"
                                                                @click="enableEvaluationMode(task)"
                                                                class="inline-flex items-center px-3 py-1.5 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
                                                            >
                                                                <i data-feather="edit-2" class="w-4 h-4 mr-1"></i>
                                                                Evaluate
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <!-- Task Content -->
                                                <div class="p-6">
                                                    <!-- Evaluation Form Mode -->
                                                    <div v-if="evaluationMode['task-' + task.id]" class="space-y-6">
                                                        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                                            <p class="text-sm text-blue-800">
                                                                <i data-feather="info" class="w-4 h-4 inline mr-1"></i>
                                                                Select band scores from the dropdown (0-9) and provide feedback for each criterion. The overall band score will be calculated automatically.
                                                            </p>
                                                        </div>

                                                        <!-- Criteria Scores Input -->
                                                        <div>
                                                            <h5 class="font-semibold text-gray-900 mb-3">Band Scores (Select from 0-9)</h5>
                                                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                <div>
                                                                    <label class="block text-sm font-medium text-gray-700 mb-1">Task Achievement / Response</label>
                                                                    <select
                                                                        v-model.number="evaluationData['task-' + task.id].task_response_or_achievement"
                                                                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                                    >
                                                                        <option value="">Select score...</option>
                                                                        <option v-for="score in bandScoreOptions" :key="score" :value="score">{{ score.toFixed(1) }}</option>
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label class="block text-sm font-medium text-gray-700 mb-1">Coherence and Cohesion</label>
                                                                    <select
                                                                        v-model.number="evaluationData['task-' + task.id].coherence_and_cohesion"
                                                                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                                    >
                                                                        <option value="">Select score...</option>
                                                                        <option v-for="score in bandScoreOptions" :key="score" :value="score">{{ score.toFixed(1) }}</option>
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label class="block text-sm font-medium text-gray-700 mb-1">Lexical Resource</label>
                                                                    <select
                                                                        v-model.number="evaluationData['task-' + task.id].lexical_resource"
                                                                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                                    >
                                                                        <option value="">Select score...</option>
                                                                        <option v-for="score in bandScoreOptions" :key="score" :value="score">{{ score.toFixed(1) }}</option>
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label class="block text-sm font-medium text-gray-700 mb-1">Grammatical Range and Accuracy</label>
                                                                    <select
                                                                        v-model.number="evaluationData['task-' + task.id].grammatical_range_and_accuracy"
                                                                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                                    >
                                                                        <option value="">Select score...</option>
                                                                        <option v-for="score in bandScoreOptions" :key="score" :value="score">{{ score.toFixed(1) }}</option>
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <!-- Feedback Inputs -->
                                                        <div class="space-y-4">
                                                            <h5 class="font-semibold text-gray-900">Detailed Feedback (Optional)</h5>
                                                            
                                                            <div>
                                                                <label class="block text-sm font-medium text-gray-700 mb-1">Task Achievement / Response Feedback</label>
                                                                <textarea
                                                                    v-model="evaluationData['task-' + task.id].feedback_task_response_or_achievement"
                                                                    rows="2"
                                                                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                                    placeholder="Comment on how well the task was addressed..."
                                                                ></textarea>
                                                            </div>

                                                            <div>
                                                                <label class="block text-sm font-medium text-gray-700 mb-1">Coherence and Cohesion Feedback</label>
                                                                <textarea
                                                                    v-model="evaluationData['task-' + task.id].feedback_coherence_and_cohesion"
                                                                    rows="2"
                                                                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                                    placeholder="Comment on organization and flow..."
                                                                ></textarea>
                                                            </div>

                                                            <div>
                                                                <label class="block text-sm font-medium text-gray-700 mb-1">Lexical Resource Feedback</label>
                                                                <textarea
                                                                    v-model="evaluationData['task-' + task.id].feedback_lexical_resource"
                                                                    rows="2"
                                                                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                                    placeholder="Comment on vocabulary usage..."
                                                                ></textarea>
                                                            </div>

                                                            <div>
                                                                <label class="block text-sm font-medium text-gray-700 mb-1">Grammatical Range and Accuracy Feedback</label>
                                                                <textarea
                                                                    v-model="evaluationData['task-' + task.id].feedback_grammatical_range_and_accuracy"
                                                                    rows="2"
                                                                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                                    placeholder="Comment on grammar and sentence structures..."
                                                                ></textarea>
                                                            </div>

                                                            <div>
                                                                <label class="block text-sm font-medium text-gray-700 mb-2">Overall Feedback Points (Optional, up to 3)</label>
                                                                <div class="space-y-2">
                                                                    <input
                                                                        v-for="i in 3"
                                                                        :key="i"
                                                                        v-model="evaluationData['task-' + task.id].feedback_overall[i-1]"
                                                                        type="text"
                                                                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                                        :placeholder="'Overall point ' + i"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <!-- Action Buttons -->
                                                        <div class="flex items-center gap-3 pt-4 border-t border-gray-200">
                                                            <button
                                                                @click="saveEvaluation(task, index)"
                                                                :disabled="evaluating['task-' + task.id]"
                                                                class="inline-flex items-center px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                <i v-if="!evaluating['task-' + task.id]" data-feather="check" class="w-4 h-4 mr-2"></i>
                                                                <span v-if="evaluating['task-' + task.id]">Saving...</span>
                                                                <span v-else>Save Evaluation</span>
                                                            </button>
                                                            <button
                                                                @click="cancelEvaluation(task)"
                                                                :disabled="evaluating['task-' + task.id]"
                                                                class="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                                                            >
                                                                <i data-feather="x" class="w-4 h-4 mr-2"></i>
                                                                Cancel
                                                            </button>
                                                        </div>

                                                        <!-- Student's Submission (Read-only in eval mode) -->
                                                        <div class="pt-4 border-t border-gray-200">
                                                            <div class="bg-gray-50 rounded-lg p-4">
                                                                <h5 class="font-semibold text-gray-900 mb-3 flex items-center justify-between">
                                                                    <span>Student's Submission</span>
                                                                    <span v-if="task.word_count" class="text-sm font-normal text-gray-600">{{ task.word_count }} words</span>
                                                                </h5>
                                                                <p class="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{{ task.user_answer }}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <!-- Display Mode (already evaluated) -->
                                                    <div v-else>
                                                        <!-- Criteria Scores -->
                                                        <div v-if="task.criteria" class="mb-6">
                                                            <h5 class="font-semibold text-gray-900 mb-3">Assessment Criteria</h5>
                                                            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                                <div 
                                                                    v-for="(score, criterion) in task.criteria"
                                                                    :key="criterion"
                                                                    class="bg-gray-50 rounded-lg p-4 text-center"
                                                                >
                                                                    <div class="text-xs text-gray-600 mb-2">{{ formatCriterion(criterion) }}</div>
                                                                    <div class="text-2xl font-bold text-gray-900">{{ formatScore(score) }}</div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <!-- Feedback -->
                                                        <div v-if="task.feedback && (task.feedback.task_response_or_achievement || task.feedback.coherence_and_cohesion || task.feedback.lexical_resource || task.feedback.grammatical_range_and_accuracy)" class="mb-6">
                                                            <h5 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                                <i data-feather="message-circle" class="w-4 h-4 text-orange-600"></i>
                                                                Detailed Feedback
                                                            </h5>
                                                            <div class="space-y-3">
                                                                <div v-if="task.feedback.task_response_or_achievement" class="bg-orange-50 rounded-lg p-4">
                                                                    <h6 class="font-semibold text-gray-900 text-sm mb-2">Task Response / Achievement</h6>
                                                                    <p class="text-sm text-gray-700 leading-relaxed">{{ task.feedback.task_response_or_achievement }}</p>
                                                                </div>
                                                                <div v-if="task.feedback.coherence_and_cohesion" class="bg-blue-50 rounded-lg p-4">
                                                                    <h6 class="font-semibold text-gray-900 text-sm mb-2">Coherence and Cohesion</h6>
                                                                    <p class="text-sm text-gray-700 leading-relaxed">{{ task.feedback.coherence_and_cohesion }}</p>
                                                                </div>
                                                                <div v-if="task.feedback.lexical_resource" class="bg-green-50 rounded-lg p-4">
                                                                    <h6 class="font-semibold text-gray-900 text-sm mb-2">Lexical Resource</h6>
                                                                    <p class="text-sm text-gray-700 leading-relaxed">{{ task.feedback.lexical_resource }}</p>
                                                                </div>
                                                                <div v-if="task.feedback.grammatical_range_and_accuracy" class="bg-purple-50 rounded-lg p-4">
                                                                    <h6 class="font-semibold text-gray-900 text-sm mb-2">Grammatical Range and Accuracy</h6>
                                                                    <p class="text-sm text-gray-700 leading-relaxed">{{ task.feedback.grammatical_range_and_accuracy }}</p>
                                                                </div>
                                                                <div v-if="task.feedback.overall && task.feedback.overall.filter(p => p).length > 0" class="bg-yellow-50 rounded-lg p-4">
                                                                    <h6 class="font-semibold text-gray-900 text-sm mb-3">Overall Feedback</h6>
                                                                    <ul class="space-y-2">
                                                                        <li v-for="(point, idx) in task.feedback.overall.filter(p => p)" :key="idx" class="flex items-start gap-2">
                                                                            <span class="text-orange-600 mt-1">•</span>
                                                                            <p class="text-sm text-gray-700 leading-relaxed flex-1">{{ point }}</p>
                                                                        </li>
                                                                    </ul>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <!-- User Answer -->
                                                        <div>
                                                            <div class="bg-gray-50 rounded-lg p-4">
                                                                <h5 class="font-semibold text-gray-900 mb-3 flex items-center justify-between">
                                                                    <span>Student's Submission</span>
                                                                    <span v-if="task.word_count" class="text-sm font-normal text-gray-600">{{ task.word_count }} words</span>
                                                                </h5>
                                                                <p class="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{{ task.user_answer }}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div v-else class="text-center py-12">
                                        <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <i data-feather="edit-3" class="w-10 h-10 text-gray-400"></i>
                                        </div>
                                        <p class="text-gray-500 font-medium">No writing submissions found</p>
                                    </div>
                                </div>

                                <!-- Modal Footer -->
                                <div class="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                                    <button
                                        @click="closeAnswersDialog"
                                        class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Speaking Dialog Modal -->
                <div v-if="showAnswersDialog && dialogSection === 'speaking'" class="fixed inset-0 z-50 overflow-y-auto" @click.self="closeAnswersDialog">
                    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <!-- Background overlay -->
                        <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" @click="closeAnswersDialog"></div>

                        <!-- Center modal -->
                        <span class="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

                        <!-- Modal panel -->
                        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full max-h-[90vh]">
                            <div class="flex flex-col max-h-[90vh]">
                                <!-- Modal Header -->
                                <div class="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
                                    <div class="flex items-center gap-3">
                                        <div class="bg-white/20 rounded-full p-2">
                                            <i data-feather="mic" class="w-5 h-5 text-white"></i>
                                        </div>
                                        <h3 class="text-xl font-bold text-white">Speaking Assessment & Feedback</h3>
                                    </div>
                                    <button @click="closeAnswersDialog" class="text-white hover:bg-white/20 rounded-full p-2 transition-colors">
                                        <i data-feather="x" class="w-5 h-5"></i>
                                    </button>
                                </div>

                                <!-- Modal Body - Scrollable -->
                                <div class="flex-1 overflow-y-auto p-6">
                                    <div v-if="result.sections.speaking.parts && result.sections.speaking.parts.length > 0">
                                        <!-- Overall Speaking Band -->
                                        <div class="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6 mb-6">
                                            <div class="flex items-center justify-center gap-6">
                                                <div class="text-center">
                                                    <div class="text-sm text-gray-600 mb-1">Speaking Band Score</div>
                                                    <div class="text-4xl font-bold text-indigo-600">{{ formatScore(result.sections.speaking.overall_band_score) }}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Criteria Scores -->
                                        <div v-if="result.sections.speaking.criteria" class="mb-6">
                                            <h5 class="font-semibold text-gray-900 mb-3">Assessment Criteria</h5>
                                            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                <div 
                                                    v-for="(score, criterion) in result.sections.speaking.criteria"
                                                    :key="criterion"
                                                    class="bg-gray-50 rounded-lg p-4 text-center"
                                                >
                                                    <div class="text-xs text-gray-600 mb-2">{{ formatCriterion(criterion) }}</div>
                                                    <div class="text-2xl font-bold text-gray-900">{{ formatScore(score) }}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Overall Feedback -->
                                        <div v-if="result.sections.speaking.feedback" class="mb-6">
                                            <div class="bg-orange-50 rounded-lg p-4">
                                                <h5 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                    <i data-feather="message-circle" class="w-4 h-4 text-orange-600"></i>
                                                    Overall Feedback
                                                </h5>
                                                <p class="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{{ result.sections.speaking.feedback }}</p>
                                            </div>
                                        </div>

                                        <!-- Parts -->
                                        <div class="space-y-4">
                                            <h5 class="font-semibold text-gray-900">Speaking Parts</h5>
                                            <div
                                                v-for="(part, index) in result.sections.speaking.parts"
                                                :key="'part-' + index"
                                                class="border border-gray-200 rounded-lg p-4"
                                            >
                                                <div class="flex items-center justify-between mb-2">
                                                    <h6 class="font-semibold text-gray-900">{{ part.part_display }}</h6>
                                                    <span v-if="part.has_audio" class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        <i data-feather="check" class="w-3 h-3 mr-1"></i>
                                                        Recorded
                                                    </span>
                                                </div>
                                                <p class="text-sm text-gray-600">{{ part.topic }}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div v-else class="text-center py-12">
                                        <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <i data-feather="mic" class="w-10 h-10 text-gray-400"></i>
                                        </div>
                                        <p class="text-gray-500 font-medium">Speaking feedback is being processed...</p>
                                    </div>
                                </div>

                                <!-- Modal Footer -->
                                <div class="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                                    <button
                                        @click="closeAnswersDialog"
                                        class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
};
