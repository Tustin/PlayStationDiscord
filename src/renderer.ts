const { ipcRenderer } = require('electron');

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