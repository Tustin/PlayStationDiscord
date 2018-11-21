using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using static DiscordRpc;

namespace PlayStationDiscord
{
	internal class DiscordController
	{
		public static RichPresence presence;
		private static EventHandlers handlers;
		private static CancellationTokenSource CallbacksCts = new CancellationTokenSource();

		// Application IDs for each supported platform.
		public static string PS4ApplicationId = "457775893746810880";
		public static string PS3ApplicationId = "459823182044725269";
		public static string VitaApplicationId = "493957159323828259";

		public bool Running { get; set; }

		public void Initialize(KeyValuePair<DiscordApplicationId, ConsoleInformation> application)
		{
			handlers = new EventHandlers();
			handlers.readyCallback += ReadyCallback;
			handlers.disconnectedCallback += DisconnectedCallback;
			handlers.errorCallback += ErrorCallback;
			DiscordRpc.Initialize(application.Value.ClientId, ref handlers, true, default(string));
			CallbacksCts = new CancellationTokenSource();
			Task.Run(() => RunCallbacksController());
			this.Running = true;
		}

		public void Stop()
		{
			CallbacksCts.Cancel();
			DiscordRpc.Shutdown();
			this.Running = false;
		}

		public void ReadyCallback()
		{
			//
		}

		public void DisconnectedCallback(int errorCode, string message)
		{
			Logger.Write($"Disconnect callback fired: {errorCode} - {message}");
		}

		public void ErrorCallback(int errorCode, string message)
		{
			Logger.Write($"Error callback fired: {errorCode} - {message}");
		}

		private static void RunCallbacksController()
		{
			while (!CallbacksCts.IsCancellationRequested)
			{
				DiscordRpc.RunCallbacks();
				Thread.Sleep(1000);
			}
		}
	}
}
