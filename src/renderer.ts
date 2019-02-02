const { ipcRenderer } = require('electron');

ipcRenderer.on('profile-data', (event: any, data: any) => {
	console.log('got profile info', data);

	const image : HTMLImageElement = document.getElementById('avatar') as HTMLImageElement;
	image.src = data.avatarUrls[0].avatarUrl;

	document.getElementById('onlineId').innerHTML = data.onlineId;
});

ipcRenderer.on('presence-data', (event: any, data: any) => {
	console.log('got presence info', data);

	const details = document.getElementById('details');
	const state = document.getElementById('state');

	state.innerHTML = '';
	details.innerHTML = data.details;

	if (data.state)
	{
		state.innerHTML = data.state;
	}
});