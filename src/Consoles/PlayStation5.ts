import { PlayStationConsoleType, PlayStationConsole } from './PlayStationConsole';

export default class PlayStation4 extends PlayStationConsole
{
	public constructor()
	{
		super(PlayStationConsoleType.PS5, '772482010878312458');
	}

	public get assetName() : string
	{
		return 'ps5_main';
	}

	public get consoleName() : string
	{
		return 'PlayStation 5';
	}
}