document.getElementById('minimize').addEventListener('click', (e) => {
	ipcRenderer.send('minimize-window');
});

document.getElementById('maximize').addEventListener('click', (e) => {
	ipcRenderer.send('maximize-window');
});

document.getElementById('close').addEventListener('click', (e) => {
	ipcRenderer.send('close-window');
});
