export interface IOAuthTokenResponseModel
{
	access_token : string;
	token_type : string;
	refresh_token : string;
	expires_in : number;
	scope : string;
}

export interface IOAuthTokenCodeRequestModel
{
	code : string;
	grant_type : string;
	redirect_uri : string;
}

export interface IOAuthTokenRefreshRequestModel
{
	refresh_token : string;
	grant_type : string;
	redirect_uri : string;
	scope : string;
}