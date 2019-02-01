interface AvatarUrlModel
{
	size:		string;
	avatarUrl:	string;
}

interface PresenceModel
{
	onlineStatus:	string;
	platform:		string;
	npTitleId:		string;
	titleName:		string;
	npTitleIconUrl:	string;
	gameStatus:		string;
}

export interface ProfileModel
{
	onlineId: 				string;
	avatarUrls: 			AvatarUrlModel[];
	plus:					boolean;
	primaryOnlineStatus: 	string;
	presences:				PresenceModel[];
}