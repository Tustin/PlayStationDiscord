using System;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Input;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;
using System.Windows.Media.Imaging;
using System.Globalization;
using System.Linq;
using System.Collections.Generic;
using System.Diagnostics;
using PlayStationSharp.API;
using PlayStationSharp.Model.ProfileJsonTypes;
using PlayStationDiscord.Exceptions;
using Newtonsoft.Json;

namespace PlayStationDiscord
{
	public partial class MainWindow : Window
	{
		private Account m_PlayStationAccount;
		private DiscordController DiscordController { get; set; } = new DiscordController();
		private CancellationTokenSource DiscordCts = new CancellationTokenSource();
		private CancellationTokenSource TokenRefreshCts = new CancellationTokenSource();

		private string CurrentGame { get; set; } = default(string);
		private DateTime TimeStarted { get; set; } = default(DateTime);

		private NotifyIcon NotifyIcon { get; set; } = default(NotifyIcon);

		public delegate void UpdateStatusControlsCallback(string currentGame);

		public Account PlayStationAccount
		{
			private get => m_PlayStationAccount;
			set
			{
				m_PlayStationAccount = value;
				TokenHandler.Write(value.Tokens);
			}
		}

		public Dictionary<DiscordApplicationId, ConsoleInformation> SupportedConsoles { get; private set; }

		public KeyValuePair<DiscordApplicationId, ConsoleInformation> CurrentConsole { get; private set; }

		public KeyValuePair<DiscordApplicationId, ConsoleInformation> GetConsoleFromApplicationId(PresenceModel console)
		{
			switch (console.Platform)
			{
				case "PS3": 
					return SupportedConsoles.First(a => a.Key == DiscordApplicationId.PS3);
				case "PSVITA": 
					return SupportedConsoles.First(a => a.Key == DiscordApplicationId.Vita);
				case "ps4":
				default:
					return SupportedConsoles.First(a => a.Key == DiscordApplicationId.PS4);
			}
		}

		private void StartDiscordControllers()
		{
			DiscordController.Initialize(CurrentConsole);

			DiscordCts = new CancellationTokenSource();
			TokenRefreshCts = new CancellationTokenSource();

			Task.Run(() => UpdateTask(DiscordCts.Token));
			Task.Run(() => TokenRefreshTask(TokenRefreshCts.Token));
		}

		private void StopDiscordControllers()
		{
			DiscordCts.Cancel();
			TokenRefreshCts.Cancel();
			DiscordController.Stop();
		}

		public void RestartDiscordControllers()
		{
			StopDiscordControllers();
			StartDiscordControllers();
		}

		private async Task TokenRefreshTask(CancellationToken cts)
		{
			while (!cts.IsCancellationRequested)
			{
				try
				{
					await Task.Delay(TimeSpan.FromSeconds(PlayStationAccount.Tokens.ExpiresIn - 60), cts);

					try
					{
						PlayStationAccount.Tokens.RefreshTokens();
						Logger.Write("Refreshed authorization tokens");
					}
					catch (ExpiredRefreshTokenException)
					{
						// If we get here, it means both the access token and refresh tokens have expired
						// Might not be necessary but better to have it than not
						StopDiscordControllers();
						break;
					}
				}
				catch (TaskCanceledException)
				{
					break;
				}
			}
		}

		private async Task UpdateTask(CancellationToken cts)
		{
			while (!cts.IsCancellationRequested)
			{
				var game = FetchGame();

				if (game.Platform != null)
				{
					if (!DiscordController.Running)
					{
						DiscordController.Initialize(CurrentConsole);
					}

					UpdateDiscordPresence(game);
				}
				else if (DiscordController.Running)
				{
					lblCurrentlyPlaying.Dispatcher.Invoke(new UpdateStatusControlsCallback(UpdateStatusControls),
	new object[] { "Offline" });
					DiscordController.Stop();
				}

				try
				{
					await Task.Delay(TimeSpan.FromSeconds(30), cts);
				}
				catch (TaskCanceledException)
				{
					break;
				}
			}
		}

		private void UpdateDiscordPresence(PresenceModel game)
		{
			var console = GetConsoleFromApplicationId(game);

			// If the current console doesn't equal the latest game's console, update it and restart.
			if (CurrentConsole.Key != console.Key)
			{
				Logger.Write($"Detected console switch: old = {CurrentConsole.Value.Name}, new = {console.Value.Name}");
				CurrentConsole = SupportedConsoles.FirstOrDefault(a => a.Key == console.Key);
				RestartDiscordControllers();
				return;
			}

			// Hack - This is a mess
			// So apparently, either something with `ref` in C# OR something with Discord messes up Unicode literals
			// To fix this, instead of passing a string to the struct and sending that over to RPC, we need to make a pointer to it
			// Dirty, but fixes the Unicode characters.
			// https://github.com/discordapp/discord-rpc/issues/119#issuecomment-363916563

			// TODO - Figure out why the pointer will point to junk memory after toggling the enable switch after some time (1 hour+)
			// Also, now that PS3 is supported, we should probably trim the game name/status
			// Since you can mod the PARAM.SFO for a game and give it a fake name, could cause an overflow issue with Discord

			var currentStatus = game.TitleName ?? CultureInfo.CurrentCulture.TextInfo.ToTitleCase(game.OnlineStatus);
			var encoded = Encoding.UTF8.GetString(Encoding.UTF8.GetBytes(currentStatus));
			encoded += "\0\0"; // Null terminate for the pointer

			var pointer = Marshal.AllocCoTaskMem(Encoding.UTF8.GetByteCount(encoded));
			Marshal.Copy(Encoding.UTF8.GetBytes(encoded), 0, pointer, Encoding.UTF8.GetByteCount(encoded));

			DiscordController.presence = new DiscordRPC.RichPresence
			{
				details = pointer
			};

			// Update game status (if applicable).
			if (game.GameStatus != null)
			{
				DiscordController.presence.state = game.GameStatus;
			}

			string largeImageKey = CurrentConsole.Value.ImageKeyName;
			// These will only be used if the user is playing a supported game.
			string smallImageKey = default(string);
			string smallImageText = default(string);

			// Only set the timestamp if the user is playing a game. Pointless otherwise.
			if (game.NpTitleId != null)
			{
				// If the list of supported games contains the currently played game, lets use that custom icon.
				if (CurrentConsole.Value.Games.Contains(game.NpTitleId, StringComparer.OrdinalIgnoreCase))
				{
					// Set the small image to the console being played.
					smallImageKey = largeImageKey;
					smallImageText = CurrentConsole.Value.Name;
					// Discord automatically lowercases all assets when uploaded.
					largeImageKey = game.NpTitleId.ToLower();

				}
				// If the new game doesn't equal the last game, reset the time.
				if (!game.NpTitleId.Equals(CurrentGame))
				{
					DiscordController.presence.startTimestamp = (long)(DateTime.UtcNow - new DateTime(1970, 1, 1)).TotalSeconds;
					CurrentGame = game.NpTitleId;
					TimeStarted = DateTime.UtcNow;
				}
				else
				{
					DiscordController.presence.startTimestamp = (long)(TimeStarted - new DateTime(1970, 1, 1)).TotalSeconds;
				}
			}

			DiscordController.presence.largeImageKey = largeImageKey;
			DiscordController.presence.largeImageText = pointer;
			DiscordController.presence.smallImageKey = smallImageKey;
			// This should be fine to keep as a string for now (the smallImageText field in DiscordController), 
			// but if for some reason there is ever unicode characters in the string, it'll need to be changed to a pointer.
			DiscordController.presence.smallImageText = smallImageText;

			// Send the presence over to Discord.
			DiscordRPC.UpdatePresence(ref DiscordController.presence);

			// Update the stuff on the form.
			lblCurrentlyPlaying.Dispatcher.Invoke(new UpdateStatusControlsCallback(UpdateStatusControls),
				new object[] { currentStatus });

			Marshal.FreeCoTaskMem(pointer);
		}

		private void UpdateStatusControls(string currentGame)
		{
			lblCurrentlyPlaying.Content = $"Status: {currentGame}";
			lblLastUpdated.Content = $"Last Updated: {DateTime.Now.ToShortTimeString()}";
		}

		private void SetControlState(bool loggedIn)
		{
			if (loggedIn)
			{
				btnSignIn.Visibility = Visibility.Hidden;
				lblWelcome.Visibility = Visibility.Visible;
				imgAvatar.Visibility = Visibility.Visible;
				lblEnableRP.Visibility = Visibility.Visible;
				togEnableRP.Visibility = Visibility.Visible;
				lblCurrentlyPlaying.Visibility = Visibility.Visible;
				lblLastUpdated.Visibility = Visibility.Visible;
				btnSignOut.Visibility = Visibility.Visible;
			}
			else
			{
				btnSignIn.Visibility = Visibility.Visible;
				lblWelcome.Visibility = Visibility.Hidden;
				imgAvatar.Visibility = Visibility.Hidden;
				lblEnableRP.Visibility = Visibility.Hidden;
				togEnableRP.Visibility = Visibility.Hidden;
				lblCurrentlyPlaying.Visibility = Visibility.Hidden;
				lblLastUpdated.Visibility = Visibility.Hidden;
				btnSignOut.Visibility = Visibility.Hidden;
			}

		}

		private PresenceModel FetchGame()
		{
			var presences = PlayStationAccount.GetInfo().Information.Presences;

			if (presences.Count == 0) return null;

			return presences[0];
		}

		private void Icon_DoubleClick(object sender, EventArgs e)
		{
			this.Show();
			this.WindowState = WindowState.Normal;
		}

		private void Button_Click(object sender, RoutedEventArgs e)
		{
			var account = Auth.CreateLogin();

			// Login form was closed by the user.
			if (account == null) return;

			Instantiate(account);
		}

		private void Instantiate(Account account)
		{
			this.PlayStationAccount = account;

			var game = FetchGame();

			Logger.Write($"Game = {JsonConvert.SerializeObject(game)}");

			this.CurrentConsole = GetConsoleFromApplicationId(game);

			lblWelcome.Content = this.PlayStationAccount.Profile.OnlineId;

			var bitmap = new BitmapImage();
			bitmap.BeginInit();
			bitmap.UriSource = new Uri(this.PlayStationAccount.Profile.AvatarUrls[1].AvatarUrl, UriKind.Absolute);
			bitmap.EndInit();

			imgAvatar.Source = bitmap;

			SetControlState(true);

			StartDiscordControllers();
		}

		private void SignIn_Closed(object sender, EventArgs e)
		{
			if (PlayStationAccount == null) return;

			LoadComponents();
		}

		private void Window_Closing(object sender, System.ComponentModel.CancelEventArgs e)
		{
			StopDiscordControllers();
			this.NotifyIcon.Visible = false;
		}

		private void togEnableRP_PreviewMouseUp(object sender, MouseButtonEventArgs e)
		{
			if (togEnableRP.IsOn) StopDiscordControllers();
			else StartDiscordControllers();
		}

		private void Window_StateChanged(object sender, EventArgs e)
		{
			if (WindowState == WindowState.Minimized) this.Hide();
		}

		private void LoadComponents()
		{
			try
			{
				var account = TokenHandler.Check();

				Instantiate(account);
			}
			catch (Exception)
			{
				SetControlState(false);
			}
		}

		public MainWindow()
		{
			if (!UpdateChecker.Latest)
			{
				if (System.Windows.Forms.MessageBox.Show($"A new version has been released.\n\n{UpdateChecker.Changelog}\n\nGo to download page?", "PlayStationDiscord Update", MessageBoxButtons.YesNo, MessageBoxIcon.Exclamation) == System.Windows.Forms.DialogResult.Yes)
				{
					Process.Start(UpdateChecker.Url);
					this.Close();
				}
			}

			InitializeComponent();

			//FlurlHttp.Configure(settings => {
			//	settings.HttpClientFactory = new ProxyHttpClientFactory("http://localhost:8888");
			//});

			this.NotifyIcon = new NotifyIcon()
			{
				Icon = Properties.Resources.icon,
				Visible = true,
				Text = "Discord Rich Presence for PlayStation"
			};

			this.NotifyIcon.DoubleClick += Icon_DoubleClick;

			// Run our task to grab the supported game SKUs from the repo.
			var games = Task.Run(Game.FetchGames).Result;

			this.SupportedConsoles = new Dictionary<DiscordApplicationId, ConsoleInformation>()
			{
				{ DiscordApplicationId.PS4, new ConsoleInformation("PlayStation 4", "ps4_main", DiscordController.PS4ApplicationId, games.FirstOrDefault(a => a.Key == "ps4").Value) },
				{ DiscordApplicationId.PS3, new ConsoleInformation("PlayStation 3", "ps3_main", DiscordController.PS3ApplicationId, games.FirstOrDefault(a => a.Key == "ps3").Value) },
				{ DiscordApplicationId.Vita, new ConsoleInformation("PlayStation Vita", "vita_main", DiscordController.VitaApplicationId, games.FirstOrDefault(a => a.Key == "vita").Value) }
			};

			LoadComponents();
		}

		private void btnSignOut_Click(object sender, RoutedEventArgs e)
		{
			if (System.Windows.MessageBox.Show("Are you sure you want to sign out?", "Confirm", MessageBoxButton.YesNo, MessageBoxImage.Question) == MessageBoxResult.Yes)
			{
				StopDiscordControllers();
				SetControlState(false);
			}
		}
	}
}
