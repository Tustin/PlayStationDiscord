const { remote } = require('electron');

const currentWindow = remote.BrowserWindow.getFocusedWindow();

document.getElementById('minimize').addEventListener('click', (e) => {
	currentWindow.minimize();
});

document.getElementById('maximize').addEventListener('click', (e) => {
	if (currentWindow.isMaximized())
	{
		currentWindow.unmaximize();
	}
	else
	{
		currentWindow.maximize();
	}
});

document.getElementById('close').addEventListener('click', (e) => {
	currentWindow.close();
});