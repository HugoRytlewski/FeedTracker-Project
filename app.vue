<script setup >
import axios from 'axios';
import { ref, onMounted, computed } from 'vue';
import Navbar from '/components/Layouts/NavBar.vue';
import Footer from '/components/Layouts/Footer.vue';
import Wait from '/components/Layouts/Wait.vue';

import cheerio from 'cheerio';
import { useWindowScroll } from "@vueuse/core";


const articles = ref([]);
const limiteArticles = ref(10);
const { y } = useWindowScroll();
const waitLoadRss = ref(true)

//Pour eviter d'utiliser un serveur back(php) j'ai pas les sous (reconstitution API)

let tableau = [
  {
    "id": 1,
    "url": "https://www.clubic.com/feed/news.rss\n"
  },
  {
    "id": 2,
    "url": "https://www.tomsguide.fr/feed/",
  },
  {
    "id": 3,
    "url": "https://www.zdnet.fr/feeds/rss/actualites/",
  },
  {
    "id": 4,
    "url": "https://www.01net.com/actualites/feed/",
  },
  {
    "id": 5,
    "url": "https://www.journaldunet.com/rss/",
  },
  {
    "id": 6,
    "url": "https://www.frandroid.com/feed",
  }
];

onMounted(async () => {
     FeedArticles(tableau);
});

async function FeedArticles(fluxRssList) {
  articles.value = [];
  //contournement cors error par un proxy cors 
  const proxyUrl = 'https://corsproxy.io/?';

  for (const fluxRss of fluxRssList) {
    const url = fluxRss.url;
    try {
      const reponse = await axios.get(proxyUrl + url);
      const donnees = reponse.data;
      setRssFeed(donnees, true);

    } catch (erreur) {
      console.error(`Une erreur s'est produite lors de la récupération du flux RSS : ${erreur}`);
    }

  }
  
}

function sortChrono(a, b) {
        const dateA = new Date(a.pubDate);
        const dateB = new Date(b.pubDate);
        if (dateA > dateB) {
            return -1; 
        }
    }
function extractImageSource(contentEncoded) {
  const regex = /<img.*?src="(.*?)"/;
  const match = regex.exec(contentEncoded);
  if (match && match[1]) {
    return match[1];
  } else {
    return '';
  }
}
async function setRssFeed(dataFeed, limit) {
  limiteArticles.value = 10 ;

  const parser = new DOMParser();
  const xml = parser.parseFromString(dataFeed, 'text/xml');
  const items = xml.getElementsByTagName('item');
  let limitLength ;
  if (limit) {
    limitLength = 15;
  } else {
    limitLength = items.length;
  }
  for (let i = 0; i < limitLength; i += 1) {
    const title = items[i]?.querySelector('title')?.textContent;
    const link = items[i]?.querySelector('link')?.textContent;
    
    const descriptionHTML = items[i]?.querySelector('description')?.textContent;
    const $ = cheerio.load(descriptionHTML);
    const description = $.text();


    let img = '';

    const mediaContent = items[i]?.querySelector('media\\:content, content');
    const mediaThumbnail = items[i]?.querySelector('media\\:thumbnail, thumbnail');

    if (mediaContent) {
      img = mediaContent.getAttribute('url');
    } else if (mediaThumbnail) {
      img = mediaThumbnail.getAttribute('url');
    } else {
      const enclosure = items[i]?.querySelector('enclosure');
      if (enclosure) {
        img = enclosure.getAttribute('url');
      } else {
        const imgTag = $('img');
        if (imgTag.length > 0) {
          img = imgTag.attr('src');
        }
      }
    }
    // Vérification de la validité de l'image
    const isImgValid = await isImageValid(img);
    if (!isImgValid) {
      const contentEncoded = items[i]?.getElementsByTagNameNS('*', 'encoded')[0]?.textContent;
      const imgSrc = extractImageSource(contentEncoded);
      img = imgSrc;
      if(!imgSrc){
        img=''


      }

    }
    

    const article = {
      title,
      link,
      description,
      img,
    };
    articles.value.push(article);
    articles.value.sort(sortChrono);
  }
  waitLoadRss.value = false;
}

async function isImageValid(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

function incrementlimiteArticles() {
  limiteArticles.value += 10;
}

function ScrollTop() {

window.scrollTo({
    top: 0,
    left: 0,
    behavior: "smooth"
})
}

</script>

<template>
    <Wait class="hidden md:grid		"  v-if="waitLoadRss"/>
    <Navbar/>
  <div class="p-10 mt-24 lg:p-28 lg:mt-16">
    <div class="grid lg:grid-cols-2 gap-16 ">
      <div v-for="(article , index) in articles.slice(0, limiteArticles)" :key="index" class="flex h-full items-center justify-center flex-col gap-6 rounded-xl bg-neutral-800 md:hover:-translate-y-1 md:hover:scale-105  md:duration-200 p-6  border-neutral-800 shadow-md ">
        <img  v-if="article.img" :src="article.img" class="pixelated-image  w-11/12 max-h-72 rounded-lg object-cover  lazyload">
        <img v-else src="~/assets/img/ee.png" class=" w-11/12 max-h-72 rounded-lg object-cover ">
        <div class="flex flex-col justify-between w-full	 gap-y-4">
          <div class="space-y-4">
            <div class="flex justify-center">
              <p class="line-clamp-2 md:line-clamp-1 text-lg  max-w-fit	text-white text-center	font-bold">
                {{ article.title }}
              </p>
            </div>
              <p class="line-clamp-3 text-white text-center	 ">
                {{(article.description) }}
              </p>
              <div class="flex justify-center">                            
              <a :href="article.link" target="_blank" class="float-right rounded-lg bg-neutral-200 px-2 py-1 text-sm transition hover:bg-neutral-400">
                Lire la suite
             </a>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="flex items-center justify-center mt-16">
      <button v-if="limiteArticles < articles.length" @click="incrementlimiteArticles" class="relative rounded px-5 py-2.5 text-black overflow-hidden group bg-white md:hover:bg-neutral-400  ">
        <span class="absolute right-0 w-8 h-32 -mt-12 "></span>
        <span class="relative">Voir plus</span>
      </button>
    </div>
  </div>
  <Transition>
    <button v-if="y>100" @click="ScrollTop()" class="text-black bg-white fixed bottom-0 right-0 p-3 mr-4 mb-4 rounded-full">
      <svg class="w-4 h-4 text-white-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/>
      </svg>
    </button>
  </Transition>
  <Footer/>

</template>

<style>
body {
  background-color: rgb(27, 27, 27);
}
.v-enter-active,
.v-leave-active {
  transition: all 0.5s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}
.pixelated-image {
  image-rendering: pixelated; /* Applique un rendu pixelisé */
}

</style>
