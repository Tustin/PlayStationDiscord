using System;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Input;
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
using System.IO;

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

		/// <summary>
		/// Task that only runs when the access token is about to expire.
		/// </summary>
		/// <param name="cts">CancellationToken</param>
		private async void TokenRefreshTask(CancellationToken cts)
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
						Logger.Write("Both OAuth tokens expired.");
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

		/// <summary>
		/// Task which updates Discord Rich Presence every 30 seconds.
		/// </summary>
		/// <param name="cts">CancellationToken</param>
		private async void UpdateTask(CancellationToken cts)
		{
			while (!cts.IsCancellationRequested)
			{
				var game = FetchCurrentGame();

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

		/// <summary>
		/// Updates Discord rich presence.
		/// </summary>
		/// <param name="game">Game information.</param>
		private void UpdateDiscordPresence(PresenceModel game)
		{
			var console = GetConsoleFromApplicationId(game);

			// If the current console doesn't equal the latest game's console, update it and restart.
			if (CurrentConsole.Key != console.Key)
			{
				CurrentConsole = SupportedConsoles.FirstOrDefault(a => a.Key == console.Key);
				RestartDiscordControllers();
				return;
			}

			var currentStatus = game.TitleName ?? CultureInfo.CurrentCulture.TextInfo.ToTitleCase(game.OnlineStatus);

			DiscordController.presence = new DiscordRpc.RichPresence
			{
				details = currentStatus
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

			if (game.NpTitleId != null)
			{
				// Try to find the title id of a pre-set game using the titleId or use the game name.
				// Doing it this way now for other regions.
				var foundGameInfo = (from g in CurrentConsole.Value.Games
									 where g.TitleId.Equals(game.NpTitleId, StringComparison.OrdinalIgnoreCase)
									 || g.Name.Equals(game.TitleName, StringComparison.OrdinalIgnoreCase)
									 select g).FirstOrDefault();

				// If the list of supported games contains the currently played game, lets use that custom icon.
				if (foundGameInfo != default(GameInfo))
				{
					// Set the small image to the console being played.
					smallImageKey = largeImageKey;
					smallImageText = CurrentConsole.Value.Name;
					// Discord automatically lowercases all assets when uploaded.
					largeImageKey = foundGameInfo.TitleId.ToLower();
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
			DiscordController.presence.largeImageText = currentStatus;
			DiscordController.presence.smallImageKey = smallImageKey;
			DiscordController.presence.smallImageText = smallImageText;

			// Send the presence over to Discord.
			DiscordRpc.UpdatePresence(DiscordController.presence);

			// Update the stuff on the form.
			lblCurrentlyPlaying.Dispatcher.Invoke(new UpdateStatusControlsCallback(UpdateStatusControls),
				new object[] { currentStatus });
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

		private PresenceModel FetchCurrentGame()
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
			try
			{
				var account = Auth.CreateLogin();

				// Login form was closed by the user.
				if (account == null) return;

				FinalizeLoginFlow(account);
			}
			catch (FileNotFoundException ex)
			{
				Logger.Write($"Failed to spawn login form: {ex.ToString()}");
				System.Windows.MessageBox.Show("An error has occurred while attempting to create login form. Please try to install the application again. If the problem persists, please open an issue on the GitHub repo.", "PlayStation", MessageBoxButton.OK, MessageBoxImage.Error);
			}

		}

		/// <summary>
		/// Sets up form properties, grabs information and starts up tasks.
		/// </summary>
		/// <param name="account">PlayStation account.</param>
		private void FinalizeLoginFlow(Account account)
		{
			this.PlayStationAccount = account;

			var game = FetchCurrentGame();

			this.CurrentConsole = GetConsoleFromApplicationId(game);

			lblWelcome.Content = this.PlayStationAccount.Profile.OnlineId;

			var avatars = this.PlayStationAccount.Profile.AvatarUrls;

			// Set avatar if one exists.
			if (avatars.Count > 0)
			{
				var biggest = avatars.Last().AvatarUrl;
				var bitmap = new BitmapImage();

				bitmap.BeginInit();
				bitmap.UriSource = new Uri(biggest, UriKind.Absolute);
				bitmap.EndInit();

				imgAvatar.Source = bitmap;
			}

			SetControlState(true);

			StartDiscordControllers();
		}

		private void SignIn_Closed(object sender, EventArgs e)
		{
			if (PlayStationAccount == null) return;

			TryAutomaticLogin();
		}

		private void Window_Closing(object sender, System.ComponentModel.CancelEventArgs e)
		{
			HandleShutdown();
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

		/// <summary>
		/// Tries to login with tokens from <see cref="TokenHandler.TokensFile"/>.
		/// </summary>
		private void TryAutomaticLogin()
		{
			try
			{
				var account = TokenHandler.Check();

				FinalizeLoginFlow(account);
			}
			catch (Exception ex)
			{
				// Log exception only if the file was found.
				if (!(ex is FileNotFoundException))
				{
					Logger.Write($"Error when logging in with tokens: {ex.ToString()}");
				}

				SetControlState(false);
			}
		}

		public MainWindow()
		{
			if (!UpdateChecker.Latest)
			{
				if (System.Windows.Forms.MessageBox.Show($"A new version has been released.\n\n{UpdateChecker.Changelog}\n\nWould you like to install?", "PlayStationDiscord Update", MessageBoxButtons.YesNo, MessageBoxIcon.Exclamation) == System.Windows.Forms.DialogResult.Yes)
				{
					try
					{
						UpdateChecker.TryToInstall();
						this.Close();
					}
					catch (Exception ex)
					{
						Logger.Write($"Failed to automatically install update: {ex.ToString()}");

						if (System.Windows.Forms.MessageBox.Show("Unable to automatically install update. Would you like to go to the download page?", "PlayStationDiscord Update", MessageBoxButtons.YesNo, MessageBoxIcon.Exclamation) == System.Windows.Forms.DialogResult.Yes)
						{
							Process.Start(UpdateChecker.Url);
							this.Close();
						}
					}
				}
			}

			// Create form.
			InitializeComponent();

			// Instantiate the config file.
			Config.Init();

			//FlurlHttp.Configure(settings =>
			//{
			//	settings.HttpClientFactory = new ProxyHttpClientFactory("http://localhost:8888");
			//});

			this.NotifyIcon = new NotifyIcon()
			{
				Icon = Properties.Resources.icon,
				Visible = true,
				Text = "Discord Rich Presence for PlayStation",
				ContextMenu = new ContextMenu(
					new MenuItem[] { new MenuItem("Exit", notifyIcon_OnExit) }
				)
			};

			this.NotifyIcon.DoubleClick += Icon_DoubleClick;

			var games = Task.Run(SupportedGames.FetchGames).Result;

			// Put this here so we can give it the list of all the games.
			this.SupportedConsoles = new Dictionary<DiscordApplicationId, ConsoleInformation>()
			{
				{ DiscordApplicationId.PS4, new ConsoleInformation("PlayStation 4", "ps4_main", DiscordController.PS4ApplicationId, games.FirstOrDefault(a => a.Key == "ps4").Value) },
				{ DiscordApplicationId.PS3, new ConsoleInformation("PlayStation 3", "ps3_main", DiscordController.PS3ApplicationId, games.FirstOrDefault(a => a.Key == "ps3").Value) },
				{ DiscordApplicationId.Vita, new ConsoleInformation("PlayStation Vita", "vita_main", DiscordController.VitaApplicationId, games.FirstOrDefault(a => a.Key == "vita").Value) }
			};

			TryAutomaticLogin();
		}

		private void btnSignOut_Click(object sender, RoutedEventArgs e)
		{
			if (System.Windows.MessageBox.Show("Are you sure you want to sign out?", "Confirm", MessageBoxButton.YesNo, MessageBoxImage.Question) == MessageBoxResult.Yes)
			{
				StopDiscordControllers();
				SetControlState(false);
				TokenHandler.Delete();
			}
		}

		private void notifyIcon_OnExit(object sender, EventArgs args)
		{
			HandleShutdown();
			this.Close();
		}

		private void HandleShutdown()
		{
			StopDiscordControllers();
			this.NotifyIcon.Visible = false;
			this.NotifyIcon.Icon = null;
		}
	}
}
