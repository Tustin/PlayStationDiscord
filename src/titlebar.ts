const { remote } = require('electron');

document.getElementById('minimize').addEventListener('click', (e) => {
	const currentWindow = remote.BrowserWindow.getFocusedWindow();
	currentWindow.minimize();
});

document.getElementById('maximize').addEventListener('click', (e) => {
	const currentWindow = remote.BrowserWindow.getFocusedWindow();

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
	const currentWindow = remote.BrowserWindow.getFocusedWindow();

	currentWindow.close();
});