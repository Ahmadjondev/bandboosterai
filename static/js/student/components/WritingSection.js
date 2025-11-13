/**
 * Writing Section Component
 */

window.vueApp.component('writing-section', {
    template: `
        <div class="flex h-full flex-col">
            <!-- Image Modal -->
            <div 
                v-if="showImageModal"
                @click="closeImageModal"
                class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4"
                style="backdrop-filter: blur(4px);"
            >
                <div class="relative max-w-7xl max-h-full">
                    <!-- Close Button -->
                    <button
                        @click="closeImageModal"
                        class="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
                        title="Close (ESC)"
                    >
                        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                    
                    <!-- Image -->
                    <img 
                        :src="modalImageUrl" 
                        alt="Task visual (full size)" 
                        class="max-w-full max-h-screen object-contain rounded-lg shadow-2xl"
                        @click.stop
                    />
                    
                    <!-- Hint Text -->
                    <div class="absolute -bottom-12 left-0 right-0 text-center text-white text-sm opacity-75">
                        Click outside or press ESC to close
                    </div>
                </div>
            </div>

            <!-- Task Tabs -->
            <div class="border-b bg-white px-6 py-3">
                <div class="flex items-center justify-between">
                    <div class="flex gap-2">
                        <button
                            v-for="task in data.tasks"
                            :key="task.id"
                            @click="activeTask = task.task_type"
                            :class="[
                                'rounded-lg border px-4 py-2 text-sm font-medium transition',
                                activeTask === task.task_type
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            ]"
                        >
                            {{ task.task_type === 'TASK_1' ? 'Task 1' : 'Task 2' }}
                        </button>
                    </div>
                    
                    <div class="flex items-center gap-4 text-sm">
                        <div v-for="task in data.tasks" :key="task.id">
                            <span v-if="activeTask === task.task_type" class="text-slate-600">
                                Words: <span class="font-semibold text-indigo-600">{{ wordCounts[task.id] || 0 }}</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-6 lg:px-8 py-6">
                <div v-for="task in data.tasks" :key="task.id">
                    <div v-show="activeTask === task.task_type" class="max-w-7xl mx-auto">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <!-- Left: Instructions & Visual -->
                            <div class="space-y-6">
                                <div class="rounded-lg border border-slate-200 bg-white p-6" :class="fontSize">
                                    <div class="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
                                        {{ task.task_type === 'TASK_1' ? 'Task 1' : 'Task 2' }} Instructions
                                    </div>
                                    <div class="text-slate-700 leading-relaxed whitespace-pre-wrap" style="font-size: inherit;">
                                        {{ task.prompt }}
                                    </div>
                                </div>

                                <!-- Picture (Clickable to enlarge) -->
                                <div v-if="task.picture_url" class="rounded-lg border border-slate-200 bg-white p-4">
                                    <div class="relative group cursor-pointer" @click="openImageModal(task.picture_url)">
                                        <img 
                                            :src="task.picture_url" 
                                            alt="Task visual (click to enlarge)" 
                                            class="w-full h-auto rounded transition-transform group-hover:scale-[1.02]" 
                                        />
                                        <!-- Overlay hint on hover -->
                                        <div class="absolute inset-0 group-hover:bg-opacity-30 transition-all rounded flex items-center justify-center">
                                            <span class="text-white font-semibold text-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Chart (Task 1 only) -->
                                <div v-else-if="task.data && task.task_type === 'TASK_1'" class="rounded-lg border border-slate-200 bg-white p-4">
                                    <canvas :ref="'chart-' + task.id" class="w-full" style="max-height: 400px;"></canvas>
                                </div>
                            </div>

                            <!-- Right: Answer Area -->
                            <div class="rounded-lg border border-slate-200 bg-white p-6 flex flex-col">
                                <div class="flex justify-between items-center mb-3">
                                    <h3 class="text-base font-semibold text-slate-800">
                                        Your Answer
                                    </h3>
                                    <span class="text-xs text-slate-500">
                                        Min. {{ task.task_type === 'TASK_1' ? '150' : '250' }} words
                                    </span>
                                </div>
                                
                                <textarea
                                    :value="answers[task.id] || ''"
                                    @input="handleInput(task.id, task.task_type, $event.target.value)"
                                    rows="20"
                                    class="flex-1 w-full rounded border border-slate-300 p-3 font-mono leading-relaxed focus:border-indigo-500 focus:ring-indigo-500 resize-none"
                                    :class="fontSize"
                                    :placeholder="'Write your ' + (task.task_type === 'TASK_1' ? 'Task 1' : 'Task 2') + ' answer here...'"
                                ></textarea>
                                
                                <div class="mt-3 text-xs text-slate-500">
                                    Auto-saving...
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,

    props: {
        data: {
            type: Object,
            required: true
        },
        fontSize: {
            type: String,
            default: 'text-base'
        }
    },

    emits: ['submit-writing'],

    setup(props, { emit }) {
        const activeTask = ref('TASK_1');
        const answers = ref({});
        const wordCounts = ref({});
        const saveTimeouts = ref({});
        const showImageModal = ref(false);
        const modalImageUrl = ref('');

        // Initialize answers and word counts
        onMounted(() => {
            props.data.tasks.forEach(task => {
                answers.value[task.id] = task.user_answer || '';
                wordCounts.value[task.id] = countWords(task.user_answer || '');

                // Render chart if data exists
                if (task.data && task.task_type === 'TASK_1') {
                    setTimeout(() => renderChart(task.id, task.data), 100);
                }
            });

            // Initialize text highlighter
            const container = document.querySelector('.flex.h-full.flex-col');
            if (container && window.TextHighlighter) {
                const attemptId = window.attemptId || props.attemptId;
                window.TextHighlighter.init('writing', container, attemptId);
            }

            // Add ESC key listener for modal
            document.addEventListener('keydown', handleKeyDown);
        });

        // Cleanup highlighter and event listeners
        onUnmounted(() => {
            if (window.TextHighlighter) {
                window.TextHighlighter.cleanup();
            }
            document.removeEventListener('keydown', handleKeyDown);
        });

        function handleKeyDown(event) {
            if (event.key === 'Escape' && showImageModal.value) {
                closeImageModal();
            }
        }

        function openImageModal(imageUrl) {
            modalImageUrl.value = imageUrl;
            showImageModal.value = true;
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        }

        function closeImageModal() {
            showImageModal.value = false;
            modalImageUrl.value = '';
            // Restore body scroll
            document.body.style.overflow = '';
        }

        function countWords(text) {
            return text.trim() ? text.trim().split(/\s+/).length : 0;
        }

        function handleInput(taskId, taskType, text) {
            answers.value[taskId] = text;
            wordCounts.value[taskId] = countWords(text);

            // Debounced auto-save
            if (saveTimeouts.value[taskId]) {
                clearTimeout(saveTimeouts.value[taskId]);
            }

            saveTimeouts.value[taskId] = setTimeout(() => {
                autoSave(taskId, taskType, text);
            }, 1000);
        }

        async function autoSave(taskId, taskType, text) {
            try {
                const type = taskType === 'TASK_1' ? 'task1' : 'task2';
                await emit('submit-writing', taskId, type, text);
            } catch (err) {
                console.error('Auto-save failed:', err);
            }
        }

        function renderChart(taskId, chartData) {
            const canvas = document.querySelector(`[ref="chart-${taskId}"]`);
            if (!canvas || !window.Chart) return;

            const ctx = canvas.getContext('2d');

            new Chart(ctx, {
                type: chartData.type || 'bar',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        title: {
                            display: false
                        }
                    }
                }
            });
        }

        return {
            activeTask,
            answers,
            wordCounts,
            showImageModal,
            modalImageUrl,
            fontSize: computed(() => props.fontSize),
            handleInput,
            openImageModal,
            closeImageModal
        };
    }
});
