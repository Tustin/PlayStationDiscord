// Don't try to change the formatting here. These are how the PlayStation API returns the platform names. It's bad, I know.
export enum PlayStationConsoleType
{
	PS4,
	PS3,
	PSVITA
}

export abstract class PlayStationConsole
{
	private _console : PlayStationConsoleType;
	private _clientId : string;

	public abstract get assetName() : string;
	public abstract get consoleName() : string;

	public constructor(console: PlayStationConsoleType, clientId: string)
	{
		this._console = console;
		this._clientId = clientId;
	}

	public get clientId() : string
	{
		return this._clientId;
	}

	public get type() : PlayStationConsoleType
	{
		return this._console;
	}
}