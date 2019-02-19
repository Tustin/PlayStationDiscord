import { app, BrowserWindow, dialog, ipcMain, nativeImage, shell, Tray, Menu, Notification } from 'electron';
import { IPresenceModel, IProfileModel } from './Model/ProfileModel';
import { IOAuthTokenCodeRequestModel, IOAuthTokenRefreshRequestModel, IOAuthTokenResponseModel, } from './Model/AuthenticationModel';
import { DiscordController } from './DiscordController';
import {PlayStationConsole, PlayStationConsoleType } from './Consoles/PlayStationConsole';
import { IDiscordPresenceModel, IDiscordPresenceUpdateOptions } from './Model/DiscordPresenceModel';
import { autoUpdater } from 'electron-updater';
import axios from 'axios';
import PlayStation4 from './Consoles/PlayStation4';
import PlayStation3 from './Consoles/PlayStation3';
import PlayStationVita from './Consoles/PlayStationVita';

import _store = require('electron-store');
import queryString = require('query-string');
import https = require('https');
import log = require('electron-log');
import events = require('events');
import url = require('url');
import path = require('path');
import isDev = require('electron-is-dev');

const supportedGames = require('./SupportedGames');

const store = new _store();
const eventEmitter = new events.EventEmitter();

const sonyLoginUrl : string = 'https://id.sonyentertainmentnetwork.com/signin/?service_entity=urn:service-entity:psn&response_type=code&client_id=ba495a24-818c-472b-b12d-ff231c1b5745&redirect_uri=https://remoteplay.dl.playstation.net/remoteplay/redirect&scope=psn:clientapp&request_locale=en_US&ui=pr&service_logo=ps&layout_type=popup&smcid=remoteplay&PlatformPrivacyWs1=exempt&error=login_required&error_code=4165&error_description=User+is+not+authenticated#/signin?entry=%2Fsignin';

const logoIcon = nativeImage.createFromPath(path.join(__dirname, '../assets/images/logo.png'));

let mainWindow : BrowserWindow = null;
let loginWindow : BrowserWindow = null;

let discordController : DiscordController;
let previousPresence : IPresenceModel;

// Loop Ids
let updateRichPresenceLoop : NodeJS.Timeout;
let refreshAuthTokensLoop : NodeJS.Timeout;

autoUpdater.autoDownload = false;

if (isDev)
{
	log.transports.file.level = 'debug';
	log.transports.console.level = 'debug';
}
else
{
	log.transports.file.level = 'info';
	log.transports.console.level = 'info';
}

const instanceLock = app.requestSingleInstanceLock();
if (!instanceLock)
{
	app.quit();
}

axios.interceptors.request.use((request) => {
	log.debug('Firing axios request:', request);

	return request;
});

app.setAppUserModelId(process.execPath);

function login(data: string) : Promise<IOAuthTokenResponseModel>
{
	return new Promise<IOAuthTokenResponseModel>((resolve, reject) => {
		axios.post('https://auth.api.sonyentertainmentnetwork.com/2.0/oauth/token', data, {
			headers: {
				'Authorization': 'Basic YmE0OTVhMjQtODE4Yy00NzJiLWIxMmQtZmYyMzFjMWI1NzQ1Om12YWlaa1JzQXNJMUlCa1k=',
				'Content-Type': 'application/x-www-form-urlencoded'
			}
		})
		.then((response) => {
			const responseBody = response.data;
			if (responseBody.error)
			{
				return reject(responseBody);
			}

			store.set('tokens', responseBody);

			return resolve(responseBody);
		})
		.catch((err) => {
			return reject(err);
		});
	});
}

// Relevant: https://i.imgur.com/7QDkNqx.png
function showMessageAndDie(message: string, detail?: string) : void
{
	dialog.showMessageBox(null, {
		type: 'error',
		title: 'PlayStationDiscord Error',
		message,
		detail,
		icon: logoIcon
	}, () => {
		app.quit();
	});
}

function spawnLoginWindow() : void
{
	loginWindow = new BrowserWindow({
		width: 414,
		height: 743,
		minWidth: 414,
		minHeight: 763,
		icon: logoIcon,
		title: 'PlayStation Login',
		webPreferences: {
			nodeIntegration: false
		}
	});

	loginWindow.setMenu(null);

	loginWindow.on('closed', () => {
		loginWindow = null;
	});

	loginWindow.loadURL(sonyLoginUrl);

	loginWindow.webContents.on('did-finish-load', () => {
		const browserUrl : string = loginWindow.webContents.getURL();

		if (browserUrl.startsWith('https://remoteplay.dl.playstation.net/remoteplay/redirect'))
		{
			const query : string = queryString.extract(browserUrl);
			const items : any = queryString.parse(query);

			if (!items.code)
			{
				log.error('Redirect URL was found but there was no code in the query string', items);

				showMessageAndDie(
					'An error has occurred during the PSN login process. Please try again.',
					'If the problem persists, please open an issue on the GitHub repo.'
				);

				return;
			}

			const data : string = queryString.stringify({
				grant_type: 'authorization_code',
				code: items.code,
				redirect_uri: 'https://remoteplay.dl.playstation.net/remoteplay/redirect'
			} as IOAuthTokenCodeRequestModel);

			login(data).then((tokenData) =>
			{
				log.info('Saved oauth tokens');
				eventEmitter.emit('logged-in');

				spawnMainWindow();

				loginWindow.close();
			})
			.catch((err) =>
			{
				log.error('Unable to get PSN OAuth tokens', err);

				showMessageAndDie(
					'An error has occurred during the PSN login process. Please try again.',
					'If the problem persists, please open an issue on the GitHub repo.'
				);
			});
		}
	});
}

function spawnMainWindow() : void
{
	const contextMenu = Menu.buildFromTemplate([
		{
			label: 'Show Application',
			click:  () => mainWindow.show()
		},
		{
			label: 'Quit',
			click:  () => {
				mainWindow.destroy();
				app.quit();
			}
		}
	]);

	const tray = new Tray(logoIcon);

	tray.setContextMenu(contextMenu);
	tray.setToolTip('PlayStationDiscord');

	mainWindow = new BrowserWindow({
		width: 512,
		height: 512,
		minWidth: 512,
		minHeight: 512,
		show: false,
		icon: logoIcon,
		backgroundColor: '#23272a',
		webPreferences: {
			nodeIntegration: true
		},
		frame: false,
		title: 'PlayStationDiscord'
	});

	mainWindow.loadURL(url.format({
		pathname: path.join(__dirname, 'app.html'),
		protocol: 'file:',
		slashes: true
	}));

	mainWindow.webContents.on('did-finish-load', () => {
		if (!isDev)
		{
			autoUpdater.checkForUpdates();
		}
		else
		{
			log.debug('Skipping update check because app is running in dev mode');
		}

		// Init this here just in case the initial richPresenceLoop fails and needs to call clearInterval.
		let retries : number;
		let supportedTitleId : string;

		eventEmitter.on('refresh-token-failed', () => {
			log.info('Stopping update rich presence loop because token refresh failed');
			clearTimeout(updateRichPresenceLoop);
		});

		function richPresenceLoop() : void
		{
			fetchProfile().then((profile) => {
				if (!store.get('presenceEnabled', true))
				{
					return undefined;
				}

				if (profile.primaryOnlineStatus !== 'online')
				{
					if (discordController && discordController.running())
					{
						discordController.stop();
						log.info('DiscordController stopped because the user is not online on PlayStation');
					}

					// Just update the form like this so we don't update rich presence.
					mainWindow.webContents.send('presence-data', {
						details: 'Offline'
					});
				}
				else if (profile.primaryOnlineStatus === 'online')
				{
					let discordRichPresenceData : IDiscordPresenceModel;
					let discordRichPresenceOptionsData : IDiscordPresenceUpdateOptions;

					// We really should start handling multiple presences properly at this point...
					const presence = profile.presences[0];
					const platform = presence.platform;

					if (previousPresence === undefined || platform !== previousPresence.platform)
					{
						log.info('Switching console to', platform);

						// Reset cached presence so we get fresh data.
						previousPresence = undefined;

						if (discordController)
						{
							discordController.stop();
							discordController = undefined;
						}

						const platformType = PlayStationConsoleType[platform as (keyof typeof PlayStationConsoleType)];

						if (platformType === undefined)
						{
							log.error(`Unexpected platform type ${platform} was not found in PlayStationConsoleType`);

							return showMessageAndDie(`An error occurred when trying to assign/switch PlayStation console.`);
						}

						const playstationConsole = getConsoleFromType(platformType);

						if (playstationConsole === undefined)
						{
							log.error(`No suitiable PlayStationConsole abstraction could be derived from platform type ${platformType}`);

							return showMessageAndDie(`An error occurred when trying to assign/switch PlayStation console.`);
						}

						discordController = new DiscordController(playstationConsole);

						log.info('Switched console to', playstationConsole.consoleName);
					}

					// Setup previous presence with the current presence if it's empty.
					// Update status if the titleId has changed.
					if (previousPresence === undefined || previousPresence.npTitleId !== presence.npTitleId)
					{
						// See if we're actually playing a title.
						if (presence.npTitleId === undefined)
						{
							discordRichPresenceData = {
								details: 'Online',
							};

							discordRichPresenceOptionsData = {
								hideTimestamp: true
							};

							log.info('Status set to online');
						}
						else
						{
							discordRichPresenceData = {
								details: presence.titleName,
								state: presence.gameStatus,
								startTimestamp: Date.now(),
								largeImageText: presence.titleName
							};

							log.info('Game has switched', presence.titleName);

							if (supportedGames.has(presence.npTitleId) || supportedGames.has(presence.titleName))
							{
								const discordFriendly = presence.npTitleId.toLowerCase();
								discordRichPresenceData.largeImageKey = discordFriendly;
								supportedTitleId = discordFriendly;

								log.info('Using game icon since it is supported');
							}
							else
							{
								supportedTitleId = undefined;
							}
						}
					}
					// Update if game status has changed.
					else if (previousPresence === undefined || previousPresence.gameStatus !== presence.gameStatus)
					{
						discordRichPresenceData = {
							details: presence.titleName,
							state: presence.gameStatus,
							largeImageText: presence.titleName
						};

						if (supportedTitleId !== undefined)
						{
							discordRichPresenceData.largeImageKey = supportedTitleId;
						}

						log.info('Game status has changed', presence.gameStatus);
					}

					// Only send a rich presence update if we have something new.
					if (discordRichPresenceData !== undefined)
					{
						// Cache it.
						previousPresence = presence;

						discordController.update(discordRichPresenceData, discordRichPresenceOptionsData).then(() => {
							log.info('Updated rich presence');
							mainWindow.webContents.send('presence-data', discordRichPresenceData);
						}).catch((err) => {
							log.error('Failed updating rich presence', err);
						});
					}
				}
				mainWindow.webContents.send('profile-data', profile);
				retries = 0;
			})
			.catch((err) => {
				log.error('Failed fetching PSN profile', err);

				if (++retries === 5)
				{
					clearInterval(updateRichPresenceLoop);
					log.error('Stopped rich presence loop because of too many retries without success');
				}
			});
		}

		richPresenceLoop();

		updateRichPresenceLoop = setInterval(richPresenceLoop, 15000);
	});

	mainWindow.on('ready-to-show', () => {
		mainWindow.show();
		mainWindow.focus();
	});

	mainWindow.on('closed', () => {
		mainWindow = null;
	});

	mainWindow.on('minimize', () => {
		if (process.platform !== 'win32')
		{
			return;
		}

		mainWindow.hide();

		if (Notification.isSupported())
		{
			const notification = new Notification({
				title: 'Still Here!',
				body: 'PlayStationDiscord is still running in the tray. You can restore it by double clicking the icon in the tray.',
				icon: logoIcon
			});

			notification.show();
		}
		else
		{
			log.warn('Tray notification not shown because notifications aren\'t supported on this platform', process.platform);
		}

		tray.on('double-click', () => {
			if (!mainWindow.isVisible())
			{
				mainWindow.show();
				mainWindow.focus();
			}
		});
	});
}

function getConsoleFromType(type: PlayStationConsoleType) : PlayStationConsole
{
	if (type === PlayStationConsoleType.PS4)
	{
		return new PlayStation4();
	}

	if (type === PlayStationConsoleType.PS3)
	{
		return new PlayStation3();
	}

	if (type === PlayStationConsoleType.PSVITA)
	{
		return new PlayStationVita();
	}

	return undefined;
}

function fetchProfile() : Promise<IProfileModel>
{
	return new Promise<IProfileModel>((resolve, reject) => {
		const accessToken = store.get('tokens.access_token');

		axios.get('https://us-prof.np.community.playstation.net/userProfile/v1/users/me/profile2?fields=onlineId,avatarUrls,plus,primaryOnlineStatus,presences(@titleInfo)&avatarSizes=m,xl&titleIconSize=s', {
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		})
		.then((response) => {
			const responseBody = response.data;
			if (responseBody.error)
			{
				return reject(responseBody);
			}

			return resolve(responseBody.profile);
		})
		.catch((err) => {
			return reject(err);
		});
	});
}

function refreshTokenRequestData() : string
{
	const tokens = store.get('tokens');

	return queryString.stringify({
		grant_type: 'refresh_token',
		refresh_token: tokens.refresh_token,
		redirect_uri: 'https://remoteplay.dl.playstation.net/remoteplay/redirect',
		scope: tokens.scope
	} as IOAuthTokenRefreshRequestModel);
}

eventEmitter.on('logged-in', () => {
	log.debug('Logged in event triggered');

	const refreshTokens = () => {
		const requestData = refreshTokenRequestData();

		login(requestData).then((responseData) => {
			log.info('Refreshed PSN OAuth tokens');
		})
		.catch((err) => {
			// We should probably try this multiple times if it fails, but I can't think of many reasons why it would.
			log.error('Failed refreshing PSN OAuth tokens', err);

			showMessageAndDie(
				'Sorry, an error occurred when trying to refresh your account tokens. Please restart the program.'
			);

			eventEmitter.emit('token-refresh-failed');
		});
	};
	// Going to hardcode this refresh value for now in case it is causing issues.
	// Old expire time: parseInt(store.get('tokens.expires_in'), 10) * 1000);
	refreshAuthTokensLoop = setInterval(refreshTokens, 3599 * 1000);
});

eventEmitter.on('token-refresh-failed', () => {
	clearInterval(refreshAuthTokensLoop);
});

ipcMain.on('toggle-presence', () => {
	const newValue = !store.get('presenceEnabled');
	store.set('presenceEnabled', newValue);

	if (!newValue)
	{
		discordController.stop();
	}
});

ipcMain.on('signout', () => {
	dialog.showMessageBox(null, {
		type: 'question',
		title: 'PlayStationDiscord Alert',
		buttons: ['Yes', 'No'],
		defaultId: 0,
		message: 'Are you sure you want to sign out?',
		icon: logoIcon
	}, (response) => {
		if (response === 0)
		{
			spawnLoginWindow();
			store.clear();
			clearTimeout(refreshAuthTokensLoop);
			clearTimeout(updateRichPresenceLoop);
			mainWindow.close();
		}
	});
});

autoUpdater.on('download-progress', ({ percent }) => {
	sendUpdateStatus({
		message: `Downloading update ${Math.round(percent)}%`,
	});
});

autoUpdater.on('checking-for-update', () => {
	sendUpdateStatus({
		message: 'Checking for new update...',
		icon: 'bars'
	});
});

autoUpdater.on('update-available', (info) => {
	sendUpdateStatus({
		message: 'New update available',
		icons: 'success'
	});

	// Because macOS requires code-signing for auto updating, we'll just have them download the update manually.
	if (process.platform === 'darwin')
	{
		sendUpdateStatus({
			message: 'New update available. <u id="mac-download">Click here</u> to download!',
			icons: 'success'
		});
	}
	else
	{
		autoUpdater.downloadUpdate();
	}
});

autoUpdater.on('update-not-available', (info) => {
	sendUpdateStatus({
		message: 'Up to date!',
		fade: true,
		icon: 'success'
	});
});

autoUpdater.on('update-downloaded', () => {
	sendUpdateStatus({
		message: 'Update downloaded. Please <u id="install">click here</u> to install - <u id="notes">Release Notes</u>',
		icon: 'success'
	});
});

autoUpdater.on('error', (err) => {
	log.error(err);

	sendUpdateStatus({
		message: 'Auto update failed!',
		icon: 'error'
	});
});

ipcMain.on('update-install', () => {
	autoUpdater.quitAndInstall(true, true);
});

ipcMain.on('show-notes', () => {
	shell.openExternal('https://github.com/Tustin/PlayStationDiscord/releases/latest');
});

ipcMain.on('mac-download', () => {
	shell.openExternal('https://tusticles.com/PlayStationDiscord/');
});

ipcMain.on('discord-reconnect', () => {
	if (discordController && discordController.running())
	{
		toggleDiscordReconnect(true);
	}
});

function toggleDiscordReconnect(toggle: boolean) : void
{
	if (mainWindow)
	{
		mainWindow.webContents.send('disable-discord-reconnect', toggle);
	}
}

function sendUpdateStatus(data: any) : void
{
	if (mainWindow)
	{
		mainWindow.webContents.send('update-status', data);
	}
}

function toggleUpdateInfo(value: boolean) : void
{
	if (mainWindow)
	{
		mainWindow.webContents.send('update-toggle', value);
	}
}

app.on('second-instance', () => {
	if (!mainWindow)
	{
		return;
	}

	if (mainWindow.isMinimized())
	{
		mainWindow.restore();
	}

	return mainWindow.focus();
});

app.on('ready', () => {

	// Fix for #26
	if (process.platform === 'darwin')
	{
		Menu.setApplicationMenu(Menu.buildFromTemplate([{
			label: 'Edit',
			submenu: [
				{ role: 'undo' },
				{ role: 'redo' },
				{ type: 'separator' },
				{ role: 'cut' },
				{ role: 'copy' },
				{ role: 'paste' },
				{ role: 'pasteandmatchstyle' },
				{ role: 'delete' },
				{ role: 'selectall' }
			]
		}]));
	}

	if (store.has('tokens'))
	{
		const requestData = refreshTokenRequestData();

		login(requestData).then((responseData) => {
			log.info('Updated PSN OAuth tokens');
			eventEmitter.emit('logged-in');

			spawnMainWindow();
		}).catch((err) => {
			log.error('Failed logging in with saved OAuth tokens', err);

			spawnLoginWindow();
		});
	}
	else
	{
		spawnLoginWindow();
	}
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin')
	{
		app.quit();
	}
});