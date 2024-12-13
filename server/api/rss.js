// server/api/rss.ts
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes
const cache = new Map();

export default defineEventHandler(async (event) => {
  const { url } = getQuery(event);
  
  if (!url) {
    throw createError({
      statusCode: 400,
      message: "L'URL du flux RSS est requise"
    });
  }

  // Vérifier le cache
  const cachedData = cache.get(url);
  if (cachedData) {
    const { data, timestamp } = cachedData;
    if (Date.now() - timestamp < CACHE_DURATION) {
      return data;
    }
    cache.delete(url);
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw createError({
        statusCode: response.status,
        message: `Erreur lors de la requête RSS: ${response.statusText}`
      });
    }
    
    const data = await response.text();
    
    
    // Mettre en cache
    cache.set(url, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  } catch (error) {
    console.error('Erreur serveur:', error);
    throw createError({
      statusCode: 500,
      message: `Erreur lors de la récupération du flux RSS: ${error.message}`
    });
  }
});