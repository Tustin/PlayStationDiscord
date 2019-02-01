export interface OAuthTokenResponseModel
{
	access_token: 	string;
	token_type: 	string;
	refresh_token: 	string;
	expires_in: 	number;
	scope:			string;
}

export interface OAuthTokenCodeRequestModel
{
	code: 			string;
	grant_type: 	string;
	redirect_uri:	string;
}

export interface OAuthTokenRefreshRequestModel
{
	refresh_token: 	string;
	grant_type: 	string;
	redirect_uri:	string;
	scope:			string;
}