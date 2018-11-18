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

		public static void Init()
		{
			// Create %appdata% directory if necessary.
			if (!Directory.Exists(ApplicationDataDirectory))
			{
				Directory.CreateDirectory(ApplicationDataDirectory);
			}

			if (_settings == default(ConfigModel))
			{
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
