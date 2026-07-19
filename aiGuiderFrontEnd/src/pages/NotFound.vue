<template>
  <div class="not-found">
    <h1>404</h1>
    <p>页面不存在</p>
    <el-button type="primary" @click="$router.push('/')">返回首页</el-button>
  </div>
</template>

<script setup lang="ts">
import { ElButton } from 'element-plus'
</script>

<style scoped lang="scss">
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 16px;

  h1 {
    font-size: 72px;
    color: #ccc;
    font-weight: 300;
  }

  p {
    font-size: 18px;
    color: #999;
  }
}
</style>
