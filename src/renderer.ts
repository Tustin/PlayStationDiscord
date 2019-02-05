const { ipcRenderer } = require('electron');

const togglePresence = document.getElementById('togglePresence');
const signOut = document.getElementById('signOut');

ipcRenderer.on('profile-data', (event: any, data: any) => {
	const image : HTMLImageElement = document.getElementById('avatar') as HTMLImageElement;
	image.src = data.avatarUrls[0].avatarUrl;

	document.getElementById('onlineId').innerHTML = data.onlineId;
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

togglePresence.addEventListener('click', () => {
	if (togglePresence.classList.contains('red'))
	{
		togglePresence.classList.remove('red');
		togglePresence.innerHTML = 'Enable Rich Presence';
	}
	else
	{
		togglePresence.classList.add('red');
		togglePresence.innerHTML = 'Disable Rich Presence';
	}

	ipcRenderer.send('toggle-presence');
});

signOut.addEventListener('click', () => {
	ipcRenderer.send('signout');
});