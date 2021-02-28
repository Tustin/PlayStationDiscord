"use strict";

import { createApp } from 'vue';

// @ts-ignore
import App from '@/App.vue'

import "@/styles/app.scss";

import { RouteRecordRaw, createRouter, createWebHashHistory } from 'vue-router';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faPlaystation } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

library.add(faPlaystation);

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


createApp(App).component('font-awesome-icon', FontAwesomeIcon).use(router).mount("#app");