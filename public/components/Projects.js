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
      <!-- Projects Sidebar (Left) -->
      <div class="w-1/4 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <!-- Header -->
        <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-4 bg-gray-50 dark:bg-gray-900">
          <button
            @click="addProject"
            class="p-2 bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-sm"
          >
            <i class="pi pi-plus"></i>
          </button>
          <select
            v-model="selectedModel"
            class="flex-1 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all"
          >
            <option v-for="model in models" :key="model.model" :value="model.model">
              {{ model.name.en }} ({{ model.provider }})
            </option>
          </select>
        </div>

        <!-- Projects List -->
        <div class="flex-1 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
          <div
            v-for="project in entities?.projects || []"
            :key="project.id"
            class="p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-all"
            :class="{ 'bg-blue-50 dark:bg-blue-900': activeProjectId === project.id }"
            @click="selectProject(project.id)"
          >
            <div class="flex-1 truncate">
              <span v-if="isEditingProject !== project.id" class="text-gray-900 dark:text-white font-medium">
                {{ project.data.name }}
              </span>
              <input
                v-else
                v-model="project.data.name"
                type="text"
                class="bg-transparent text-gray-900 dark:text-white flex-1 outline-none font-medium w-full"
                @blur="updateProject(project)"
                @keypress.enter="updateProject(project)"
                :id="'project-input-' + project.id"
              />
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
      <div class="flex-1 flex flex-col relative">
        <!-- Project Details -->
        <div v-if="activeProject" class="flex flex-col h-full">
          <!-- Fixed Title and Export Button -->
          <div class="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <h3 v-if="!isEditingProjectName" @click="isEditingProjectName = true" class="text-xl font-semibold cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded" :class="darkMode ? 'text-white' : 'text-gray-900'">{{ activeProject.data.name }}</h3>
                <input
                  v-else
                  v-model="projectName"
                  type="text"
                  class="text-xl font-semibold bg-transparent border border-gray-200 dark:border-gray-600 rounded p-1 w-full"
                  :class="darkMode ? 'text-white' : 'text-gray-900'"
                  @blur="saveProjectName"
                  @keypress.enter="saveProjectName"
                />
              </div>
              <button @click="exportProject" class="py-1 px-3 bg-blue-500 dark:bg-blue-400 dark:hover:bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all">
                Export Project (JSON)
              </button>
            </div>
          </div>

          <!-- Non-Sticky Description and Details -->
          <div class="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <p v-if="!isEditingDescription" @click="isEditingDescription = true" class="text-gray-600 dark:text-gray-300 mt-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded">{{ activeProject.data.description || 'No description provided.' }}</p>
            <textarea
              v-else
              v-model="projectDescription"
              class="w-full p-1 bg-transparent border border-gray-200 dark:border-gray-600 rounded text-gray-600 dark:text-gray-300"
              @blur="saveProjectDescription"
              @keypress.enter="saveProjectDescription"
            ></textarea>
            <div class="flex gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
              <span v-if="!isEditingBudget" @click="isEditingBudget = true" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded">Budget: {{ activeProject.data.budget ? '$' + activeProject.data.budget.toLocaleString() : 'N/A' }}</span>
              <input
                v-else
                v-model="projectBudget"
                type="number"
                class="bg-transparent border border-gray-200 dark:border-gray-600 rounded p-1 text-gray-500 dark:text-gray-400"
                @blur="saveProjectBudget"
                @keypress.enter="saveProjectBudget"
              />
              <span v-if="!isEditingOutcomes" @click="isEditingOutcomes = true" class="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded">Outcomes: {{ activeProject.data.outcomes || 'N/A' }}</span>
              <input
                v-else
                v-model="projectOutcomes"
                type="text"
                class="bg-transparent border border-gray-200 dark:border-gray-600 rounded p-1 text-gray-500 dark:text-gray-400"
                @blur="saveProjectOutcomes"
                @keypress.enter="saveProjectOutcomes"
              />
            </div>
          </div>

          <!-- Gantt Chart -->
          <div class="flex-1">
            <gantt
              :project="activeProject"
              :activities="projectActivities"
              :darkMode="darkMode"
              :maxWidth="maxGanttWidth"
              ref="gantt"
              @clear-selections="clearSelections"
            />
          </div>

          <!-- Fixed LLM Input Bar -->
          <div class="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div class="flex gap-3 items-center">
              <textarea
                v-model="draft"
                rows="2"
                class="flex-1 p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all resize-none whitespace-pre-wrap"
                :placeholder="inputPlaceholder"
                @keypress.enter="handleEnterKey"
              ></textarea>
              <button
                @click="sendMessage"
                class="py-2 px-4 bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all flex items-center"
                :disabled="!draft?.trim() || !selectedModel || !activeProjectId || isSending"
              >
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

        <!-- No Project Selected -->
        <div v-else class="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
          Select a project to view its Gantt chart.
        </div>
      </div>

      <!-- Chat Sidebar (Right) -->
      <div class="border-l border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300" :class="isChatOpen ? 'w-1/4' : 'w-12'">
        <!-- Chat Header with Collapse Button -->
        <div class="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
          <h3 v-if="isChatOpen" class="text-lg font-semibold" :class="darkMode ? 'text-white' : 'text-gray-900'">Chat</h3>
          <button @click="toggleChat" class="text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">
            <i :class="isChatOpen ? 'pi pi-chevron-right' : 'pi pi-chevron-left'"></i>
          </button>
        </div>

        <!-- Chat Content -->
        <div v-if="isChatOpen" class="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
          <!-- Chat Messages -->
          <div v-if="activeProject" class="flex-1 overflow-y-auto p-4">
            <div
              v-for="chat in projectChats || []"
              :key="chat.id"
              class="mb-2 p-2 rounded-lg"
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
            <div v-if="!(projectChats?.length > 0)" class="text-gray-500 dark:text-gray-400 text-sm text-center">
              No chat messages yet.
            </div>
          </div>

          <!-- Chat Input -->
          <div class="p-4 border-t border-gray-200 dark:border-gray-700">
            <div class="flex gap-3">
              <textarea
                v-model="chatDraft"
                rows="1"
                class="flex-1 p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all resize-none whitespace-pre-wrap"
                placeholder="Chat with team members..."
                @keypress.enter="sendChatMessage"
              ></textarea>
              <button
                @click="sendChatMessage"
                class="py-2 px-4 bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
                :disabled="!chatDraft?.trim() || !activeProjectId"
              >
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
    const draft = Vue.ref(''); // For LLM input
    const chatDraft = Vue.ref(''); // For human chat
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
    const gantt = Vue.ref(null);
    const windowWidth = Vue.ref(window.innerWidth);
    const projectSidebarWidth = 0.25 * windowWidth.value; // 25% of window width
    const chatBarWidth = isChatOpen.value ? 0.25 * windowWidth.value : 48; // 25% when open, 48px when closed
    const maxGanttWidth = Vue.computed(() => windowWidth.value - projectSidebarWidth - chatBarWidth);

    // Update window width on resize
    Vue.onMounted(() => {
      window.addEventListener('resize', () => {
        windowWidth.value = window.innerWidth;
      });
    });

    // Update chat bar width when toggled
    Vue.watch(isChatOpen, (newValue) => {
      chatBarWidth.value = newValue ? 0.25 * windowWidth.value : 48;
    });

    // Computed properties
    const activeProject = Vue.computed(() => {
      console.log('Computing activeProject:', activeProjectId.value, entities.value?.projects);
      const project = entities.value?.projects?.find(p => p.id === activeProjectId.value);
      console.log('Found project:', project);
      return project || null;
    });

    const projectActivities = Vue.computed(() => {
      if (!activeProjectId.value) {
        console.log('No active project ID, returning empty activities');
        return [];
      }
      const activities = (entities.value.activities || [])
        .filter(a => a.data.project === activeProjectId.value)
        .sort((a, b) => new Date(a.data.startDate) - new Date(b.data.startDate));
      console.log('Project activities:', activities);
      return activities;
    });

    const projectChats = Vue.computed(() => {
      if (!activeProjectId.value) {
        console.log('No active project ID, returning empty chats');
        return [];
      }
      const chats = (entities.value.chats || [])
        .filter(c => c.data.project === activeProjectId.value)
        .sort((a, b) => a.timestamp - b.timestamp);
      console.log('Project chats:', chats);
      return chats;
    });

    const inputPlaceholder = Vue.computed(() => {
      if (!activeProjectId.value) return 'Select a project to start planning...';
      if (gantt.value?.selectedActivityIds?.length) {
        return 'Describe changes to selected activities (e.g., adjust dates, add dependencies)...';
      }
      return 'Describe your project or activities to generate a plan...';
    });

    // Watch for project changes
    Vue.watch(
      () => entities.value?.projects,
      (projects) => {
        console.log('Projects changed:', projects);
        if (projects?.length && !activeProjectId.value) {
          activeProjectId.value = projects[0].id;
          console.log('Auto-selected project ID:', activeProjectId.value);
        }
      },
      { immediate: true }
    );

    // Watch for active project changes to update editable fields
    Vue.watch(
      () => activeProject.value,
      (newProject) => {
        console.log('Active project changed:', newProject);
        if (newProject) {
          projectName.value = newProject.data.name;
          projectDescription.value = newProject.data.description || '';
          projectBudget.value = newProject.data.budget || null;
          projectOutcomes.value = newProject.data.outcomes || '';
        }
      },
      { immediate: true }
    );

    // Watch for model changes
    Vue.watch(
      () => models.value,
      (newModels) => {
        console.log('Models changed:', newModels);
        if (newModels?.length && !selectedModel.value) {
          selectedModel.value = newModels[0].model;
        }
      },
      { immediate: true }
    );

    // Project management
    function addProject() {
      console.log('Adding new project');
      const id = addEntity('projects', {
        name: `Project ${entities.value.projects.length + 1}`,
        description: '',
        budget: null,
        outcomes: '',
        llmResponses: [],
        llmLastResponse: null,
      });
      console.log('New project ID:', id);
      activeProjectId.value = id;
    }

    function selectProject(id) {
      console.log('Selecting project with ID:', id);
      activeProjectId.value = id;
      isEditingProject.value = null;
    }

    function editProjectName(project) {
      console.log('Editing project name:', project.id);
      isEditingProject.value = project.id;
      Vue.nextTick(() => {
        const input = document.querySelector(`#project-input-${project.id}`);
        if (input) input.focus();
      });
    }

    function updateProject(project) {
      console.log('Updating project:', project.id);
      updateEntity('projects', project.id, {
        ...project.data,
        name: project.data.name,
      });
      isEditingProject.value = null;
    }

    function deleteProject(id) {
      console.log('Deleting project:', id);
      entities.value.activities
        .filter(a => a.data.project === id)
        .forEach(a => removeEntity('activities', a.id));
      entities.value.chats
        .filter(c => c.data.project === id)
        .forEach(c => removeEntity('chats', c.id));
      removeEntity('projects', id);
      if (activeProjectId.value === id) {
        activeProjectId.value = entities.value.projects[0]?.id || null;
        console.log('Active project ID after deletion:', activeProjectId.value);
      }
    }

    // Inline editing for project details
    function saveProjectName() {
      console.log('Saving project name:', projectName.value);
      updateEntity('projects', activeProjectId.value, {
        ...activeProject.value.data,
        name: projectName.value,
      });
      isEditingProjectName.value = false;
    }

    function saveProjectDescription() {
      console.log('Saving project description:', projectDescription.value);
      updateEntity('projects', activeProjectId.value, {
        ...activeProject.value.data,
        description: projectDescription.value,
      });
      isEditingDescription.value = false;
    }

    function saveProjectBudget() {
      console.log('Saving project budget:', projectBudget.value);
      updateEntity('projects', activeProjectId.value, {
        ...activeProject.value.data,
        budget: projectBudget.value ? parseFloat(projectBudget.value) : null,
      });
      isEditingBudget.value = false;
    }

    function saveProjectOutcomes() {
      console.log('Saving project outcomes:', projectOutcomes.value);
      updateEntity('projects', activeProjectId.value, {
        ...activeProject.value.data,
        outcomes: projectOutcomes.value,
      });
      isEditingOutcomes.value = false;
    }

    // Export project as JSON
    function exportProject() {
      if (!activeProject.value) return;
      console.log('Exporting project:', activeProject.value.data.name);
      const exportData = {
        project: activeProject.value.data,
        activities: projectActivities.value.map(a => a.data),
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeProject.value.data.name}_export.json`;
      a.click();
      URL.revokeObjectURL(url);
    }

    // Markdown rendering
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

    // Format timestamp
    function formatTime(timestamp) {
      if (!timestamp) return '';
      return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Handle Enter key for LLM input
    function handleEnterKey(event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    }

    // Send human-to-human chat message
    function sendChatMessage(event) {
      if (event?.key === 'Enter' && !event?.shiftKey) {
        event.preventDefault();
      }
      if (!chatDraft.value.trim() || !activeProjectId.value) {
        console.log('Cannot send chat message:', { chatDraft: chatDraft.value, activeProjectId: activeProjectId.value });
        return;
      }

      console.log('Sending chat message:', chatDraft.value);
      addEntity('chats', {
        project: activeProjectId.value,
        text: chatDraft.value,
        userName: displayName.value,
        isResponse: false,
      });

      chatDraft.value = '';
    }

    // Toggle chat sidebar
    function toggleChat() {
      console.log('Toggling chat sidebar, current state:', isChatOpen.value);
      isChatOpen.value = !isChatOpen.value;
      console.log('Chat sidebar state after toggle:', isChatOpen.value);
    }

    // Send message to LLM
    function sendMessage() {
      if (!draft.value.trim() || !selectedModel.value || !activeProjectId.value || isSending.value) {
        console.log('Cannot send message:', { draft: draft.value, selectedModel: selectedModel.value, activeProjectId: activeProjectId.value, isSending: isSending.value });
        return;
      }
      isSending.value = true;
      console.log('Sending LLM message:', draft.value);

      // Initialize llmLastResponse
      updateEntity('projects', activeProjectId.value, {
        ...activeProject.value.data,
        llmLastResponse: { text: '', isStreaming: true, timestamp: Date.now() },
      });

      // Build message history
      const messageHistory = [];
      const selectedActivities = gantt.value?.selectedActivityIds?.length
        ? projectActivities.value.filter(a => gantt.value.selectedActivityIds.includes(a.id))
        : [];

      // Add context about the project and activities
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

      // Add JSON instruction based on selection
      const jsonInstruction = selectedActivities.length
        ? `Based on the user's input, modify the selected activities. Return a JSON object with:
- activitiesToAdd: Array of new activities ({name, startDate, endDate, owner, dependencies: [{dependencyId, dependencyType}]})
- activitiesToUpdate: Array of updates for existing activities ({id, name, startDate, endDate, owner, dependencies, status})
- activitiesToDelete: Array of activity IDs to delete
Dates must be in ISO format (YYYY-MM-DD). Dependency types are FS, FF, SS, SF. Only modify the selected activities: ${JSON.stringify(selectedActivities.map(a => a.data))}. Return ONLY JSON, no additional text.`
        : `Based on the user's input, generate or modify a project plan. Return a JSON object with:
- project: Optional project details ({name, description, outcomes, budget})
- activities: Array of activities ({name, startDate, endDate, owner, dependencies: [{dependencyId, dependencyType}]})
Dates must be in ISO format (YYYY-MM-DD). Dependency types are FS, FF, SS, SF. Return ONLY JSON, no additional text.`;

      // Add user input with JSON instruction
      messageHistory.push({
        role: 'user',
        content: `${draft.value}\n\n${jsonInstruction}`,
      });

      // Trigger LLM with the correct project ID
      const model = models.value.find(m => m.model === selectedModel.value) || {
        provider: 'xai',
        name: 'grok-3',
        model: 'grok-3',
      };
      try {
        console.log('Triggering LLM with project ID:', activeProjectId.value);
        triggerLLM('projects', activeProjectId.value, {
          provider: model.provider,
          name: model.name.en,
          model: model.model,
        }, 0.7, '', draft.value, messageHistory, true);
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

    // Handle LLM draft
    function handleLLMDraft(eventObj) {
      if (eventObj.data.entityType !== 'projects' || !activeProject.value || eventObj.id !== activeProjectId.value) return;

      console.log('Handling LLM draft for project:', activeProjectId.value);
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
    }

    // Handle LLM end
    function handleLLMEnd(eventObj) {
      if (eventObj.data.entityType !== 'projects' || !activeProject.value || eventObj.id !== activeProjectId.value) return;

      console.log('Handling LLM end for project:', activeProjectId.value);
      const currentResponse = activeProject.value.data.llmLastResponse;
      if (!currentResponse) return;

      let responseText = currentResponse.text || '';
      responseText = responseText.replace(/```json\n|\n```/g, '').trim();
      const llmResponses = activeProject.value.data.llmResponses || [];
      llmResponses.push({
        text: responseText,
        isStreaming: false,
        timestamp: currentResponse.timestamp,
      });

      try {
        const parsed = JSON5.parse(responseText);
        console.log('Parsed LLM response:', parsed);

        // Update project details
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

        // Handle activities
        if (parsed.activities) {
          parsed.activities.forEach(act => {
            console.log('Adding activity:', act);
            addEntity('activities', {
              project: activeProjectId.value,
              ...act,
            });
          });
        }
        if (parsed.activitiesToAdd) {
          parsed.activitiesToAdd.forEach(act => {
            console.log('Adding activity from activitiesToAdd:', act);
            addEntity('activities', {
              project: activeProjectId.value,
              ...act,
            });
          });
        }
        if (parsed.activitiesToUpdate) {
          parsed.activitiesToUpdate.forEach(update => {
            const act = entities.value.activities.find(a => a.id === update.id);
            if (act) {
              console.log('Updating activity:', update);
              updateEntity('activities', update.id, {
                ...act.data,
                ...update,
              });
              // Update entities.value.activities to trigger reactivity
              const index = entities.value.activities.findIndex(a => a.id === update.id);
              if (index !== -1) {
                entities.value.activities[index] = {
                  ...entities.value.activities[index],
                  data: {
                    ...entities.value.activities[index].data,
                    ...update,
                  },
                };
              }
            } else {
              console.warn('Activity not found for update:', update.id);
            }
          });
        }
        if (parsed.activitiesToDelete) {
          parsed.activitiesToDelete.forEach(id => {
            if (entities.value.activities.some(a => a.id === id)) {
              console.log('Deleting activity:', id);
              removeEntity('activities', id);
              // Update entities.value.activities to trigger reactivity
              entities.value.activities = entities.value.activities.filter(a => a.id !== id);
            }
          });
        }

        // Add sample dependency for testing (temporary)
        const permittingActivity = entities.value.activities.find(a => a.data.name === "Secure Permits and Licenses" && a.data.project === activeProjectId.value);
        const constructionActivity = entities.value.activities.find(a => a.data.name === "Shop Construction and Renovation" && a.data.project === activeProjectId.value);
        if (permittingActivity && constructionActivity) {
          updateEntity('activities', constructionActivity.id, {
            ...constructionActivity.data,
            dependencies: [{ dependencyId: permittingActivity.id, dependencyType: "FS" }],
          });
          const index = entities.value.activities.findIndex(a => a.id === constructionActivity.id);
          if (index !== -1) {
            entities.value.activities[index] = {
              ...entities.value.activities[index],
              data: {
                ...entities.value.activities[index].data,
                dependencies: [{ dependencyId: permittingActivity.id, dependencyType: "FS" }],
              },
            };
          }
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

      // Clear selections after LLM response
      if (gantt.value) {
        gantt.value.clearSelections();
      }

      isSending.value = false;
    }

    // Clear selections in Gantt
    function clearSelections() {
      if (gantt.value) {
        gantt.value.clearSelections();
      }
    }

    // Register LLM event handlers
    const { on } = useRealTime();
    Vue.onMounted(() => {
      console.log('Projects component mounted');
      console.log('Initial entities:', entities.value);
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
      projectChats,
      inputPlaceholder,
      isChatOpen,
      gantt,
      models,
      maxGanttWidth,
      addProject,
      selectProject,
      editProjectName,
      updateProject,
      deleteProject,
      saveProjectName,
      saveProjectDescription,
      saveProjectBudget,
      saveProjectOutcomes,
      exportProject,
      renderMarkdown,
      formatTime,
      handleEnterKey,
      sendChatMessage,
      toggleChat,
      sendMessage,
      clearSelections,
    };
  },
};