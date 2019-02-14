import { app, BrowserWindow, dialog, ipcMain, nativeImage } from 'electron';
import { IPresenceModel, IProfileModel } from './Model/ProfileModel';
import { IOAuthTokenCodeRequestModel, IOAuthTokenRefreshRequestModel, IOAuthTokenResponseModel, } from './Model/AuthenticationModel';
import { DiscordController, ps4ClientId, ps3ClientId, psVitaClientId } from './DiscordController';
import { IDiscordPresenceModel, IDiscordPresenceUpdateOptions } from './Model/DiscordPresenceModel';

import _store = require('electron-store');
import queryString = require('query-string');
import https = require('https');
import util = require('util');
import log = require('electron-log');
import events = require('events');

const supportedGames = require('./SupportedGames');

const store = new _store();
const eventEmitter = new events.EventEmitter();

const sonyLoginUrl : string = 'https://id.sonyentertainmentnetwork.com/signin/?service_entity=urn:service-entity:psn&response_type=code&client_id=ba495a24-818c-472b-b12d-ff231c1b5745&redirect_uri=https://remoteplay.dl.playstation.net/remoteplay/redirect&scope=psn:clientapp&request_locale=en_US&ui=pr&service_logo=ps&layout_type=popup&smcid=remoteplay&PlatformPrivacyWs1=exempt&error=login_required&error_code=4165&error_description=User+is+not+authenticated#/signin?entry=%2Fsignin';

const logoIcon = nativeImage.createFromPath('./assets/images/logo.png');

let mainWindow : BrowserWindow = null;
let loginWindow : BrowserWindow = null;

let discordController : DiscordController;
let previousPresence : IPresenceModel;

function login(data: string) : Promise<IOAuthTokenResponseModel>
{
	return new Promise<IOAuthTokenResponseModel>((resolve, reject) => {
		const options : any = {
			headers: {
				'Authorization': 'Basic YmE0OTVhMjQtODE4Yy00NzJiLWIxMmQtZmYyMzFjMWI1NzQ1Om12YWlaa1JzQXNJMUlCa1k=',
				'Content-Length': data.length,
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			hostname: 'auth.api.sonyentertainmentnetwork.com',
			method: 'POST',
			path: '/2.0/oauth/token',
			port: 443,
		};

		const request = https.request(options, (response) => {
			response.setEncoding('utf8');

			response.on('data', (body) => {
				const info = JSON.parse(body);

				if (info.error)
				{
					reject(info);
				}
				else
				{
					store.set('tokens', info);
					resolve(info);
				}
			});
		});

		request.on('error', (err) => {
			reject(err);
		});

		request.write(data);
		request.end();
	});
}

// Relevant: https://i.imgur.com/7QDkNqx.png
function showMessageAndDie(message: string, detail?: string) : void
{
	dialog.showMessageBox(null, {
		type: 'error',
		title: 'PlayStationDiscord Error',
		message,
		detail
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
		const url : string = loginWindow.webContents.getURL();

		if (url.startsWith('https://remoteplay.dl.playstation.net/remoteplay/redirect'))
		{
			const query : string = queryString.extract(url);
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
		frame: false
	});

	discordController = new DiscordController(ps4ClientId);

	mainWindow.loadFile('./app.html');

	// Hide devtools by default, use ctrl-shift-i if needed
	// MainWindow.webContents.openDevTools();

	mainWindow.webContents.on('did-finish-load', () => {
		// Init this here just in case the initial richPresenceLoop fails and needs to call clearInterval.
		let updateRichPresenceLoop : NodeJS.Timeout;
		let retries : number;
		let supportedTitleId : string;

		eventEmitter.on('refresh-token-failed', () => {
			log.info('Stopping update rich presence loop because token refresh failed');
			clearTimeout(updateRichPresenceLoop);
		});

		function richPresenceLoop() : void
		{
			fetchProfile().then((profile) => {
				if (profile.primaryOnlineStatus !== 'online')
				{
					if (discordController.running())
					{
						discordController.stop();
						log.info('DiscordController stopped because the user is not online');
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

					if (!discordController.running() && store.get('presenceEnabled', true))
					{
						discordController = new DiscordController(ps4ClientId);
						log.info('Created new DiscordController instance');
					}

					// We really should start handling multiple presences properly at this point...
					const presence = profile.presences[0];

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
}

function fetchProfile() : Promise<IProfileModel>
{
	return new Promise<IProfileModel>((resolve, reject) => {
		const accessToken = store.get('tokens.access_token');

		const options = {
			method: 'GET',
			port: 443,
			hostname: 'us-prof.np.community.playstation.net',
			path: '/userProfile/v1/users/me/profile2?fields=onlineId,avatarUrls,plus,primaryOnlineStatus,presences(@titleInfo)&avatarSizes=m,xl&titleIconSize=s',
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		};

		const request = https.request(options, (response) => {
			response.setEncoding('utf8');

			response.on('data', (body) => {
				const info = JSON.parse(body);

				if (info.error)
				{
					reject(body);
				}
				else
				{
					resolve(info.profile);
				}
			});
		});

		request.on('error', (err) => {
			reject(err);
		});

		request.end();
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
	const refreshTokens = () => {
		const requestData = refreshTokenRequestData();

		login(requestData).then((responseData) => {
			log.info('Refreshed PSN OAuth tokens');
			setTimeout(refreshTokens, parseInt(store.get('tokens.expires_in'), 10) * 1000);
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

	setTimeout(refreshTokens, parseInt(store.get('tokens.expires_in'), 10) * 1000);
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
	}, (response) => {
		if (response === 0)
		{
			spawnLoginWindow();
			store.clear();
			mainWindow.close();
		}
	});
});

app.on('ready', () => {

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