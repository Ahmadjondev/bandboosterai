/**
 * Text Highlighter Component - Advanced Optimized Version
 * Allows users to highlight text with color selection
 * 
 * Features:
 * - Text selection detection
 * - Color picker popup
 * - Persistent highlights per section
 * - Clean removal of highlights
 * - localStorage persistence
 * 
 * Performance Optimizations:
 * - Debounced selection detection (150ms)
 * - Throttled save operations (300ms)
 * - Smart text node caching (5s TTL)
 * - Passive event listeners
 * - RequestIdleCallback for restoration
 * - Memory leak prevention
 */

window.TextHighlighter = {
    /**
     * Available highlight colors
     */
    colors: [
        { name: 'Yellow', class: 'bg-yellow-200', hex: '#fef08a' },
        { name: 'Green', class: 'bg-green-200', hex: '#bbf7d0' },
        { name: 'Pink', class: 'bg-pink-200', hex: '#fbcfe8' },
        { name: 'Blue', class: 'bg-blue-200', hex: '#bfdbfe' },
        { name: 'Purple', class: 'bg-purple-200', hex: '#e9d5ff' }
    ],

    /**
     * Available text formats
     */
    formats: [
        { name: 'Bold', class: 'font-bold', icon: 'B' },
        { name: 'Underline', class: 'underline', icon: 'U' }
    ],

    /**
     * Store highlights per section
     */
    highlights: {},

    /**
     * Current section name
     */
    currentSection: null,

    /**
     * Current attempt UID
     */
    attemptId: null,

    /**
     * Popup element
     */
    popupElement: null,

    /**
     * Container element reference
     */
    containerElement: null,

    /**
     * Performance: Cache for text nodes
     */
    textNodeCache: null,
    cacheTimestamp: 0,
    CACHE_DURATION: 5000,

    /**
     * Performance: Debounce/throttle timers
     */
    selectionTimeout: null,
    saveTimeout: null,

    /**
     * Event handlers (for cleanup)
     */
    boundHandlers: {
        mouseup: null,
        keyup: null,
        mousedown: null
    },

    /**
     * Initialize highlighter for a section
     */
    init(sectionName, containerElement, attemptId = null) {
        console.log('[TextHighlighter] Initializing:', sectionName, containerElement);

        // Cleanup any previous instance
        this.cleanup();

        this.currentSection = sectionName;
        this.containerElement = containerElement;
        this.attemptId = attemptId || window.attemptId || 'default';

        // Reset cache
        this.textNodeCache = null;
        this.cacheTimestamp = 0;

        // Load highlights from storage
        this.loadHighlights();

        // Create popup
        this.createPopup();

        // Setup listeners
        this.setupSelectionListener(containerElement);

        // Restore highlights with delay for DOM
        requestAnimationFrame(() => {
            setTimeout(() => {
                this.restoreHighlights(containerElement);
            }, 100);
        });

        console.log('[TextHighlighter] Initialized successfully');
    },
    /**
     * Create the color picker popup
     */
    createPopup() {
        if (this.popupElement) return;

        const popup = document.createElement('div');
        popup.id = 'text-highlighter-popup';
        popup.className = 'fixed hidden z-50 bg-white rounded-lg shadow-xl border border-slate-200 p-2';
        popup.style.cssText = 'transition: opacity 0.2s ease; will-change: transform;';

        popup.innerHTML = `
            <div class="flex items-center gap-2 flex-wrap">
                <div class="text-xs font-semibold text-slate-600 px-2">Highlight:</div>
                ${this.colors.map((color, index) => `
                    <button
                        type="button"
                        data-color-index="${index}"
                        class="w-8 h-8 rounded-md ${color.class} border-2 border-slate-300 hover:border-slate-500 transition-all hover:scale-110 flex items-center justify-center group"
                        title="${color.name}"
                    >
                        <span class="text-xs opacity-0 group-hover:opacity-100 font-bold text-slate-700">✓</span>
                    </button>
                `).join('')}
                <div class="w-px h-6 bg-slate-300 mx-1"></div>
                <div class="text-xs font-semibold text-slate-600 px-2">Format:</div>
                ${this.formats.map((format, index) => `
                    <button
                        type="button"
                        data-format-index="${index}"
                        class="w-8 h-8 rounded-md bg-slate-100 border-2 border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 transition-all hover:scale-110 flex items-center justify-center group ${format.class}"
                        title="${format.name}"
                    >
                        <span class="text-xs font-bold text-slate-700 group-hover:text-indigo-600">${format.icon}</span>
                    </button>
                `).join('')}
                <div class="w-px h-6 bg-slate-300 mx-1"></div>
                <button
                    type="button"
                    data-action="remove"
                    class="w-8 h-8 rounded-md bg-slate-100 border-2 border-slate-300 hover:border-red-400 hover:bg-red-50 transition-all hover:scale-110 flex items-center justify-center group"
                    title="Remove highlight"
                >
                    <span class="text-slate-600 group-hover:text-red-600 font-bold">✕</span>
                </button>
            </div>
        `;

        document.body.appendChild(popup);
        this.popupElement = popup;

        // Event delegation
        popup.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const colorBtn = e.target.closest('[data-color-index]');
            const formatBtn = e.target.closest('[data-format-index]');
            const removeBtn = e.target.closest('[data-action="remove"]');

            if (colorBtn) {
                const colorIndex = parseInt(colorBtn.dataset.colorIndex);
                this.applyHighlight(colorIndex, null);
            } else if (formatBtn) {
                const formatIndex = parseInt(formatBtn.dataset.formatIndex);
                this.applyFormat(formatIndex);
            } else if (removeBtn) {
                this.removeHighlight();
            }
        }, false);
    },

    /**
     * Setup selection listener with debouncing
     */
    setupSelectionListener(containerElement) {
        const handleSelection = () => {
            if (this.selectionTimeout) {
                clearTimeout(this.selectionTimeout);
            }

            this.selectionTimeout = setTimeout(() => {
                const selection = window.getSelection();
                const selectedText = selection.toString().trim();

                if (selectedText.length > 0 && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const container = range.commonAncestorContainer;
                    const isInContainer = container === containerElement ||
                        containerElement.contains(container);

                    if (isInContainer) {
                        this.showPopup(selection);
                    } else {
                        this.hidePopup();
                    }
                } else {
                    this.hidePopup();
                }
            }, 150);
        };

        // Store handlers for cleanup
        this.boundHandlers.mouseup = handleSelection;
        this.boundHandlers.keyup = handleSelection;

        // Use passive listeners
        document.addEventListener('mouseup', this.boundHandlers.mouseup, { passive: true });
        document.addEventListener('keyup', this.boundHandlers.keyup, { passive: true });

        // Hide popup when clicking outside
        this.boundHandlers.mousedown = (e) => {
            if (this.popupElement && !this.popupElement.contains(e.target)) {
                const selection = window.getSelection();
                if (!selection.toString().trim()) {
                    this.hidePopup();
                }
            }
        };

        document.addEventListener('mousedown', this.boundHandlers.mousedown, { passive: true });
    },

    /**
     * Show popup near selection
     */
    showPopup(selection) {
        if (!this.popupElement || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        const popupWidth = 400;
        const popupHeight = 50;
        const margin = 10;

        let left = rect.left + (rect.width / 2) - (popupWidth / 2);
        let top = rect.top - popupHeight - margin;

        // Clamp to viewport
        left = Math.max(margin, Math.min(left, window.innerWidth - popupWidth - margin));

        if (top < margin) {
            top = rect.bottom + margin;
        }

        // Use transform for better performance
        this.popupElement.style.transform = `translate(${left}px, ${top}px)`;
        this.popupElement.style.left = '0';
        this.popupElement.style.top = '0';
        this.popupElement.classList.remove('hidden');
        this.popupElement.style.opacity = '1';
    },

    /**
     * Hide popup
     */
    hidePopup() {
        if (this.popupElement && !this.popupElement.classList.contains('hidden')) {
            this.popupElement.style.opacity = '0';
            setTimeout(() => {
                if (this.popupElement) {
                    this.popupElement.classList.add('hidden');
                }
            }, 200);
        }
    },

    /**
     * Apply highlight to selection
     * Handles both simple and complex selections (spanning multiple nodes)
     */
    applyHighlight(colorIndex, existingFormats = null) {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const selectedText = selection.toString().trim();

        if (!selectedText) return;

        const color = this.colors[colorIndex];

        // Check if selection is already highlighted (simple case)
        const container = range.commonAncestorContainer;
        let existingHighlight = container.nodeType === 3
            ? container.parentElement
            : container;

        if (existingHighlight.tagName === 'MARK' && existingHighlight.dataset.highlightSection === this.currentSection) {
            // Update existing highlight color
            existingHighlight.className = `${color.class} rounded px-0.5 transition-colors cursor-pointer`;
            // Preserve existing formats
            const formats = existingHighlight.dataset.highlightFormats
                ? existingHighlight.dataset.highlightFormats.split(',').map(f => parseInt(f))
                : [];
            formats.forEach(formatIndex => {
                existingHighlight.classList.add(this.formats[formatIndex].class);
            });
            existingHighlight.dataset.highlightColor = colorIndex;

            // Clear selection and hide popup
            selection.removeAllRanges();
            this.hidePopup();
            this.saveAllHighlights();
            return;
        }

        // Try simple surroundContents first
        try {
            const highlight = document.createElement('mark');
            highlight.className = `${color.class} rounded px-0.5 transition-colors cursor-pointer inline`;
            highlight.style.display = 'inline';
            highlight.style.whiteSpace = 'normal';
            highlight.style.wordBreak = 'normal';
            highlight.dataset.highlightColor = colorIndex;
            highlight.dataset.highlightSection = this.currentSection;
            highlight.dataset.highlightAttempt = this.attemptId;

            // Apply existing formats if provided
            if (existingFormats && existingFormats.length > 0) {
                highlight.dataset.highlightFormats = existingFormats.join(',');
                existingFormats.forEach(formatIndex => {
                    highlight.classList.add(this.formats[formatIndex].class);
                });
            }

            range.surroundContents(highlight);

            // Save highlight
            const formats = existingFormats || [];
            this.saveHighlight(selectedText, colorIndex, formats);

            // Clear selection and hide popup
            selection.removeAllRanges();
            this.hidePopup();
        } catch (e) {
            // Simple method failed, use advanced method for complex selections
            console.log('Using advanced highlight method for complex selection');
            this.applyHighlightAdvanced(range, selectedText, colorIndex, existingFormats);
        }
    },

    /**
     * Advanced highlight method for complex selections
     * Handles selections spanning multiple elements
     */
    applyHighlightAdvanced(range, selectedText, colorIndex, existingFormats = null) {
        const color = this.colors[colorIndex];

        // Get all text nodes within the range
        const textNodes = this.getTextNodesInRange(range);

        if (textNodes.length === 0) {
            this.hidePopup();
            return;
        }

        // Wrap each text node in a highlight
        textNodes.forEach(textNode => {
            try {
                const highlight = document.createElement('mark');
                highlight.className = `${color.class} rounded px-0.5 transition-colors cursor-pointer inline`;
                highlight.style.display = 'inline';
                highlight.style.whiteSpace = 'normal';
                highlight.style.wordBreak = 'normal';
                highlight.dataset.highlightColor = colorIndex;
                highlight.dataset.highlightSection = this.currentSection;
                highlight.dataset.highlightAttempt = this.attemptId;

                // Apply formats
                if (existingFormats && existingFormats.length > 0) {
                    highlight.dataset.highlightFormats = existingFormats.join(',');
                    existingFormats.forEach(formatIndex => {
                        if (this.formats[formatIndex]) {
                            highlight.classList.add(this.formats[formatIndex].class);
                        }
                    });
                }

                // Wrap the text node
                const parent = textNode.parentNode;
                parent.insertBefore(highlight, textNode);
                highlight.appendChild(textNode);
            } catch (err) {
                console.warn('Failed to highlight text node:', err);
            }
        });

        // Save highlight
        const formats = existingFormats || [];
        this.saveHighlight(selectedText, colorIndex, formats);

        // Clear selection and hide popup
        window.getSelection().removeAllRanges();
        this.hidePopup();
    },

    /**
     * Get all text nodes within a range
     */
    getTextNodesInRange(range) {
        const textNodes = [];
        const walker = document.createTreeWalker(
            range.commonAncestorContainer,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    // Check if this text node is within the range
                    const nodeRange = document.createRange();
                    nodeRange.selectNodeContents(node);

                    // Check if ranges intersect
                    if (range.compareBoundaryPoints(Range.END_TO_START, nodeRange) <= 0 &&
                        range.compareBoundaryPoints(Range.START_TO_END, nodeRange) >= 0) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_REJECT;
                }
            }
        );

        let node;
        while (node = walker.nextNode()) {
            // Skip empty or whitespace-only nodes
            if (node.textContent.trim().length > 0) {
                // Don't highlight if already inside a mark with our attributes
                let parent = node.parentElement;
                let isAlreadyHighlighted = false;
                while (parent) {
                    if (parent.tagName === 'MARK' &&
                        parent.dataset.highlightAttempt === this.attemptId) {
                        isAlreadyHighlighted = true;
                        break;
                    }
                    parent = parent.parentElement;
                }

                if (!isAlreadyHighlighted) {
                    textNodes.push(node);
                }
            }
        }

        return textNodes;
    },

    /**
     * Apply format (bold/underline) to selection
     */
    applyFormat(formatIndex) {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const selectedText = selection.toString().trim();

        if (!selectedText) return;

        const format = this.formats[formatIndex];
        const container = range.commonAncestorContainer;
        let highlightElement = container.nodeType === 3
            ? container.parentElement
            : container;

        // Check if selection is already highlighted
        if (highlightElement.tagName === 'MARK' && highlightElement.dataset.highlightSection === this.currentSection) {
            // Toggle format on existing highlight
            const currentFormats = highlightElement.dataset.highlightFormats
                ? highlightElement.dataset.highlightFormats.split(',').map(f => parseInt(f))
                : [];

            const formatExists = currentFormats.includes(formatIndex);

            if (formatExists) {
                // Remove format
                highlightElement.classList.remove(format.class);
                const newFormats = currentFormats.filter(f => f !== formatIndex);
                highlightElement.dataset.highlightFormats = newFormats.join(',');
            } else {
                // Add format
                highlightElement.classList.add(format.class);
                currentFormats.push(formatIndex);
                highlightElement.dataset.highlightFormats = currentFormats.join(',');
            }

            // Clear selection and hide popup
            selection.removeAllRanges();
            this.hidePopup();
            this.saveAllHighlights();
        } else {
            // No highlight exists, create format-only mark (no background color)
            try {
                const mark = document.createElement('mark');
                mark.className = `${format.class} rounded px-0.5 transition-colors cursor-pointer inline`;
                mark.style.display = 'inline';
                mark.style.whiteSpace = 'normal';
                mark.style.wordBreak = 'normal';
                mark.style.backgroundColor = 'transparent';
                mark.dataset.highlightColor = '-1'; // -1 indicates no color, format only
                mark.dataset.highlightSection = this.currentSection;
                mark.dataset.highlightAttempt = this.attemptId;
                mark.dataset.highlightFormats = formatIndex.toString();

                range.surroundContents(mark);

                // Save format-only highlight
                this.saveHighlight(selectedText, -1, [formatIndex]);

                // Clear selection and hide popup
                selection.removeAllRanges();
                this.hidePopup();
            } catch (e) {
                console.warn('Could not apply format:', e);
                this.hidePopup();
            }
        }
    },

    /**
     * Remove highlight from selection
     */
    removeHighlight() {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;

        // Find highlight element
        let highlightElement = container.nodeType === 3
            ? container.parentElement
            : container;

        if (highlightElement.tagName === 'MARK' && highlightElement.dataset.highlightSection === this.currentSection) {
            // Remove highlight element, keep text
            const parent = highlightElement.parentNode;
            while (highlightElement.firstChild) {
                parent.insertBefore(highlightElement.firstChild, highlightElement);
            }
            parent.removeChild(highlightElement);

            // Clear selection and hide popup
            selection.removeAllRanges();
            this.hidePopup();

            // Save updated highlights
            this.saveAllHighlights();
        }
    },

    /**
     * Save highlight to storage
     */
    saveHighlight(text, colorIndex, formats) {
        if (!this.highlights[this.attemptId]) {
            this.highlights[this.attemptId] = {};
        }
        if (!this.highlights[this.attemptId][this.currentSection]) {
            this.highlights[this.attemptId][this.currentSection] = [];
        }

        this.highlights[this.attemptId][this.currentSection].push({
            text: text,
            color: colorIndex,
            formats: formats || [],
            timestamp: Date.now()
        });

        this.persistHighlights();
    },

    /**
     * Save all current highlights from DOM with throttling
     */
    saveAllHighlights() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        this.saveTimeout = setTimeout(() => {
            const marks = document.querySelectorAll(
                `mark[data-highlight-section="${this.currentSection}"][data-highlight-attempt="${this.attemptId}"]`
            );

            if (!this.highlights[this.attemptId]) {
                this.highlights[this.attemptId] = {};
            }

            this.highlights[this.attemptId][this.currentSection] = Array.from(marks).map(mark => ({
                text: mark.textContent,
                color: parseInt(mark.dataset.highlightColor),
                formats: mark.dataset.highlightFormats
                    ? mark.dataset.highlightFormats.split(',').map(f => parseInt(f))
                    : [],
                timestamp: Date.now()
            }));

            this.persistHighlights();
        }, 300); // Throttle to 300ms
    },

    /**
     * Restore highlights from storage with optimized batching
     */
    restoreHighlights(containerElement) {
        const attemptHighlights = this.highlights[this.attemptId];
        if (!attemptHighlights) return;

        const sectionHighlights = attemptHighlights[this.currentSection];
        if (!sectionHighlights || sectionHighlights.length === 0) return;

        console.log('[TextHighlighter] Restoring', sectionHighlights.length, 'highlights');

        // Clear existing highlights
        this.clearVisualHighlights();

        // Use requestIdleCallback for non-blocking restoration
        const restoreTask = (deadline) => {
            let highlightIndex = 0;
            const batchSize = 5;

            const processBatch = () => {
                const endIndex = Math.min(highlightIndex + batchSize, sectionHighlights.length);

                for (let i = highlightIndex; i < endIndex; i++) {
                    const highlight = sectionHighlights[i];
                    this.findAndHighlightText(
                        containerElement,
                        highlight.text,
                        highlight.color,
                        highlight.formats || []
                    );
                }

                highlightIndex = endIndex;

                if (highlightIndex < sectionHighlights.length) {
                    if (deadline && deadline.timeRemaining() > 0) {
                        processBatch();
                    } else {
                        requestAnimationFrame(() => {
                            if ('requestIdleCallback' in window) {
                                requestIdleCallback(restoreTask, { timeout: 1000 });
                            } else {
                                setTimeout(() => restoreTask({}), 50);
                            }
                        });
                    }
                }
            };

            processBatch();
        };

        if ('requestIdleCallback' in window) {
            requestIdleCallback(restoreTask, { timeout: 1000 });
        } else {
            setTimeout(() => restoreTask({}), 100);
        }
    },

    /**
     * Find and highlight specific text in container
     */
    findAndHighlightText(containerElement, searchText, colorIndex, formats = []) {
        const walker = document.createTreeWalker(
            containerElement,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        // Check if this is a format-only mark (colorIndex = -1)
        const isFormatOnly = colorIndex === -1;
        const color = isFormatOnly ? null : this.colors[colorIndex];
        let node;
        const nodesToHighlight = [];

        while (node = walker.nextNode()) {
            const text = node.textContent;
            const index = text.indexOf(searchText);

            if (index !== -1) {
                nodesToHighlight.push({ node, index, length: searchText.length });
            }
        }

        // Apply highlights (limit to first occurrence to avoid duplicates)
        if (nodesToHighlight.length > 0) {
            const { node, index, length } = nodesToHighlight[0];

            try {
                const range = document.createRange();
                range.setStart(node, index);
                range.setEnd(node, index + length);

                const highlight = document.createElement('mark');

                // Build class list
                let classList = 'rounded px-0.5 transition-colors cursor-pointer inline';
                if (!isFormatOnly && color) {
                    classList = `${color.class} ${classList}`;
                }
                highlight.className = classList;

                highlight.style.display = 'inline';
                highlight.style.whiteSpace = 'normal';
                highlight.style.wordBreak = 'normal';

                // Set transparent background for format-only marks
                if (isFormatOnly) {
                    highlight.style.backgroundColor = 'transparent';
                }

                highlight.dataset.highlightColor = colorIndex.toString();
                highlight.dataset.highlightSection = this.currentSection;
                highlight.dataset.highlightAttempt = this.attemptId;

                // Apply formats
                if (formats.length > 0) {
                    highlight.dataset.highlightFormats = formats.join(',');
                    formats.forEach(formatIndex => {
                        if (this.formats[formatIndex]) {
                            highlight.classList.add(this.formats[formatIndex].class);
                        }
                    });
                }

                range.surroundContents(highlight);
            } catch (e) {
                console.warn('Could not restore highlight:', e);
            }
        }
    },

    /**
     * Load highlights from localStorage
     */
    loadHighlights() {
        try {
            const stored = localStorage.getItem('text-highlights');
            if (stored) {
                this.highlights = JSON.parse(stored);
            }
        } catch (e) {
            console.warn('Could not load highlights:', e);
            this.highlights = {};
        }
    },

    /**
     * Persist highlights to localStorage
     */
    persistHighlights() {
        try {
            localStorage.setItem('text-highlights', JSON.stringify(this.highlights));
        } catch (e) {
            console.warn('Could not save highlights:', e);
        }
    },

    /**
     * Clear visual highlights efficiently
     */
    clearVisualHighlights() {
        const marks = document.querySelectorAll(
            `mark[data-highlight-section="${this.currentSection}"][data-highlight-attempt="${this.attemptId}"]`
        );

        marks.forEach(mark => {
            const parent = mark.parentNode;
            if (parent) {
                while (mark.firstChild) {
                    parent.insertBefore(mark.firstChild, mark);
                }
                parent.removeChild(mark);
                parent.normalize(); // Merge text nodes
            }
        });

        this.textNodeCache = null;
    },

    /**
     * Clear all highlights for current section
     */
    clearSectionHighlights() {
        this.clearVisualHighlights();

        if (this.highlights[this.attemptId]) {
            delete this.highlights[this.attemptId][this.currentSection];
            this.persistHighlights();
        }
    },

    /**
     * Clear all highlights for current attempt (all sections)
     */
    clearAttemptHighlights() {
        // Clear all visual highlights for this attempt
        const marks = document.querySelectorAll(`mark[data-highlight-attempt="${this.attemptId}"]`);
        marks.forEach(mark => {
            const parent = mark.parentNode;
            if (parent) {
                while (mark.firstChild) {
                    parent.insertBefore(mark.firstChild, mark);
                }
                parent.removeChild(mark);
            }
        });

        // Clear from storage
        if (this.highlights[this.attemptId]) {
            delete this.highlights[this.attemptId];
            this.persistHighlights();
        }
    },

    /**
     * Clear all highlights from all attempts (complete cleanup)
     */
    clearAllHighlights() {
        // Clear all visual highlights
        const marks = document.querySelectorAll('mark[data-highlight-attempt]');
        marks.forEach(mark => {
            const parent = mark.parentNode;
            if (parent) {
                while (mark.firstChild) {
                    parent.insertBefore(mark.firstChild, mark);
                }
                parent.removeChild(mark);
            }
        });

        // Clear all from storage
        this.highlights = {};
        this.persistHighlights();
    },

    /**
     * Cleanup - remove popup, listeners, and clear caches
     */
    cleanup() {
        console.log('[TextHighlighter] Cleaning up');

        // Clear timers
        if (this.selectionTimeout) {
            clearTimeout(this.selectionTimeout);
            this.selectionTimeout = null;
        }
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }

        // Remove event listeners
        if (this.boundHandlers.mouseup) {
            document.removeEventListener('mouseup', this.boundHandlers.mouseup);
        }
        if (this.boundHandlers.keyup) {
            document.removeEventListener('keyup', this.boundHandlers.keyup);
        }
        if (this.boundHandlers.mousedown) {
            document.removeEventListener('mousedown', this.boundHandlers.mousedown);
        }

        // Reset handlers
        this.boundHandlers = {
            mouseup: null,
            keyup: null,
            mousedown: null
        };

        // Remove popup
        if (this.popupElement) {
            this.popupElement.remove();
            this.popupElement = null;
        }

        // Clear caches
        this.textNodeCache = null;
        this.cacheTimestamp = 0;
        this.containerElement = null;
    }
};
