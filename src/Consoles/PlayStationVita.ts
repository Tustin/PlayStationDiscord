import { PlayStationConsoleType, PlayStationConsole } from './PlayStationConsole';

export default class PlayStationVita extends PlayStationConsole
{
	public constructor()
	{
		super(PlayStationConsoleType.PSVITA, '772576212782546975');
	}

	public get assetName() : string
	{
		return 'vita_main';
	}

	public get consoleName() : string
	{
		return 'PlayStation Vita';
	}
}