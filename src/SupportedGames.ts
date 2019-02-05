import _store = require('electron-store');
import https = require('https');
import log = require('electron-log');

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

		const options : any = {
			headers,
			hostname: 'raw.githubusercontent.com',
			method: 'GET',
			path: '/Tustin/PlayStationDiscord-Games/master/games.json?_=' + Date.now(), // Prevents caching
			port: 443,
		};

		let badLibrary : string = '';

		const request = https.request(options, (response) => {
			response.setEncoding('utf8');

			// Not modified.
			if (response.statusCode === 304)
			{
				log.info('PlayStationDiscord-Games has not been updated, using cached version');

				return;
			}

			response.on('data', (lolWhyIsThisAChunk) => {
				badLibrary += lolWhyIsThisAChunk;
			});

			response.on('end', () => {
				this.store.set('consoles', JSON.parse(badLibrary));
				this.store.set('etag', response.headers.etag);
				log.info('Saved new version of games.json');
			});
		});

		request.on('error', (err) => {
			log.error('Failed requesting games.json from the PlayStationDiscord-Games repo', err);
		});

		request.end();
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