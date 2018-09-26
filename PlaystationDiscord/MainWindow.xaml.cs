using System;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Input;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;
using PlaystationDiscord.Exceptions;
using System.Windows.Media.Imaging;
using System.Globalization;
using PlayStationSharp.API;
using PlayStationSharp.Model.ProfileJsonTypes;
using System.Linq;
using System.Windows.Interop;

namespace PlaystationDiscord
{
	public partial class MainWindow : Window
	{
		private Account m_PlayStationAccount;
		private DiscordController DiscordController { get; set; } = new DiscordController();
		private CancellationTokenSource DiscordCts = new CancellationTokenSource();
		private CancellationTokenSource TokenRefreshCts = new CancellationTokenSource();

		private string CurrentGame { get; set; } = default(string);
		private DateTime TimeStarted { get; set; } = default(DateTime);

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

		public DiscordApplicationId CurrentConsole { get; private set; }

		public DiscordApplicationId GetApplicationId(PresenceModel console)
		{
			switch (console.Platform)
			{
				case "PS3": // Sony...
					return DiscordApplicationId.PS3;
				case "vita":
					return DiscordApplicationId.Vita;
				case "ps4":
				default:
					return DiscordApplicationId.PS4;
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
					}
					catch (ExpiredRefreshTokenException)
					{
						// If we get here, it means both the access token and refresh tokens have expired
						// Might not be necessary but better to have it than not
						StopDiscordControllers();
						break; // Pointless? Stop() will cancel this thread anyways
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
			var applicationId = GetApplicationId(game);

			// If the current console doesn't equal the latest game's console, update it and restart.
			if (CurrentConsole != applicationId)
			{
				CurrentConsole = applicationId;
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

			DiscordController.presence = new DiscordRPC.RichPresence()
			{
				largeImageKey = CurrentConsole == DiscordApplicationId.PS4 ? "ps4_main" : "ps3_main",
				largeImageText = pointer,
			};

			DiscordController.presence.details = pointer;

			// Update game status (if applicable).
			if (game.GameStatus != null)
			{
				DiscordController.presence.state = @game.GameStatus;
			}

			// Only set the timestamp if the user is playing a game. Pointless otherwise.
			if (game.NpTitleId != null)
			{
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

		private void SwitchConsole()
		{
			StopDiscordControllers();
			StartDiscordControllers();
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

			this.CurrentConsole = GetApplicationId(FetchGame());

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
			InitializeComponent();

			NotifyIcon icon = new NotifyIcon()
			{
				Icon = Properties.Resources.icon,
				Visible = true,
				Text = "Discord Rich Presence for PlayStation"
			};
			icon.DoubleClick += Icon_DoubleClick;

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
