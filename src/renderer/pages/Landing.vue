<template>
    <div class="landing">
        <h1 class="intro">Welcome to PlayStationDiscord</h1>
        <h3 class="intro">Which console are you using?</h3>
        <div class="login-buttons">
            <button class="blue ps5-login" @click="login(false)">
                <font-awesome-icon :icon="['fab', 'playstation']" /> PlayStation 4 or 5
            </button>
            <button class="black legacy-login" @click="login(true)">
                <font-awesome-icon :icon="['fab', 'playstation']" /> PlayStation 3
            </button>
        </div>
    </div>
</template>

<script>

import { ipcRenderer } from 'electron';

export default {
    setup() {
        function login(legacy) {
            ipcRenderer.send('open-login-window', legacy);
        }

        return {
            login
        };
    }
};

</script>