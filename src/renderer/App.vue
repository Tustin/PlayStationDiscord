<template>
    <TitleBar></TitleBar>
    <router-view />
</template>

<script>
/* eslint-disable indent */

	'use strict';

	import TitleBar from '@/components/TitleBar';

	export default {
		components: { TitleBar }
	};
</script>