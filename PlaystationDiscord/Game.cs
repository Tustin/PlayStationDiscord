using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Flurl.Http;

namespace PlaystationDiscord
{
	static class Game
	{

		public static List<string> Games { get; private set; }


		/// <summary>
		/// Fetches the list of supported games from the repo.
		/// 
		/// This is used to get all the games which have a custom icon asset saved in the Discord application.
		/// 
		/// </summary>
		/// <returns>The list of game SKUs.</returns>
		public static async Task<List<string>> FetchGames()
		{
			Games = await "https://raw.githubusercontent.com/Tustin/PlayStationDiscord/master/PlaystationDiscord/Resources/games.json".GetJsonAsync<List<string>>();

			return Games;
		}

	}
}
