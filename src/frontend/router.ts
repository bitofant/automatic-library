import { createRouter, createWebHashHistory } from 'vue-router'
import { h } from 'vue'

// Stub component since routing is handled by App.vue's conditional rendering
const RouterStub = { render: () => h('div') }

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: RouterStub
    },
    {
      path: '/library/:path/:index?',
      name: 'library',
      component: RouterStub
    }
  ]
})

export default router
