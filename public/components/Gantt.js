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
      default: () => [],
    },
    dependencies: {
      type: Array,
      default: () => [],
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
          <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">{{ modalActivity.id ? 'Edit Activity' : 'Add Activity' }}</h3>
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
            <button v-if="modalActivity.id" @click="deleteActivity(modalActivity.id)" class="px-4 py-2 bg-red-600 text-white rounded">Delete</button>
            <button @click="closeActivityModal" class="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded">Cancel</button>
            <button @click="saveActivityModal" class="px-4 py-2 bg-blue-600 text-white rounded">{{ modalActivity.id ? 'Save' : 'Add' }}</button>
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
            <button @click="fixDates" class="px-4 py-2 bg-green-600 text-white rounded">Fix Dates</button>
            <button @click="closeDependencyModal" class="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded">Cancel</button>
            <button @click="saveDependencyModal" class="px-4 py-2 bg-blue-600 text-white rounded">{{ isEditingDependency ? 'Save' : 'Add' }}</button>
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
              <button @click="openDependencyModal" class="text-blue-500">
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
                    :x="getPosition(draggingActivityId === activity.id ? tempActivityDates[activity.id]?.startDate || activity.data.startDate : activity.data.startDate)"
                    :y="index * 64 + 20"
                    :width="getPosition(draggingActivityId === activity.id ? tempActivityDates[activity.id]?.endDate || activity.data.endDate || activity.data.startDate : activity.data.endDate || activity.data.startDate) - getPosition(draggingActivityId === activity.id ? tempActivityDates[activity.id]?.startDate || activity.data.startDate : activity.data.startDate)"
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
                    :x="getPosition(draggingActivityId === activity.id ? tempActivityDates[activity.id]?.startDate || activity.data.startDate : activity.data.startDate) - 4"
                    :y="index * 64 + 20"
                    width="8"
                    height="16"
                    fill="transparent"
                    @mousedown="start_drag($event, activity.id, 'start')"
                    class="cursor-w-resize"
                  />
                  <rect
                    v-if="!isSingleDay(activity)"
                    :x="getPosition(draggingActivityId === activity.id ? tempActivityDates[activity.id]?.endDate || activity.data.endDate || activity.data.startDate : activity.data.endDate || activity.data.startDate) - 4"
                    :y="index * 64 + 20"
                    width="8"
                    height="16"
                    fill="transparent"
                    @mousedown="start_drag($event, activity.id, 'end')"
                    class="cursor-e-resize"
                  />
                  <g v-if="isSingleDay(activity)">
                    <g
                      :transform="'translate(' + getPosition(draggingActivityId === activity.id ? tempActivityDates[activity.id]?.startDate || activity.data.startDate : activity.data.startDate) + ',' + (index * 64 + 28) + ') rotate(45)'"
                    >
                      <rect
                        :id="'gantt-element-' + activity.id"
                        x="-12"
                        y="-12"
                        width="24"
                        height="24"
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
    const draggingActivityId = Vue.ref(null);
    const tempActivityDates = Vue.ref({});
    const showActivityModal = Vue.ref(false);
    const showDependencyModal = Vue.ref(false);
    const modalActivity = Vue.ref({});
    const modalDependency = Vue.ref({});
    const isEditingDependency = Vue.ref(false);
    let debounceTimeout = null;

    const sortedActivities = Vue.computed(() => {
      if (!Array.isArray(props.activities)) return [];
      return [...props.activities]
        .filter(activity => activity && activity.data && activity.data.startDate)
        .sort((a, b) => new Date(a.data.startDate) - new Date(b.data.startDate));
    });

    const sortedDependencies = Vue.computed(() => {
      if (!Array.isArray(props.dependencies)) return [];
      return [...props.dependencies]
        .filter(dep => dep && dep.data && dep.data.sourceId && dep.data.targetId)
        .sort((a, b) => {
          const sourceA = sortedActivities.value.find(act => act.id === a.data.sourceId);
          const sourceB = sortedActivities.value.find(act => act.id === b.data.sourceId);
          const dateA = sourceA ? new Date(sourceA.data.startDate).getTime() : 0;
          const dateB = sourceB ? new Date(sourceB.data.startDate).getTime() : 0;
          return dateA - dateB;
        });
    });

    function debounce(fn, wait) {
      return (...args) => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => fn(...args), wait);
      };
    }

    const debouncedSortAndTimelineUpdate = debounce(() => {
      // Sorting and timeline updates will happen after dragging stops
    }, 300);

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
      if (!Array.isArray(props.activities) || !props.activities.length) return [];
      const dates = [];
      const startDates = props.activities
        .filter(a => a && a.data && a.data.startDate)
        .map(a => new Date(a.data.startDate).getTime());
      const endDates = props.activities
        .filter(a => a && a.data && a.data.endDate)
        .map(a => new Date(a.data.endDate).getTime());
      const minDate = startDates.length ? Math.min(...startDates) : Date.now();
      const maxDate = endDates.length ? Math.max(...endDates) : Date.now();
      
      const oneMonthInMs = 31 * 24 * 60 * 60 * 1000;
      const bufferBefore = 30 * 24 * 60 * 60 * 1000;
      const bufferAfter = 30 * 24 * 60 * 60 * 1000;
      const cappedMinDate = minDate - bufferBefore;
      const cappedMaxDate = Math.max(maxDate + oneMonthInMs, maxDate + bufferAfter);
      const diffTime = cappedMaxDate - cappedMinDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const pixelsPerDay = availableWidth.value / diffDays;
      let interval;
      if (pixelsPerDay > 20) {
        timelineScale.value = 'days';
        interval = 1000 * 60 * 60 * 24;
      } else if (pixelsPerDay > 5) {
        timelineScale.value = 'weeks';
        interval = 1000 * 60 * 60 * 24 * 7;
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
        if (currentDate.getTime() > cappedMaxDate && dates[dates.length - 1].getTime() < maxDate) {
          const lastDate = new Date(maxDate);
          lastDate.setDate(1);
          dates.push(lastDate);
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
      const idealWidth = availableWidth.value / (timeline.value.length - 1);
      return Math.max(idealWidth, 40);
    });

    const ganttWidth = Vue.computed(() => {
      if (!timeline.value || !timeline.value.length) return availableWidth.value;
      return (timeline.value.length - 1) * dateWidth.value;
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
        return basePosition;
      }
      const nextDate = timeline.value[index + 1];
      const nextPosition = getPosition(nextDate);
      const monthWidth = nextPosition - basePosition;
      const offset = monthWidth * 0.5;
      return basePosition + offset;
    }

    function getDependencyColor(dependencyType) {
      const colorMap = {
        'FS': '#FF5555',
        'FF': '#55AAFF',
        'SS': '#55FF55',
        'SF': '#AA55FF',
      };
      return colorMap[dependencyType] || '#000000';
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
      return fraction * (ganttWidth.value);
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
      if (!activity) return;
      dragging.value = { type, activityId, startX: mouseX, originalStart: new Date(activity.data.startDate), originalEnd: activity.data.endDate ? new Date(activity.data.endDate) : null };
      draggingActivityId.value = activityId;
      tempActivityDates.value[activityId] = {
        startDate: activity.data.startDate,
        endDate: activity.data.endDate || activity.data.startDate,
      };
    }

    function onMouseMove(event) {
      if (dragging.value) {
        const mouseX = getMouseX(event);
        const newDate = getDateFromPosition(mouseX);
        const activity = props.activities.find(a => a.id === dragging.value.activityId);
        if (!activity) return;
        const deltaMs = newDate.getTime() - dragging.value.originalStart.getTime();
        let updatedDates = { ...tempActivityDates.value[dragging.value.activityId] };

        if (dragging.value.type === 'start') {
          if (updatedDates.endDate && newDate.getTime() > new Date(updatedDates.endDate).getTime()) {
            return; // Prevent start date from exceeding end date
          }
          updatedDates.startDate = newDate.toISOString();
        } else if (dragging.value.type === 'end') {
          if (newDate.getTime() < new Date(updatedDates.startDate).getTime()) {
            return; // Prevent end date from being before start date
          }
          updatedDates.endDate = newDate.toISOString();
        } else if (dragging.value.type === 'bar') {
          const duration = dragging.value.originalEnd ? dragging.value.originalEnd.getTime() - dragging.value.originalStart.getTime() : 0;
          const newStartDate = new Date(dragging.value.originalStart.getTime() + deltaMs);
          if (dragging.value.originalEnd) {
            const newEndDate = new Date(dragging.value.originalStart.getTime() + deltaMs + duration);
            if (newStartDate.getTime() <= newEndDate.getTime()) {
              updatedDates.startDate = newStartDate.toISOString();
              updatedDates.endDate = newEndDate.toISOString();
            } else {
              return; // Prevent start date from exceeding end date
            }
          } else {
            updatedDates.startDate = newStartDate.toISOString();
            updatedDates.endDate = newStartDate.toISOString();
          }
        }

        // Update temporary dates for real-time visual feedback
        tempActivityDates.value[dragging.value.activityId] = updatedDates;

        // Update entity in real-time for dependency violation detection
        updateEntity('activities', dragging.value.activityId, {
          ...activity.data,
          startDate: updatedDates.startDate,
          endDate: updatedDates.endDate,
        });

        // Debounce sorting and timeline updates
        debouncedSortAndTimelineUpdate();
      }
    }

    function onMouseUp() {
      if (dragging.value) {
        const activityId = dragging.value.activityId;
        const updatedDates = tempActivityDates.value[activityId];
        if (updatedDates) {
          const activity = props.activities.find(a => a.id === activityId);
          if (activity) {
            updateEntity('activities', activityId, {
              ...activity.data,
              startDate: updatedDates.startDate,
              endDate: updatedDates.endDate,
            });
          }
        }
        clearTimeout(debounceTimeout);
        debouncedSortAndTimelineUpdate();
        tempActivityDates.value = {};
        draggingActivityId.value = null;
      }
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
          updateScrollPosition();
        };
        document.addEventListener('mousemove', onPanMove);
        document.addEventListener('mouseup', onPanUp);
      }
    }

    function getBarFill(activity) {
      if (!activity || !activity.id) {
        return { fill: '#000000', stroke: 'none', strokeWidth: 0 };
      }

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
          middle: fromIndex * 64 + 28,
        };
        const toRect = { 
          left: getPosition(toActivity.data.startDate),
          right: getPosition(toActivity.data.endDate || toActivity.data.startDate),
          middle: toIndex * 64 + 28,
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

    function fixDates() {
      // Build a dependency graph to detect cycles and determine order
      const graph = new Map();
      const inDegree = new Map();
      sortedActivities.value.forEach(activity => {
        graph.set(activity.id, []);
        inDegree.set(activity.id, 0);
      });

      sortedDependencies.value.forEach(dep => {
        graph.get(dep.data.sourceId).push({ targetId: dep.data.targetId, type: dep.data.dependencyType });
        inDegree.set(dep.data.targetId, (inDegree.get(dep.data.targetId) || 0) + 1);
      });

      // Topological sort to detect cycles and determine processing order
      const queue = [];
      const visited = new Set();
      const recStack = new Set();
      sortedActivities.value.forEach(activity => {
        if (inDegree.get(activity.id) === 0) {
          queue.push(activity.id);
        }
      });

      const topologicalOrder = [];
      while (queue.length > 0) {
        const activityId = queue.shift();
        if (recStack.has(activityId)) {
          console.error('Circular dependency detected. Cannot fix dates.');
          alert('Circular dependency detected. Cannot fix dates.');
          return;
        }
        topologicalOrder.push(activityId);
        graph.get(activityId).forEach(dep => {
          inDegree.set(dep.targetId, inDegree.get(dep.targetId) - 1);
          if (inDegree.get(dep.targetId) === 0) {
            queue.push(dep.targetId);
          }
        });
      }

      if (topologicalOrder.length !== sortedActivities.value.length) {
        console.error('Circular dependency detected. Cannot fix dates.');
        alert('Circular dependency detected. Cannot fix dates.');
        return;
      }

      // Process activities in topological order to resolve conflicts
      const updatedActivities = new Map();
      topologicalOrder.forEach(activityId => {
        const activity = sortedActivities.value.find(a => a.id === activityId);
        if (!activity) return;

        let earliestStart = new Date(activity.data.startDate).getTime();
        let duration = activity.data.endDate
          ? new Date(activity.data.endDate).getTime() - new Date(activity.data.startDate).getTime()
          : 0;

        // Check all dependencies where this activity is the target
        sortedDependencies.value.forEach(dep => {
          if (dep.data.targetId !== activityId) return;

          const sourceActivity = sortedActivities.value.find(a => a.id === dep.data.sourceId);
          if (!sourceActivity) return;

          let sourceStart = new Date(sourceActivity.data.startDate).getTime();
          let sourceEnd = sourceActivity.data.endDate
            ? new Date(sourceActivity.data.endDate).getTime()
            : sourceStart;

          if (updatedActivities.has(dep.data.sourceId)) {
            const updatedSource = updatedActivities.get(dep.data.sourceId);
            sourceStart = updatedSource.startDate;
            sourceEnd = updatedSource.endDate;
          }

          let requiredStart;
          switch (dep.data.dependencyType) {
            case 'FS':
              requiredStart = sourceEnd + 1; // Target must start after source ends
              break;
            case 'FF':
              requiredStart = sourceEnd - duration; // Target end must match source end
              break;
            case 'SS':
              requiredStart = sourceStart; // Target must start when source starts
              break;
            case 'SF':
              requiredStart = sourceStart - duration; // Target end must match source start
              break;
            default:
              return;
          }

          earliestStart = Math.max(earliestStart, requiredStart);
        });

        const newStartDate = new Date(earliestStart);
        const newEndDate = duration > 0 ? new Date(earliestStart + duration) : newStartDate;

        updatedActivities.set(activityId, {
          startDate: newStartDate.getTime(),
          endDate: newEndDate.getTime(),
        });
      });

      // Update all activities with new dates
      updatedActivities.forEach((dates, activityId) => {
        const activity = sortedActivities.value.find(a => a.id === activityId);
        if (activity) {
          updateEntity('activities', activityId, {
            ...activity.data,
            startDate: new Date(dates.startDate).toISOString(),
            endDate: new Date(dates.endDate).toISOString(),
          });
        }
      });

      emit('activity-changed');
      showActivityModal.value = false;
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
        selectedActivityIds.value = [id];
        emit('clear-selections', id);
      }
    }

    function clearSelections() {
      selectedActivityIds.value = [];
    }

    function handleShiftSelect(index, event) {
      if (event.shiftKey && selectedActivityIds.value.length) {
        const lastSelectedIndex = sortedActivities.value.findIndex(a => a.id === selectedActivityIds.value[selectedActivityIds.value.length - 1]);
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        selectedActivityIds.value = sortedActivities.value.slice(start, end + 1).map(a => a.id);
        emit('clear-selections', null);
      }
    }

    function addActivity() {
      const today = new Date().toISOString().split('T')[0];
      modalActivity.value = {
        name: `New Activity ${sortedActivities.value.length + 1}`,
        startDate: today,
        endDate: today,
        owner: '',
        description: '',
      };
      showActivityModal.value = true;
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

    function deleteActivity(activityId) {
      removeEntity('activities', activityId);
      closeActivityModal();
      emit('activity-changed');
    }

    function saveActivityModal() {
      if (modalActivity.value.id) {
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
      } else {
        const newActivity = {
          project: props.project.id,
          name: modalActivity.value.name,
          startDate: new Date(modalActivity.value.startDate).toISOString(),
          endDate: modalActivity.value.endDate ? new Date(modalActivity.value.endDate).toISOString() : null,
          owner: modalActivity.value.owner,
          description: modalActivity.value.description,
        };
        addEntity('activities', newActivity);
      }
      closeActivityModal();
      emit('activity-changed');
    }

    function editDependency(dep) {
      isEditingDependency.value = true;
      modalDependency.value = {
        id: dep.id,
        sourceId: dep.data.sourceId,
        targetId: dep.data.targetId,
        dependencyType: dep.data.dependencyType,
      };
      showDependencyModal.value = true;
    }

    function deleteDependency(id) {
      removeEntity('dependencies', id);
      emit('activity-changed');
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
      modalDependency.value = {
        sourceId: sortedActivities.value[0]?.id || '',
        targetId: sortedActivities.value[1]?.id || sortedActivities.value[0]?.id || '',
        dependencyType: 'FS',
      };
      isEditingDependency.value = false;
      emit('activity-changed');
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
      draggingActivityId,
      tempActivityDates,
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
      clearSelections,
      handleShiftSelect,
      addActivity,
      openActivityModal,
      closeActivityModal,
      deleteActivity,
      saveActivityModal,
      editDependency,
      deleteDependency,
      openDependencyModal,
      closeDependencyModal,
      saveDependencyModal,
      getActivityName,
      fixDates,
      onMouseMove,
      onMouseUp,
    };
  },
};