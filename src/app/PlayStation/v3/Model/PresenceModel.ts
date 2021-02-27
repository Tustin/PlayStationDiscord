export interface IPrimaryPlatformInfo {
	onlineStatus : string;
	platform : string;
	lastOnlineDate : Date;
}

export interface IGameTitleInfoList {
	npTitleId : string;
	titleName : string;
	format : string;
	launchPlatform : string;
	gameStatus : string;
}

export interface IBasicPresence {
	accountId : string;
	availability : string;
	primaryPlatformInfo : IPrimaryPlatformInfo;
	gameTitleInfoList : IGameTitleInfoList[];
	lastAvailableDate? : Date;
}

export interface IPresenceModel {
	basicPresence : IBasicPresence;
}