<script setup lang="ts">
import { useUserStore } from '@/stores/user'
import GlobalLoader from '@/components/GlobalLoader/index.vue'

const userStore = useUserStore()

// 应用启动时尝试恢复用户状态
userStore.fetchCurrentUser()
</script>

<template>
  <GlobalLoader />
  <router-view v-slot="{ Component, route }">
    <keep-alive :include="['ChatView']">
      <component :is="Component" :key="route.path" />
    </keep-alive>
  </router-view>
</template>

<style>
#app {
  width: 100%;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
