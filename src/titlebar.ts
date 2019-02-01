const { remote } = require('electron');

var currentWindow = remote.BrowserWindow.getFocusedWindow();

document.getElementById("minimize").addEventListener("click", function (e) {
	currentWindow.minimize();
});

document.getElementById("maximize").addEventListener("click", function (e) {
	if (currentWindow.isMaximized())
	{
		currentWindow.unmaximize();
	}
	else
	{
		currentWindow.maximize();
	}
});

document.getElementById("close").addEventListener("click", function (e) {
	currentWindow.close();
});