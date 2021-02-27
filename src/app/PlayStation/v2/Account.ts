/**
 * Old API used to support PS3 titles. Will most likely be deprecated in the future.
 */

import { isOAuthTokenResponse } from '../../Model/IOAuthTokenResponse';
import { IProfileModel } from './Model/ProfileModel';

import axios from 'axios';
import appEvent from '../../Events';

import queryString = require('query-string');
import Presence from './Presence';
import { IAccount } from '../IAccount';
import _ = require('lodash');
import { IOAuthTokenResponse } from '../../Model/IOAuthTokenResponse';
import AbstractProfile from '../AbstractProfile';
import Profile from './Profile';

const authEndpoint = 'https://auth.api.sonyentertainmentnetwork.com/2.0/oauth/token';

const clientAuthorization = 'YmE0OTVhMjQtODE4Yy00NzJiLWIxMmQtZmYyMzFjMWI1NzQ1Om12YWlaa1JzQXNJMUlCa1k=';

export class PlayStationAccount implements IAccount
{
    private _accountData : IOAuthTokenResponse;

    public static loginUrl : string = 'https://ca.account.sony.com/api/v1/oauth/authorize?service_entity=urn:service-entity:psn&response_type=code&client_id=ba495a24-818c-472b-b12d-ff231c1b5745&redirect_uri=https://remoteplay.dl.playstation.net/remoteplay/redirect&scope=psn:clientapp%20referenceDataService:countryConfig.read&request_locale=en_US&ui=pr&service_logo=ps&layout_type=popup&smcid=remoteplay&prompt=always&PlatformPrivacyWs1=&';

    private static refreshTokenFormData(tokenData: IOAuthTokenResponse) : object
    {
        return {
            grant_type: 'refresh_token',
            refresh_token: tokenData.refresh_token,
            redirect_uri: 'https://remoteplay.dl.playstation.net/remoteplay/redirect',
            scope: tokenData.scope
        };
    }

    private constructor(accountData: IOAuthTokenResponse)
    {
        this._accountData = accountData;
    }

    public presences() : Promise<Presence> {
        return new Promise<Presence>((resolve, reject) => {
            return this.profile().then((profile) => {
                return resolve(new Presence(_.get(profile, ['presences', 0])));
            })
            .catch((err) => {
                return reject(err);
            });
        });
    }

    public data() : IOAuthTokenResponse
    {
        return this._accountData;
    }

    public static login(info: string | IOAuthTokenResponse) : Promise<PlayStationAccount>
    {
        return new Promise<PlayStationAccount>((resolve, reject) => {
            let formData = {};

            if (typeof info === 'string')
            {
                formData = {
                    grant_type: 'authorization_code',
                    code: info as string,
                    redirect_uri: 'https://remoteplay.dl.playstation.net/remoteplay/redirect',
                };
            }
            else if (isOAuthTokenResponse(info))
            {
                formData = PlayStationAccount.refreshTokenFormData(info);
            }
            else
            {
                return reject(`Invalid argument type passed to login: ${typeof info}`);
            }

            axios.post<IOAuthTokenResponse>(authEndpoint, queryString.stringify(formData), {
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

    public refresh() : Promise<IOAuthTokenResponse>
    {
        return new Promise<IOAuthTokenResponse>((resolve, reject) => {
            // This is here because of some weird problem with queryString.stringify
            // - Tustin 5/30/2019
            let formData = {};
            formData = PlayStationAccount.refreshTokenFormData(this.data());

            axios.post<IOAuthTokenResponse>(authEndpoint, queryString.stringify(formData), {
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

    public profile() : Promise<AbstractProfile>
    {
        return new Promise<AbstractProfile>((resolve, reject) => {
            const accessToken = this.data().access_token;

            axios.get('https://us-prof.np.community.playstation.net/userProfile/v1/users/me/profile2?fields=onlineId,avatarUrls,plus,primaryOnlineStatus,presences(@titleInfo)&avatarSizes=m,xl&titleIconSize=s', {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            })
            .then((response) => {
                const responseBody = response.data.profile as IProfileModel;

                const profile = new Profile(responseBody);

                appEvent.emit('profile-data', profile);

                return resolve(profile);
            })
            .catch((err) => {
                appEvent.emit('profile-data-failed', err);

                if (err.response)
                {
                    return reject(err.response.data);
                }

                return reject(err);
            });
        });
    }
}