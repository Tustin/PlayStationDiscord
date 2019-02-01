const { ipcRenderer } = require('electron');

ipcRenderer.on('profile-data', (event: any, data: any) => {
	console.log('got info', data);

	const image : HTMLImageElement = document.getElementById('avatar') as HTMLImageElement;
	image.src = data.avatarUrls[0].avatarUrl;

	document.getElementById('onlineId').innerHTML = data.onlineId;
});