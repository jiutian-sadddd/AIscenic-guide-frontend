<template>
  <div class="global-loader" :class="{ active: isLoading }" />
</template>

<script setup lang="ts">
import { useGlobalLoader } from '@/composables/useGlobalLoader'

const { isLoading } = useGlobalLoader()
</script>

<style scoped>
.global-loader {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  z-index: 9999;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s;
}

.global-loader.active {
  opacity: 1;
}

.global-loader::before {
  content: '';
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #f59e0b, #d97706, #f59e0b);
  animation: loaderSlide 1.5s ease-in-out infinite;
}

@keyframes loaderSlide {
  0% {
    width: 0;
    margin-left: 0;
  }
  50% {
    width: 40%;
    margin-left: 30%;
  }
  100% {
    width: 0;
    margin-left: 100%;
  }
}
</style>
