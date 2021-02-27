export interface IOAuthTokenCodeRequest
{
	code : string;
	grant_type : string;
	redirect_uri : string;
}

export interface IOAuthTokenRefreshRequest
{
	refresh_token : string;
	grant_type : string;
	redirect_uri : string;
	scope : string;
}