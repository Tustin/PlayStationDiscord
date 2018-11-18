using System;
using System.IO;
using System.Threading.Tasks;
using Flurl.Http;
using Newtonsoft.Json;
using PlayStationDiscord.Models;

namespace PlayStationDiscord
{
	static class Game
	{
		private static string CachedGamesFile => Config.ApplicationDataDirectory + "/games.cached.json";

#if __DEBUG
		private static string GamesFileUrl => "https://raw.githubusercontent.com/Tustin/PlayStationDiscord/master/PlayStationDiscord/Resources/games_test.json";
#else
		private static string GamesFileUrl => "https://raw.githubusercontent.com/Tustin/PlayStationDiscord/master/PlayStationDiscord/Resources/games.json";
#endif

		/// <summary>
		/// Fetches the list of supported games from the repo.
		/// 
		/// This is used to get all the games which have a custom icon asset saved in the Discord application.
		/// 
		/// </summary>
		/// <returns>The list of game SKUs.</returns>
		public static async Task<SupportedGamesModel> FetchGames()
		{
			try
			{
				// Get the last ETag from the config to see if games cache is up-to-date.
				// For some reason, sha1 doesn't seem to give the same hash that GitHub uses for the ETag.
				// I'm unsure if they use some other hash algo or maybe I'm doing something wrong.
				// Tustin - 11/18/2018
				var checksum = Config.ETag;

				// To prevent server caching.
				var time = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

				try
				{
					var request = (GamesFileUrl + $"?_={time}")
						.WithHeader("User-Agent", "PlayStationDiscord (https://github.com/Tustin/PlayStationDiscord)");

					// Only use checksum if the cache file exists and there is a checksum.
					if (File.Exists(CachedGamesFile) && checksum != default(string))
					{
						request.WithHeader("If-None-Match", checksum);
					}

					var response = await request.GetAsync();

					var headers = response.Headers;

					// Set the new ETag to config file.
					Config.ETag = headers.ETag.Tag;

					var body = await response.Content.ReadAsStringAsync();

					File.WriteAllText(CachedGamesFile, body);

					return JsonConvert.DeserializeObject<SupportedGamesModel>(body);
				}
				catch (FlurlHttpException ex)
				{
					var code = ex.Call.Response.StatusCode;

					if (code == System.Net.HttpStatusCode.NotModified)
					{
						try
						{
							using (var stream = File.OpenText(CachedGamesFile))
							{
								return JsonConvert.DeserializeObject<SupportedGamesModel>(stream.ReadToEnd());
							}
						}
						catch (FileNotFoundException)
						{
							Logger.Write("Cached games file doesn't exist but received NotModified response.");
						}
						catch (AccessViolationException)
						{
							Logger.Write("Unable to open cached games file but received NotModified response.");
						}
					}
					else
					{
						Logger.Write($"Unexpected response code {code} received when fetching game info.");
					}
				}
			}
			catch (Exception ex)
			{
				Logger.Write($"Failed to fetch games from external source: {ex.ToString()}");
			}

			return new SupportedGamesModel();
		}
	}
}