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
  },
  template: `
    <div class="relative flex-1 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
      <!-- Scrollable Container for Both Header and Body -->
      <div class="relative flex">
        <!-- Sticky Left Column -->
        <div class="w-48 flex-shrink-0 z-20">
          <div class="w-48 h-10"></div> <!-- Placeholder for header -->
          <div v-for="(activity, index) in sortedActivities" :key="activity.id" class="border-b border-gray-200 dark:border-gray-700 h-16 flex items-center">
            <div class="w-48 p-2 bg-gray-50 dark:bg-gray-900">
              <div class="flex items-center justify-between">
                <span v-if="!editingActivityId || editingActivityId !== activity.id" @click="editActivityName(activity.id, activity.data.name)" class="text-gray-800 dark:text-gray-200 font-medium truncate cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded" :title="activity.data.name">{{ activity.data.name }}</span>
                <input
                  v-else
                  v-model="editingActivityName"
                  type="text"
                  class="bg-transparent text-gray-800 dark:text-gray-200 font-medium outline-none border border-gray-200 dark:border-gray-600 rounded p-1 w-full"
                  @blur="saveActivityName(activity.id)"
                  @keypress.enter="saveActivityName(activity.id)"
                />
                <input type="checkbox" v-model="selectedActivityIds" :value="activity.id" class="ml-2" @click.shift="handleShiftSelect(index, $event)" />
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ activity.data.owner || 'Unassigned' }}
                <span v-if="activity.data.status === 'completed'" class="ml-1 text-green-500">✔</span>
              </div>
            </div>
          </div>
          <div v-if="!activities.length" class="text-center text-gray-500 dark:text-gray-400 py-12">
            No activities in this project. Use the input below to generate some!
          </div>
        </div>

        <!-- Scrollable Gantt Chart -->
        <div ref="ganttContainer" class="flex-1 overflow-x-auto overflow-y-auto relative" @scroll="updateScrollPosition">
          <!-- Gantt Chart Header (Timeline) -->
          <div class="flex border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 bg-gray-50 dark:bg-gray-900" :style="{ minWidth: ganttWidth + 'px' }">
            <div class="flex-1">
              <div class="flex text-sm text-gray-600 dark:text-gray-300 font-medium">
                <div v-for="date in timeline" :key="date" class="flex-1 text-center py-2 whitespace-nowrap" :style="{ minWidth: dateWidth + 'px' }">
                  {{ formatDate(date) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Gantt Chart Body -->
          <div ref="ganttBody" :style="{ minWidth: ganttWidth + 'px' }">
            <div v-for="(activity, index) in sortedActivities" :key="activity.id" class="relative h-16 border-b border-gray-200 dark:border-gray-700">
              <!-- Background Grid -->
              <div class="absolute inset-0 flex">
                <div
                  v-for="date in timeline"
                  :key="date"
                  class="flex-1 border-l border-gray-200 dark:border-gray-700"
                  :style="{ minWidth: dateWidth + 'px' }"
                ></div>
              </div>
              <!-- Gantt Bar/Diamond -->
              <div class="relative h-16">
                <div
                  v-if="isSingleDay(activity)"
                  :id="'gantt-element-' + activity.id"
                  class="absolute h-6 w-6 transform rotate-45 border border-gray-300 dark:border-gray-600"
                  :style="diamondStyle(activity)"
                  :class="{ 'bg-green-500 dark:bg-green-400': activity.data.status === 'completed', 'bg-yellow-500 dark:bg-yellow-400': selectedActivityIds.includes(activity.id), 'bg-blue-500 dark:bg-blue-400': !selectedActivityIds.includes(activity.id) && activity.data.status !== 'completed' }"
                  @click="toggleSelection(activity.id)"
                  :title="activity.data.name"
                ></div>
                <div
                  v-else
                  :id="'gantt-element-' + activity.id"
                  class="absolute h-6 rounded"
                  :style="barStyle(activity)"
                  :class="barClasses(activity)"
                  @click="toggleSelection(activity.id)"
                  :title="activity.data.name"
                ></div>
              </div>
            </div>

            <!-- Dependency Arrows (Using SVG) -->
            <svg ref="svgContainer" class="absolute top-0 left-0 pointer-events-none z-20" :style="{ transform: 'translate(0px, ' + headerHeight + 'px)' }" :width="ganttWidth" :height="ganttHeight">
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" class="text-gray-500 dark:text-gray-400" />
                </marker>
              </defs>
              <path
                v-for="dep in staticDependencies"
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
    const ganttContainer = Vue.ref(null);
    const ganttBody = Vue.ref(null);
    const svgContainer = Vue.ref(null);
    const staticDependencies = Vue.ref([]);
    const scrollLeft = Vue.ref(0);
    const scrollTop = Vue.ref(0);
    const timelineScale = Vue.ref('days');
    const availableWidth = Vue.ref(800);
    const headerHeight = 40; // Height of the timeline header

    // Custom debounce function
    function debounce(fn, wait) {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), wait);
      };
    }

    // Debounced resize handler
    const updateAvailableWidthDebounced = debounce(() => {
      updateAvailableWidth();
    }, 100);

    const resizeObserver = new ResizeObserver(() => {
      updateAvailableWidthDebounced();
    });

    Vue.onMounted(() => {
      if (ganttContainer.value) {
        resizeObserver.observe(ganttContainer.value);
      }
    });

    Vue.onUnmounted(() => {
      if (ganttContainer.value) {
        resizeObserver.unobserve(ganttContainer.value);
      }
    });

    function updateAvailableWidth() {
      if (ganttContainer.value) {
        availableWidth.value = ganttContainer.value.clientWidth;
        Vue.nextTick(() => computeDependencyPaths());
      }
    }

    // Timeline generation
    const timeline = Vue.computed(() => {
      if (!props.activities.length) return [];
      const dates = [];
      const startDates = props.activities.map(a => new Date(a.data.startDate).getTime());
      const endDates = props.activities
        .filter(a => a.data.endDate)
        .map(a => new Date(a.data.endDate).getTime());
      const minDate = Math.min(...startDates, ...endDates, Date.now());
      const maxDate = Math.max(...startDates, ...endDates, Date.now());
      const buffer = 2 * 24 * 60 * 60 * 1000; // 2 days
      const cappedMaxDate = maxDate + buffer;
      const diffTime = cappedMaxDate - minDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const pixelsPerDay = availableWidth.value / diffDays;
      let interval;
      if (pixelsPerDay > 20) { // Adjusted threshold for days
        timelineScale.value = 'days';
        interval = 1000 * 60 * 60 * 24; // 1 day
      } else if (pixelsPerDay > 5) { // Adjusted threshold for weeks
        timelineScale.value = 'weeks';
        interval = 1000 * 60 * 60 * 24 * 7; // 1 week
      } else if (pixelsPerDay > 1) { // Adjusted threshold for months
        timelineScale.value = 'months';
        interval = null;
      } else {
        timelineScale.value = 'years';
        interval = null;
      }

      if (timelineScale.value === 'days' || timelineScale.value === 'weeks') {
        const steps = Math.ceil(diffTime / interval);
        for (let i = 0; i <= steps; i++) {
          const nextDate = new Date(minDate + i * interval);
          if (nextDate.getTime() <= cappedMaxDate) {
            dates.push(nextDate);
          }
        }
      } else if (timelineScale.value === 'months') {
        let currentDate = new Date(minDate);
        currentDate.setDate(1); // Start of month
        while (currentDate.getTime() <= cappedMaxDate) {
          dates.push(new Date(currentDate));
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      } else {
        let currentDate = new Date(minDate);
        currentDate.setMonth(0, 1); // Start of year
        while (currentDate.getTime() <= cappedMaxDate) {
          dates.push(new Date(currentDate));
          currentDate.setFullYear(currentDate.getFullYear() + 1);
        }
      }
      return dates;
    });

    const dateWidth = Vue.computed(() => {
      if (!timeline.value.length) return 40;
      const totalDays = (timeline.value[timeline.value.length - 1].getTime() - timeline.value[0].getTime()) / (1000 * 60 * 60 * 24);
      const idealWidth = availableWidth.value / timeline.value.length;
      return Math.max(idealWidth, 40); // Ensure minimum width for readability
    });

    const ganttWidth = Vue.computed(() => {
      if (!timeline.value.length) return availableWidth.value;
      return timeline.value.length * dateWidth.value;
    });

    const ganttHeight = Vue.computed(() => props.activities.length * 64);

    function formatDate(date) {
      const d = new Date(date);
      if (timelineScale.value === 'days') {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (timelineScale.value === 'weeks') {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (timelineScale.value === 'months') {
        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      } else {
        return d.getFullYear();
      }
    }

    function isSingleDay(activity) {
      if (!activity.data.endDate) return true;
      const startDate = new Date(activity.data.startDate);
      const endDate = new Date(activity.data.endDate);
      return startDate.toDateString() === endDate.toDateString();
    }

    function getPosition(date) {
      if (!timeline.value.length) return 0;
      const timelineStart = timeline.value[0].getTime();
      const timelineEnd = timeline.value[timeline.value.length - 1].getTime();
      const dateTime = new Date(date).getTime();
      const fraction = Math.min(Math.max((dateTime - timelineStart) / (timelineEnd - timelineStart), 0), 1);
      return fraction * ganttWidth.value;
    }

    function diamondStyle(activity) {
      const left = getPosition(activity.data.startDate) - 12;
      return {
        left: `${left}px`,
        top: '20px',
      };
    }

    function barStyle(activity) {
      const startPos = getPosition(activity.data.startDate);
      const endPos = activity.data.endDate ? getPosition(activity.data.endDate) : startPos + dateWidth.value / 2;
      const width = Math.max(endPos - startPos, dateWidth.value / 2);

      return {
        left: `${startPos}px`,
        width: `${width}px`,
        top: '20px',
      };
    }

    function barClasses(activity) {
      const hasConflict = dependencies.value.some(dep => dep.conflict && (dep.fromId === activity.id || dep.toId === activity.id));
      return {
        'bg-blue-500 dark:bg-blue-400': !hasConflict && !selectedActivityIds.value.includes(activity.id) && activity.data.status !== 'completed',
        'bg-yellow-500 dark:bg-yellow-400': selectedActivityIds.value.includes(activity.id),
        'bg-green-500 dark:bg-green-400': activity.data.status === 'completed',
        'bg-red-500 dark:bg-red-600': hasConflict,
      };
    }

    const dependencies = Vue.computed(() => {
      const deps = [];
      props.activities.forEach(activity => {
        if (activity.data.dependencies && Array.isArray(activity.data.dependencies)) {
          activity.data.dependencies.forEach(dep => {
            const toActivity = props.activities.find(a => a.id === dep.dependencyId);
            if (toActivity) {
              const conflict = detectConflict(activity, toActivity, dep.dependencyType);
              deps.push({
                id: `${activity.id}-${dep.dependencyId}`,
                fromId: activity.id,
                toId: dep.dependencyId,
                type: dep.dependencyType,
                conflict,
              });
            }
          });
        }
      });
      return deps;
    });

    function detectConflict(fromActivity, toActivity, type) {
      const fromStart = new Date(fromActivity.data.startDate).getTime();
      const fromEnd = fromActivity.data.endDate ? new Date(fromActivity.data.endDate).getTime() : fromStart;
      const toStart = new Date(toActivity.data.startDate).getTime();
      const toEnd = toActivity.data.endDate ? new Date(toActivity.data.endDate).getTime() : toStart;

      switch (type) {
        case 'FS': return fromEnd > toStart;
        case 'FF': return fromEnd > toEnd;
        case 'SS': return fromStart > toStart;
        case 'SF': return fromStart > toEnd;
        default: return false;
      }
    }

    function computeDependencyPaths() {
      if (!ganttBody.value || !svgContainer.value) return;

      const rowHeight = 64;
      const computedPaths = dependencies.value.map(dep => {
        const fromActivity = sortedActivities.value.find(a => a.id === dep.fromId);
        const toActivity = sortedActivities.value.find(a => a.id === dep.toId);
        if (!fromActivity || !toActivity) {
          return { ...dep, path: '' };
        }

        const fromIndex = sortedActivities.value.indexOf(fromActivity);
        const toIndex = sortedActivities.value.indexOf(toActivity);

        const fromEndDate = fromActivity.data.endDate ? new Date(fromActivity.data.endDate) : new Date(fromActivity.data.startDate);
        const toStartDate = new Date(toActivity.data.startDate);

        const x1 = getPosition(fromEndDate) + (isSingleDay(fromActivity) ? 12 : 0);
        const x2 = getPosition(toStartDate) - (isSingleDay(toActivity) ? 12 : 0);
        const y1 = fromIndex * rowHeight + 32 - scrollTop.value;
        const y2 = toIndex * rowHeight + 32 - scrollTop.value;

        const offset = 20;
        const path = `M${x1},${y1} H${x1 + offset} V${y2} H${x2 - offset} H${x2}`;

        return { ...dep, path };
      });

      staticDependencies.value = computedPaths;
    }

    function updateScrollPosition() {
      if (ganttContainer.value) {
        scrollLeft.value = ganttContainer.value.scrollLeft;
        scrollTop.value = ganttContainer.value.scrollTop;
        Vue.nextTick(() => computeDependencyPaths());
      }
    }

    Vue.watch(
      [() => sortedActivities.value, () => ganttWidth.value, () => dependencies.value],
      () => {
        Vue.nextTick(() => computeDependencyPaths());
      },
      { immediate: true }
    );

    function toggleSelection(id) {
      if (selectedActivityIds.value.includes(id)) {
        selectedActivityIds.value = selectedActivityIds.value.filter(aid => aid !== id);
      } else {
        selectedActivityIds.value.push(id);
      }
    }

    function handleShiftSelect(index, event) {
      if (event.shiftKey && selectedActivityIds.value.length) {
        const lastSelectedIndex = sortedActivities.value.findIndex(a => a.id === selectedActivityIds.value[selectedActivityIds.value.length - 1]);
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        selectedActivityIds.value = sortedActivities.value.slice(start, end + 1).map(a => a.id);
      }
    }

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
      staticDependencies,
      ganttContainer,
      ganttBody,
      svgContainer,
      scrollLeft,
      scrollTop,
      updateScrollPosition,
      formatDate,
      isSingleDay,
      diamondStyle,
      barStyle,
      barClasses,
      toggleSelection,
      handleShiftSelect,
      editActivityName,
      saveActivityName,
    };
  },
};