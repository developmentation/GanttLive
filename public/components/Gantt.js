import { useHistory } from '../composables/useHistory.js';
import { useGlobal } from '../composables/useGlobal.js';

export default {
  name: 'Gantt',
  props: {
    project: {
      type: Object,
      required: true,
    },
    activities: {
      type: Array,
    },
    dependencies: {
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
      <!-- Modal for Activity Editing -->
      <div v-if="showActivityModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg w-1/3">
          <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Edit Activity</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
              <input v-model="modalActivity.name" type="text" class="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Owner</label>
              <input v-model="modalActivity.owner" type="text" class="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
              <textarea v-model="modalActivity.description" class="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
              <input v-model="modalActivity.startDate" type="date" class="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
              <input v-model="modalActivity.endDate" type="date" class="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
            </div>
          </div>
          <div class="mt-6 flex justify-end space-x-2">
            <button @click="closeActivityModal" class="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded">Cancel</button>
            <button @click="saveActivityModal" class="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
          </div>
        </div>
      </div>

      <!-- Modal for Dependency Editing -->
      <div v-if="showDependencyModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg w-1/2 max-h-[80vh] overflow-y-auto">
          <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">{{ isEditingDependency ? 'Edit Dependency' : 'Add Dependency' }}</h3>
          <table v-if="sortedDependencies.length" class="w-full mb-4">
            <thead>
              <tr>
                <th class="text-left p-2 text-gray-700 dark:text-gray-300">Source</th>
                <th class="text-left p-2 text-gray-700 dark:text-gray-300">Target</th>
                <th class="text-left p-2 text-gray-700 dark:text-gray-300">Type</th>
                <th class="text-left p-2 text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="dep in sortedDependencies" :key="dep.id" class="border-t border-gray-200 dark:border-gray-700">
                <td class="p-2 text-gray-900 dark:text-gray-100">{{ getActivityName(dep.data.sourceId) }}</td>
                <td class="p-2 text-gray-900 dark:text-gray-100">{{ getActivityName(dep.data.targetId) }}</td>
                <td class="p-2 text-gray-900 dark:text-gray-100">{{ dep.data.dependencyType }}</td>
                <td class="p-2">
                  <button @click="editDependency(dep)" class="text-blue-500 mr-2">Edit</button>
                  <button @click="deleteDependency(dep.id)" class="text-red-500">Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Source Activity</label>
              <select v-model="modalDependency.sourceId" class="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
                <option v-for="act in sortedActivities" :value="act.id">{{ act.data.name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Target Activity</label>
              <select v-model="modalDependency.targetId" class="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
                <option v-for="act in sortedActivities" :value="act.id">{{ act.data.name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Dependency Type</label>
              <select v-model="modalDependency.dependencyType" class="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
                <option value="FS">Finish-to-Start (FS)</option>
                <option value="FF">Finish-to-Finish (FF)</option>
                <option value="SS">Start-to-Start (SS)</option>
                <option value="SF">Start-to-Finish (SF)</option>
              </select>
            </div>
          </div>
          <div class="mt-6 flex justify-end space-x-2">
            <button @click="closeDependencyModal" class="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded">Cancel</button>
            <button @click="saveDependencyModal" class="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
          </div>
        </div>
      </div>

      <!-- Scrollable Container -->
      <div class="relative flex">
        <!-- Sticky Left Column -->
        <div class="w-48 flex-shrink-0 z-20">
          <div class="w-48 h-10 sticky top-0 bg-gray-50 dark:bg-gray-900 flex items-center justify-between px-2">
            <span class="font-semibold text-gray-800 dark:text-gray-200">Activities</span>
            <div class="flex items-center gap-2">
              <button @click="addActivity" class="text-blue-500">
                <i class="pi pi-plus"></i>
              </button>
              <button @click="showDependencyModal = true" class="text-blue-500">
                <i class="pi pi-list-check"></i>
              </button>
            </div>
          </div>
          <div v-for="(activity, index) in sortedActivities" :key="activity.id" class="border-b border-gray-200 dark:border-gray-700 h-16 flex items-center">
            <div class="w-48 p-2 bg-gray-50 dark:bg-gray-900">
              <div class="flex items-center justify-between">
                <span @click="openActivityModal(activity)" class="text-gray-800 dark:text-gray-200 font-medium truncate cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded" :title="activity.data.name">{{ activity.data.name }}</span>
                <input type="checkbox" v-model="selectedActivityIds" :value="activity.id" class="ml-2" @click.shift="handleShiftSelect(index, $event)" />
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ activity.data.owner || 'Unassigned' }}
                <span v-if="activity.data.status === 'completed'" class="ml-1 text-green-500">✔</span>
              </div>
            </div>
          </div>
          <div v-if="!sortedActivities?.length" class="text-center text-gray-500 dark:text-gray-400 py-12">
            No activities in this project.
          </div>
        </div>

        <!-- Scrollable Gantt Chart -->
        <div ref="ganttContainer" class="flex-1 overflow-x-auto overflow-y-auto relative" @scroll="updateScrollPosition">
          <!-- Gantt Chart Body -->
          <div ref="ganttBody" :style="{ minWidth: ganttWidth + 'px', minHeight: ganttHeight + 'px' }">
            <svg :width="ganttWidth" :height="ganttHeight" class="absolute top-0 left-0" ref="svgContainer" @mousedown="startPan">
              <defs>
                <marker id="circleMarker" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                  <circle cx="3" cy="3" r="3" fill="currentColor" :class="darkMode ? 'text-gray-400' : 'text-gray-500'" />
                </marker>
              </defs>
              <!-- Timeline Dates -->
              <g>
                <rect x="0" y="0" :width="ganttWidth" :height="40" fill="rgb(249, 250, 251)" class="dark:fill-gray-900" />
                <text
                  v-for="(date, index) in timeline"
                  :key="date"
                  :x="getDateLabelPosition(date, index)"
                  y="30"
                  class="text-sm font-medium select-none"
                  :class="darkMode ? 'fill-gray-300' : 'fill-gray-600'"
                  text-anchor="middle"
                >
                  {{ formatDate(date) }}
                </text>
                <line x1="0" :x2="ganttWidth" y1="40" y2="40" class="stroke-gray-200 dark:stroke-gray-700" stroke-width="1" />
              </g>
              <!-- Background Grid -->
              <g transform="translate(0, 40)">
                <line v-for="date in timeline" :key="date" :x1="getPosition(date)" :x2="getPosition(date)" :y1="0" :y2="ganttHeight - 40" class="stroke-gray-200 dark:stroke-gray-700" stroke-width="1" />
                <line v-for="n in (sortedActivities?.length + 1)" :key="'h'+n" :x1="0" :x2="ganttWidth" :y1="n*64" :y2="n*64" class="stroke-gray-200 dark:stroke-gray-700" stroke-width="1" />
              </g>
              <!-- Gantt Bars -->
              <g transform="translate(0, 40)">
                <g v-for="(activity, index) in sortedActivities" :key="activity.id">
                  <rect
                    v-if="!isSingleDay(activity)"
                    :id="'gantt-element-' + activity.id"
                    :x="getPosition(activity.data.startDate)"
                    :y="index * 64 + 20"
                    :width="getPosition(activity.data.endDate || activity.data.startDate) - getPosition(activity.data.startDate)"
                    :height="16"
                    :fill="getBarFill(activity).fill"
                    :stroke="getBarFill(activity).stroke"
                    :stroke-width="getBarFill(activity).strokeWidth"
                    @mousedown="start_drag($event, activity.id, 'bar')"
                    @click="toggleSelection(activity.id)"
                    :title="activity.data.name"
                    rx="2"
                    class="cursor-move"
                  />
                  <rect
                    v-if="!isSingleDay(activity)"
                    :x="getPosition(activity.data.startDate) - 4"
                    :y="index * 64 + 20"
                    width="8"
                    height="16"
                    fill="transparent"
                    @mousedown="start_drag($event, activity.id, 'start')"
                    class="cursor-w-resize"
                  />
                  <rect
                    v-if="!isSingleDay(activity)"
                    :x="getPosition(activity.data.endDate || activity.data.startDate) - 4"
                    :y="index * 64 + 20"
                    width="8"
                    height="16"
                    fill="transparent"
                    @mousedown="start_drag($event, activity.id, 'end')"
                    class="cursor-e-resize"
                  />
                  <rect
                    v-if="isSingleDay(activity)"
                    :id="'gantt-element-' + activity.id"
                    :x="getPosition(activity.data.startDate) - 12"
                    :y="index * 64 + 16"
                    width="24"
                    height="24"
                    transform="rotate(45)"
                    :fill="getBarFill(activity).fill"
                    :stroke="getBarFill(activity).stroke"
                    :stroke-width="getBarFill(activity).strokeWidth"
                    @mousedown="start_drag($event, activity.id, 'bar')"
                    @click="toggleSelection(activity.id)"
                    :title="activity.data.name"
                    class="cursor-move"
                  />
                </g>
              </g>
              <!-- Dependency Paths -->
              <g transform="translate(0, 40)">
                <path
                  v-for="dep in dependencyPaths"
                  :key="dep.id"
                  :d="dep.path"
                  :stroke="getDependencyColor(dep.data.dependencyType)"
                  stroke-width="2"
                  opacity="0.3"
                  fill="none"
                  marker-end="url(#circleMarker)"
                />
              </g>
            </svg>
          </div>
        </div>
      </div>
    </div>
  `,
  setup(props, { emit }) {
    const { updateEntity, addEntity, removeEntity } = useHistory();
    const { entities } = useGlobal();
    const selectedActivityIds = Vue.ref([]);
    const ganttContainer = Vue.ref(null);
    const ganttBody = Vue.ref(null);
    const svgContainer = Vue.ref(null);
    const dependencyPaths = Vue.ref([]);
    const scrollLeft = Vue.ref(0);
    const scrollTop = Vue.ref(0);
    const timelineScale = Vue.ref('days');
    const availableWidth = Vue.ref(800);
    const dragging = Vue.ref(null);
    const showActivityModal = Vue.ref(false);
    const showDependencyModal = Vue.ref(false);
    const modalActivity = Vue.ref({});
    const modalDependency = Vue.ref({});
    const isEditingDependency = Vue.ref(false);

    const sortedActivities = Vue.computed(() => 
      [...props.activities]
        .filter(activity => activity && activity.data && activity.data.startDate)
        .sort((a, b) => new Date(a.data.startDate) - new Date(b.data.startDate))
    );

    const sortedDependencies = Vue.computed(() => 
      [...props.dependencies]
        .filter(dep => dep && dep.data && dep.data.sourceId && dep.data.targetId)
        .sort((a, b) => a.id.localeCompare(b.id))
    );

    function debounce(fn, wait) {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), wait);
      };
    }

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
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    Vue.onUnmounted(() => {
      if (ganttContainer.value) {
        resizeObserver.unobserve(ganttContainer.value);
      }
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    });

    function updateAvailableWidth() {
      if (ganttContainer.value) {
        availableWidth.value = ganttContainer.value.clientWidth;
        Vue.nextTick(() => computeDependencyPaths());
      }
    }

    const timeline = Vue.computed(() => {
      if (!props.activities.length) return [];
      const dates = [];
      const startDates = props.activities
        .filter(a => a && a.data && a.data.startDate)
        .map(a => new Date(a.data.startDate).getTime());
      const endDates = props.activities
        .filter(a => a && a.data && a.data.endDate)
        .map(a => new Date(a.data.endDate).getTime());
      const minDate = startDates.length ? Math.min(...startDates) : Date.now();
      const maxDate = endDates.length ? Math.max(...endDates) : Date.now();
      
      // Extend the timeline by at least 1 month (31 days) past the last end date
      const oneMonthInMs = 31 * 24 * 60 * 60 * 1000; // 31 days in milliseconds
      const bufferBefore = 30 * 24 * 60 * 60 * 1000; // 30 days buffer before
      const cappedMinDate = minDate - bufferBefore;
      const cappedMaxDate = Math.max(maxDate + oneMonthInMs, maxDate + bufferBefore);
      const diffTime = cappedMaxDate - cappedMinDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const pixelsPerDay = availableWidth.value / diffDays;
      let interval;
      if (pixelsPerDay > 20) {
        timelineScale.value = 'days';
        interval = 1000 * 60 * 60 * 24; // 1 day
      } else if (pixelsPerDay > 5) {
        timelineScale.value = 'weeks';
        interval = 1000 * 60 * 60 * 24 * 7; // 1 week
      } else if (pixelsPerDay > 1) {
        timelineScale.value = 'months';
        interval = null;
      } else {
        timelineScale.value = 'years';
        interval = null;
      }

      if (timelineScale.value === 'days' || timelineScale.value === 'weeks') {
        const steps = Math.ceil(diffTime / interval);
        for (let i = 0; i <= steps; i++) {
          const nextDate = new Date(cappedMinDate + i * interval);
          if (nextDate.getTime() <= cappedMaxDate) {
            dates.push(nextDate);
          }
        }
      } else if (timelineScale.value === 'months') {
        let currentDate = new Date(cappedMinDate);
        currentDate.setDate(1);
        while (currentDate.getTime() <= cappedMaxDate) {
          dates.push(new Date(currentDate));
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      } else {
        let currentDate = new Date(cappedMinDate);
        currentDate.setMonth(0, 1);
        while (currentDate.getTime() <= cappedMaxDate) {
          dates.push(new Date(currentDate));
          currentDate.setFullYear(currentDate.getFullYear() + 1);
        }
      }
      return dates;
    });

    const dateWidth = Vue.computed(() => {
      if (!timeline.value || !timeline.value.length) return 40;
      const idealWidth = availableWidth.value / timeline.value.length;
      return Math.max(idealWidth, 40);
    });

    const ganttWidth = Vue.computed(() => {
      if (!timeline.value || !timeline.value.length) return availableWidth.value;
      return timeline.value.length * dateWidth.value;
    });

    const ganttHeight = Vue.computed(() => (sortedActivities.value.length + 1) * 64 + 40);

    function formatDate(date) {
      const d = new Date(date);
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = String(d.getFullYear()).slice(-2);
      return `${month}/${year}`;
    }

    function getDateLabelPosition(date, index) {
      const basePosition = getPosition(date);
      if (index === timeline.value.length - 1) {
        // For the last date, don't shift (or shift minimally to avoid overflow)
        return basePosition;
      }
      const nextDate = timeline.value[index + 1];
      const nextPosition = getPosition(nextDate);
      const monthWidth = nextPosition - basePosition;
      const offset = monthWidth * 0.5; // Shift by 50% of the month width
      return basePosition + offset;
    }

    function getDependencyColor(dependencyType) {
      const colorMap = {
        'FS': '#FF5555', // Red for Finish-to-Start
        'FF': '#55AAFF', // Blue for Finish-to-Finish
        'SS': '#55FF55', // Green for Start-to-Start
        'SF': '#AA55FF', // Purple for Start-to-Finish
      };
      return colorMap[dependencyType] || '#000000'; // Default to black if type is unknown
    }

    function isSingleDay(activity) {
      if (!activity || !activity.data || !activity.data.startDate) return false;
      if (!activity.data.endDate) return true;
      const startDate = new Date(activity.data.startDate);
      const endDate = new Date(activity.data.endDate);
      return startDate.toDateString() === endDate.toDateString();
    }

    function getPosition(date) {
      if (!timeline.value || !timeline.value.length) return 0;
      const timelineStart = timeline.value[0].getTime();
      const timelineEnd = timeline.value[timeline.value.length - 1].getTime();
      const dateTime = new Date(date).getTime();
      const fraction = Math.min(Math.max((dateTime - timelineStart) / (timelineEnd - timelineStart), 0), 1);
      return fraction * ganttWidth.value;
    }

    function getDateFromPosition(x) {
      if (!timeline.value || !timeline.value.length) return new Date();
      const timelineStart = timeline.value[0].getTime();
      const timelineEnd = timeline.value[timeline.value.length - 1].getTime();
      const fraction = x / ganttWidth.value;
      const dateTime = timelineStart + fraction * (timelineEnd - timelineStart);
      return new Date(dateTime);
    }

    function getMouseX(event) {
      const svg = svgContainer.value;
      const ctm = svg.getScreenCTM();
      const pt = svg.createSVGPoint();
      pt.x = event.clientX;
      pt.y = event.clientY;
      const svgPt = pt.matrixTransform(ctm.inverse());
      return svgPt.x;
    }

    function start_drag(event, activityId, type) {
      event.stopPropagation();
      const mouseX = getMouseX(event);
      const activity = sortedActivities.value.find(a => a.id === activityId);
      dragging.value = { type, activityId, startX: mouseX, originalStart: new Date(activity.data.startDate), originalEnd: activity.data.endDate ? new Date(activity.data.endDate) : null };
    }

    function onMouseMove(event) {
      if (dragging.value) {
        const mouseX = getMouseX(event);
        const newDate = getDateFromPosition(mouseX);
        const activity = props.activities.find(a => a.id === dragging.value.activityId);
        const deltaMs = newDate.getTime() - dragging.value.originalStart.getTime();
        let updateData = { ...activity.data };

        if (dragging.value.type === 'start') {
          updateData.startDate = newDate.toISOString();
          if (updateData.endDate && new Date(updateData.endDate) < newDate) {
            updateData.endDate = newDate.toISOString();
          }
        } else if (dragging.value.type === 'end') {
          updateData.endDate = newDate.toISOString();
          if (new Date(updateData.startDate) > newDate) {
            updateData.startDate = newDate.toISOString();
          }
        } else if (dragging.value.type === 'bar') {
          const duration = dragging.value.originalEnd ? dragging.value.originalEnd.getTime() - dragging.value.originalStart.getTime() : 0;
          updateData.startDate = new Date(dragging.value.originalStart.getTime() + deltaMs).toISOString();
          if (dragging.value.originalEnd) {
            updateData.endDate = new Date(dragging.value.originalStart.getTime() + deltaMs + duration).toISOString();
          }
        }

        updateEntity('activities', activity.id, updateData);
      }
    }

    function onMouseUp() {
      dragging.value = null;
    }

    function startPan(event) {
      if (event.target === svgContainer.value) {
        const startX = event.clientX;
        const startScrollLeft = ganttContainer.value.scrollLeft;
        const onPanMove = (moveEvent) => {
          const deltaX = moveEvent.clientX - startX;
          ganttContainer.value.scrollLeft = startScrollLeft - deltaX;
        };
        const onPanUp = () => {
          document.removeEventListener('mousemove', onPanMove);
          document.removeEventListener('mouseup', onPanUp);
        };
        document.addEventListener('mousemove', onPanMove);
        document.addEventListener('mouseup', onPanUp);
      }
    }

    function getBarFill(activity) {
      if (!activity || !activity.id) {
        return { fill: '#000000', stroke: 'none', strokeWidth: 0 };
      }

      // Check for dependency violations
      const hasViolation = sortedDependencies.value.some(dep => 
        (dep.data.sourceId === activity.id || dep.data.targetId === activity.id) && detectConflict(dep)
      );

      let fillColor;
      if (selectedActivityIds.value.includes(activity.id)) {
        fillColor = '#facc15';
      } else if (activity.data.status === 'completed') {
        fillColor = '#22c55e';
      } else {
        fillColor = '#3b82f6';
      }

      return {
        fill: fillColor,
        stroke: hasViolation ? '#ef4444' : 'none',
        strokeWidth: hasViolation ? 5 : 0,
      };
    }

    function computeDependencyPaths() {
      if (!ganttBody.value || !svgContainer.value || !ganttContainer.value) return;

      const computedPaths = sortedDependencies.value.map(dep => {
        const fromActivity = sortedActivities.value.find(a => a.id === dep.data.sourceId);
        const toActivity = sortedActivities.value.find(a => a.id === dep.data.targetId);
        if (!fromActivity || !toActivity) return { ...dep, path: '' };

        const fromIndex = sortedActivities.value.findIndex(a => a.id === dep.data.sourceId);
        const toIndex = sortedActivities.value.findIndex(a => a.id === dep.data.targetId);
        const fromRect = { 
          left: getPosition(fromActivity.data.startDate),
          right: getPosition(fromActivity.data.endDate || fromActivity.data.startDate),
          middle: fromIndex * 64 + 28, // Adjusted middle of the bar (20 + 16/2)
        };
        const toRect = { 
          left: getPosition(toActivity.data.startDate),
          right: getPosition(toActivity.data.endDate || toActivity.data.startDate),
          middle: toIndex * 64 + 28, // Adjusted middle of the bar (20 + 16/2)
        };

        const offsetX = 20;
        let path;
        let x1, x2, y1, y2;

        switch (dep.data.dependencyType) {
          case 'FS':
            x1 = fromRect.right;
            y1 = fromRect.middle;
            x2 = toRect.left;
            y2 = toRect.middle;
            if (x2 < x1) {
              const midY1 = y1 + 32;
              const midX = x2 - offsetX;
              const midY2 = y2;
              path = `M${x1},${y1} V${midY1} H${midX} V${midY2} H${x2} V${y2}`;
            } else {
              path = `M${x1},${y1} V${y1 + 32} H${x2} V${y2}`;
            }
            break;
          case 'SS':
            x1 = fromRect.left;
            y1 = fromRect.middle;
            x2 = toRect.left;
            y2 = toRect.middle;
            if (x2 < x1) {
              const midY1 = y1 + 32;
              const midX = x2 - offsetX;
              const midY2 = y2;
              path = `M${x1},${y1} V${midY1} H${midX} V${midY2} H${x2} V${y2}`;
            } else {
              path = `M${x1},${y1} V${y1 + 32} H${x2} V${y2}`;
            }
            break;
          case 'FF':
            x1 = fromRect.right;
            y1 = fromRect.middle;
            x2 = toRect.right;
            y2 = toRect.middle;
            if (x2 < x1) {
              const midY1 = y1 + 32;
              const midX = x2 + offsetX;
              const midY2 = y2;
              path = `M${x1},${y1} V${midY1} H${midX} V${midY2} H${x2} V${y2}`;
            } else {
              path = `M${x1},${y1} V${y1 + 32} H${x2} V${y2}`;
            }
            break;
          case 'SF':
            x1 = fromRect.left;
            y1 = fromRect.middle;
            x2 = toRect.right;
            y2 = toRect.middle;
            if (x2 < x1) {
              const midY1 = y1 + 32;
              const midX = x2 + offsetX;
              const midY2 = y2;
              path = `M${x1},${y1} V${midY1} H${midX} V${midY2} H${x2} V${y2}`;
            } else {
              path = `M${x1},${y1} V${y1 + 32} H${x2} V${y2}`;
            }
            break;
          default:
            path = '';
        }

        return { ...dep, path };
      });

      dependencyPaths.value = computedPaths;
    }

    function detectConflict(dep) {
      const fromActivity = props.activities.find(a => a.id === dep.data.sourceId);
      const toActivity = props.activities.find(a => a.id === dep.data.targetId);
      if (!fromActivity || !toActivity) return false;

      const fromStart = new Date(fromActivity.data.startDate).getTime();
      const fromEnd = fromActivity.data.endDate ? new Date(fromActivity.data.endDate).getTime() : fromStart;
      const toStart = new Date(toActivity.data.startDate).getTime();
      const toEnd = toActivity.data.endDate ? new Date(toActivity.data.endDate).getTime() : toStart;

      switch (dep.data.dependencyType) {
        case 'FS': return fromEnd > toStart;
        case 'FF': return fromEnd > toEnd;
        case 'SS': return fromStart > toStart;
        case 'SF': return fromStart > toEnd;
        default: return false;
      }
    }

    function updateScrollPosition() {
      if (ganttContainer.value) {
        scrollLeft.value = ganttContainer.value.scrollLeft;
        scrollTop.value = ganttContainer.value.scrollTop;
        Vue.nextTick(() => computeDependencyPaths());
      }
    }

    Vue.watch(
      [() => sortedActivities.value, () => sortedDependencies.value, () => ganttWidth.value],
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
      emit('clear-selections');
    }

    function handleShiftSelect(index, event) {
      if (event.shiftKey && selectedActivityIds.value.length) {
        const lastSelectedIndex = sortedActivities.value.findIndex(a => a.id === selectedActivityIds.value[selectedActivityIds.value.length - 1]);
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        selectedActivityIds.value = sortedActivities.value.slice(start, end + 1).map(a => a.id);
      }
    }

    function addActivity() {
      const today = new Date().toISOString().split('T')[0];
      const newActivity = {
        project: props.project.id,
        name: `New Activity ${sortedActivities.value.length + 1}`,
        startDate: today,
        endDate: today,
        owner: '',
        description: '',
      };
      const newId = addEntity('activities', newActivity);
      openActivityModal({ id: newId, data: newActivity });
    }

    function openActivityModal(activity) {
      modalActivity.value = {
        id: activity.id,
        name: activity.data.name,
        owner: activity.data.owner || '',
        description: activity.data.description || '',
        startDate: new Date(activity.data.startDate).toISOString().split('T')[0],
        endDate: activity.data.endDate ? new Date(activity.data.endDate).toISOString().split('T')[0] : '',
      };
      showActivityModal.value = true;
    }

    function closeActivityModal() {
      showActivityModal.value = false;
      modalActivity.value = {};
    }

    function saveActivityModal() {
      const activity = props.activities.find(a => a.id === modalActivity.value.id);
      if (activity) {
        updateEntity('activities', activity.id, {
          ...activity.data,
          name: modalActivity.value.name,
          owner: modalActivity.value.owner,
          description: modalActivity.value.description,
          startDate: new Date(modalActivity.value.startDate).toISOString(),
          endDate: modalActivity.value.endDate ? new Date(modalActivity.value.endDate).toISOString() : null,
        });
      }
      closeActivityModal();
    }

    function editDependency(dep) {
      isEditingDependency.value = true;
      modalDependency.value = {
        id: dep.id,
        sourceId: dep.data.sourceId,
        targetId: dep.data.targetId,
        dependencyType: dep.data.dependencyType,
      };
    }

    function deleteDependency(id) {
      removeEntity('dependencies', id);
    }

    function openDependencyModal() {
      isEditingDependency.value = false;
      modalDependency.value = {
        sourceId: sortedActivities.value[0]?.id || '',
        targetId: sortedActivities.value[1]?.id || sortedActivities.value[0]?.id || '',
        dependencyType: 'FS',
      };
      showDependencyModal.value = true;
    }

    function closeDependencyModal() {
      showDependencyModal.value = false;
      modalDependency.value = {};
      isEditingDependency.value = false;
    }

    function saveDependencyModal() {
      if (!modalDependency.value.sourceId || !modalDependency.value.targetId || !modalDependency.value.dependencyType) return;

      const depData = {
        sourceId: modalDependency.value.sourceId,
        targetId: modalDependency.value.targetId,
        dependencyType: modalDependency.value.dependencyType,
        conflict: detectConflict({ data: modalDependency.value }),
      };

      if (isEditingDependency.value && modalDependency.value.id) {
        updateEntity('dependencies', modalDependency.value.id, depData);
      } else {
        addEntity('dependencies', depData);
      }
      closeDependencyModal();
    }

    function getActivityName(id) {
      const activity = sortedActivities.value.find(a => a.id === id);
      return activity ? activity.data.name : 'Unknown';
    }

    return {
      selectedActivityIds,
      timeline,
      dateWidth,
      ganttWidth,
      ganttHeight,
      sortedActivities,
      sortedDependencies,
      dependencyPaths,
      ganttContainer,
      ganttBody,
      svgContainer,
      scrollLeft,
      scrollTop,
      showActivityModal,
      showDependencyModal,
      modalActivity,
      modalDependency,
      isEditingDependency,
      updateScrollPosition,
      formatDate,
      getDateLabelPosition,
      getDependencyColor,
      isSingleDay,
      getBarFill,
      getPosition,
      getDateFromPosition,
      getMouseX,
      start_drag,
      startPan,
      toggleSelection,
      handleShiftSelect,
      addActivity,
      openActivityModal,
      closeActivityModal,
      saveActivityModal,
      editDependency,
      deleteDependency,
      openDependencyModal,
      closeDependencyModal,
      saveDependencyModal,
      getActivityName,
      onMouseMove,
      onMouseUp,
    };
  },
};