import _ = require('lodash');
import AbstractProfile from '../AbstractProfile';
import IProfile from '../IProfile';
import { IAvatar, IProfileModel } from './Model/ProfileModel';

export default class Profile extends AbstractProfile implements IProfile<IProfileModel>
{
    public profileData : IProfileModel;

    constructor(profileData: IProfileModel)
    {
        super();
        this.profileData = profileData;
    }

    public avatarUrl() : string {
        return Profile.getBiggestAvatar(this.profileData.avatars).url;
    }

    public onlineId() : string {
        return this.profileData.onlineId;
    }

    static getBiggestAvatar(avatars: IAvatar[]) : IAvatar {
        const sizes = ['xl', 'l', 'm', 's', 'xs'];
        let biggest : IAvatar = avatars[0];
        let sizeIndex = -1;

        for (const avatar of avatars) {
            if (avatar.size === 'xl') {
                return avatar;
            }

            const i = sizes.indexOf(avatar.size.toLowerCase());
            if (i === -1)
            {
                continue;
            }

            if (i < sizeIndex)
            {
                sizeIndex = i;
                biggest = avatar;
            }
        }

        return biggest;
    }
}