import _ = require('lodash');
import AbstractPresence from '../AbstractPresence';
import IPresence from '../IPresence';
import { IPresenceModel, IProfileModel } from './Model/ProfileModel';

export default class Presence extends AbstractPresence implements IPresence<IPresenceModel>
{
    public presenceData : IPresenceModel;

    public profile : IProfileModel;

    constructor(presenceData: IPresenceModel)
    {
        super();
        this.presenceData = presenceData;
    }

    public title() : object {
        return this.profile;
    }

    public onlineStatus() : string {
        return this.presenceData.platform;
    }

    public platform() : string {
        return this.presenceData.platform;
    }

    public titleId() : string {
        return this.onlineStatus();
    }
    public titleName() : string {
        return this.onlineStatus();
    }
    public titleStatus() : string {
        return this.onlineStatus();
    }
}