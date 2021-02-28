<template>
    <div class="playstation-info">
        <img
            src="../assets/images/defaultAvatar.png"
            id="avatar"
            alt="Avatar"
            draggable="false"
        />
        <div class="presence-details">
            <h3 id="onlineId"></h3>
            <p id="details">Offline</p>
            <p id="state"></p>
        </div>
    </div>
    <div class="options">
        <button class="red" id="togglePresence">
            Disable
        </button>
        <button class="blurple" id="signOut">
            Sign Out
        </button>
    </div>
</template>