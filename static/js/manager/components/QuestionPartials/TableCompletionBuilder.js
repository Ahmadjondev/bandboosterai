/**
 * Table Completion Builder Component
 * 
 * Advanced builder for creating Table Completion questions:
 * - Create structured tables with headers
 * - Add rows and columns dynamically
 * - Insert <input> blanks in cells
 * - Support for multiple blanks in one cell (array format)
 * - Auto-generate questions from <input> tags
 * - Save structured data to question_data field
 * 
 * Features:
 * - Visual table editor
 * - Add/remove rows and columns
 * - Insert blanks with button click
 * - Support for multi-line cells (arrays)
 * - Auto-question generation
 * - Edit mode support
 */

const TableCompletionBuilderComponent = {
    template: `
        <div class="bg-white rounded-lg p-6 shadow-sm">
            <!-- Header -->
            <div class="mb-6 pb-4 border-b-2 border-gray-200">
                <h3 class="text-2xl font-semibold text-gray-800 mb-2">📊 Table Completion Builder</h3>
                <p class="text-gray-500 text-sm">Create tables with blanks for students to complete</p>
            </div>

            <!-- Step 1: Table Editor -->
            <div v-if="currentStep === 1">
                <div class="flex flex-col gap-5">
                    <!-- Instructions -->
                    <div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <h4 class="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                            <i data-feather="info" class="w-5 h-5"></i>
                            How to use
                        </h4>
                        <ul class="text-sm text-orange-800 space-y-1 list-disc list-inside">
                            <li>The first row is the table header</li>
                            <li>Click <strong>"Add Blank"</strong> to insert an &lt;input&gt; tag where students will type</li>
                            <li>For multiple lines in a cell, click <strong>"Split to Lines"</strong></li>
                            <li>Questions will be auto-generated from each &lt;input&gt; tag</li>
                        </ul>
                    </div>

                    <!-- Table Controls -->
                    <div class="flex gap-3 flex-wrap">
                        <button 
                            type="button" 
                            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                            @click="addRow"
                        >
                            <i data-feather="plus" class="w-4 h-4"></i> Add Row
                        </button>
                        <button 
                            type="button" 
                            class="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition flex items-center gap-2"
                            @click="addColumn"
                        >
                            <i data-feather="plus" class="w-4 h-4"></i> Add Column
                        </button>
                        <button 
                            type="button" 
                            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2"
                            @click="removeColumn"
                            :disabled="tableData.items[0].length <= 1"
                        >
                            <i data-feather="minus" class="w-4 h-4"></i> Remove Last Column
                        </button>
                    </div>

                    <!-- Table Editor -->
                    <div class="overflow-x-auto border border-gray-300 rounded-lg">
                        <table class="w-full min-w-max border-collapse table-fixed">
                            <tbody>
                                <tr 
                                    v-for="(row, rowIndex) in tableData.items" 
                                    :key="'row-' + rowIndex"
                                    :class="rowIndex === 0 ? 'bg-gray-100' : 'bg-white'"
                                >
                                    <!-- Row Number / Actions -->
                                    <td class="border border-gray-300 p-2 text-center bg-gray-50 w-20">
                                        <div class="flex flex-col gap-1">
                                            <span class="text-xs font-semibold text-gray-600">
                                                {{ rowIndex === 0 ? 'Header' : 'Row ' + rowIndex }}
                                            </span>
                                            <button 
                                                v-if="rowIndex > 0"
                                                type="button" 
                                                class="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition"
                                                @click="removeRow(rowIndex)"
                                                title="Remove row"
                                            >
                                                <i data-feather="trash-2" class="w-3 h-3"></i>
                                            </button>
                                        </div>
                                    </td>

                                    <!-- Table Cells -->
                                    <td 
                                        v-for="(cell, cellIndex) in row" 
                                        :key="'cell-' + rowIndex + '-' + cellIndex"
                                        class="border border-gray-300 p-2 break-words"
                                        :class="rowIndex === 0 ? 'font-semibold bg-gray-100' : 'bg-white'"
                                    >
                                        <!-- Simple Cell (String) -->
                                        <div v-if="typeof cell === 'string'" class="space-y-2">
                                            <textarea 
                                                class="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-y"
                                                :class="rowIndex === 0 ? 'font-semibold' : ''"
                                                v-model="tableData.items[rowIndex][cellIndex]"
                                                @input="markAsModified"
                                                rows="3"
                                                :placeholder="rowIndex === 0 ? 'Column header' : 'Cell content'"
                                            ></textarea>
                                            <div class="flex gap-1">
                                                <button 
                                                    v-if="rowIndex > 0"
                                                    type="button" 
                                                    class="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 transition"
                                                    @click="insertBlank(rowIndex, cellIndex)"
                                                >
                                                    Add Blank
                                                </button>
                                                <button 
                                                    v-if="rowIndex > 0"
                                                    type="button" 
                                                    class="px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 transition"
                                                    @click="convertToMultiLine(rowIndex, cellIndex)"
                                                >
                                                    Split to Lines
                                                </button>
                                            </div>
                                        </div>

                                        <!-- Multi-line Cell (Array) -->
                                        <div v-else-if="Array.isArray(cell)" class="space-y-2">
                                            <div 
                                                v-for="(line, lineIndex) in cell" 
                                                :key="'line-' + lineIndex"
                                                class="flex gap-2 items-start"
                                            >
                                                <span class="text-xs text-gray-500 mt-2">{{ lineIndex + 1 }}.</span>
                                                <textarea 
                                                    class="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-y"
                                                    v-model="tableData.items[rowIndex][cellIndex][lineIndex]"
                                                    @input="markAsModified"
                                                    rows="2"
                                                    placeholder="Line content"
                                                ></textarea>
                                                <button 
                                                    type="button" 
                                                    class="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition"
                                                    @click="removeLine(rowIndex, cellIndex, lineIndex)"
                                                    title="Remove line"
                                                >
                                                    <i data-feather="x" class="w-3 h-3"></i>
                                                </button>
                                            </div>
                                            <div class="flex gap-1">
                                                <button 
                                                    type="button" 
                                                    class="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition"
                                                    @click="addLine(rowIndex, cellIndex)"
                                                >
                                                    Add Line
                                                </button>
                                                <button 
                                                    type="button" 
                                                    class="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 transition"
                                                    @click="insertBlankInMultiLine(rowIndex, cellIndex, cell.length - 1)"
                                                >
                                                    Add Blank
                                                </button>
                                                <button 
                                                    type="button" 
                                                    class="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition"
                                                    @click="convertToSingleLine(rowIndex, cellIndex)"
                                                >
                                                    Merge Lines
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Preview Section -->
                    <div class="bg-gray-50 border border-gray-200 rounded-lg p-5">
                        <h4 class="font-semibold text-gray-700 mb-3">Preview</h4>
                        <div class="overflow-x-auto border border-gray-300 rounded bg-white">
                            <table class="w-full min-w-max border-collapse table-fixed">
                                <tbody>
                                    <tr 
                                        v-for="(row, rowIndex) in tableData.items" 
                                        :key="'preview-row-' + rowIndex"
                                        :class="rowIndex === 0 ? 'bg-gray-100' : 'bg-white'"
                                    >
                                        <td 
                                            v-for="(cell, cellIndex) in row" 
                                            :key="'preview-cell-' + rowIndex + '-' + cellIndex"
                                            class="border border-gray-300 p-3 break-words"
                                            :class="rowIndex === 0 ? 'font-semibold text-center' : ''"
                                        >
                                            <!-- Render String Cell -->
                                            <div v-if="typeof cell === 'string'" class="whitespace-normal" v-html="renderCellPreview(cell)"></div>
                                            
                                            <!-- Render Array Cell -->
                                            <ul v-else-if="Array.isArray(cell)" class="space-y-1">
                                                <li v-for="(line, lineIndex) in cell" :key="'preview-line-' + lineIndex" class="whitespace-normal">
                                                    <span v-html="renderCellPreview(line)"></span>
                                                </li>
                                            </ul>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        
                        <!-- Blank Count -->
                        <div class="mt-3 text-sm text-gray-600">
                            <span class="font-semibold">Total blanks:</span> {{ countBlanks() }}
                        </div>
                    </div>

                    <!-- Navigation -->
                    <div class="flex justify-end gap-3 pt-4 border-t">
                        <button 
                            type="button" 
                            class="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition flex items-center gap-2"
                            @click="generateQuestions"
                            :disabled="countBlanks() === 0"
                        >
                            Next: Generate Questions
                            <i data-feather="arrow-right" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Step 2: Question Review -->
            <div v-if="currentStep === 2">
                <div class="flex flex-col gap-5">
                    <!-- Info Banner -->
                    <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 class="font-semibold text-green-900 mb-2 flex items-center gap-2">
                            <i data-feather="check-circle" class="w-5 h-5"></i>
                            Questions Generated
                        </h4>
                        <p class="text-sm text-green-800">
                            {{ generatedQuestions.length }} questions have been generated from your table blanks.
                            Review and adjust the answers below.
                        </p>
                    </div>

                    <!-- Table Preview (Read-only) -->
                    <div class="bg-gray-50 border border-gray-200 rounded-lg p-5">
                        <h4 class="font-semibold text-gray-700 mb-3">Table Structure</h4>
                        <div class="overflow-x-auto border border-gray-300 rounded bg-white">
                            <table class="w-full min-w-max border-collapse table-fixed">
                                <tbody>
                                    <tr 
                                        v-for="(row, rowIndex) in tableData.items" 
                                        :key="'final-row-' + rowIndex"
                                        :class="rowIndex === 0 ? 'bg-gray-100' : 'bg-white'"
                                    >
                                        <td 
                                            v-for="(cell, cellIndex) in row" 
                                            :key="'final-cell-' + rowIndex + '-' + cellIndex"
                                            class="border border-gray-300 p-3 break-words"
                                            :class="rowIndex === 0 ? 'font-semibold text-center' : ''"
                                        >
                                            <div v-if="typeof cell === 'string'" class="whitespace-normal" v-html="renderCellPreview(cell)"></div>
                                            <ul v-else-if="Array.isArray(cell)" class="space-y-1">
                                                <li v-for="(line, lineIndex) in cell" :key="'final-line-' + lineIndex" class="whitespace-normal">
                                                    <span v-html="renderCellPreview(line)"></span>
                                                </li>
                                            </ul>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Questions List -->
                    <div class="space-y-4">
                        <h4 class="font-semibold text-gray-700">Questions & Answers</h4>
                        
                        <div 
                            v-for="(question, index) in generatedQuestions" 
                            :key="'question-' + index"
                            class="bg-white border border-gray-200 rounded-lg p-4"
                        >
                            <div class="flex items-start gap-3">
                                <div class="flex-shrink-0 w-8 h-8 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center font-semibold text-sm">
                                    {{ index + 1 }}
                                </div>
                                <div class="flex-1 space-y-3">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">
                                            Question Text
                                        </label>
                                        <input 
                                            type="text" 
                                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                                            v-model="question.question_text"
                                            readonly
                                        >
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">
                                            Correct Answer
                                            <span class="text-red-500">*</span>
                                        </label>
                                        <input 
                                            type="text" 
                                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                                            v-model="question.correct_answer_text"
                                            placeholder="Enter the correct answer"
                                            @input="markAsModified"
                                        >
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Navigation -->
                    <div class="flex justify-between gap-3 pt-4 border-t">
                        <button 
                            type="button" 
                            class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
                            @click="goBackToEditor"
                        >
                            <i data-feather="arrow-left" class="w-4 h-4"></i>
                            Back to Editor
                        </button>
                        <button 
                            type="button" 
                            class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                            @click="finalizeQuestions"
                            :disabled="!canFinalize()"
                        >
                            <i data-feather="check" class="w-4 h-4"></i>
                            Finalize Questions
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `,

    props: {
        initialData: {
            type: Object,
            default: null
        },
        isEditMode: {
            type: Boolean,
            default: false
        }
    },

    data() {
        return {
            currentStep: 1,
            tableData: {
                items: [
                    // Header row
                    ['Column 1', 'Column 2', 'Column 3'],
                    // Data row
                    ['', '', '']
                ]
            },
            generatedQuestions: [],
            isModified: false
        };
    },

    mounted() {
        this.initializeData();
        this.refreshIcons();
    },

    updated() {
        this.$nextTick(() => {
            this.refreshIcons();
        });
    },

    methods: {
        initializeData() {
            if (this.initialData && this.initialData.question_data) {
                try {
                    const parsedData = typeof this.initialData.question_data === 'string'
                        ? JSON.parse(this.initialData.question_data)
                        : this.initialData.question_data;

                    if (parsedData.items && Array.isArray(parsedData.items)) {
                        this.tableData = parsedData;
                    }

                    // Load existing questions if in edit mode
                    if (this.isEditMode && this.initialData.questions) {
                        this.generatedQuestions = this.initialData.questions.map(q => ({
                            id: q.id,
                            question_text: q.question_text,
                            correct_answer_text: q.correct_answer_text,
                            order: q.order
                        }));
                    }
                } catch (error) {
                    console.error('Failed to parse table data:', error);
                }
            }
        },

        refreshIcons() {
            if (window.feather) {
                feather.replace();
            }
        },

        markAsModified() {
            this.isModified = true;
        },

        // Table manipulation methods
        addRow() {
            const columnCount = this.tableData.items[0].length;
            const newRow = Array(columnCount).fill('');
            this.tableData.items.push(newRow);
            this.markAsModified();
        },

        removeRow(rowIndex) {
            if (rowIndex > 0) {
                this.tableData.items.splice(rowIndex, 1);
                this.markAsModified();
            }
        },

        addColumn() {
            this.tableData.items.forEach((row, index) => {
                if (index === 0) {
                    row.push('Column ' + (row.length + 1));
                } else {
                    row.push('');
                }
            });
            this.markAsModified();
        },

        removeColumn() {
            if (this.tableData.items[0].length > 1) {
                this.tableData.items.forEach(row => {
                    row.pop();
                });
                this.markAsModified();
            }
        },

        removeLine(rowIndex, cellIndex, lineIndex) {
            const cell = this.tableData.items[rowIndex][cellIndex];
            if (Array.isArray(cell) && cell.length > 1) {
                cell.splice(lineIndex, 1);
                this.markAsModified();
            }
        },

        addLine(rowIndex, cellIndex) {
            const cell = this.tableData.items[rowIndex][cellIndex];
            if (Array.isArray(cell)) {
                cell.push('');
                this.markAsModified();
            }
        },

        insertBlank(rowIndex, cellIndex) {
            const currentValue = this.tableData.items[rowIndex][cellIndex];
            this.tableData.items[rowIndex][cellIndex] = currentValue + ' <input>';
            this.markAsModified();
        },

        insertBlankInMultiLine(rowIndex, cellIndex, lineIndex) {
            const cell = this.tableData.items[rowIndex][cellIndex];
            if (Array.isArray(cell) && cell[lineIndex] !== undefined) {
                cell[lineIndex] = cell[lineIndex] + ' <input>';
                this.markAsModified();
            }
        },

        convertToMultiLine(rowIndex, cellIndex) {
            const currentValue = this.tableData.items[rowIndex][cellIndex];
            this.tableData.items[rowIndex][cellIndex] = [currentValue];
            this.markAsModified();
        },

        convertToSingleLine(rowIndex, cellIndex) {
            const cell = this.tableData.items[rowIndex][cellIndex];
            if (Array.isArray(cell)) {
                this.tableData.items[rowIndex][cellIndex] = cell.join(', ');
                this.markAsModified();
            }
        },

        renderCellPreview(text) {
            if (!text) return '';
            // Replace <input> with visual placeholder
            return text.replace(/<input>/g, '<span class="inline-block px-3 py-1 bg-yellow-100 border border-yellow-300 rounded text-xs font-mono">__________</span>');
        },

        countBlanks() {
            let count = 0;
            this.tableData.items.forEach((row, rowIndex) => {
                if (rowIndex === 0) return; // Skip header row

                row.forEach(cell => {
                    if (typeof cell === 'string') {
                        count += (cell.match(/<input>/g) || []).length;
                    } else if (Array.isArray(cell)) {
                        cell.forEach(line => {
                            count += (line.match(/<input>/g) || []).length;
                        });
                    }
                });
            });
            return count;
        },

        generateQuestions() {
            const questions = [];
            let questionNumber = 1;

            this.tableData.items.forEach((row, rowIndex) => {
                if (rowIndex === 0) return; // Skip header row

                row.forEach((cell, cellIndex) => {
                    const header = this.tableData.items[0][cellIndex];

                    if (typeof cell === 'string') {
                        const blankCount = (cell.match(/<input>/g) || []).length;
                        for (let i = 0; i < blankCount; i++) {
                            questions.push({
                                question_text: `Row ${rowIndex}, ${header} (${questionNumber})`,
                                correct_answer_text: '',
                                order: questionNumber
                            });
                            questionNumber++;
                        }
                    } else if (Array.isArray(cell)) {
                        cell.forEach((line, lineIndex) => {
                            const blankCount = (line.match(/<input>/g) || []).length;
                            for (let i = 0; i < blankCount; i++) {
                                questions.push({
                                    question_text: `Row ${rowIndex}, ${header} - Line ${lineIndex + 1} (${questionNumber})`,
                                    correct_answer_text: '',
                                    order: questionNumber
                                });
                                questionNumber++;
                            }
                        });
                    }
                });
            });

            // Preserve existing answers if in edit mode
            if (this.isEditMode && this.generatedQuestions.length > 0) {
                questions.forEach((newQ, index) => {
                    if (this.generatedQuestions[index]) {
                        newQ.correct_answer_text = this.generatedQuestions[index].correct_answer_text;
                        newQ.id = this.generatedQuestions[index].id;
                    }
                });
            }

            this.generatedQuestions = questions;
            this.currentStep = 2;
        },

        goBackToEditor() {
            this.currentStep = 1;
        },

        canFinalize() {
            return this.generatedQuestions.every(q => q.correct_answer_text && q.correct_answer_text.trim());
        },

        finalizeQuestions() {
            if (!this.canFinalize()) {
                alert('Please fill in all correct answers before finalizing.');
                return;
            }

            // Emit event with finalized data
            this.$emit('questions-ready', {
                question_data: JSON.stringify(this.tableData),
                questions: this.generatedQuestions,
                isModified: this.isModified
            });
        }
    }
};

// Register component globally
if (typeof window !== 'undefined') {
    window.TableCompletionBuilderComponent = TableCompletionBuilderComponent;
}
