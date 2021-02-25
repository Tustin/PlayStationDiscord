const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const log = require('electron-log');
const _store = require('electron-store');
const store = new _store();

const togglePresence = document.getElementById('togglePresence');
const signOut = document.getElementById('signOut');
const updateInfo = document.getElementById('update-info');
const updateIcon = updateInfo.querySelector('#icon') as HTMLImageElement;
const updateText = updateInfo.querySelector('#text');
const installLink = document.getElementById('install');
const discordReconnect = document.getElementById('discord-reconnect');
const packageJson = require('../package.json');

ipcRenderer.on('profile-data', (event: any, data: any) => {
    const image : HTMLImageElement = document.getElementById('avatar') as HTMLImageElement;
    image.src = data.avatarUrl;
    // const avatars = data.avatars;
    // if (avatars.length > 0)
    // {
    // 	const avatar = getBiggestAvatar(avatars);

    // 	image.src = avatar.url;
    // }

    document.getElementById('onlineId').innerHTML = data.onlineId;
});

ipcRenderer.on('update-status', (event: any, data: any) => {
    if (updateInfo.style.display === 'none')
    {
        updateInfo.style.display = 'grid';
    }

    if (data.fade && !updateInfo.classList.contains('fade'))
    {
        updateInfo.classList.add('fade');
    }

    if (data.icon)
    {
        fs.readFile(path.join(__dirname, `../assets/images/${data.icon}.svg`), (err: any, fileData: any) => {
            if (err)
            {
                log.error(err);
            }
            else
            {
                updateIcon.innerHTML = fileData;
            }
        });
    }

    if (data.message)
    {
        updateText.innerHTML = data.message;
    }
});

ipcRenderer.on('update-display', (event: any, data: boolean) => {
    updateInfo.style.display = data ? 'grid' : 'none';
});

ipcRenderer.on('presence-data', (event: any, data: any) => {
    const details = document.getElementById('details');
    const state = document.getElementById('state');

    state.innerHTML = '';
    details.innerHTML = data.details;

    if (data.state)
    {
        state.innerHTML = data.state;
    }
});

ipcRenderer.on('toggle-discord-reconnect', (event: any, toggle: boolean) => {
    discordReconnect.style.display = toggle ? 'block' : 'none';
});

// Hacky way of checking for certain elements since they won't always exist.
document.addEventListener('click', (event) => {
    const element = event.target as HTMLElement;

    if (element.id === 'install')
    {
        ipcRenderer.send('update-install');
    }
    else if (element.id === 'notes')
    {
        ipcRenderer.send('show-notes');
    }
    else if (element.id === 'mac-download')
    {
        ipcRenderer.send('mac-download');
    }
    else if (element.id === 'discord-reconnect')
    {
        ipcRenderer.send('discord-reconnect');
    }
});

togglePresence.addEventListener('click', () => {
    if (togglePresence.classList.contains('red'))
    {
        togglePresence.classList.remove('red');
        togglePresence.classList.add('blurple');
        togglePresence.innerHTML = 'Enable';
    }
    else
    {
        togglePresence.classList.remove('blurple');
        togglePresence.classList.add('red');
        togglePresence.innerHTML = 'Disable';
    }

    ipcRenderer.send('toggle-presence');
});

signOut.addEventListener('click', () => {
    ipcRenderer.send('signout');
});

window.onload = () => {
    document.getElementById('title').innerHTML = 'PlayStationDiscord ' + (packageJson.version || '');

    // Update initial state of rich presence button
    if (!store.get('presenceEnabled', true))
    {
        togglePresence.classList.remove('red');
        togglePresence.innerHTML = 'Enable';
    }
};

function getBiggestAvatar(avatars: any) {
    const sizes = ['xl', 'l', 'm', 's', 'xs'];
    let biggest = avatars[0];
    let sizeIndex = -1;

    for (const avatar of avatars) {
        if (avatar.size === 'xl') {
            return avatar;
        }

        const i = sizes.indexOf(avatar.size.toLowerCase());
        if (i === -1)
        {
            continue;
        }
        if (i < sizeIndex)
        {
            sizeIndex = i;
            biggest = avatar;
        }
    }

    return biggest;
}