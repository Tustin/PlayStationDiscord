"use strict";

import { createApp } from 'vue';

// @ts-ignore
import App from '@/App.vue'

import "@/styles/app.scss";

import { RouteRecordRaw, createRouter, createWebHashHistory } from 'vue-router'

// @ts-ignore
import LandingComponent from '@/pages/Landing.vue'; 
// @ts-ignore
import DashboardComponent from '@/pages/Dashboard.vue';

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


createApp(App).use(router).mount("#app");