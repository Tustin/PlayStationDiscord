import { IOAuthTokenRefreshRequest } from './Model/AuthenticationModel';
import axios from 'axios';
import appEvent from '../../Events';
import { IProfileModel } from './Model/ProfileModel';
import { IBasicPresence, IPresenceModel } from './Model/PresenceModel';
import _store = require('electron-store');
const store = new _store();

import queryString = require('query-string');
import Presence from './Presence';
import { IAccount } from '../IAccount';
import { IOAuthTokenResponse } from '../../Model/IOAuthTokenResponse';
import AbstractProfile from '../AbstractProfile';
import Profile from './Profile';

const clientAuthorization = 'YWM4ZDE2MWEtZDk2Ni00NzI4LWIwZWEtZmZlYzIyZjY5ZWRjOkRFaXhFcVhYQ2RYZHdqMHY=';

export class PlayStationAccount implements IAccount
{
    private _accountData : IOAuthTokenResponse;

    public static loginUrl : string = 'https://ca.account.sony.com/api/authz/v3/oauth/authorize?response_type=code&app_context=inapp_ios&device_profile=mobile&extraQueryParams=%7B%0A%20%20%20%20PlatformPrivacyWs1%20%3D%20minimal%3B%0A%7D&token_format=jwt&access_type=offline&scope=psn%3Amobile.v1%20psn%3Aclientapp&service_entity=urn%3Aservice-entity%3Apsn&ui=pr&smcid=psapp%253Asettings-entrance&darkmode=true&redirect_uri=com.playstation.PlayStationApp%3A%2F%2Fredirect&support_scheme=sneiprls&client_id=ac8d161a-d966-4728-b0ea-ffec22f69edc&duid=0000000d0004008088347AA0C79542D3B656EBB51CE3EBE1&device_base_font_size=10&elements_visibility=no_aclink&service_logo=ps';

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

    public data() : IOAuthTokenResponse
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
            formData = PlayStationAccount.refreshTokenFormData(this.data());

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

    public presences() : Promise<Presence>
    {
        return new Promise<Presence>((resolve, reject) => {
            const accessToken = this.data().access_token;

            axios.get<IPresenceModel>('https://m.np.playstation.net/api/userProfile/v1/internal/users/me/basicPresences?type=primary', {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            })
            .then((response) => {
                const responseBody = response.data;

                appEvent.emit('presence-data', responseBody.basicPresence);

                return resolve(new Presence(responseBody.basicPresence));
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

    public accountId() : Promise<string>
    {
        return new Promise<string>((resolve, reject) => {
            if (store.has('accountId'))
            {
                return resolve(store.get('accountId'));
            }

            const accessToken = this.data().access_token;
            axios.get('https://dms.api.playstation.com/api/v1/devices/accounts/me', {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            })
            .then((response) => {
                const accountId = response.data.accountId;

                store.set('accountId', accountId);

                return resolve(accountId);
            })
            .catch((err) => {
                if (err.response)
                {
                    return reject(err.response.error);
                }

                return reject(err);
            });
        });
    }

    public profile() : Promise<AbstractProfile>
    {
        return new Promise<AbstractProfile>((resolve, reject) => {
            const accessToken = this.data().access_token;

            this.accountId()
            .then((accountId) => {
                axios.get<IProfileModel>(`https://m.np.playstation.net/api/userProfile/v1/internal/users/${accountId}/profiles`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                })
                .then((response) => {
                    const responseBody = response.data;

                    const profile = new Profile(responseBody);

                    appEvent.emit('profile-data', profile);

                    return resolve(profile);
                })
                .catch((err) => {
                    appEvent.emit('profile-data-failed', err);

                    if (err.response)
                    {
                        return reject(err.response.error);
                    }

                    return reject(err);
                });
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