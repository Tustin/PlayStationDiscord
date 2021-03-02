<template>
    <TitleBar />
    <main>
        <router-view v-slot="{ Component }">
            <transition 
            enter-active-class="animate__animated animate__bounceInLeft"
            leave-active-class="animate__animated animate__bounceOutRight"
            mode="out-in">
                <component :is="Component" />
            </transition>
        </router-view>
    </main>
    <Footer />
</template>

<script>
import { ipcRenderer } from 'electron';
import { useRouter } from 'vue-router';

import TitleBar from '@/components/TitleBar';
import Footer from '@/components/Footer';

export default {
    components: { TitleBar, Footer },
    setup() {
        const router = useRouter();
        ipcRenderer.on('psn-logged-in', () => {
            router.push('Dashboard');
        });
    }
};
</script>