using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;
using Flurl.Http;

namespace PlayStationDiscord
{
	static class UpdateChecker
	{
		private static GitHubReleaseModel _model { get; set; }

		public static string Changelog => _model.Body;
		public static string Url => _model.HtmlUrl;

		public static bool Latest
		{
			get
			{
				try
				{
					var currentVersion = Assembly.GetExecutingAssembly().GetName().Version.ToString();
					_model = "https://api.github.com/repos/Tustin/PlayStationDiscord/releases/latest"
						.WithHeader("User-Agent", "PlayStationDiscord")
						.GetJsonAsync<GitHubReleaseModel>().Result;

					return currentVersion.Equals(_model.TagName, StringComparison.CurrentCultureIgnoreCase);
				}
				catch (Exception) 
				{
					// If we can't get the latest version for some reason, just ignore.
					return true;
				}

			}
		}
	}
}
