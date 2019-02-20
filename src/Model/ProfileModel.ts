interface IAvatarUrl
{
	size : string;
	avatarUrl : string;
}

export interface IPresence
{
	onlineStatus : string;
	platform : string;
	npTitleId : string;
	titleName : string;
	npTitleIconUrl : string;
	gameStatus : string;
}

export interface IProfile
{
	onlineId : string;
	avatarUrls : IAvatarUrl[];
	plus : boolean;
	primaryOnlineStatus : string;
	presences : IPresence[];
}