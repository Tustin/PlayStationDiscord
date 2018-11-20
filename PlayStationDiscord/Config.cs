using System;
using System.IO;
using Newtonsoft.Json;
using PlayStationDiscord.Models;

namespace PlayStationDiscord
{
	public static class Config
	{
		public static string ApplicationDataDirectory => Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData) + "/PlayStationDiscord";

		private static string ConfigFile => ApplicationDataDirectory + "/config.json";

		private static ConfigModel _settings { get; set; } = default(ConfigModel);
		
		/// <summary>
		/// ETag hash for games file on GitHub.
		/// </summary>
		public static string ETag
		{
			get
			{
				return _settings.ETag;
			}
			set
			{
				_settings.ETag = value;
				Save();
			}
		}

		/// <summary>
		/// Creates AppData directory is necessary and sets up config file.
		/// </summary>
		public static void Init()
		{
			// Create %appdata% directory if necessary.
			if (!Directory.Exists(ApplicationDataDirectory))
			{
				Directory.CreateDirectory(ApplicationDataDirectory);
			}

			if (_settings == default(ConfigModel))
			{
				// If the config file doesn't exist, create it and fill it with default values.
				if (!File.Exists(ConfigFile))
				{
					using (var stream = File.CreateText(ConfigFile))
					{
						new JsonSerializer().Serialize(stream, new ConfigModel());
					}
				}

				using (var stream = new FileStream(ConfigFile, FileMode.OpenOrCreate))
				using (var reader = new StreamReader(stream))
				{
					_settings = JsonConvert.DeserializeObject<ConfigModel>(reader.ReadToEnd());
				}
			}
		}

		/// <summary>
		/// Save the config file.
		/// </summary>
		public static void Save()
		{
			using (var stream = File.CreateText(ConfigFile))
			{
				var serializer = new JsonSerializer();
				serializer.Serialize(stream, _settings);
			}
		}
	}
}
