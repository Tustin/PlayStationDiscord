export interface IPersonalDetail {
	firstName : string;
	lastName : string;
}

export interface IAvatar {
	size : string;
	url : string;
}

export interface IProfileModel {
	onlineId : string;
	personalDetail : IPersonalDetail;
	aboutMe : string;
	avatars : IAvatar[];
	languages : string[];
	isPlus : boolean;
	isOfficiallyVerified : boolean;
	isMe : boolean;
}