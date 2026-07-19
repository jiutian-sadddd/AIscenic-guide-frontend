<template>
  <div class="admin-layout">
    <!-- 左侧菜单 -->
    <aside class="admin-layout__sidebar" :class="{ collapsed: isCollapsed }">
      <div class="sidebar-logo">
        <span v-show="!isCollapsed">AI 导览后台</span>
        <span v-show="isCollapsed">AI</span>
      </div>

      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapsed"
        :router="true"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
      >
        <el-menu-item index="/admin/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <template #title>数据大屏</template>
        </el-menu-item>
        <el-menu-item index="/admin/knowledge">
          <el-icon><Document /></el-icon>
          <template #title>知识库管理</template>
        </el-menu-item>
      </el-menu>
    </aside>

    <!-- 右侧区域 -->
    <div class="admin-layout__main">
      <!-- 顶部栏 -->
      <header class="admin-layout__header">
        <div class="header-left">
          <el-icon
            class="collapse-btn"
            :size="20"
            @click="isCollapsed = !isCollapsed"
          >
            <Fold v-if="!isCollapsed" />
            <Expand v-else />
          </el-icon>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/admin' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <span class="header-user">{{ userStore.user?.username || '管理员' }}</span>
          <el-button text @click="handleLogout">退出</el-button>
        </div>
      </header>

      <!-- 内容区域 -->
      <main class="admin-layout__content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { DataAnalysis, Document, Fold, Expand } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const isCollapsed = ref(false)

const activeMenu = computed(() => route.path)
const currentTitle = computed(() => route.meta.title as string || '')
</script>

<script lang="ts">
export default {
  name: 'AdminLayout',
}
</script>

<style scoped lang="scss">
$sidebar-width: 220px;
$sidebar-collapsed-width: 64px;
$header-height: 56px;

.admin-layout {
  display: flex;
  min-height: 100vh;

  &__sidebar {
    width: $sidebar-width;
    flex-shrink: 0;
    background: #304156;
    transition: width 0.3s;
    overflow: hidden;

    &.collapsed {
      width: $sidebar-collapsed-width;
    }
  }

  &__main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  &__header {
    height: $header-height;
    background: #fff;
    border-bottom: 1px solid #e6e6e6;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    flex-shrink: 0;
  }

  &__content {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    background: #f0f2f5;
  }
}

.sidebar-logo {
  height: $header-height;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  letter-spacing: 1px;
}

.collapse-btn {
  cursor: pointer;
  margin-right: 12px;
  color: #666;

  &:hover { color: #409EFF; }
}

.header-left {
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-user {
  font-size: 14px;
  color: #666;
}
</style>
