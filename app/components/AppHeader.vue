<script setup lang="ts">
// ============================================================
// AppHeader.vue — шапка: логотип, навигация, тема, язык.
// ============================================================
import { useT } from '~/composables/useI18n'
import ThemeSwitch from './ThemeSwitch.vue'
import LocaleSwitch from './LocaleSwitch.vue'

const t = useT()
</script>

<template lang="pug">
header.navbar.bg-base-200.shadow-sm.sticky.top-0.z-40.px-2(class="sm:px-4")
  // Логотип
  .navbar-start
    NuxtLink.btn.btn-ghost.text-lg.font-bold.text-primary(to="/")
      | {{ t('app.name') }}
    span.hidden(class="md:inline text-sm text-base-content/60 ml-1")
      | {{ t('app.tagline') }}

  // Навигация (десктоп)
  .navbar-center.hidden(class="lg:flex")
    ul.menu.menu-horizontal.gap-1.text-sm
      li
        NuxtLink(to="/") {{ t('nav.dashboard') }}
      li
        NuxtLink(to="/lessons") {{ t('nav.lessons') }}
      li
        NuxtLink(to="/words") {{ t('nav.words') }}
      li
        NuxtLink(to="/phrases") {{ t('nav.phrases') }}
      li
        NuxtLink(to="/practice") {{ t('nav.practice') }}
      li
        NuxtLink(to="/opportunities") {{ t('nav.opportunities') }}
      li
        NuxtLink(to="/achievements") {{ t('nav.achievements') }}

  // Переключатели (правая часть)
  .navbar-end.gap-1
    ThemeSwitch
    LocaleSwitch

  // Нижняя навигация (мобильная) — рисуется отдельно в layout
</template>
