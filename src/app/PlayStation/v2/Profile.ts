import _ = require('lodash');
import AbstractPresence from '../AbstractPresence';
import AbstractProfile from '../AbstractProfile';
import IPresence from '../IPresence';
import IProfile from '../IProfile';
import { IPresenceModel, IProfileModel } from './Model/ProfileModel';

export default class Profile extends AbstractProfile implements IProfile<IProfileModel>
{
    public profileData : IProfileModel;

    constructor(profileData: IProfileModel)
    {
        super();
        this.profileData = profileData;
    }

    public avatarUrl() : string {
        return this.profileData.avatarUrls[0].avatarUrl;
    }
    public onlineId() : string {
        return this.profileData.onlineId;
    }
}