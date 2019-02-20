export interface IOAuthTokenResponse
{
	access_token : string;
	token_type : string;
	refresh_token : string;
	expires_in : number;
	scope : string;
}

export function isOAuthTokenResponse(data: any) : data is IOAuthTokenResponse
{
	const test = data as IOAuthTokenResponse;

	return test.access_token !== undefined;
}

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