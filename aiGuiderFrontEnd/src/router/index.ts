import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // ==================== 游客端 (Mobile H5) ====================
    {
      path: '/',
      name: 'chat',
      component: () => import('@/pages/mobile/ChatView.vue'),
      meta: { title: 'AI 智能导览', keepAlive: true },
    },

    // ==================== 管理后台 (Web Admin) ====================
    {
      path: '/admin/login',
      name: 'admin-login',
      component: () => import('@/pages/admin/Login.vue'),
      meta: { title: '管理员登录' },
    },
    {
      path: '/admin',
      component: () => import('@/pages/admin/Layout.vue'),
      redirect: '/admin/dashboard',
      meta: { requiresAuth: true, role: 'admin' },
      children: [
        {
          path: 'dashboard',
          name: 'admin-dashboard',
          component: () => import('@/pages/admin/dashboard/Index.vue'),
          meta: { title: '数据大屏', icon: 'DataAnalysis' },
        },
        {
          path: 'knowledge',
          name: 'admin-knowledge',
          component: () => import('@/pages/admin/knowledge/List.vue'),
          meta: { title: '知识库管理', icon: 'Document' },
        },
      ],
    },

    // ==================== 404 ====================
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/pages/NotFound.vue'),
      meta: { title: '404' },
    },
  ],
})

// 路由守卫
router.beforeEach((to, _from, next) => {
  document.title = `${to.meta.title || 'AI 数字人导览'} — 灵山胜境`

  if (to.meta.requiresAuth) {
    const token = localStorage.getItem('token')
    if (!token) {
      return next('/admin/login')
    }
  }

  next()
})

export default router
