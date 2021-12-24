document.getElementById('minimize').addEventListener('click', (e) => {
	ipcRenderer.send('minimize-window');
	// const currentWindow = remote.BrowserWindow.getFocusedWindow();
	// currentWindow.minimize();
});

document.getElementById('maximize').addEventListener('click', (e) => {
	ipcRenderer.send('maximize-window');

	// const currentWindow = remote.BrowserWindow.getFocusedWindow();

	// if (currentWindow.isMaximized())
	// {
	// 	currentWindow.unmaximize();
	// }
	// else
	// {
	// 	currentWindow.maximize();
	// }
});

document.getElementById('close').addEventListener('click', (e) => {
	ipcRenderer.send('close-window');
	// const currentWindow = remote.BrowserWindow.getFocusedWindow();

	// currentWindow.close();
});
