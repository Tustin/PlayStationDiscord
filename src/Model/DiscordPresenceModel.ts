export interface IDiscordPresenceUpdateOptions
{
	hideTimestamp : boolean;
}

export interface IDiscordPresenceModel
{
  	details : string;
	state? : string;
	largeImageKey? : string;
	largeImageText? : string;
  	startTimestamp? : number;
}