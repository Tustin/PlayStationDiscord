const {ipcRenderer} = require('electron');
// import { ProfileModel } from './Model/ProfileModel'


ipcRenderer.on('profile-data', (event: any, data: any) => {
	console.log('got info', data);
	
	let image : HTMLImageElement = <HTMLImageElement> document.getElementById('avatar');
	image.src = data.avatarUrls[0].avatarUrl;

	document.getElementById('onlineId').innerHTML = data.onlineId;
});