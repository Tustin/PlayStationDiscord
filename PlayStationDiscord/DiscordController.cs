using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PlayStationDiscord
{
	internal class DiscordController
	{
		public DiscordRPC.RichPresence presence;
		DiscordRPC.EventHandlers handlers;

		public static string PS4ApplicationId	= "457775893746810880";
		public static string PS3ApplicationId	= "459823182044725269";
		public static string VitaApplicationId = "493957159323828259";

		public bool Running { get; set; }

		/// <summary>
		///     Initializes Discord RPC
		/// </summary>

		public void Initialize(KeyValuePair<DiscordApplicationId, ConsoleInformation> application)
		{
			handlers = new DiscordRPC.EventHandlers();
			handlers.readyCallback = ReadyCallback;
			handlers.disconnectedCallback += DisconnectedCallback;
			handlers.errorCallback += ErrorCallback;
			DiscordRPC.Initialize(application.Value.ClientId, ref handlers, true, default(string));
			this.Running = true;
		}

		public void Stop()
		{
			DiscordRPC.Shutdown();
			this.Running = false;
		}

		public void ReadyCallback()
		{
			Console.WriteLine("Discord RPC is ready!");
		}

		public void DisconnectedCallback(int errorCode, string message)
		{
			Console.WriteLine($"Error: {errorCode} - {message}");
		}

		public void ErrorCallback(int errorCode, string message)
		{
			Console.WriteLine($"Error: {errorCode} - {message}");
		}
	}
}
