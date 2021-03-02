<template>
    <TitleBar />
    <main>
        <router-view v-slot="{ Component }">
            <transition 
            enter-active-class="animate__animated animate__bounceInLeft"
            leave-active-class="animate__animated animate__bounceOutLeft"
            mode="out-in">
                <component :is="Component" />
            </transition>
        </router-view>
    </main>
    <Footer />
</template>

<script>
import { ipcRenderer } from 'electron';

import TitleBar from '@/components/TitleBar';
import Footer from '@/components/Footer';

ipcRenderer.on('psn-logged-in', () => {
    this.$router.push('Dashboard');
});


export default {
    components: { TitleBar, Footer },
};

</script>