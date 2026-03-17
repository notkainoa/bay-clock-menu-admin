// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-03-16',
  devtools: {
    enabled: true,
  },
  css: [
    '~/assets/css/tailwind.css',
    '~/assets/css/main.css',
  ],
  modules: ['@nuxtjs/tailwindcss'],
  runtimeConfig: {
    menuUploadPassword: '',
    sessionSigningSecret: '',
    githubToken: '',
    githubOwner: 'notkainoa',
    githubRepo: 'bay-clock-3',
    githubDefaultBranch: 'main',
    githubInboxBranch: 'menu-upload-inbox',
    uploadMaxBytes: 15 * 1024 * 1024,
    public: {
      githubOwner: 'notkainoa',
      githubRepo: 'bay-clock-3',
      githubDefaultBranch: 'main',
      uploadMaxBytes: 15 * 1024 * 1024,
    },
  },
  nitro: {
    preset: 'cloudflare_module',
  },
  app: {
    head: {
      title: 'Bay Clock Menu Admin',
      htmlAttrs: {
        lang: 'en',
      },
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1',
        },
      ],
    },
  },
  typescript: {
    strict: true,
  },
})
