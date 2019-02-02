export interface IDiscordPresenceUpdateOptions
{
	hideTimestamp : boolean;
}

export interface IDiscordPresenceModel
{
  	details : string;
	state? : string;
  	startTimestamp? : number;
}