import { RouteRecordRaw, createRouter, createWebHashHistory } from 'vue-router'

// @ts-ignore
import LandingComponent from '@/components/Landing.vue'; 
// @ts-ignore
import DashboardComponent from '@/components/Dashboard.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Landing',
    component: LandingComponent
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: DashboardComponent
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router