<script setup lang="ts">
// ============================================================
// SpeakButton.vue — кнопка озвучки испанского текста.
// Скрывается, если Web Speech API недоступен.
// ============================================================
import { computed, onMounted, ref } from 'vue'
import { speechAvailable, speakEs } from '~/composables/useSpeech'

const props = defineProps<{ text: string; label?: string }>()

const available = ref(false)

onMounted(() => {
  available.value = speechAvailable()
})

const title = computed(() => props.label ?? 'Escuchar')
</script>

<template lang="pug">
button.btn.btn-ghost.btn-sm.btn-circle(
  v-if="available"
  :title="title"
  :aria-label="title"
  @click="speakEs(text)"
)
  span.text-lg 🔊
</template>
