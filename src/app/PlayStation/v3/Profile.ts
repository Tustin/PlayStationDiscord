import _ = require('lodash');
import AbstractProfile from '../AbstractProfile';
import IProfile from '../IProfile';
import { IProfileModel } from './Model/ProfileModel';

export default class Profile extends AbstractProfile implements IProfile<IProfileModel>
{
    public profileData : IProfileModel;

    constructor(profileData: IProfileModel)
    {
        super();
        this.profileData = profileData;
    }

    public avatarUrl() : string {
        return this.profileData.avatars[0].url;
    }
    public onlineId() : string {
        return this.profileData.onlineId;
    }
}