<script setup lang="ts">
// ============================================================
// AuthPanel.vue — регистрация/вход профиля для синхронизации.
// ============================================================
import { ref, computed } from 'vue'
import { useT } from '~/composables/useI18n'
import { useAuth, registerProfile, loginProfile, logoutProfile } from '~/composables/useAuth'
import { ensureLoaded } from '~/composables/useProgress'

const t = useT()
const auth = useAuth()
// Режим панели: регистрация или вход
const mode = ref<'register' | 'login'>('register')
const name = ref('')
const pin = ref('')
const busy = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

const canSubmit = computed(() => name.value.trim().length >= 2 && /^\d{4,8}$/.test(pin.value))

async function submit() {
  if (busy.value || !canSubmit.value) return
  busy.value = true
  error.value = null
  success.value = null
  try {
    if (mode.value === 'register') {
      await registerProfile(name.value.trim(), pin.value)
    } else {
      await loginProfile(name.value.trim(), pin.value)
    }
    success.value = t('set.auth.synced')
    // После входа подтягиваем серверный прогресс
    await ensureLoaded() } catch (e) {
    const status = (e as { statusCode?: number }).statusCode
    if (status === 409) error.value = 'Имя занято — выберите другое'
    else if (status === 401) error.value = 'Неверное имя или PIN'
    else error.value = t('common.error')
  } finally {
    busy.value = false
  }
}

async function logout() {
  await logoutProfile()
}
</script>

<template lang="pug">
.card.bg-base-100.shadow-sm.border.border-base-300
  .card-body(class="p-3 sm:p-4 gap-2 sm:gap-3")

    // Вошли: показываем профиль и выход
    template(v-if="auth.authed.value")
      h3.font-semibold {{ t('set.profile') }}
      p.text-sm.text-success
        | {{ t('set.auth.loggedAs') }}:
        span.font-bold.ml-1 {{ auth.name.value }}
      p(class="text-xs text-base-content/50") {{ t('set.profileHint') }}
      button.btn.btn-outline.btn-sm.w-fit(@click="logout") {{ t('set.auth.logout') }}

    // Гость: форма входа/регистрации
    template(v-else='')
      h3.font-semibold {{ t('set.profile') }}
      p(class="text-xs text-base-content/50") {{ t('set.auth.guest') }}
      p(class="text-xs text-base-content/50") {{ t('set.profileHint') }}

      .join.w-fit
        button.join-item.btn.btn-sm(:class="mode === 'register' ? 'btn-primary' : 'btn-ghost'" @click="mode = 'register'") {{ t('set.auth.register') }}
        button.join-item.btn.btn-sm(:class="mode === 'login' ? 'btn-primary' : 'btn-ghost'" @click="mode = 'login'") {{ t('set.auth.login') }}

      form.flex.flex-col.gap-2.mt-1(@submit.prevent="submit")
        input.input.input-bordered.input-sm.w-full(
          v-model="name"
          :placeholder="t('set.auth.name')"
          autocomplete="username"
          maxlength="24"
        )
        input.input.input-bordered.input-sm.w-full(
          v-model="pin"
          type="password"
          inputmode="numeric"
          :placeholder="t('set.auth.pin')"
          autocomplete="off"
          maxlength="8"
        )
        button.btn.btn-primary.btn-sm(type="submit" :disabled="!canSubmit || busy")
          span.loading.loading-spinner.loading-xs(v-if="busy")
          | {{ mode === 'register' ? t('set.auth.create') : t('set.auth.enter') }}

      p.text-error.text-xs(v-if="error") {{ error }}
      p.text-success.text-xs(v-if="success") {{ success }}
</template>
