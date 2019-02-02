import { app, BrowserWindow, ipcMain } from 'electron';
import { IPresenceModel, IProfileModel } from './Model/ProfileModel';
import { IOAuthTokenCodeRequestModel, IOAuthTokenRefreshRequestModel, IOAuthTokenResponseModel, } from './Model/AuthenticationModel';
import { DiscordController, ps4ClientId, ps3ClientId, psVitaClientId } from './DiscordController';
import { IDiscordPresenceModel, IDiscordPresenceUpdateOptions } from './Model/DiscordPresenceModel';

import _store = require('electron-store');
import queryString = require('query-string');
import https = require('https');
import util = require('util');

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
					reject('failed writing token because of a PSN API error: ' + info.error_description);
				}
				else
				{
					resolve(info);
				}
			});
		});

		request.on('error', (err) => {
			reject('failed sending oauth token request: ' + err);
		});

		request.write(data);
		request.end();
	});
}

function spawnMainWindow() : void
{
	mainWindow = new BrowserWindow({
		width: 490,
		height: 450,
		minWidth: 490,
		minHeight: 450,
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

		function richPresenceLoop() : void
		{
			fetchProfile().then((profile) => {
				if (profile.primaryOnlineStatus !== 'online' && discordController.running())
				{
					discordController.stop();
				}
				else if (profile.primaryOnlineStatus === 'online')
				{
					let discordRichPresenceData : IDiscordPresenceModel;
					let discordRichPresenceOptionsData : IDiscordPresenceUpdateOptions;

					if (!discordController.running())
					{
						discordController = new DiscordController(ps4ClientId);
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

							console.log('status set to online');
						}
						else
						{
							discordRichPresenceData = {
								details: presence.titleName,
								state: presence.gameStatus,
								startTimestamp: Date.now()
							};

							console.log('found new game');
						}
					}
					// Update if game status has changed.
					else if (previousPresence === undefined || previousPresence.gameStatus !== presence.gameStatus)
					{
						discordRichPresenceData = {
							details: presence.titleName,
							state: presence.gameStatus,
						};

						console.log('game status changed');
					}

					if (discordRichPresenceData !== undefined)
					{
						// Cache it.
						previousPresence = presence;

						discordController.update(discordRichPresenceData, discordRichPresenceOptionsData).then(() => {
							console.log('updated rich presence');
							
							mainWindow.webContents.send('profile-data', profile);
						}).catch((err) => {
							console.log(err);
						});
					}
				}
			})
			.catch((err) => {
				console.log(err);
				clearInterval(loop);
			});
		}

		richPresenceLoop();

		loop = setInterval(richPresenceLoop, 15000);
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
					reject('failed getting profile because of a PSN API error: ' + info.error_description);
				}
				else
				{
					resolve(info.profile);
				}
			});
		});

		request.on('error', (err) => {
			reject('failed fetching profile from PSN: ' + err);
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
			console.log('successfully updated tokens');
			spawnMainWindow();
		}).catch((err) => {
			console.log(err);
		});
	}
	else
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
					console.log('hit redirect url but found no code in query string', items);

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
					console.log('successfully saved tokens');

					spawnMainWindow();

					loginWindow.close();
				})
				.catch((err) =>
				{
					console.log(err);
				});
			}
		});
	}
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin')
	{
		app.quit();
	}
});