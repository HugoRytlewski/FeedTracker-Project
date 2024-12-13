// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  css: ['~/assets/css/style.css'],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  // Ajout de la configuration Nitro
  nitro: {
    routeRules: {
      '/api/rss': {
        cors: true,
        headers: {
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Origin': '*',
        }
      }
    }
  }
})