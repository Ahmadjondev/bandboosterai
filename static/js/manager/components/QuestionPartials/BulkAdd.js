/**
 * Bulk Add Component
 * Allows adding multiple questions at once via pipe-separated format
 */

window.BulkAddComponent = {
    mixins: [window.FeatherIconsMixin],
    data() {
        return {
            bulkText: '',
            showBulkAdd: false
        };
    },

    methods: {
        toggle() {
            this.showBulkAdd = !this.showBulkAdd;
            if (this.showBulkAdd) {
                this.$nextTick(() => {
                    const textarea = this.$el.querySelector('textarea');
                    if (textarea) textarea.focus();
                });
            }
            this.initIcons();
        },

        processBulk() {
            if (!this.bulkText.trim()) {
                this.$root.showNotification('Please enter questions', 'warning');
                return;
            }

            const lines = this.bulkText.split('\n').filter(line => line.trim());
            const parsedQuestions = [];
            let failed = 0;

            for (const line of lines) {
                const parts = line.split('|').map(p => p.trim());
                if (parts.length >= 2) {
                    parsedQuestions.push({
                        question_text: parts[0],
                        correct_answer_text: parts[1],
                        answer_two_text: parts[2] || '',
                        explanation: parts[3] || '',
                        points: parseInt(parts[4]) || 1,
                    });
                } else {
                    failed++;
                }
            }

            if (parsedQuestions.length > 0) {
                this.$emit('bulk-add', parsedQuestions);
                this.bulkText = '';
                this.showBulkAdd = false;
                this.$root.showNotification(
                    `Added ${parsedQuestions.length} question(s)${failed > 0 ? `, ${failed} failed` : ''}`,
                    'success'
                );
            } else {
                this.$root.showNotification(
                    'No valid questions found. Format: Question | Answer [| Alt Answer] [| Explanation] [| Points]',
                    'warning'
                );
            }
        },

        cancel() {
            this.bulkText = '';
            this.showBulkAdd = false;
        }
    },

    template: `
        <div class="bulk-add-component">
            <!-- Toggle Button -->
            <div class="bg-gradient-to-r from-indigo-50 to-purple-50 border border-orange-200 rounded-lg p-4">
                <div class="flex items-center justify-between flex-wrap gap-3">
                    <div class="flex items-center gap-3 flex-wrap">
                        <div class="flex items-center gap-2">
                            <i data-feather="zap" class="w-4 h-4 text-orange-600"></i>
                            <span class="text-sm font-medium text-slate-900">Quick Actions</span>
                        </div>
                        <button @click="toggle" 
                                class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-orange-700 bg-white border border-orange-300 rounded-lg hover:bg-orange-50 transition-colors">
                            <i data-feather="layers" class="w-3.5 h-3.5"></i>
                            Bulk Add
                        </button>
                    </div>
                    <div class="flex items-center gap-2 text-xs text-slate-600">
                        <kbd class="px-2 py-1 bg-white rounded border border-slate-300 font-mono">Ctrl/Cmd + Enter</kbd>
                        <span>Add & Continue</span>
                    </div>
                </div>
            </div>

            <!-- Bulk Add Modal -->
            <div v-if="showBulkAdd" class="bg-white rounded-lg border-2 border-orange-300 p-6 shadow-lg mt-4">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-slate-900">Bulk Add Questions</h3>
                    <button @click="cancel" class="text-slate-400 hover:text-slate-600">
                        <i data-feather="x" class="w-5 h-5"></i>
                    </button>
                </div>
                <div class="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p class="text-sm text-amber-900 mb-2 font-medium">
                        Format: One question per line (pipe-separated)
                    </p>
                    <div class="space-y-1 text-xs text-amber-800 font-mono">
                        <p>Question | Answer | AltAnswer | Explanation | Points</p>
                        <p class="text-amber-600">(Only Question and Answer are required)</p>
                    </div>
                    <div class="mt-3 pt-3 border-t border-amber-200">
                        <p class="text-xs text-amber-900 font-semibold mb-1">Examples:</p>
                        <div class="space-y-1 text-xs text-amber-800 font-mono">
                            <p>What is 2+2? | 4</p>
                            <p>Complete: The sky is ___ | blue | azure | Color of clear sky | 2</p>
                        </div>
                    </div>
                </div>
                <textarea 
                    v-model="bulkText"
                    rows="10"
                    class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-sm"
                    placeholder="What is the capital of France? | Paris&#10;Complete: The sky is ___ | blue&#10;How many continents are there? | 7 | seven | Remember Antarctica | 1"
                ></textarea>
                <div class="flex justify-end gap-2 mt-4">
                    <button @click="cancel" 
                            class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                        Cancel
                    </button>
                    <button @click="processBulk" 
                            class="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors">
                        Add Questions
                    </button>
                </div>
            </div>
        </div>
    `
};
