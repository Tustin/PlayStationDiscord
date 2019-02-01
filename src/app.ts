import {app, BrowserWindow} from 'electron';
import Store = require('electron-store');
import queryString = require('query-string');
import https = require('https');
const discordClient = require('discord-rich-presence')('457775893746810880');

const userDataPath = app.getPath ('userData');
const store = new Store({cwd: userDataPath});

const sonyLoginUrl: string = 'https://id.sonyentertainmentnetwork.com/signin/?service_entity=urn:service-entity:psn&response_type=code&client_id=ba495a24-818c-472b-b12d-ff231c1b5745&redirect_uri=https://remoteplay.dl.playstation.net/remoteplay/redirect&scope=psn:clientapp&request_locale=en_US&ui=pr&service_logo=ps&layout_type=popup&smcid=remoteplay&PlatformPrivacyWs1=exempt&error=login_required&error_code=4165&error_description=User+is+not+authenticated#/signin?entry=%2Fsignin';

let mainWindow:		BrowserWindow = null;
let loginWindow:	BrowserWindow = null;

interface OAuthTokenResponseModel
{
	access_token: 	string;
	token_type: 	string;
	refresh_token: 	string;
	expires_in: 	number;
	scope:			string;
}

interface OAuthTokenCodeRequestModel
{
	code: 			string;
	grant_type: 	string;
	redirect_uri:	string;
}

interface OAuthTokenRefreshRequestModel
{
	refresh_token: 	string;
	grant_type: 	string;
	redirect_uri:	string;
	scope:			string;
}

function login(data: string) : Promise<OAuthTokenResponseModel>
{
	return new Promise<OAuthTokenResponseModel>(function (resolve, reject) {
		let options: any = {
			method: 'POST',
			port: 443,
			hostname: 'auth.api.sonyentertainmentnetwork.com',
			path: '/2.0/oauth/token',
			headers: {
				'Authorization': 'Basic YmE0OTVhMjQtODE4Yy00NzJiLWIxMmQtZmYyMzFjMWI1NzQ1Om12YWlaa1JzQXNJMUlCa1k=',
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': data.length
			}
		};

		let request = https.request(options, function(response) {
			response.setEncoding('ascii');
			
			response.on('data', function(body) {
				let info = JSON.parse(body);

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

		request.on('error', function (err) {
			reject('failed sending oauth token request: ' + err)
		});

		request.write(data);
		request.end();
	});
}

function spawnMainWindow() : void
{
	mainWindow = new BrowserWindow({
		width: 200,
		height: 200,
		webPreferences: {
			nodeIntegration: true
		}
	});

	mainWindow.on("closed", () => {
    	mainWindow = null;
  	});
}

let tokens: OAuthTokenResponseModel = null;

app.on('ready', () => {

	if (store.has('tokens'))
	{
		tokens = store.get('tokens');

		let requestData: string = queryString.stringify(<OAuthTokenRefreshRequestModel> {
			grant_type: 'refresh_token',
			refresh_token: tokens.refresh_token,
			redirect_uri: 'https://remoteplay.dl.playstation.net/remoteplay/redirect',
			scope: 'psn:clientapp'
		});

		login(requestData).then((responseData) => {
			store.set('tokens', responseData);
			console.log('successfully updated tokens');
			spawnMainWindow();
			
		}).catch((err) => {
			console.log(err);
		})
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

		loginWindow.loadURL(sonyLoginUrl);
		
		loginWindow.webContents.on('did-finish-load', function () {
			let url: string = loginWindow.webContents.getURL();

			if (url.startsWith('https://remoteplay.dl.playstation.net/remoteplay/redirect'))
			{
				let query: string = queryString.extract(url);
				let items: any = queryString.parse(query);

				if (!items.code)
				{
					console.log('hit redirect url but found no code in query string', items);
					return;
				}

				let data: string = queryString.stringify(<OAuthTokenCodeRequestModel> {
					grant_type: 'authorization_code',
					code: items.code,
					redirect_uri: 'https://remoteplay.dl.playstation.net/remoteplay/redirect'
				});


				login(data).then((data) => {
					store.set('tokens', data);
					console.log('successfully saved tokens');

					loginWindow.close();

					spawnMainWindow();

					}).catch((err) => {
						console.log(err);
				});
			}
        });

	}
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin")
	{
		app.quit();
	}
});