
import { useRealTime } from '../composables/useRealTime.js';
import { useHistory } from '../composables/useHistory.js';
import { useModels } from '../composables/useModels.js';
import { useConfigs } from '../composables/useConfigs.js';


import Projects from './Projects.js';

export default {
  name: 'Landing',
  components: { Projects },
  props: {
    channelName: {
      type: String,
      default: null,
    },
    darkMode: {
      type: Boolean,
      default: false,
    },
  },
  template: `
    <div class="transition-colors duration-300">
      <!-- Navigation -->
      <div class="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-20 shadow-lg">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav class="flex justify-between items-center py-4">
            <div class="flex space-x-6 items-center">
              <button
                v-for="tab in tabs"
                :key="tab"
                @click="activeTab = tab"
                class="py-2 px-4 text-sm font-medium transition-colors rounded-lg"
                :class="activeTab === tab ? 'bg-blue-500 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-800'"
              >
                {{ tab }}
              </button>
            </div>
          </nav>
        </div>
      </div>

      <!-- Landing Tab Content -->
      <div v-if="activeTab === 'Landing'">
        <!-- Hero Section -->
        <header class="relative bg-gradient-to-br from-blue-700 via-teal-500 to-purple-600 text-white py-24 overflow-hidden">
          <div class="absolute inset-0 bg-black opacity-40"></div>
          <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
          <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 class="text-5xl sm:text-6xl font-extrabold mb-6 animate-fade-in-down">Revolutionize Your Project Management</h2>
            <p class="text-xl sm:text-2xl mb-8 font-light animate-fade-in-up">Plan, collaborate, and succeed with AI-powered Gantt charts and real-time teamwork.</p>
            <div class="flex justify-center space-x-4">
              <button @click="activeTab = 'Projects'" class="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-all shadow-lg animate-bounce">
                Start Planning Now
              </button>
              <button @click="scrollToFeatures" class="px-8 py-4 border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-all">
                Explore Features
              </button>
            </div>
          </div>
          <div class="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white dark:from-gray-900 to-transparent"></div>
        </header>

        <!-- Feature Spotlight Section -->
        <section ref="featuresSection" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-gray-50 dark:bg-gray-900">
          <h3 class="text-4xl font-bold mb-12 text-center text-gray-900 dark:text-white">Supercharge Your Projects</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div v-for="(feature, index) in features" :key="feature.title" class="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2 animate-fade-in" :style="{ animationDelay: index * 0.2 + 's' }">
              <div class="flex items-center mb-4">
                <i :class="feature.icon" class="text-3xl text-blue-500 mr-3"></i>
                <h4 class="text-xl font-semibold text-gray-900 dark:text-white">{{ feature.title }}</h4>
              </div>
              <p class="text-gray-600 dark:text-gray-300">{{ feature.description }}</p>
            </div>
          </div>
        </section>

        <!-- How It Works Section -->
        <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-white dark:bg-gray-900">
          <h3 class="text-4xl font-bold mb-12 text-center text-gray-900 dark:text-white">How IJustGantt Works</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div v-for="(step, index) in steps" :key="step.title" class="text-center">
              <div class="relative mb-6">
                <div class="absolute -top-4 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center text-xl font-bold">{{ index + 1 }}</div>
                <img :src="step.image" :alt="step.title" class="w-full h-48 object-cover rounded-lg shadow-md">
              </div>
              <h4 class="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{{ step.title }}</h4>
              <p class="text-gray-600 dark:text-gray-300">{{ step.description }}</p>
            </div>
          </div>
        </section>

        <!-- Interactive Demo Section -->
        <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-gray-100 dark:bg-gray-800">
          <h3 class="text-4xl font-bold mb-12 text-center text-gray-900 dark:text-white">Experience the Magic</h3>
          <div class="relative rounded-lg overflow-hidden shadow-2xl">
            <img src="./assets/gantt1.jpg" alt="Gantt Chart Demo" class="w-full">
            <div class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <button @click="activeTab = 'Projects'" class="px-8 py-4 bg-gradient-to-r from-blue-500 to-teal-400 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-teal-500 transition-all animate-pulse">
                Try Interactive Gantt Charts
              </button>
            </div>
          </div>
        </section>

        <!-- Testimonials Section -->
        <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-white dark:bg-gray-900">
          <h3 class="text-4xl font-bold mb-12 text-center text-gray-900 dark:text-white">What Our Users Say</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div v-for="testimonial in testimonials" :key="testimonial.name" class="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-md">
              <div class="flex items-center mb-4">
                <img :src="testimonial.avatar" :alt="testimonial.name" class="w-12 h-12 rounded-full mr-4">
                <div>
                  <h4 class="text-lg font-semibold text-gray-900 dark:text-white">{{ testimonial.name }}</h4>
                  <p class="text-sm text-gray-600 dark:text-gray-400">{{ testimonial.role }}</p>
                </div>
              </div>
              <p class="text-gray-600 dark:text-gray-300 italic">"{{ testimonial.quote }}"</p>
            </div>
          </div>
        </section>

        <!-- Pricing Teaser Section -->
        <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-gradient-to-r from-blue-600 to-teal-500 text-white text-center">
          <h3 class="text-4xl font-bold mb-6">Ready to Get Started?</h3>
          <p class="text-xl mb-8">Completely and always free!</p>
       
        </section>

        <!-- Footer -->
        <footer class="bg-gray-900 text-white py-12">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <h4 class="text-lg font-semibold mb-4">IJustGantt.com</h4>
                <p class="text-gray-400">AI-powered project planning. Always free. Always MIT.</p>
              </div>
              <div>
                <h4 class="text-lg font-semibold mb-4">Product</h4>
                <ul class="space-y-2">
                  <li><button click = "scrollToFeatures" class="text-gray-400 hover:text-white">Features</button></li>
                </ul>
              </div>
              <div>
                <h4 class="text-lg font-semibold mb-4">Follow Us</h4>
                <div class="flex space-x-4">
                  <a href="https://github.com/developmentation/ganttlive" class="text-gray-400 hover:text-white"><i class="pi pi-github text-xl"></i></a>
                </div>
              </div>
            </div>
            <div class="mt-8 text-center text-gray-400">
              <p>© 2025 Government of Alberta. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>

      <!-- Projects Tab Content -->
      <main v-else class="max-w-8xl mx-auto px-4 py-2">
        <projects :darkMode="darkMode" />
      </main>
    </div>
  `,
  setup(props) {
    const { env } = useConfigs();
    const { connect, disconnect, userUuid, displayName, channelName, isConnected, on } = useRealTime();
    const { gatherLocalHistory } = useHistory();
    const { fetchServerModels } = useModels();
    const router = VueRouter.useRouter();

    const activeTab = Vue.ref('Landing');
    const tabs = ['Landing', 'Projects'];
    const sessionReady = Vue.ref(false);
    const errorMessage = Vue.ref('');
    const featuresSection = Vue.ref(null);

    const features = [
      {
        title: 'Real-Time Collaboration',
        description: 'Sync with your team instantly using live updates for seamless project management.',
        icon: 'pi pi-users',
      },
      {
        title: 'AI-Driven Planning',
        description: 'Let AI generate and refine your project plans with intelligent insights.',
        icon: 'pi pi-cog',
      },
      {
        title: 'Interactive Gantt Charts',
        description: 'Visualize tasks, dependencies, and timelines with a dynamic interface.',
        icon: 'pi pi-chart-bar',
      },
      {
        title: 'Smart Project Summaries',
        description: 'Get AI-generated executive summaries to keep stakeholders informed.',
        icon: 'pi pi-file',
      },
      {
        title: 'Customizable Plans',
        description: 'Easily adjust budgets, outcomes, and dependencies to fit your needs.',
        icon: 'pi pi-sliders-h',
      },
      {
        title: 'Team Communication',
        description: 'Stay connected with built-in chat for effortless collaboration.',
        icon: 'pi pi-comments',
      },
    ];

    const steps = [
      {
        title: 'Create Your Project',
        description: 'Set up your project with goals, budgets, and timelines in just a few clicks.',
        image: './assets/gantt3.jpg',
      },
      {
        title: 'Collaborate in Real-Time',
        description: 'Work with your team live, with every change synced instantly.',
        image: './assets/gantt4.jpg',
      },
      {
        title: 'Track with Gantt Charts',
        description: 'Visualize progress and dependencies with interactive Gantt charts.',
        image: './assets/gantt5.jpg',
      },
    ];

    const testimonials = [
      {
        name: 'Janak Alford',
        role: 'Deputy Minister of Technology and Innovation',
        quote: 'I built it, so I think it is cool!',
        avatar: 'https://intelligentdigitalecosystems.com/images/author/JPEG/IMG_0859.jpg',
      }
    ];

    function scrollToFeatures() {
      featuresSection.value.scrollIntoView({ behavior: 'smooth' });
    }

    function copyLink() {
      const link = `${env.value.API_URL}/${channelName.value}`;
      navigator.clipboard.writeText(link).catch(err => {
        console.error('Clipboard API error:', err);
        errorMessage.value = 'Failed to copy link.';
      });
    }

    function isValidChannelName(name) {
      if (!name || typeof name !== 'string') return false;
      return /^[a-z0-9 _-]+$/.test(name);
    }

    function handleVisibilityChange() {
      if (!document.hidden && !isConnected.value && channelName.value && displayName.value) {
        if (!isValidChannelName(channelName.value)) {
          console.error('Invalid channel name on reconnect.');
          return;
        }
        connect(channelName.value, displayName.value);
      }
    }

    Vue.onMounted(() => {
      fetchServerModels();
      document.addEventListener('visibilitychange', handleVisibilityChange);
      if (props.channelName && isValidChannelName(props.channelName)) {
        channelName.value = props.channelName;
        displayName.value = `User ${Math.floor(Math.random() * 1000)}`;
        connect(props.channelName, displayName.value);
        sessionReady.value = true;
      } else {
        channelName.value = uuidv4();
        displayName.value = `User ${Math.floor(Math.random() * 1000)}`;
        if (isValidChannelName(channelName.value)) {
          router.push(`/${channelName.value}`);
          connect(channelName.value, displayName.value);
          sessionReady.value = true;
        } else {
          console.error('Generated invalid channel name.');
        }
      }
    });

    Vue.onUnmounted(() => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    });

    return {
      activeTab,
      tabs,
      features,
      steps,
      testimonials,
      featuresSection,
      scrollToFeatures,
      sessionReady,
      errorMessage,
      copyLink,
    };
  },
};