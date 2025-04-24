import { useGlobal } from '../composables/useGlobal.js';
import { useHistory } from '../composables/useHistory.js';
import { useRealTime } from '../composables/useRealTime.js';
import { useModels } from '../composables/useModels.js';
import Gantt from './Gantt.js';

export default {
  name: 'Projects',
  components: { Gantt },
  props: {
    darkMode: {
      type: Boolean,
      default: false,
    },
  },
  template: `
    <div class="flex h-[calc(100vh-8rem)] bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <!-- Project Summary Modal -->
      <div v-if="showSummaryModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg w-1/2 max-h-[80vh] overflow-y-auto">
          <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Project Summary</h3>
          <div class="space-y-4">
            <textarea v-model="projectSummary" class="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" rows="10"></textarea>
            <div class="flex justify-between">
              <button @click="generateSummary" class="px-4 py-2 bg-blue-600 text-white rounded flex items-center" :disabled="isGeneratingSummary">
                <i class="pi pi-file-word mr-2"></i>
                <span v-if="isGeneratingSummary">Generating...</span>
                <span v-else>Generate Summary</span>
              </button>
              <button @click="copySummary" class="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded">Copy</button>
            </div>
          </div>
          <div class="mt-6 flex justify-end space-x-2">
            <button @click="closeSummaryModal" class="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded">Cancel</button>
            <button @click="saveSummary" class="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
          </div>
        </div>
      </div>

      <!-- Projects Sidebar (Left) -->
      <div class="border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300" :class="isProjectsOpen ? 'w-1/4' : 'w-12'">
        <div class="p-4 border-b border-gray-200 dark:border-grey-700 flex items-center gap-4 bg-gray-50 dark:bg-gray-900">
          <button @click="toggleProjects" class="text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">
            <i :class="isProjectsOpen ? 'pi pi-chevron-left' : 'pi pi-chevron-right'"></i>
          </button>
          <button v-if="isProjectsOpen" @click="addProject" class="p-2 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 text-white rounded-lg transition-all shadow-sm">
            <i class="pi pi-plus"></i>
          </button>
          <select v-if="isProjectsOpen" v-model="selectedModel" class="flex-1 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all">
            <option v-for="model in models" :key="model.model" :value="model.model">
              {{ model.name.en }} ({{ model.provider }})
            </option>
          </select>
        </div>
        <div v-if="isProjectsOpen" class="flex-1 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
          <div v-for="project in entities?.projects || []" :key="project.id" class="p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-all" :class="{ 'bg-blue-50 dark:bg-blue-900': activeProjectId === project.id }" @click="selectProject(project.id)">
            <div class="flex-1 truncate">
              <span v-if="isEditingProject !== project.id" class="text-gray-900 dark:text-white font-medium">{{ project.data.name }}</span>
              <input v-else v-model="project.data.name" type="text" class="bg-transparent text-gray-900 dark:text-white flex-1 outline-none font-medium w-full" @blur="updateProject(project)" @keydown.enter="updateProject(project)" :id="'project-input-' + project.id" />
            </div>
            <div class="flex gap-2">
              <button @click.stop="editProjectName(project)" class="text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">
                <i class="pi pi-pencil"></i>
              </button>
              <button @click.stop="deleteProject(project.id)" class="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-600">
                <i class="pi pi-trash"></i>
              </button>
            </div>
          </div>
          <div v-if="!(entities?.projects?.length > 0)" class="p-4 text-gray-500 dark:text-gray-400 text-center">
            No projects yet. Create one to start planning!
          </div>
        </div>
      </div>

      <!-- Main Area (Gantt Chart and LLM Input) -->
      <div class="flex-1 flex flex-col relative overflow-hidden">
        <div v-if="activeProject" class="flex-1 flex flex-col overflow-hidden">
          <div class="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <h3 v-if="!isEditingProjectName" class="text-xl font-semibold" :class="darkMode ? 'text-white' : 'text-gray-900'">{{ activeProject.data.name }}</h3>
                <input v-else v-model="projectName" type="text" class="text-xl font-semibold bg-transparent border border-gray-200 dark:border-gray-600 rounded p-1 w-full" :class="darkMode ? 'text-white' : 'text-gray-900'" @blur="saveProjectName" @keydown.enter="saveProjectName" />
                <button @click="openSummaryModal" class="text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">
                  <i class="pi pi-file-check"></i>
                </button>
              </div>
              <button @click="exportProject" class="py-1 px-3 bg-blue-500 dark:bg-blue-400 hover:bg-blue-600 text-white rounded-lg transition-all">
                Export Project (JSON)
              </button>
            </div>
            <p v-if="!isEditingDescription" @click="isEditingDescription = true" class="text-gray-600 dark:text-gray-300 mt-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded">{{ activeProject.data.description || 'No description provided.' }}</p>
            <textarea v-else v-model="projectDescription" class="w-full p-1 bg-transparent border border-gray-200 dark:border-gray-600 rounded text-gray-600 dark:text-gray-300" @blur="saveProjectDescription" @keydown.enter="saveProjectDescription"></textarea>
            <div class="flex gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
              <span v-if="!isEditingBudget" @click="isEditingBudget = true" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded">Budget: {{ activeProject.data.budget ? '$' + activeProject.data.budget.toLocaleString() : 'N/A' }}</span>
              <input v-else v-model="projectBudget" type="number" class="bg-transparent border border-gray-200 dark:border-gray-600 rounded p-1 text-gray-500 dark:text-gray-400" @blur="saveProjectBudget" @keydown.enter="saveProjectBudget" />
              <span v-if="!isEditingOutcomes" @click="isEditingOutcomes = true" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded">Outcomes: {{ activeProject.data.outcomes || 'N/A' }}</span>
              <input v-else v-model="projectOutcomes" type="text" class="bg-transparent border border-gray-200 dark:border-gray-600 rounded p-1 text-gray-500 dark:text-gray-400" @blur="saveProjectOutcomes" @keydown.enter="saveProjectOutcomes" />
            </div>
          </div>
          <div class="flex-1 overflow-y-auto overflow-x-hidden">
            <gantt :project="activeProject" :activities="projectActivities" :dependencies="projectDependencies" :darkMode="darkMode" :key="ganttKey" ref="gantt" @clear-selections="handleClearSelections" @activity-changed="handleActivityChanged" />
          </div>
        </div>
        <div v-else class="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
          Select a project to view its Gantt chart.
        </div>
        <div v-if="activeProject" class="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div class="flex gap-3 items-center">
            <textarea v-model="draft" rows="2" class="flex-1 p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all resize-none whitespace-pre-wrap" :placeholder="inputPlaceholder" @keydown.enter="handleEnterKey"></textarea>
            <button @click="sendMessage" class="py-2 px-4 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 text-white rounded-lg transition-all flex items-center" :disabled="!draft?.trim() || !selectedModel || !activeProjectId || isSending">
              <span v-if="!isSending">Generate</span>
              <span v-else class="flex items-center">
                <svg class="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
                Generating...
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- Chat Sidebar (Right) -->
      <div class="border-l border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300" :class="isChatOpen ? 'w-1/4' : 'w-12'">
        <div class="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
          <h3 v-if="isChatOpen" class="text-lg font-semibold" :class="darkMode ? 'text-white' : 'text-gray-900'">Chat</h3>
          <button @click="toggleChat" class="text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">
            <i :class="isChatOpen ? 'pi pi-chevron-right' : 'pi pi-chevron-left'"></i>
          </button>
        </div>
        <div v-if="isChatOpen" class="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
          <div v-if="activeProject" class="flex-1 overflow-y-auto p-4" style = "max-height:500px">
            <div
              v-for="chat in projectChats"
              :key="chat.id"
              class="mb-2 p-2 rounded-lg "
              :class="chat.data.isResponse ? 'bg-gray-100 dark:bg-gray-800 mr-auto' : 'bg-gray-100 dark:bg-gray-700 ml-auto'"
            >
              <div class="flex items-center mb-1">
                <span class="font-semibold" :class="darkMode ? 'text-white' : 'text-gray-900'">
                  {{ chat.data.userName || 'User' }}
                </span>
                <span class="text-xs text-gray-500 dark:text-gray-400 ml-2">
                  {{ formatTime(chat.timestamp) }}
                </span>
              </div>
              <div class="text-sm" :class="darkMode ? 'text-gray-200' : 'text-gray-800'" v-html="renderMarkdown(chat.data.text)"></div>
            </div>
            <div v-if="!projectChats?.length" class="text-gray-500 dark:text-gray-400 text-sm text-center">
              No chat messages yet.
            </div>
          </div>
          <div class="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div class="flex gap-3">
              <textarea v-model="chatDraft" rows="1" class="flex-1 p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all resize-none whitespace-pre-wrap" placeholder="Chat with team members..." @keydown.enter="sendChatMessage"></textarea>
              <button @click="sendChatMessage" class="py-2 px-4 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 text-white rounded-lg transition-all" :disabled="!chatDraft?.trim() || !activeProjectId">
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  setup(props) {
    const { entities } = useGlobal();
    const { addEntity, updateEntity, removeEntity } = useHistory();
    const { triggerLLM, userUuid, displayName } = useRealTime();
    const { models } = useModels();
    const activeProjectId = Vue.ref(null);
    const selectedModel = Vue.ref(models.value.length > 0 ? models.value[0].model : '');
    const draft = Vue.ref('');
    const chatDraft = Vue.ref('');
    const isSending = Vue.ref(false);
    const isEditingProject = Vue.ref(null);
    const isEditingProjectName = Vue.ref(false);
    const isEditingDescription = Vue.ref(false);
    const isEditingBudget = Vue.ref(false);
    const isEditingOutcomes = Vue.ref(false);
    const projectName = Vue.ref('');
    const projectDescription = Vue.ref('');
    const projectBudget = Vue.ref(null);
    const projectOutcomes = Vue.ref('');
    const isChatOpen = Vue.ref(true);
    const isProjectsOpen = Vue.ref(true);
    const gantt = Vue.ref(null);
    const showSummaryModal = Vue.ref(false);
    const projectSummary = Vue.ref('');
    const isGeneratingSummary = Vue.ref(false);
    const selectedActivityIds = Vue.ref([]);
    const ganttKey = Vue.ref(0);

    const activeProject = Vue.computed(() => {
      return entities.value?.projects?.find(p => p.id === activeProjectId.value) || null;
    });

    const projectActivities = Vue.computed(() => {
      if (!activeProjectId.value) return [];
      const activities = entities.value?.activities || [];
      return activities
        .filter(a => a.data.project === activeProjectId.value)
        .sort((a, b) => new Date(a.data.startDate) - new Date(b.data.startDate));
    });

    const projectDependencies = Vue.computed(() => {
      if (!activeProjectId.value) return [];
      const dependencies = entities.value?.dependencies || [];
      return dependencies
        .filter(d => projectActivities.value.some(a => a.id === d.data.sourceId || a.id === d.data.targetId));
    });

    const projectChats = Vue.computed(() => {
      if (!activeProjectId.value) return [];
      const chats = entities.value?.chats || [];
      return chats
        .filter(c => c.data.project === activeProjectId.value)
        .sort((a, b) => a.timestamp - b.timestamp);
    });

    const inputPlaceholder = Vue.computed(() => {
      if (!activeProjectId.value) return 'Select a project to start planning...';
      if (selectedActivityIds.value.length > 0) {
        return 'Describe changes to selected activities or dependencies...';
      }
      return 'Describe your project, activities, or dependencies to generate a plan...';
    });

    Vue.watch(
      () => entities.value?.projects,
      (projects) => {
        if (projects?.length && !activeProjectId.value) {
          activeProjectId.value = projects[0].id;
        }
      },
      { immediate: true }
    );

    Vue.watch(
      () => activeProject.value,
      (newProject) => {
        if (newProject) {
          projectName.value = newProject.data.name;
          projectDescription.value = newProject.data.description || '';
          projectBudget.value = newProject.data.budget || null;
          projectOutcomes.value = newProject.data.outcomes || '';
          projectSummary.value = newProject.data.summary?.text || '';
        }
      },
      { immediate: true }
    );

    Vue.watch(
      () => models.value,
      (newModels) => {
        if (newModels?.length && !selectedModel.value) {
          selectedModel.value = newModels[0].model;
        }
      },
      { immediate: true }
    );

    function addProject() {
      const id = addEntity('projects', {
        name: `Project ${entities.value?.projects?.length + 1 || 1}`,
        description: '',
        budget: null,
        outcomes: '',
        summary: '',
        llmResponses: [],
        llmLastResponse: null,
      });
      activeProjectId.value = id;
      selectedActivityIds.value = [];
    }

    function selectProject(id) {
      activeProjectId.value = id;
      isEditingProject.value = null;
      selectedActivityIds.value = [];
    }

    function editProjectName(project) {
      isEditingProject.value = project.id;
      Vue.nextTick(() => {
        const input = document.querySelector(`#project-input-${project.id}`);
        if (input) input.focus();
      });
    }

    function updateProject(project) {
      updateEntity('projects', project.id, {
        ...project.data,
        name: project.data.name,
      });
      isEditingProject.value = null;
    }

    function deleteProject(id) {
      (entities.value?.activities || [])
        .filter(a => a.data.project === id)
        .forEach(a => removeEntity('activities', a.id));
      (entities.value?.dependencies || [])
        .filter(d => projectActivities.value.some(a => a.id === d.data.sourceId || a.id === d.data.targetId))
        .forEach(d => removeEntity('dependencies', d.id));
      (entities.value?.chats || [])
        .filter(c => c.data.project === id)
        .forEach(c => removeEntity('chats', c.id));
      removeEntity('projects', id);
      if (activeProjectId.value === id) {
        activeProjectId.value = entities.value?.projects?.[0]?.id || null;
      }
      selectedActivityIds.value = [];
    }

    function saveProjectName() {
      updateEntity('projects', activeProjectId.value, {
        ...activeProject.value.data,
        name: projectName.value,
      });
      isEditingProjectName.value = false;
    }

    function saveProjectDescription() {
      updateEntity('projects', activeProjectId.value, {
        ...activeProject.value.data,
        description: projectDescription.value,
      });
      isEditingDescription.value = false;
    }

    function saveProjectBudget() {
      updateEntity('projects', activeProjectId.value, {
        ...activeProject.value.data,
        budget: projectBudget.value ? parseFloat(projectBudget.value) : null,
      });
      isEditingBudget.value = false;
    }

    function saveProjectOutcomes() {
      updateEntity('projects', activeProjectId.value, {
        ...activeProject.value.data,
        outcomes: projectOutcomes.value,
      });
      isEditingOutcomes.value = false;
    }

    function openSummaryModal() {
      projectSummary.value = activeProject.value.data.summary?.text || '';
      showSummaryModal.value = true;
    }

    function closeSummaryModal() {
      showSummaryModal.value = false;
      projectSummary.value = '';
    }

    function saveSummary() {
      updateEntity('projects', activeProjectId.value, {
        ...activeProject.value.data,
        summary: { text: projectSummary.value, isStreaming: false, timestamp: Date.now() },
      });
      closeSummaryModal();
    }

    function copySummary() {
      navigator.clipboard.writeText(projectSummary.value).then(() => {
        console.log('Summary copied to clipboard');
      });
    }

    function generateSummary() {
      if (!activeProjectId.value || !selectedModel.value || isGeneratingSummary.value) return;
      isGeneratingSummary.value = true;

      updateEntity('projects', activeProjectId.value, {
        ...activeProject.value.data,
        llmLastResponse: { text: '', isStreaming: true, timestamp: Date.now() },
      });

      const messageHistory = [];
      messageHistory.push({
        role: 'user',
        content: `Current project: ${JSON.stringify(activeProject.value.data)}`,
      });
      if (projectActivities.value.length) {
        messageHistory.push({
          role: 'user',
          content: `Current activities: ${JSON.stringify(projectActivities.value.map(a => a.data))}`,
        });
      }
      if (projectDependencies.value.length) {
        messageHistory.push({
          role: 'user',
          content: `Current dependencies: ${JSON.stringify(projectDependencies.value.map(d => d.data))}`,
        });
      }

      messageHistory.push({
        role: 'user',
        content: `Read the entire selected project, its activities, and dependencies. Write a clear and comprehensive executive summary of the project, including the project team (owners) for the initiatives, the overall start and end dates, and the expected outcomes. Return the summary as plain text, no JSON or additional formatting.`,
      });

      const model = models.value.find(m => m.model === selectedModel.value) || {
        provider: 'xai',
        name: 'grok-3',
        model: 'grok-3',
      };

      try {
        triggerLLM('projects', activeProjectId.value, {
          provider: model.provider,
          name: model.name.en,
          model: model.model,
        }, 0.7, '', 'Generate project summary', messageHistory, true);
      } catch (error) {
        console.error('Error triggering LLM for summary:', error);
        isGeneratingSummary.value = false;
      }
    }

    function exportProject() {
      if (!activeProject.value) return;
      const exportData = {
        project: activeProject.value.data,
        activities: projectActivities.value.map(a => a.data),
        dependencies: projectDependencies.value.map(d => d.data),
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeProject.value.data.name}_export.json`;
      a.click();
      URL.revokeObjectURL(url);
    }

    function renderMarkdown(content) {
      if (!content) return '';
      try {
        const md = markdownit({
          html: true,
          breaks: true,
          linkify: true,
          typographer: true,
          highlight: (str, lang) => {
            const code = lang && hljs.getLanguage(lang)
              ? hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
              : md.utils.escapeHtml(str);
            const codeId = `code-${Math.random().toString(36).substr(2, 9)}`;
            return `<pre class="hljs relative"><code id="${codeId}">${code}</code><button class="copy-code-btn absolute top-2 right-2 text-gray-400 hover:text-gray-200 p-1" onclick="navigator.clipboard.writeText(document.getElementById('${codeId}').innerText).then(() => console.log('Code copied'))"><i class="pi pi-copy text-sm"></i></button></pre>`;
          },
        });
        return md.render(content);
      } catch (error) {
        console.error('Error in renderMarkdown:', error);
        return `<pre class="hljs"><code>${content}</code></pre>`;
      }
    }

    function formatTime(timestamp) {
      if (!timestamp) return '';
      return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function handleEnterKey(event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    }

    function sendChatMessage(event) {
      if (event?.key === 'Enter' && !event?.shiftKey) {
        event.preventDefault();
      }
      if (!chatDraft.value.trim() || !activeProjectId.value) return;
      addEntity('chats', {
        project: activeProjectId.value,
        text: chatDraft.value,
        userName: displayName.value,
        isResponse: false,
      });
      chatDraft.value = '';
    }

    function toggleChat() {
      isChatOpen.value = !isChatOpen.value;
    }

    function toggleProjects() {
      isProjectsOpen.value = !isProjectsOpen.value;
    }

    function handleClearSelections(selectedId) {
      if (selectedId) {
        selectedActivityIds.value = [selectedId];
      } else {
        selectedActivityIds.value = [];
      }
      if (gantt.value && typeof gantt.value.clearSelections === 'function') {
        gantt.value.clearSelections();
      }
    }

    function handleActivityChanged() {
      ganttKey.value += 1;
    }

    function sendMessage() {
      if (!draft.value.trim() || !selectedModel.value || !activeProjectId.value || isSending.value) return;
      isSending.value = true;

      const messageToSend = draft.value;
      draft.value = '';

      updateEntity('projects', activeProjectId.value, {
        ...activeProject.value.data,
        llmLastResponse: { text: '', isStreaming: true, timestamp: Date.now() },
      });

      const messageHistory = [];
      const selectedActivities = selectedActivityIds.value.length
        ? projectActivities.value.filter(a => selectedActivityIds.value.includes(a.id))
        : [];

      messageHistory.push({
        role: 'user',
        content: `Current project: ${JSON.stringify(activeProject.value.data)}`,
      });
      if (projectActivities.value.length) {
        messageHistory.push({
          role: 'user',
          content: `Current activities: ${JSON.stringify(projectActivities.value.map(a => a.data))}`,
        });
      }
      if (projectDependencies.value.length) {
        messageHistory.push({
          role: 'user',
          content: `Current dependencies: ${JSON.stringify(projectDependencies.value.map(d => d.data))}`,
        });
      }

      const jsonInstruction = selectedActivities.length
        ? `Based on the user's input, modify the selected activities or dependencies. Return a JSON object with:
- activitiesToAdd: Array of new activities ({name, startDate, endDate, owner, description})
- activitiesToUpdate: Array of updates for existing activities ({id, name, startDate, endDate, owner, description, status})
- activitiesToDelete: Array of activity IDs to delete
- dependenciesToAdd: Array of new dependencies ({sourceId, targetId, dependencyType})
- dependenciesToUpdate: Array of updates for existing dependencies ({id, sourceId, targetId, dependencyType})
- dependenciesToDelete: Array of dependency IDs to delete
Dates must be in ISO format (YYYY-MM-DD). Dependency types are FS, FF, SS, SF. Only modify the selected activities: ${JSON.stringify(selectedActivities.map(a => a.data))}. Return ONLY JSON, no additional text.`
        : `Based on the user's input, generate or modify a project plan. Return a JSON object with:
- project: Optional project details ({name, description, outcomes, budget})
- activities: Array of activities ({name, startDate, endDate, owner, description})
- dependencies: Array of dependencies ({sourceId, targetId, dependencyType})
Dates must be in ISO format (YYYY-MM-DD). Dependency types are FS, FF, SS, SF. Use activity names as temporary IDs for dependencies; they will be mapped to actual IDs. Return ONLY JSON, no additional text.`;

      messageHistory.push({
        role: 'user',
        content: `${messageToSend}\n\n${jsonInstruction}`,
      });

      const model = models.value.find(m => m.model === selectedModel.value) || {
        provider: 'xai',
        name: 'grok-3',
        model: 'grok-3',
      };
      try {
        triggerLLM('projects', activeProjectId.value, {
          provider: model.provider,
          name: model.name.en,
          model: model.model,
        }, 0.7, '', messageToSend, messageHistory, true);
      } catch (error) {
        console.error('Error triggering LLM:', error);
        const llmResponses = activeProject.value.data.llmResponses || [];
        llmResponses.push({
          text: 'Error: Unable to get response',
          isStreaming: false,
          timestamp: Date.now(),
        });
        updateEntity('projects', activeProjectId.value, {
          ...activeProject.value.data,
          llmResponses,
          llmLastResponse: null,
        });
        isSending.value = false;
      }
    }

    function handleLLMDraft(eventObj) {
      if (eventObj.data.entityType !== 'projects' || !activeProject.value || eventObj.id !== activeProjectId.value) return;
      const currentResponse = activeProject.value.data.llmLastResponse || { text: '', isStreaming: true, timestamp: Date.now() };
      const updatedText = (currentResponse.text || '') + eventObj.data.content;
      updateEntity('projects', activeProjectId.value, {
        ...activeProject.value.data,
        llmLastResponse: {
          ...currentResponse,
          text: updatedText,
          isStreaming: true,
        },
      });
      if (!eventObj.data.content.startsWith('```json')) {
        projectSummary.value = updatedText;
      }
    }

    function handleLLMEnd(eventObj) {
      if (eventObj.data.entityType !== 'projects' || !activeProject.value || eventObj.id !== activeProjectId.value) return;
      const currentResponse = activeProject.value.data.llmLastResponse;
      if (!currentResponse) {
        isSending.value = false;
        isGeneratingSummary.value = false;
        return;
      }

      let responseText = currentResponse.text || '';
      const llmResponses = activeProject.value.data.llmResponses || [];
      const newResponse = {
        text: responseText,
        isStreaming: false,
        timestamp: currentResponse.timestamp,
      };
      llmResponses.push(newResponse);

      if (responseText.startsWith('```json')) {
        responseText = responseText.replace(/```json\n|\n```/g, '').trim();
        try {
          const parsed = JSON5.parse(responseText);

          if (parsed.project) {
            updateEntity('projects', activeProjectId.value, {
              ...activeProject.value.data,
              ...parsed.project,
              llmResponses,
              llmLastResponse: null,
            });
            activeProject.value.data = {
              ...activeProject.value.data,
              ...parsed.project,
              llmResponses,
              llmLastResponse: null,
            };
          } else {
            updateEntity('projects', activeProjectId.value, {
              ...activeProject.value.data,
              llmResponses,
              llmLastResponse: null,
            });
            activeProject.value.data.llmResponses = llmResponses;
            activeProject.value.data.llmLastResponse = null;
          }

          const activityIdMapping = {};
          const tempActivities = [];

          if (parsed.activities) {
            parsed.activities.forEach((act, index) => {
              const newId = addEntity('activities', {
                project: activeProjectId.value,
                ...act,
              });
              tempActivities.push({ id: newId, name: act.name, originalIndex: index });
              activityIdMapping[index] = newId;
              if (act.name) activityIdMapping[act.name] = newId;
            });
          }

          if (parsed.activitiesToAdd) {
            parsed.activitiesToAdd.forEach((act, index) => {
              const newId = addEntity('activities', {
                project: activeProjectId.value,
                ...act,
              });
              tempActivities.push({ id: newId, name: act.name, originalIndex: index + (parsed.activities ? parsed.activities.length : 0) });
              activityIdMapping[index + (parsed.activities ? parsed.activities.length : 0)] = newId;
              if (act.name) activityIdMapping[act.name] = newId;
            });
          }

          if (parsed.activitiesToUpdate) {
            parsed.activitiesToUpdate.forEach(update => {
              const act = entities.value?.activities?.find(a => a.id === update.id);
              if (act) {
                updateEntity('activities', update.id, {
                  ...act.data,
                  ...update,
                });
                const index = entities.value?.activities?.findIndex(a => a.id === update.id) ?? -1;
                if (index !== -1) {
                  entities.value.activities[index] = {
                    ...entities.value.activities[index],
                    data: {
                      ...entities.value.activities[index].data,
                      ...update,
                    },
                  };
                }
              }
            });
          }

          if (parsed.activitiesToDelete) {
            parsed.activitiesToDelete.forEach(id => {
              if (entities.value?.activities?.some(a => a.id === id)) {
                removeEntity('activities', id);
                entities.value.activities = (entities.value?.activities || []).filter(a => a.id !== id);
              }
            });
          }

          if (parsed.dependencies) {
            parsed.dependencies.forEach(dep => {
              let sourceId = dep.sourceId;
              let targetId = dep.targetId;
              if (!isNaN(dep.sourceId)) sourceId = activityIdMapping[parseInt(dep.sourceId)];
              else if (typeof dep.sourceId === 'string') sourceId = activityIdMapping[dep.sourceId];
              if (!isNaN(dep.targetId)) targetId = activityIdMapping[parseInt(dep.targetId)];
              else if (typeof dep.targetId === 'string') targetId = activityIdMapping[dep.targetId];

              if (sourceId && targetId && sourceId !== targetId) {
                addEntity('dependencies', {
                  sourceId,
                  targetId,
                  dependencyType: dep.dependencyType,
                });
              }
            });
          }

          if (parsed.dependenciesToAdd) {
            parsed.dependenciesToAdd.forEach(dep => {
              let sourceId = dep.sourceId;
              let targetId = dep.targetId;
              if (!isNaN(dep.sourceId)) sourceId = activityIdMapping[parseInt(dep.sourceId)];
              else if (typeof dep.sourceId === 'string') sourceId = activityIdMapping[dep.sourceId];
              if (!isNaN(dep.targetId)) targetId = activityIdMapping[parseInt(dep.targetId)];
              else if (typeof dep.targetId === 'string') targetId = activityIdMapping[dep.targetId];

              if (sourceId && targetId && sourceId !== targetId) {
                addEntity('dependencies', {
                  sourceId,
                  targetId,
                  dependencyType: dep.dependencyType,
                });
              }
            });
          }

          if (parsed.dependenciesToUpdate) {
            parsed.dependenciesToUpdate.forEach(update => {
              const dep = entities.value?.dependencies?.find(d => d.id === update.id);
              if (dep) {
                let sourceId = update.sourceId;
                let targetId = update.targetId;
                if (!isNaN(update.sourceId)) sourceId = activityIdMapping[parseInt(update.sourceId)];
                else if (typeof update.sourceId === 'string') sourceId = activityIdMapping[update.sourceId];
                if (!isNaN(update.targetId)) targetId = activityIdMapping[parseInt(update.targetId)];
                else if (typeof update.targetId === 'string') targetId = activityIdMapping[update.targetId];

                if (sourceId && targetId && sourceId !== targetId) {
                  updateEntity('dependencies', update.id, {
                    ...dep.data,
                    sourceId,
                    targetId,
                    dependencyType: update.dependencyType,
                  });
                  const index = entities.value?.dependencies?.findIndex(d => d.id === update.id) ?? -1;
                  if (index !== -1) {
                    entities.value.dependencies[index] = {
                      ...entities.value.dependencies[index],
                      data: {
                        ...entities.value.dependencies[index].data,
                        sourceId,
                        targetId,
                        dependencyType: update.dependencyType,
                      },
                    };
                  }
                }
              }
            });
          }

          if (parsed.dependenciesToDelete) {
            parsed.dependenciesToDelete.forEach(id => {
              if (entities.value?.dependencies?.some(d => d.id === id)) {
                removeEntity('dependencies', id);
                entities.value.dependencies = (entities.value?.dependencies || []).filter(d => d.id !== id);
              }
            });
          }
        } catch (error) {
          console.error('Error parsing LLM response:', error);
          llmResponses[llmResponses.length - 1] = {
            ...llmResponses[llmResponses.length - 1],
            text: 'Error: Invalid JSON response',
            isStreaming: false,
          };
          updateEntity('projects', activeProjectId.value, {
            ...activeProject.value.data,
            llmResponses,
            llmLastResponse: null,
          });
        }
      } else {
        const lastResponse = llmResponses[llmResponses.length - 1];
        updateEntity('projects', activeProjectId.value, {
          ...activeProject.value.data,
          summary: lastResponse,
          llmResponses,
          llmLastResponse: null,
        });
        activeProject.value.data.summary = lastResponse;
        projectSummary.value = lastResponse.text;
      }

      isSending.value = false;
      isGeneratingSummary.value = false;
      selectedActivityIds.value = [];
      if (gantt.value && typeof gantt.value.clearSelections === 'function') {
        gantt.value.clearSelections();
      }
      ganttKey.value += 1;
    }

    const { on } = useRealTime();
    Vue.onMounted(() => {
      on('history-llm-draft', handleLLMDraft);
      on('history-llm-end', handleLLMEnd);
    });

    return {
      entities,
      activeProjectId,
      selectedModel,
      draft,
      chatDraft,
      isSending,
      isEditingProject,
      isEditingProjectName,
      isEditingDescription,
      isEditingBudget,
      isEditingOutcomes,
      projectName,
      projectDescription,
      projectBudget,
      projectOutcomes,
      activeProject,
      projectActivities,
      projectDependencies,
      projectChats,
      inputPlaceholder,
      isChatOpen,
      isProjectsOpen,
      gantt,
      models,
      showSummaryModal,
      projectSummary,
      isGeneratingSummary,
      selectedActivityIds,
      ganttKey,
      addProject,
      selectProject,
      editProjectName,
      updateProject,
      deleteProject,
      saveProjectName,
      saveProjectDescription,
      saveProjectBudget,
      saveProjectOutcomes,
      openSummaryModal,
      closeSummaryModal,
      saveSummary,
      copySummary,
      generateSummary,
      exportProject,
      renderMarkdown,
      formatTime,
      handleEnterKey,
      sendChatMessage,
      toggleChat,
      toggleProjects,
      handleClearSelections,
      handleActivityChanged,
      sendMessage,
    };
  },
};