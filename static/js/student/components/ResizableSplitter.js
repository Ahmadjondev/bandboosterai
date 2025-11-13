/**
 * Resizable Splitter Component
 * A draggable divider that allows resizing of two panels
 * 
 * Features:
 * - Smooth horizontal dragging
 * - Visual feedback on hover and drag
 * - Constraints to prevent panels from becoming too small
 * - Clean, minimal Tailwind styling
 * - Responsive to window resize
 */

window.vueApp.component('resizable-splitter', {
    template: `
        <div class="flex h-full overflow-hidden">
            <!-- Left Panel -->
            <div 
                :style="{ width: leftWidth + '%' }"
                class="overflow-hidden"
            >
                <slot name="left"></slot>
            </div>
            
            <!-- Draggable Splitter -->
            <div
                ref="splitter"
                @mousedown="startDrag"
                :class="[
                    'relative flex-shrink-0 cursor-col-resize transition-colors',
                    isDragging ? 'bg-indigo-400' : 'bg-slate-200 hover:bg-indigo-300'
                ]"
                :style="{ width: splitterWidth + 'px' }"
            >
                <!-- Visual Handle -->
                <div class="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-1 bg-slate-400 opacity-50"></div>
                
                <!-- Hover/Drag Indicator -->
                <div 
                    v-if="isDragging"
                    class="absolute inset-0 flex items-center justify-center"
                >
                    <div class="w-1 h-12 bg-indigo-600 rounded-full shadow-lg"></div>
                </div>
            </div>
            
            <!-- Right Panel -->
            <div 
                :style="{ width: rightWidth + '%' }"
                class="overflow-hidden"
            >
                <slot name="right"></slot>
            </div>
        </div>
    `,

    props: {
        initialLeftWidth: {
            type: Number,
            default: 50 // Default 50% for left panel
        },
        minLeftWidth: {
            type: Number,
            default: 30 // Minimum 30%
        },
        maxLeftWidth: {
            type: Number,
            default: 70 // Maximum 70%
        },
        splitterWidth: {
            type: Number,
            default: 8 // Width of the draggable area in pixels
        }
    },

    setup(props, { emit }) {
        const leftWidth = ref(props.initialLeftWidth);
        const rightWidth = computed(() => 100 - leftWidth.value);
        const isDragging = ref(false);
        const splitter = ref(null);
        const containerWidth = ref(0);

        let startX = 0;
        let startLeftWidth = 0;

        function startDrag(event) {
            isDragging.value = true;
            startX = event.clientX;
            startLeftWidth = leftWidth.value;

            // Get container width
            const container = splitter.value?.parentElement;
            if (container) {
                containerWidth.value = container.offsetWidth;
            }

            // Add event listeners for drag
            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', stopDrag);

            // Prevent text selection during drag
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'col-resize';

            event.preventDefault();
        }

        function onDrag(event) {
            if (!isDragging.value || containerWidth.value === 0) return;

            const deltaX = event.clientX - startX;
            const deltaPercent = (deltaX / containerWidth.value) * 100;
            const newLeftWidth = startLeftWidth + deltaPercent;

            // Apply constraints
            if (newLeftWidth >= props.minLeftWidth && newLeftWidth <= props.maxLeftWidth) {
                leftWidth.value = newLeftWidth;

                // Emit event for parent component
                emit('resize', {
                    leftWidth: leftWidth.value,
                    rightWidth: rightWidth.value
                });
            }
        }

        function stopDrag() {
            isDragging.value = false;

            // Remove event listeners
            document.removeEventListener('mousemove', onDrag);
            document.removeEventListener('mouseup', stopDrag);

            // Restore text selection
            document.body.style.userSelect = '';
            document.body.style.cursor = '';

            // Save to localStorage for persistence
            try {
                localStorage.setItem('reading-splitter-position', leftWidth.value.toString());
            } catch (e) {
                console.warn('Could not save splitter position:', e);
            }
        }

        onMounted(() => {
            // Load saved position from localStorage
            try {
                const savedPosition = localStorage.getItem('reading-splitter-position');
                if (savedPosition) {
                    const position = parseFloat(savedPosition);
                    if (position >= props.minLeftWidth && position <= props.maxLeftWidth) {
                        leftWidth.value = position;
                    }
                }
            } catch (e) {
                console.warn('Could not load splitter position:', e);
            }

            // Update container width on window resize
            const handleResize = () => {
                const container = splitter.value?.parentElement;
                if (container) {
                    containerWidth.value = container.offsetWidth;
                }
            };

            window.addEventListener('resize', handleResize);
            handleResize(); // Initial size

            // Cleanup on unmount
            onUnmounted(() => {
                window.removeEventListener('resize', handleResize);
                document.removeEventListener('mousemove', onDrag);
                document.removeEventListener('mouseup', stopDrag);
            });
        });

        return {
            leftWidth,
            rightWidth,
            isDragging,
            splitter,
            startDrag
        };
    }
});
