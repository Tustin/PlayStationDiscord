using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PlaystationDiscord
{
	internal class DiscordController
	{
		public DiscordRPC.RichPresence presence;
		DiscordRPC.EventHandlers handlers;

		public string PS4ApplicationId = "457775893746810880";
		public string PS3ApplicationId = "459823182044725269";
		public string optionalSteamId = string.Empty;

		/// <summary>
		///     Initializes Discord RPC
		/// </summary>
		public void Initialize(DiscordApplicationId applicationId)
		{
			handlers = new DiscordRPC.EventHandlers();
			handlers.readyCallback = ReadyCallback;
			handlers.disconnectedCallback += DisconnectedCallback;
			handlers.errorCallback += ErrorCallback;
			DiscordRPC.Initialize(applicationId == DiscordApplicationId.PS3 ? PS3ApplicationId : PS4ApplicationId, ref handlers, true, optionalSteamId);
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
