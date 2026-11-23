// ============================================================
// vitest.config.ts — два проекта тестов:
// — unit: чистая логика (словарь, движок, статистика, БД) — Node;
// — components: рендер компонентов — happy-dom + @vue/test-utils.
// ============================================================

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

import { resolve } from 'node:path'

export default defineConfig({
  plugins: [vue()] as never[],
  resolve: {
    alias: {
      '~': resolve(__dirname, 'app'),
      '@': resolve(__dirname, 'app'),
      // Аналогично Nuxt: общий слой доступен по алиасу #shared
      '#shared': resolve(__dirname, 'shared'),
    },
  },
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['test/unit/**/*.spec.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'components',
          include: ['test/components/**/*.spec.ts'],
          environment: 'happy-dom',
        },
      },
    ],
  },
})
