// ============================================================
// nuxt.config.ts — конфигурация приложения «¡Vamos!»
// Стек: Nuxt 4 + PWA (@vite-pwa/nuxt) + Tailwind CSS 4 + DaisyUI 5 + Pug
// ============================================================

import tailwindcss from '@tailwindcss/vite'
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  // Дата совместимости API-поведения Nuxt (см. документацию Nuxt 4)
  compatibilityDate: '2025-07-15',

  devtools: { enabled: false },

  // Pug используется в шаблонах .vue SFC (<template lang="pug">).
  // @vitejs/plugin-vue компилирует Pug «из коробки», достаточно пакета pug.
  // Отдельный модуль не нужен.

  modules: [
    // PWA: service worker + веб-манифест (установка на устройство, оффлайн)
    '@vite-pwa/nuxt',
  ],

  // Глобальные стили: Tailwind 4 + кастомные темы DaisyUI 5
  css: ['~/assets/css/main.css'],

  // Строгий TypeScript во всём проекте
  typescript: {
    strict: true,
    typeCheck: false, // проверка выполняется отдельно: bun run typecheck
    tsConfig: {
      compilerOptions: {
        // Индексация массивов защищена порядком данных — строгая
        // noUncheckedIndexedAccess создаёт шум без пользы
        noUncheckedIndexedAccess: false,
      },
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },

  // ============================================================
  // Серверная часть (Nitro): пути и настройки
  // ============================================================
  runtimeConfig: {
    // Путь к файлу SQLite (node:sqlite, без нативных зависимостей).
    // Переопределяется переменной окружения NUXT_DB_PATH.
    dbPath: 'db/custom.db',
  },

  // ============================================================
  // PWA — манифест и service worker
  // ============================================================
  pwa: {
    // Service worker обновляется автоматически при новой версии
    registerType: 'autoUpdate',
    includeAssets: ['favicon.png', 'apple-touch-icon.png', 'robots.txt'],

    manifest: {
      id: '/',
      name: '¡Vamos! — учим латиноамериканский испанский',
      short_name: '¡Vamos!',
      description:
        'Изучение латиноамериканского испанского: самые употребительные слова, комбинаторные фразы, статистика и проекции «выучишь — будешь знать».',
      lang: 'ru',
      dir: 'ltr',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait-primary',
      background_color: '#fdf6ec',
      theme_color: '#c25a3a',
      categories: ['education'],
      icons: [
        { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
        { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },

    // В dev-режиме service worker тоже включён — можно проверить PWA сразу
    devOptions: { enabled: true },

    // Конфигурация автогенерации service worker (workbox-build).
    // В @vite-pwa/nuxt 2.x ключ называется generateSW (старое имя workbox устарело).
    generateSW: {
      // Прекеш всех статических ресурсов — приложение полностью работает офлайн
      globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
      navigateFallback: '/index.html',
      // Данные API не кешируем: прогресс синхронизируется,
      // а оффлайн-очередь хранится в localStorage
      navigateFallbackDenylist: [/^\/api\//],
    },

    client: {
      // Кнопка «Установить приложение» внутри интерфейса
      installPrompt: true,
    },
  },

  // ============================================================
  // HTML «шапка»: заголовок, иконки, мгновенное применение темы.
  // Скрипт до первой отрисовки читает localStorage; если там нет
  // валидного значения — светлая (системную тему НЕ слушаем:
  // тёмная включается только вручную).
  // ============================================================
  app: {
    head: {
      htmlAttrs: { lang: 'ru' },
      title: '¡Vamos! — учим латиноамериканский испанский',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Латиноамериканский испанский: слова, фразы, статистика и проекции «выучишь — будешь знать».' },
        { name: 'theme-color', content: '#c25a3a' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
      script: [
        {
          // Раннее применение сохранённой темы (до гидратации), дефолт — светлая.
          // Легаси-значение 'dark' из старых версий тоже признаём.
          innerHTML: `(function(){try{var t=localStorage.getItem('vamos.theme');t=(t==='vamos-dark'||t==='dark')?'vamos-dark':'vamos-light';document.documentElement.dataset.theme=t;}catch(e){}})();`,
        },
      ],
    },
  },
})
