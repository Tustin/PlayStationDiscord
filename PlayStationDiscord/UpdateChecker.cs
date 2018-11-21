using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using Flurl.Http;
using PlayStationDiscord.Models;

namespace PlayStationDiscord
{
	static class UpdateChecker
	{
		private static GitHubReleaseModel _model { get; set; }

		public static string Changelog => _model.Body;
		public static string Url => _model.HtmlUrl;
		public static string DownloadUrl => _model.Assets[0].BrowserDownloadUrl;
		public static string FileName => _model.Assets[0].Name;

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
#if !DEBUG
					return currentVersion.Equals(_model.TagName, StringComparison.CurrentCultureIgnoreCase) && !_model.Prerelease;
#else
					return currentVersion.Equals(_model.TagName, StringComparison.CurrentCultureIgnoreCase);
#endif
				}
				catch (Exception ex)
				{
					Logger.Write($"Failed to download update: {ex.ToString()}");
					// If we can't get the latest version for some reason, just ignore.
					return true;
				}
			}
		}

		/// <summary>
		/// Tries to download and execute the latest installer from GitHub.
		/// </summary>
		public static void TryToInstall()
		{
			var newFile = Path.GetTempPath() + FileName;

			if (File.Exists(newFile))
			{
				File.Delete(newFile);
			}

			var file = DownloadUrl.DownloadFileAsync(Path.GetTempPath()).Result;

			if (file != default(string))
			{
				Process.Start(file);
			}
		}
	}
}
