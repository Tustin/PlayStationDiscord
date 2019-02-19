import _store = require('electron-store');
import log = require('electron-log');
import axios from 'axios';

interface IGame
{
	name : string;
	titleId : string;
}

interface ISupportedGames
{
	ps4 : IGame[];
	ps3 : IGame[];
	vita : IGame[];
	etag : string;
}

class SupportedGames
{
	public static get instance() : SupportedGames
	{
		return this._instance || (this._instance = new this());
	}

	private static _instance : SupportedGames;

	private store : any;

	private constructor()
	{
		this.store = new _store({
			name: 'games',
		});

		const checksum = this.store.get('etag');

		const headers : any = {
			'User-Agent': 'PlayStationDiscord (https://github.com/Tustin/PlayStationDiscord)'
		};

		if (checksum)
		{
			headers['If-None-Match'] = checksum;
		}

		axios.get(`https://raw.githubusercontent.com/Tustin/PlayStationDiscord-Games/master/games.json?_=${Date.now()}`, {
			headers
		})
		.then((response) => {
			this.store.set('consoles', response.data);
			this.store.set('etag', response.headers.etag);

			log.info('Saved new version of games.json');
		})
		.catch((err) => {
			if (err.response.status === 304)
			{
				log.info('PlayStationDiscord-Games has not been updated, using cached version');

				return undefined;
			}

			log.error('Failed requesting games.json from the PlayStationDiscord-Games repo', err);
		});
	}

	public has(identifier: string) : boolean
	{
		return this.get(identifier) !== undefined;
	}

	public get(identifier: string) : IGame
	{
		return this.store.get('consoles.ps4').find((game: IGame) => {
			return (game.titleId.toLowerCase() === identifier.toLowerCase()) || (game.name.toLowerCase() === identifier.toLowerCase());
		});
	}
}

module.exports = SupportedGames.instance;