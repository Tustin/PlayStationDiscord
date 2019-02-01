export const ps4ClientId : string 		= '457775893746810880';
export const ps3ClientId : string 		= '459823182044725269';
export const psVitaClientId : string 	= '493957159323828259';

let discordClient : any;

import { IDiscordPresenceModel } from './Model/DiscordPresenceModel';

interface IDiscordPresenceDefaultDataModel
{
  	instance : boolean;
	largeImageKey : string;
	largeImageText : string;
  	smallImageKey : string;
  	smallImageText : string;
}

export class DiscordController
{
	private _currentConsole : string;
	private _running : boolean = false;
	private _defaultInfo : IDiscordPresenceDefaultDataModel =  {
		instance: true,
		largeImageKey: 'ps4_main',
		largeImageText: 'PlayStation 4',
		smallImageKey: 'ps4_main',
		smallImageText: 'PlayStation 4'
	};

	constructor(clientId: string)
	{
		this._currentConsole = clientId;

		discordClient = require('discord-rich-presence')(clientId);

		this._running = true;
	}

	public running() : boolean
	{
		return this._running;
	}

	public stop() : void
	{
		discordClient.disconnect();
		this._running = false;
		console.log('discord client destroyed');
	}

	public update(data: IDiscordPresenceModel) : Promise<void>
	{
		return new Promise((resolve, reject) => {
			if (!this.running())
			{
				reject('discord controller not running');
			}
			else
			{
				discordClient.updatePresence({...this._defaultInfo, ...data});
				resolve();
			}
		});
	}
}