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
        console.log(presenceData);
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

    public format() : string {
        return _.get(this.title(), ['format']);
    }

    public icon() : string {
        // Hack. Of course Sony uses 2 different property names for PS4/PS5 lol.
        let key = 'npTitleIconUrl';

        if (this.format() === 'PS5') {
            key = 'conceptIconUrl';
        }

        return _.get(this.title(), [key]);
    }

    public platform() : string {
        return this.presenceData.primaryPlatformInfo.platform;
    }
}