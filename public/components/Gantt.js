import { useHistory } from '../composables/useHistory.js';

export default {
  name: 'Gantt',
  props: {
    project: {
      type: Object,
      required: true,
    },
    activities: {
      type: Array,
      required: true,
    },
    darkMode: {
      type: Boolean,
      default: false,
    },
    maxWidth: {
      type: Number,
      required: true,
    },
  },
  template: `
    <div class="relative bg-gray-50 dark:bg-gray-900 rounded-lg h-full flex flex-col">
      <!-- Gantt Chart Container with Scrollbars -->
      <div class="flex-1 overflow-x-auto overflow-y-auto">
        <!-- Gantt Chart Content -->
        <div :style="{ width: ganttWidth + 'px', minWidth: '100%' }">
          <!-- Timeline Header -->
          <div class="sticky top-0 bg-gray-50 dark:bg-gray-900 z-10">
            <div class="flex border-b border-gray-200 dark:border-gray-700">
              <div class="w-48 flex-shrink-0"></div>
              <div class="flex">
                <div
                  v-for="date in timeline"
                  :key="date.toISOString()"
                  class="text-center py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 font-medium"
                  :style="{ width: dateWidth + 'px' }"
                >
                  {{ formatDate(date) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Gantt Chart Body -->
          <div class="relative">
            <div
              v-for="(activity, index) in sortedActivities"
              :key="activity.id"
              class="flex items-center border-b border-gray-200 dark:border-gray-700"
            >
              <!-- Activity Info -->
              <div class="w-48 flex-shrink-0 p-2 sticky left-0 bg-gray-50 dark:bg-gray-900 z-10">
                <div class="flex items-center justify-between">
                  <span
                    v-if="!editingActivityId || editingActivityId !== activity.id"
                    @click="editActivityName(activity.id, activity.data.name)"
                    class="text-gray-800 dark:text-gray-200 font-medium truncate cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded"
                    :title="activity.data.name"
                  >
                    {{ activity.data.name }}
                  </span>
                  <input
                    v-else
                    v-model="editingActivityName"
                    type="text"
                    class="bg-transparent text-gray-800 dark:text-gray-200 font-medium outline-none border border-gray-200 dark:border-gray-600 rounded p-1 w-full"
                    @blur="saveActivityName(activity.id)"
                    @keypress.enter="saveActivityName(activity.id)"
                  />
                  <input
                    type="checkbox"
                    v-model="selectedActivityIds"
                    :value="activity.id"
                    class="ml-2"
                    @click.shift="handleShiftSelect(index, $event)"
                  />
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  {{ activity.data.owner || 'Unassigned' }}
                  <span v-if="activity.data.status === 'completed'" class="ml-1 text-green-500">✔</span>
                </div>
              </div>

              <!-- Gantt Bar/Diamond -->
              <div class="relative h-12" :style="{ width: ganttWidth + 'px' }">
                <div class="relative h-full">
                  <div
                    v-for="date in timeline"
                    :key="date.toISOString()"
                    class="inline-block border-l border-gray-200 dark:border-gray-700 h-full"
                    :style="{ width: dateWidth + 'px' }"
                  ></div>
                </div>
                <div
                  v-if="isSingleDay(activity)"
                  class="absolute h-6 w-6 transform rotate-45 border border-gray-300 dark:border-gray-600"
                  :style="diamondStyle(activity)"
                  :class="{ 'bg-green-500 dark:bg-green-400': activity.data.status === 'completed', 'bg-yellow-500 dark:bg-yellow-400': selectedActivityIds.includes(activity.id), 'bg-blue-500 dark:bg-blue-400': !selectedActivityIds.includes(activity.id) && activity.data.status !== 'completed' }"
                  @click="toggleSelection(activity.id)"
                  :title="activity.data.name"
                ></div>
                <div
                  v-else
                  class="absolute h-6 rounded"
                  :style="barStyle(activity)"
                  :class="barClasses(activity)"
                  @click="toggleSelection(activity.id)"
                  :title="activity.data.name"
                ></div>
              </div>
            </div>

            <!-- Dependency Arrows (Using SVG) -->
            <svg class="absolute top-0 left-0 pointer-events-none z-20" :width="ganttWidth" :height="ganttHeight">
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" class="text-gray-500 dark:text-gray-400" />
                </marker>
              </defs>
              <path
                v-for="dep in dependencies"
                :key="dep.id"
                :d="dep.path"
                stroke="currentColor"
                stroke-width="2"
                fill="none"
                class="text-gray-500 dark:text-gray-400"
                marker-end="url(#arrowhead)"
                :class="{ 'text-red-500 dark:text-red-600': dep.conflict }"
              />
            </svg>

            <!-- No Activities -->
            <div v-if="!activities.length" class="text-center text-gray-500 dark:text-gray-400 py-12">
              No activities in this project. Use the input below to generate some!
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  setup(props, { emit }) {
    const { updateEntity } = useHistory();
    const selectedActivityIds = Vue.ref([]);
    const editingActivityId = Vue.ref(null);
    const editingActivityName = Vue.ref('');
    const sortedActivities = Vue.computed(() => [...props.activities].sort((a, b) => new Date(a.data.startDate) - new Date(b.data.startDate)));

    // Timeline generation (fixed to days)
    const timeline = Vue.computed(() => {
      if (!props.activities.length) return [];
      const dates = [];
      const startDates = props.activities.map(a => new Date(a.data.startDate).getTime());
      const endDates = props.activities
        .filter(a => a.data.endDate)
        .map(a => new Date(a.data.endDate).getTime());
      const minDate = Math.min(...startDates, ...endDates);
      const maxDate = Math.max(...startDates, ...endDates);

      const interval = 1000 * 60 * 60 * 24; // 1 day
      const earliestDate = new Date(minDate);
      earliestDate.setDate(earliestDate.getDate() - 2); // 2-day buffer before
      const latestDate = new Date(maxDate);
      latestDate.setDate(latestDate.getDate() + 2); // 2-day buffer after

      const range = latestDate.getTime() - earliestDate.getTime();
      const steps = Math.ceil(range / interval);
      for (let i = 0; i <= steps; i++) {
        const date = new Date(earliestDate.getTime() + i * interval);
        dates.push(date);
      }
      console.log('Timeline dates:', dates.map(d => d.toISOString()));
      return dates;
    });

    const dateWidth = Vue.computed(() => 50); // Fixed width for days
    const ganttWidth = Vue.computed(() => timeline.value.length * dateWidth.value);
    const ganttHeight = Vue.computed(() => props.activities.length * 48);

    function formatDate(date) {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function isSingleDay(activity) {
      if (!activity.data.endDate) return true;
      const startDate = new Date(activity.data.startDate);
      const endDate = new Date(activity.data.endDate);
      return startDate.toDateString() === endDate.toDateString();
    }

    // Style for diamond (single-day activity)
    function diamondStyle(activity) {
      const startDate = new Date(activity.data.startDate).getTime();
      const timelineStart = timeline.value[0].getTime();
      const daysFromStart = (startDate - timelineStart) / (1000 * 60 * 60 * 24);
      const left = daysFromStart * dateWidth.value;
      return {
        left: `${left}px`,
        top: '12px',
      };
    }

    // Style for bar (multi-day activity)
    function barStyle(activity) {
      const startDate = new Date(activity.data.startDate).getTime();
      const endDate = activity.data.endDate ? new Date(activity.data.endDate).getTime() : startDate;
      const timelineStart = timeline.value[0].getTime();
      const daysFromStart = (startDate - timelineStart) / (1000 * 60 * 60 * 24);
      const duration = (endDate - startDate) / (1000 * 60 * 60 * 24); // Duration in days
      const left = daysFromStart * dateWidth.value;
      const width = duration * dateWidth.value;

      return {
        left: `${left}px`,
        width: `${width}px`,
        top: '12px',
      };
    }

    // Bar classes (completed, selected, conflicts)
    function barClasses(activity) {
      const hasConflict = dependencies.value.some(dep => dep.conflict && (dep.fromId === activity.id || dep.toId === activity.id));
      return {
        'bg-blue-500 dark:bg-blue-400': !hasConflict && !selectedActivityIds.value.includes(activity.id) && activity.data.status !== 'completed',
        'bg-yellow-500 dark:bg-yellow-400': selectedActivityIds.value.includes(activity.id),
        'bg-green-500 dark:bg-green-400': activity.data.status === 'completed',
        'bg-red-500 dark:bg-red-600': hasConflict,
      };
    }

    // Compute dependencies with conflict detection and path calculation
    const dependencies = Vue.computed(() => {
      const deps = [];
      props.activities.forEach(activity => {
        if (activity.data.dependencies && Array.isArray(activity.data.dependencies)) {
          activity.data.dependencies.forEach(dep => {
            const toActivity = props.activities.find(a => a.id === dep.dependencyId);
            if (toActivity) {
              const conflict = detectConflict(activity, toActivity, dep.dependencyType);
              const path = getDependencyPath(activity, toActivity, dep.dependencyType);
              if (path) {
                deps.push({
                  id: `${activity.id}-${dep.dependencyId}`,
                  fromId: activity.id,
                  toId: dep.dependencyId,
                  type: dep.dependencyType,
                  conflict,
                  path,
                });
              }
            }
          });
        }
      });
      console.log('Computed dependencies:', deps);
      return deps;
    });

    // Detect dependency conflicts
    function detectConflict(fromActivity, toActivity, type) {
      const fromStart = new Date(fromActivity.data.startDate).getTime();
      const fromEnd = fromActivity.data.endDate ? new Date(fromActivity.data.endDate).getTime() : fromStart;
      const toStart = new Date(toActivity.data.startDate).getTime();
      const toEnd = toActivity.data.endDate ? new Date(toActivity.data.endDate).getTime() : toStart;

      switch (type) {
        case 'FS': // Finish-to-Start
          return fromEnd > toStart;
        case 'FF': // Finish-to-Finish
          return fromEnd > toEnd;
        case 'SS': // Start-to-Start
          return fromStart > toStart;
        case 'SF': // Start-to-Finish
          return fromStart > toEnd;
        default:
          return false;
      }
    }

    // Generate SVG path for dependency arrows
    function getDependencyPath(fromActivity, toActivity, type) {
      const fromIndex = sortedActivities.value.findIndex(a => a.id === fromActivity.id);
      const toIndex = sortedActivities.value.findIndex(a => a.id === toActivity.id);
      if (fromIndex === -1 || toIndex === -1) return null;

      const timelineStart = timeline.value[0].getTime();
      const fromStart = new Date(fromActivity.data.startDate).getTime();
      const fromEnd = fromActivity.data.endDate ? new Date(fromActivity.data.endDate).getTime() : fromStart;
      const toStart = new Date(toActivity.data.startDate).getTime();
      const toEnd = toActivity.data.endDate ? new Date(toActivity.data.endDate).getTime() : toStart;

      const x1 = ((type.includes('Start') ? fromStart : fromEnd) - timelineStart) / (1000 * 60 * 60 * 24) * dateWidth.value;
      const x2 = ((type.includes('Start') ? toStart : toEnd) - timelineStart) / (1000 * 60 * 60 * 24) * dateWidth.value;
      const y1 = fromIndex * 48 + 24; // Center of row
      const y2 = toIndex * 48 + 24;

      // Adjust x1 and x2 for the diamond/bar width
      const barHeight = 24; // Height of the bar/diamond
      const x1Adjusted = type.includes('Start') ? x1 + (isSingleDay(fromActivity) ? 12 : 0) : x1 + (isSingleDay(fromActivity) ? 12 : ((fromEnd - fromStart) / (1000 * 60 * 60 * 24) * dateWidth.value));
      const x2Adjusted = type.includes('Start') ? x2 + (isSingleDay(toActivity) ? 12 : 0) : x2 + (isSingleDay(toActivity) ? 12 : ((toEnd - toStart) / (1000 * 60 * 60 * 24) * dateWidth.value));

      // Simple path with a curve
      const midX = (x1Adjusted + x2Adjusted) / 2;
      const controlOffset = 50; // Control point offset for curve
      if (fromIndex === toIndex) {
        // Same row: draw a loop above the bar
        const loopHeight = barHeight + 20;
        return `M${x1Adjusted},${y1} C${x1Adjusted + controlOffset},${y1 - loopHeight} ${x2Adjusted - controlOffset},${y1 - loopHeight} ${x2Adjusted},${y1}`;
      } else {
        return `M${x1Adjusted},${y1} C${midX},${y1} ${midX},${y2} ${x2Adjusted},${y2}`;
      }
    }

    // Toggle activity selection
    function toggleSelection(id) {
      if (selectedActivityIds.value.includes(id)) {
        selectedActivityIds.value = selectedActivityIds.value.filter(aid => aid !== id);
      } else {
        selectedActivityIds.value.push(id);
      }
    }

    // Handle shift-selection
    function handleShiftSelect(index, event) {
      if (event.shiftKey && selectedActivityIds.value.length) {
        const lastSelectedIndex = sortedActivities.value.findIndex(a => a.id === selectedActivityIds.value[selectedActivityIds.value.length - 1]);
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        selectedActivityIds.value = sortedActivities.value.slice(start, end + 1).map(a => a.id);
      }
    }

    // Clear selections
    function clearSelections() {
      selectedActivityIds.value = [];
    }

    // Inline editing for activity names
    function editActivityName(id, name) {
      editingActivityId.value = id;
      editingActivityName.value = name;
      Vue.nextTick(() => {
        const input = document.querySelector(`input[editing-activity-id="${id}"]`);
        if (input) input.focus();
      });
    }

    function saveActivityName(id) {
      const activity = sortedActivities.value.find(a => a.id === id);
      if (activity) {
        updateEntity('activities', id, {
          ...activity.data,
          name: editingActivityName.value,
        });
      }
      editingActivityId.value = null;
      editingActivityName.value = '';
    }

    return {
      selectedActivityIds,
      editingActivityId,
      editingActivityName,
      timeline,
      dateWidth,
      ganttWidth,
      ganttHeight,
      sortedActivities,
      dependencies,
      formatDate,
      isSingleDay,
      diamondStyle,
      barStyle,
      barClasses,
      toggleSelection,
      handleShiftSelect,
      clearSelections,
      editActivityName,
      saveActivityName,
    };
  },
};