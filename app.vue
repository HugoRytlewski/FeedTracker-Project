<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import Navbar from '/components/Layouts/NavBar.vue';
import Footer from '/components/Layouts/Footer.vue';
import Wait from '/components/Layouts/Wait.vue';
import cheerio from 'cheerio';
import { useWindowScroll } from "@vueuse/core";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "FeedTracker",
  "url": "https://feed-beryl.vercel.app",
  "description": "Votre veille d'informations personnalisée sur la cybersécurité, le développement web et l'actualité tech.",
  "publisher": {
    "@type": "Person",
    "name": "Hugo Rytlewski"
  }
};

useHead({
  htmlAttrs: {
    lang: 'fr'
  },
  
  title: 'FeedTracker | Veille Tech & Cybersécurité',

  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    
    { name: 'description', content: "FeedTracker, votre veille d'informations personnalisée. Suivez l'actualité de la cybersécurité, du développement web et de la tech en temps réel." },
    
    { name: 'keywords', content: 'veille, info, cybersécurité, développement web, rss, actualités, feedtracker' },
    
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: 'https://feed-beryl.vercel.app' },
    { property: 'og:title', content: 'FeedTracker | Veille Tech & Cybersécurité' },
    { property: 'og:description', content: "Suivez l'actualité de la cybersécurité, du développement web et de la tech en temps réel." },
    { property: 'og:image', content: 'https://feed-beryl.vercel.app/og-image.png' }, 

    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:url', content: 'https://feed-beryl.vercel.app' },
    { name: 'twitter:title', content: 'FeedTracker | Veille Tech & Cybersécurité' },
    { name: 'twitter:description', content: "Suivez l'actualité de la cybersécurité, du développement web et de la tech en temps réel." },
    { name: 'twitter:image', content: 'https://feed-beryl.vercel.app/og-image.png' },
  ],

  link: [
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
    { rel: 'canonical', href: 'https://feed-beryl.vercel.app' }
  ],

  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify(structuredData)
    }
  ]
});
const articles = ref([]);
const waitLoadRss = ref(true);
const selectedCategory = ref('Toutes');
const searchQuery = ref('');
const ARTICLES_PER_PAGE = 12;
const limiteArticles = ref(ARTICLES_PER_PAGE);
const { y } = useWindowScroll();

const fluxRssList = [
  { "id": 3, "name": "Threatpost", "url":"https://threatpost.com/feed/", "category": "Cybersécurité" },
  { "id": 4, "name": "Krebs on Security", "url":"https://krebsonsecurity.com/feed/", "category": "Cybersécurité" },
  { "id": 5, "name": "Smashing Magazine", "url":"https://www.smashingmagazine.com/feed/", "category": "Développement Web" },
  { "id": 6, "name": "CyberVeiile", "url":"https://cyberveille.curated.co/issues.rss", "category": "Cybersécurité" },
  { "id": 7, "name": "RFI", "url":"https://www.rfi.fr/fr/tag/cybercriminalité/rss", "category": "Actualités Cyber" },
  { "id": 8, "name": "Le Monde", "url":"https://www.lemonde.fr/piratage/rss_full.xml", "category": "Actualités Cyber" },
  { "id": 9, "name": "CERT-FR", "url": "https://www.cert.ssi.gouv.fr/feed/", "category": "Cybersécurité" },
  { "id": 10, "name": "The Hacker News", "url": "https://feeds.feedburner.com/TheHackersNews", "category": "Cybersécurité" },
  { "id": 11, "name": "ZDNet Sécurité", "url": "https://www.zdnet.fr/feeds/rss/securite/", "category": "Cybersécurité" },
];

const favorites = ref([]);
const readArticles = ref(new Set());
const showOnlyUnread = ref(false);
const layout = ref('grid');
const currentView = ref('all');

onMounted(() => {
  favorites.value = JSON.parse(localStorage.getItem('favorites') || '[]');
  readArticles.value = new Set(JSON.parse(localStorage.getItem('readArticles') || '[]'));
  layout.value = localStorage.getItem('layout') || 'grid';
  if (articles.value.length === 0) {
    fetchAndProcessArticles(fluxRssList);
  }
});

const categories = computed(() => {
  const allCategories = fluxRssList.map(item => item.category);
  return ['Toutes', ...new Set(allCategories)];
});

const filteredArticles = computed(() => {
  let articlesToFilter = currentView.value === 'favorites' ? favorites.value : articles.value;
  if (selectedCategory.value !== 'Toutes') {
    articlesToFilter = articlesToFilter.filter(article => article.category === selectedCategory.value);
  }
  if (searchQuery.value.trim() !== '') {
    const lowerCaseQuery = searchQuery.value.toLowerCase();
    articlesToFilter = articlesToFilter.filter(article =>
      article.title.toLowerCase().includes(lowerCaseQuery) ||
      article.description.toLowerCase().includes(lowerCaseQuery)
    );
  }
  if (showOnlyUnread.value) {
      articlesToFilter = articlesToFilter.filter(article => !readArticles.value.has(article.link));
  }
  return articlesToFilter;
});

async function fetchAndProcessArticles(feeds) {
  articles.value = [];
  waitLoadRss.value = true;
  try {
    const fetchPromises = feeds.map(feed =>
      useFetch('/api/rss', { params: { url: feed.url } })
        .then(({ data, error }) => {
          if (error.value) return null;
          return { data: data.value, category: feed.category, sourceName: feed.name };
        })
    );
    const results = await Promise.all(fetchPromises);
    results.forEach(result => {
      if (result) {
        parseAndSetRssFeed(result.data, result.category, result.sourceName);
      }
    });
    articles.value.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  } finally {
    waitLoadRss.value = false;
  }
}

async function parseAndSetRssFeed(dataFeed, category, sourceName) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(dataFeed, 'text/xml');
  const items = Array.from(xml.getElementsByTagName('item'));
  for (const item of items.slice(0, 15)) {
    const title = item.querySelector('title')?.textContent || 'Titre non disponible';
    const link = item.querySelector('link')?.textContent;
    if (!link) {
      continue;
    }
    const pubDate = item.querySelector("pubDate")?.textContent;
    const descriptionHTML = item.querySelector('description')?.textContent;
    const $ = cheerio.load(descriptionHTML || '');
    const description = $.text();
    let img = extractImage(item, $);
    if (!await isImageValid(img)) {
       const contentEncoded = item.getElementsByTagNameNS('*', 'encoded')[0]?.textContent;
       img = extractImageSourceFromContent(contentEncoded) || '';
    }
    articles.value.push({ title, link, description, img, pubDate, category, sourceName });
  }
}

function extractImage(item, cheerioInstance) {
    const mediaContent = item.querySelector('media\\:content, content');
    if (mediaContent) return mediaContent.getAttribute('url');
    const mediaThumbnail = item.querySelector('media\\:thumbnail, thumbnail');
    if (mediaThumbnail) return mediaThumbnail.getAttribute('url');
    const enclosure = item.querySelector('enclosure');
    if (enclosure && enclosure.getAttribute('type').startsWith('image')) return enclosure.getAttribute('url');
    const imgTag = cheerioInstance('img');
    if (imgTag.length > 0) return imgTag.attr('src');
    return '';
}

function extractImageSourceFromContent(content) {
  if (!content) return '';
  const match = /<img.*?src="(.*?)"/.exec(content);
  return match?.[1] || '';
}

async function isImageValid(url) {
  if (!url) return false;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

function incrementlimiteArticles() {
  limiteArticles.value += ARTICLES_PER_PAGE;
}

function scrollTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toggleFavorite(article) {
  const index = favorites.value.findIndex(fav => fav.link === article.link);
  if (index === -1) {
    favorites.value.push(article);
  } else {
    favorites.value.splice(index, 1);
  }
  localStorage.setItem('favorites', JSON.stringify(favorites.value));
}

function isFavorite(article) {
  return favorites.value.some(fav => fav.link === article.link);
}

function markAsRead(link) {
  readArticles.value.add(link);
  localStorage.setItem('readArticles', JSON.stringify(Array.from(readArticles.value)));
}

function setLayout(newLayout) {
  layout.value = newLayout;
  localStorage.setItem('layout', newLayout);
}

function setView(view) {
    currentView.value = view;
    selectedCategory.value = 'Toutes';
    searchQuery.value = '';
}

watch([selectedCategory, searchQuery, showOnlyUnread, currentView], () => {
  limiteArticles.value = ARTICLES_PER_PAGE;
  scrollTop();
});
</script>

<template>
  <Wait class="hidden md:grid" v-if="waitLoadRss"/>
  <Navbar/>
  <main class="p-6 md:p-10 lg:px-24 mt-24" id="accueil">
    <h1 class="sr-only">Flux d'actualités FeedTracker</h1>

    <div role="tablist" aria-label="Navigation des articles" class="flex justify-center border-b border-neutral-800 mb-8">
        <button role="tab" :aria-selected="currentView === 'all'" @click="setView('all')" :class="currentView === 'all' ? 'border-sky-500 text-white' : 'border-transparent text-neutral-400 hover:text-white'" class="px-4 py-2 font-semibold border-b-2 transition-colors duration-300">
            Tous les articles
        </button>
        <button role="tab" :aria-selected="currentView === 'favorites'" @click="setView('favorites')" :class="currentView === 'favorites' ? 'border-sky-500 text-white' : 'border-transparent text-neutral-400 hover:text-white'" class="px-4 py-2 font-semibold border-b-2 transition-colors duration-300">
            Mes favoris <span class="sr-only">, actuellement {{ favorites.length }}</span>
            <span aria-hidden="true">({{ favorites.length }})</span>
        </button>
    </div>

    <section aria-labelledby="filters-heading" class="flex flex-col md:flex-row items-center justify-between gap-4 mb-10 p-4 bg-neutral-900/50 rounded-lg border border-neutral-800">
      <h2 id="filters-heading" class="sr-only">Filtres des articles</h2>
      <div class="flex flex-col sm:flex-row items-center gap-4 w-full">
        <label for="search-input" class="sr-only">Rechercher un article</label>
        <input id="search-input" type="text" v-model="searchQuery" placeholder="Rechercher..." class="bg-neutral-800 text-white px-4 py-2 rounded-md w-full sm:w-60 border border-neutral-700 focus:ring-2 focus:ring-sky-500 focus:outline-none transition"/>
        <label v-if="currentView === 'all'" for="category-select" class="sr-only">Filtrer par catégorie</label>
        <select v-if="currentView === 'all'" id="category-select" v-model="selectedCategory" class="bg-neutral-800 text-white px-4 py-2 rounded-md w-full sm:w-auto border border-neutral-700 focus:ring-2 focus:ring-sky-500 focus:outline-none transition cursor-pointer">
            <option v-for="category in categories" :key="category" :value="category">{{ category }}</option>
        </select>
         <label for="show-unread" class="flex items-center gap-2 text-neutral-300 cursor-pointer select-none hover:text-white transition">
            <input type="checkbox" id="show-unread" v-model="showOnlyUnread" class="w-4 h-4 text-sky-600 bg-neutral-700 border-neutral-600 rounded focus:ring-sky-500 cursor-pointer">
            Masquer les lus
        </label>
      </div>

      <fieldset class="flex items-center gap-1 p-1 bg-neutral-800 rounded-md border border-neutral-700">
          <legend class="sr-only">Changer le mode d'affichage</legend>
          <button @click="setLayout('grid')" aria-label="Affichage en grille" :aria-pressed="layout === 'grid'" :class="layout === 'grid' ? 'bg-sky-600 text-white' : 'text-neutral-400 hover:bg-neutral-700'" class="p-1.5 rounded transition-colors">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
          </button>
          <button @click="setLayout('list')" aria-label="Affichage en liste" :aria-pressed="layout === 'list'" :class="layout === 'list' ? 'bg-sky-600 text-white' : 'text-neutral-400 hover:bg-neutral-700'" class="p-1.5 rounded transition-colors">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
      </fieldset>
    </section>
    
    <div v-if="!waitLoadRss && filteredArticles.length > 0" :class="layout === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8' : 'flex flex-col gap-4'">
      <article v-for="(article, index) in filteredArticles.slice(0, limiteArticles)" :key="article.link + index" class="group" :aria-labelledby="`article-title-${index}`">
          
          <div v-if="layout === 'grid'" :class="readArticles.has(article.link) ? 'opacity-70 group-hover:opacity-100' : ''" class="relative h-full">
            <a :href="article.link" @click="markAsRead(article.link)" target="_blank" rel="noopener noreferrer" class="flex flex-col h-full bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800 transition-all duration-300 hover:border-sky-500/40 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-neutral-900">
              <div class="relative">
                <img v-if="article.img" :src="article.img" alt="" class="w-full aspect-video object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy">
                <div v-else class="w-full aspect-video bg-neutral-800 flex items-center justify-center" aria-hidden="true">
                  <span class="text-neutral-500 text-xs">Image indisponible</span>
                </div>
              </div>
              <div class="p-5 flex flex-col flex-grow">
                <div class="flex justify-between items-center text-xs text-neutral-300 mb-2">
                    <span class="font-bold uppercase tracking-wider">{{ article.sourceName }}</span>
                    <time v-if="article.pubDate" :datetime="new Date(article.pubDate).toISOString()">{{ new Date(article.pubDate).toLocaleDateString('fr-FR') }}</time>
                </div>
                <h3 :id="`article-title-${index}`" class="text-md font-bold text-neutral-100 group-hover:text-sky-400 line-clamp-2 mb-2 flex-grow transition-colors">
                  {{ article.title }}
                </h3>
                <p class="text-sm text-neutral-300 line-clamp-3 mb-4">
                  {{ article.description }}
                </p>
              </div>
            </a>
            <button @click="toggleFavorite(article)" :aria-label="isFavorite(article) ? `Retirer l'article '${article.title}' des favoris` : `Ajouter l'article '${article.title}' aux favoris`" :aria-pressed="isFavorite(article)" class="absolute top-3 right-3 p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors z-10 focus:outline-none focus:ring-2 focus:ring-sky-500">
              <svg class="w-5 h-5 transition-colors" :class="isFavorite(article) ? 'text-yellow-400' : 'text-white'" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
            </button>
          </div>
          
          <div v-if="layout === 'list'" :class="readArticles.has(article.link) ? 'opacity-60' : ''" class="flex items-center justify-between p-4 bg-neutral-900 rounded-lg hover:bg-neutral-800/60 border border-neutral-800 hover:border-neutral-700 transition-all duration-300">
              <div class="flex-1 min-w-0 pr-4">
                  <a :href="article.link" @click="markAsRead(article.link)" target="_blank" rel="noopener noreferrer" class="block rounded-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                    <p :id="`article-title-${index}`" class="text-neutral-100 font-semibold truncate group-hover:text-sky-400 transition-colors">{{ article.title }}</p>
                    <p class="text-xs text-neutral-400 mt-1">{{ article.sourceName }} - <time v-if="article.pubDate" :datetime="new Date(article.pubDate).toISOString()">{{ new Date(article.pubDate).toLocaleDateString('fr-FR') }}</time></p>
                  </a>
              </div>
              <div class="flex items-center gap-4 flex-shrink-0">
                  <button @click="toggleFavorite(article)" :aria-label="isFavorite(article) ? `Retirer l'article '${article.title}' des favoris` : `Ajouter l'article '${article.title}' aux favoris`" :aria-pressed="isFavorite(article)" class="p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-sky-500">
                      <svg class="w-5 h-5 transition-colors" :class="isFavorite(article) ? 'text-yellow-400' : 'text-neutral-500 hover:text-yellow-400'" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                  </button>
                  <a :href="article.link" @click="markAsRead(article.link)" target="_blank" rel="noopener noreferrer" class="rounded-md bg-neutral-700 px-3 py-1 text-sm text-neutral-200 transition hover:bg-sky-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-500" :aria-label="`Lire l'article complet : ${article.title}`">
                    Lire
                  </a>
              </div>
          </div>
      </article>
    </div>

    <div v-if="!waitLoadRss && filteredArticles.length === 0" class="text-center text-neutral-500 py-16">
        <p class="text-2xl font-semibold text-neutral-200">Aucun article trouvé.</p>
        <p class="text-md mt-2">Essayez de modifier vos filtres ou de consulter vos favoris.</p>
    </div>

    <div class="flex items-center justify-center mt-16">
      <button v-if="!waitLoadRss && limiteArticles < filteredArticles.length" @click="incrementlimiteArticles" class="px-6 py-2.5 font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors duration-300">
        Voir plus d'articles
      </button>
    </div>
  </main>

  <Transition name="fade">
    <button v-if="y > 200" @click="scrollTop()" aria-label="Retourner en haut de la page" class="text-white bg-sky-600 fixed bottom-0 right-0 p-3 m-4 rounded-full shadow-lg hover:bg-sky-700 transition-colors duration-300">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
    </button>
  </Transition>
  <Footer/>
</template>

<style>
html {
  scroll-behavior: smooth;
}
body {
  background-color: #171717;
  color: #e5e5e5;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.pixelated-image {
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>