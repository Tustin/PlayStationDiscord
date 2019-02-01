export const ps4ClientId : string 		= '457775893746810880';
export const ps3ClientId : string 		= '459823182044725269';
export const psVitaClientId : string 	= '493957159323828259';

let discordClient : any;

import {DiscordPresenceModel } from './Model/DiscordPresenceModel';

interface DiscordPresenceDefaultDataModel
{
	largeImageKey: string;
	largeImageText: string;
  	smallImageKey: string;
  	smallImageText: string;
  	instance: boolean;
}

// type DiscordActivity = DiscordPresenceModel | DiscordPresenceDefaultDataModel;

export class DiscordController
{
	private _currentConsole : string;
	private _running : boolean = false;
	private _defaultInfo : DiscordPresenceDefaultDataModel =  {
		largeImageKey: "ps4_main",
		largeImageText: "PlayStation 4",
		smallImageKey: "ps4_main",
		smallImageText: "PlayStation 4",
		instance: true
	};

	constructor(clientId : string)
	{
		this._currentConsole = clientId;

		discordClient = require('discord-rich-presence')(clientId);

		this._running = true;
	}

	running() : boolean
	{
		return this._running;
	}

	stop() : void
	{
		discordClient.disconnect();
		this._running = false;
		console.log('discord client destroyed');
	}

	update(data : DiscordPresenceModel) : Promise<void>
	{
		return new Promise((resolve, reject) => {
			if (!this.running()) {
				reject('discord controller not running');
			} else {
				discordClient.updatePresence({...this._defaultInfo, ...data});
				resolve();
			}
		});
	}
}