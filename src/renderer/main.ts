"use strict";

import { createApp } from 'vue';

// @ts-ignore
import App from '@/App.vue'

import "@/styles/app.scss";

import { RouteRecordRaw, createRouter, createWebHashHistory } from 'vue-router';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faPlaystation } from '@fortawesome/free-brands-svg-icons';
import { faCog } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

library.add(faPlaystation);
library.add(faCog);

// @ts-ignore
import LandingPage from '@/pages/Landing.vue';

// @ts-ignore
import DashboardPage from '@/pages/Dashboard.vue';

// @ts-ignore
import SettingsPage from '@/pages/Settings.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Landing',
    component: LandingPage
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: DashboardPage
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsPage
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})


createApp(App).component('font-awesome-icon', FontAwesomeIcon).use(router).mount("#app");