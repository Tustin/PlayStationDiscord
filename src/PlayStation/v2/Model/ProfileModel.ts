interface IAvatarUrl
{
	size : string;
	avatarUrl : string;
}

export interface IPresenceModel
{
	onlineStatus : string;
	platform : string;
	npTitleId : string;
	titleName : string;
	npTitleIconUrl : string;
	gameStatus : string;
}

export interface IProfileModel
{
	onlineId : string;
	avatarUrls : IAvatarUrl[];
	plus : boolean;
	primaryOnlineStatus : string;
	presences : IPresenceModel[];
}