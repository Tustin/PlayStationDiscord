<template>
    <TitleBar />
    <main>
        <router-view />
    </main>
    <Footer />
</template>

<script>

/* eslint-disable indent */
	'use strict';

    import TitleBar from '@/components/TitleBar';
    import Footer from '@/components/Footer';

	export default {
        components: { TitleBar, Footer },
	};
</script>