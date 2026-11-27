<script setup lang="ts">
// ============================================================
// MicCompare.vue — микрофон в режиме «Аудио»: записать свой голос
// и сравнить с эталоном. Просто и без «умного» сравнения:
// 🎙 запись → ▶ Эталон (синтез) и ▶ Моя запись (аудио) — ухо
// ловит разницу в интонации и произношении надёжнее любого score.
//
// MediaRecorder недоступен (старые браузеры) или отказ в доступе —
// блок просто не показывается / показывается объяснение.
// ============================================================
import { computed, onBeforeUnmount, ref } from 'vue'
import { useT } from '~/composables/useI18n'
import { speakEs } from '~/composables/useSpeech'

const props = defineProps<{
  /** Эталонная фраза (текст для озвучки) */
  reference: string
}>()

const t = useT()

/** MediaRecorder доступен в этом браузере? */
const available = computed(() =>
  typeof window !== 'undefined'
  && typeof MediaRecorder !== 'undefined'
  && !!navigator.mediaDevices?.getUserMedia,
)

const recording = ref(false)
const recordingUrl = ref<string | null>(null)
const denied = ref(false)

let recorder: MediaRecorder | null = null
let chunks: Blob[] = []
let stream: MediaStream | null = null
let audioEl: HTMLAudioElement | null = null

async function startRecording() {
  if (!available.value || recording.value) return
  denied.value = false
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    chunks = []
    recorder = new MediaRecorder(stream)
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' })
      if (recordingUrl.value) URL.revokeObjectURL(recordingUrl.value)
      recordingUrl.value = URL.createObjectURL(blob)
      cleanupStream()
    }
    recorder.start()
    recording.value = true
  } catch {
    // пользователь не дал доступ к микрофону (или ошибка устройства)
    denied.value = true
    cleanupStream()
  }
}

function stopRecording() {
  if (!recording.value || !recorder) return
  try {
    recorder.stop()
  } catch {
    cleanupStream()
  }
  recording.value = false
}

function toggle() {
  if (recording.value) stopRecording()
  else void startRecording()
}

/** Прослушать свою запись */
function playMine() {
  if (!recordingUrl.value) return
  audioEl?.pause()
  audioEl = new Audio(recordingUrl.value)
  void audioEl.play()
}

/** Прослушать эталон (синтез речи) */
function playReference() {
  void speakEs(props.reference)
}

function cleanupStream() {
  for (const track of stream?.getTracks() ?? []) track.stop()
  stream = null
}

onBeforeUnmount(() => {
  if (recording.value) stopRecording()
  cleanupStream()
  if (recordingUrl.value) URL.revokeObjectURL(recordingUrl.value)
})
</script>

<template lang="pug">
// Блок сравнения: показываем только если MediaRecorder поддерживается
.w-full(v-if="available")
  .flex.flex-wrap.items-center.justify-center.gap-2.mt-1
    // Запись: тап — старт, повторный тап — стоп
    button.btn.btn-sm(
      :class="recording ? 'btn-error text-white' : 'btn-outline'"
      @click="toggle()"
    )
      span(aria-hidden="true") {{ recording ? '⏹' : '🎙' }}
      | {{ recording ? t('practice.micStop') : t('practice.mic') }}
    // Сравнение: после первой записи
    template(v-if="recordingUrl")
      div
        button.btn.btn-sm.btn-outline.mr-2(@click="playReference()")
          span(aria-hidden="true") 🔊
          | {{ t('practice.micPlayRef') }}
        button.btn.btn-sm.btn-outline(@click="playMine()")
          span(aria-hidden="true") ▶
          | {{ t('practice.micPlayMine') }}
  p(class="mt-1 text-xs text-base-content/50 text-center" v-if="denied")
    | {{ t('practice.micUnavailable') }}
</template>
