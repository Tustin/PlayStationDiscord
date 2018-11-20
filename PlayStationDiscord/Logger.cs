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
		private static string LogFile => Config.ApplicationDataDirectory + "/log.txt";

		private static readonly object Mutex = new object();

		/// <summary>
		/// Acquires a lock on <see cref="LogFile"/> and writes <paramref name="line"/>.
		/// </summary>
		/// <param name="line">String to log.</param>
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
