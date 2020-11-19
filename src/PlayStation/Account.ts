import { IOAuthTokenRefreshRequest, IOAuthTokenResponse, isOAuthTokenResponse } from '../Model/AuthenticationModel';
import axios from 'axios';
import appEvent from '../Events';
import { IProfileModel } from '../Model/ProfileModel';
import { IBasicPresence, IPresenceModel } from '../Model/PresenceModel';

import queryString = require('query-string');

const clientAuthorization = 'YWM4ZDE2MWEtZDk2Ni00NzI4LWIwZWEtZmZlYzIyZjY5ZWRjOkRFaXhFcVhYQ2RYZHdqMHY=';

export default class PlayStationAccount
{
	private _accountData : IOAuthTokenResponse;

	private static refreshTokenFormData(tokenData: IOAuthTokenResponse) : IOAuthTokenRefreshRequest
	{
		return {
			grant_type: 'refresh_token',
			token_format: 'jtw',
			refresh_token: tokenData.refresh_token,
			scope: tokenData.scope
		} as IOAuthTokenRefreshRequest;
	}

	private constructor(accountData: IOAuthTokenResponse)
	{
		this._accountData = accountData;
	}

	public get data() : IOAuthTokenResponse
	{
		return this._accountData;
	}

	public static login(info: string) : Promise<PlayStationAccount>
	{
		return new Promise<PlayStationAccount>((resolve, reject) => {
			const formData = queryString.stringify({
					smcid: 'psapp%3Asettings-entrance',
					access_type: 'offline',
					code: info as string,
					service_logo: 'ps',
					ui: 'pr',
					elements_visibility: 'no_aclink',
					redirect_uri: 'com.playstation.PlayStationApp://redirect',
					support_scheme: 'sneiprls',
					grant_type: 'authorization_code',
					darkmode: 'true',
					token_format: 'jwt',
					device_profile: 'mobile',
					app_context: 'inapp_ios',
					extraQueryParams: '{ PlatformPrivacyWs1 = minimal; }',
				});

			axios.post('https://ca.account.sony.com/api/authz/v3/oauth/token', formData, {
				headers: {
					'Authorization': `Basic ${clientAuthorization}`,
					'Content-Type': 'application/x-www-form-urlencoded'
				}
			})
			.then((response) => {
				const accountData = response.data;

				appEvent.emit('logged-in', accountData);

				return resolve(new this(accountData));
			})
			.catch((err) => {
				appEvent.emit('login-failed', err);

				if (err.response)
				{
					return reject(err.response.data);
				}

				return reject(err);
			});
		});
	}

	public static loginWithRefresh(info: IOAuthTokenResponse) : Promise<PlayStationAccount>
	{
		return new Promise<PlayStationAccount>((resolve, reject) => {
			// This is here because of some weird problem with queryString.stringify
			// - Tustin 5/30/2019
			let formData = {};
			formData = PlayStationAccount.refreshTokenFormData(info);

			axios.post<IOAuthTokenResponse>('https://ca.account.sony.com/api/authz/v3/oauth/token', queryString.stringify(formData), {
				headers: {
					'Authorization': `Basic ${clientAuthorization}`,
					'Content-Type': 'application/x-www-form-urlencoded'
				}
			})
			.then((response) => {
				const accountData = response.data;

				appEvent.emit('logged-in', accountData);

				return resolve(new this(accountData));
			})
			.catch((err) => {
				appEvent.emit('tokens-refresh-failed', err);

				if (err.response)
				{
					return reject(err.response.data);
				}

				return reject(err);
			});
		});
	}

	public refresh() : Promise<IOAuthTokenResponse>
	{
		return new Promise<IOAuthTokenResponse>((resolve, reject) => {
			let formData = {};
			formData = PlayStationAccount.refreshTokenFormData(this.data);

			axios.post<IOAuthTokenResponse>('https://ca.account.sony.com/api/authz/v3/oauth/token', queryString.stringify(formData), {
				headers: {
					'Authorization': `Basic ${clientAuthorization}`,
					'Content-Type': 'application/x-www-form-urlencoded'
				}
			})
			.then((response) => {
				this._accountData = response.data;

				appEvent.emit('tokens-refreshed', this._accountData);

				return resolve(this._accountData);
			})
			.catch((err) => {
				appEvent.emit('tokens-refresh-failed', err);

				if (err.response)
				{
					return reject(err.response.data);
				}

				return reject(err);
			});
		});
	}

	public presences() : Promise<IBasicPresence>
	{
		return new Promise<IBasicPresence>((resolve, reject) => {
			const accessToken = this.data.access_token;

			axios.get<IPresenceModel>('https://m.np.playstation.net/api/userProfile/v1/internal/users/me/basicPresences?type=primary', {
				headers: {
					Authorization: `Bearer ${accessToken}`
				}
			})
			.then((response) => {
				const responseBody = response.data;

				appEvent.emit('presence-data', responseBody.basicPresence);

				return resolve(responseBody.basicPresence);
			})
			.catch((err) => {
				appEvent.emit('presence-data-failed', err);

				if (err.response)
				{
					return reject(err.response.error);
				}

				return reject(err);
			});
		});
	}

	public profile() : Promise<IProfileModel>
	{
		return new Promise<IProfileModel>((resolve, reject) => {
			const accessToken = this.data.access_token;

			axios.get<IProfileModel>('https://m.np.playstation.net/api/userProfile/v1/internal/users/me/profiles', {
				headers: {
					Authorization: `Bearer ${accessToken}`
				}
			})
			.then((response) => {
				const responseBody = response.data;

				appEvent.emit('profile-data', responseBody);

				return resolve(responseBody);
			})
			.catch((err) => {
				appEvent.emit('profile-data-failed', err);

				if (err.response)
				{
					return reject(err.response.error);
				}

				return reject(err);
			});
		});
	}
}