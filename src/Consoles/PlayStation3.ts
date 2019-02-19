import { PlayStationConsoleType, PlayStationConsole } from './PlayStationConsole';

export default class PlayStation3 extends PlayStationConsole
{
	public constructor()
	{
		super(PlayStationConsoleType.PS3, '459823182044725269');
	}

	public get assetName() : string
	{
		return 'ps3_main';
	}

	public get consoleName() : string
	{
		return 'PlayStation 3';
	}
}