using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Flurl.Http;

namespace PlayStationDiscord
{
	static class Game
	{
		/// <summary>
		/// Fetches the list of supported games from the repo.
		/// 
		/// This is used to get all the games which have a custom icon asset saved in the Discord application.
		/// 
		/// </summary>
		/// <returns>The list of game SKUs.</returns>
		public static async Task<Dictionary<string, List<GameInfo>>> FetchGames()
		{
			try
			{
				return await "https://raw.githubusercontent.com/Tustin/PlayStationDiscord/master/PlayStationDiscord/Resources/games.json".GetJsonAsync<Dictionary<string, List<GameInfo>>>();
			} catch (Exception)
			{
				return new Dictionary<string, List<GameInfo>>();
			}
		}
	}
}
