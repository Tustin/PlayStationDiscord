import _ = require('lodash');
import AbstractPresence from '../AbstractPresence';
import IPresence from '../IPresence';
import { IBasicPresence, IGameTitleInfoList } from './Model/PresenceModel';

export default class Presence extends AbstractPresence implements IPresence<IBasicPresence>
{
    presenceData : IBasicPresence;

    constructor(presenceData: IBasicPresence)
    {
        super();
        this.presenceData = presenceData;
    }

    public onlineStatus() : string {
        return this.presenceData.primaryPlatformInfo.onlineStatus;
    }

    public title() : IGameTitleInfoList {
        return _.get(this.presenceData, ['gameTitleInfoList', 0]);
    }

    public titleId() : string {
        return _.get(this.title(), ['npTitleId']);
    }

    public titleName() : string {
        return _.get(this.title(), ['titleName']);
    }

    public titleStatus() : string {
        return _.get(this.title(), ['gameStatus']);
    }

    public platform() : string {
        return this.presenceData.primaryPlatformInfo.platform;
    }
}