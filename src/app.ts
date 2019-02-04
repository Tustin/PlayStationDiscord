import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { IPresenceModel, IProfileModel } from './Model/ProfileModel';
import { IOAuthTokenCodeRequestModel, IOAuthTokenRefreshRequestModel, IOAuthTokenResponseModel, } from './Model/AuthenticationModel';
import { DiscordController, ps4ClientId, ps3ClientId, psVitaClientId } from './DiscordController';
import { IDiscordPresenceModel, IDiscordPresenceUpdateOptions } from './Model/DiscordPresenceModel';

import _store = require('electron-store');
import queryString = require('query-string');
import https = require('https');
import util = require('util');
import log = require('electron-log');

const store = new _store();

const sonyLoginUrl : string = 'https://id.sonyentertainmentnetwork.com/signin/?service_entity=urn:service-entity:psn&response_type=code&client_id=ba495a24-818c-472b-b12d-ff231c1b5745&redirect_uri=https://remoteplay.dl.playstation.net/remoteplay/redirect&scope=psn:clientapp&request_locale=en_US&ui=pr&service_logo=ps&layout_type=popup&smcid=remoteplay&PlatformPrivacyWs1=exempt&error=login_required&error_code=4165&error_description=User+is+not+authenticated#/signin?entry=%2Fsignin';

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
			response.setEncoding('ascii');

			response.on('data', (body) => {
				const info = JSON.parse(body);

				if (info.error)
				{
					reject(info);
				}
				else
				{
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
		width: 590,
		height: 850,
		webPreferences: {
			nodeIntegration: false
		}
	});

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
				store.set('tokens', tokenData);
				log.info('Saved oauth tokens');

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
		width: 490,
		height: 450,
		minWidth: 490,
		minHeight: 450,
		show: false,
		webPreferences: {
			nodeIntegration: true
		},
		frame: false
	});

	discordController = new DiscordController(ps4ClientId);

	mainWindow.loadFile('./app.html');

	mainWindow.webContents.openDevTools();

	mainWindow.webContents.on('did-finish-load', () => {
		// Init this here just in case the initial richPresenceLoop fails and needs to call clearInterval.
		let loop : NodeJS.Timeout;
		let retries : number;

		function richPresenceLoop() : void
		{
			fetchProfile().then((profile) => {
				if (profile.primaryOnlineStatus !== 'online' && discordController.running())
				{
					discordController.stop();
					log.info('DiscordController stopped because the user is not online');
				}
				else if (profile.primaryOnlineStatus === 'online')
				{
					let discordRichPresenceData : IDiscordPresenceModel;
					let discordRichPresenceOptionsData : IDiscordPresenceUpdateOptions;

					if (!discordController.running())
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
								startTimestamp: Date.now()
							};

							log.info('Game has switched', presence.titleName);
						}
					}
					// Update if game status has changed.
					else if (previousPresence === undefined || previousPresence.gameStatus !== presence.gameStatus)
					{
						discordRichPresenceData = {
							details: presence.titleName,
							state: presence.gameStatus,
						};

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
					clearInterval(loop);
					log.error('Stopped rich presence loop because of too many retries without success');
				}
			});
		}

		richPresenceLoop();

		loop = setInterval(richPresenceLoop, 15000);
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
		const accessToken = store.get('tokens.access_token', true);

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

app.on('ready', () => {

	if (store.has('tokens'))
	{
		const tokens = store.get('tokens');

		const requestData : string = queryString.stringify({
			grant_type: 'refresh_token',
			refresh_token: tokens.refresh_token,
			redirect_uri: 'https://remoteplay.dl.playstation.net/remoteplay/redirect',
			scope: tokens.scope
		} as IOAuthTokenRefreshRequestModel);

		login(requestData).then((responseData) => {
			store.set('tokens', responseData);

			log.info('Updated PSN OAuth tokens');

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