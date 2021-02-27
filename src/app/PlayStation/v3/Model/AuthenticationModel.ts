export interface IOAuthTokenRefreshRequest
{
	refresh_token : string;
	grant_type : string;
	token_format : string;
	scope : string;
}