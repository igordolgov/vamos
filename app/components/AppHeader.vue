<script setup lang="ts">
// ============================================================
// AppHeader.vue — компактная шапка: логотип, навигация, язык.
// ============================================================
import { useT } from '~/composables/useI18n'
import LocaleSwitch from './LocaleSwitch.vue'

const t = useT()
</script>

<template lang="pug">
// Компактная шапка: переопределяем высоту .navbar (по умолчанию 4rem)
header.navbar.bg-base-200.shadow-sm.sticky.top-0.z-40(class="px-2 min-h-12! sm:px-4 sm:min-h-14!")
  // Логотип
  .navbar-start
    NuxtLink.btn.btn-ghost.btn-sm.px-2.text-base.font-bold.text-primary(class="sm:text-lg sm:px-3" to="/")
      | {{ t('app.name') }}
    span.hidden(class="md:inline text-xs text-base-content/60 ml-1 sm:text-sm")
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
    LocaleSwitch

  // Нижняя навигация (мобильная) — рисуется отдельно в layout
</template>
