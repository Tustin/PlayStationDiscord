using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PlayStationDiscord
{
	class Logger
	{
		private static string ApplicationDataDirectory => Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData) + "/PlayStationDiscord";

		private static string LogFile => ApplicationDataDirectory + "/log.txt";

		private static readonly object Mutex = new object();

		public static void Write(string line)
		{
			lock (Mutex)
			{
				using (var stream = new FileStream(LogFile, FileMode.OpenOrCreate | FileMode.Append))
				using (var writer = new StreamWriter(stream))
				{
					writer.WriteLine($"[{DateTime.Now.ToLongTimeString()}] - {line}");
				}
			}
		}
	}
}
