using System;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Input;
using System.Security.Cryptography;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;
using PlaystationDiscord.Exceptions;
using PlaystationDiscord.Models;
using System.Windows.Media.Imaging;
using System.Globalization;

namespace PlaystationDiscord
{
	public partial class MainWindow : Window
	{
		private PSN m_Playstation;
		private DiscordController DiscordController { get; set; } = new DiscordController();
		private CancellationTokenSource DiscordCts = new CancellationTokenSource();
		private CancellationTokenSource TokenRefreshCts = new CancellationTokenSource();

		private string CurrentGame { get; set; } = default(string);
		private DateTime TimeStarted { get; set; } = default(DateTime);

		public delegate void UpdateStatusControlsCallback(string currentGame);

		public PSN Playstation
		{
			private get => m_Playstation;
			set
			{
				m_Playstation = value;
				value.Tokens.Write();
				Start();
			}
		}

		private void Start()
		{
			new DiscordController().Initialize();

			DiscordRPC.UpdatePresence(ref DiscordController.presence);

			DiscordCts = new CancellationTokenSource();
			TokenRefreshCts = new CancellationTokenSource();

			Task.Run(() => Update(DiscordCts.Token));
			Task.Run(() => TokenRefresh(TokenRefreshCts.Token));
		}

		private async Task TokenRefresh(CancellationToken cts)
		{
			while (!cts.IsCancellationRequested)
			{
				try
				{
					await Task.Delay(TimeSpan.FromSeconds(Playstation.Tokens.expires_in - 60), cts);

					try
					{
						Playstation.Refresh();
					}
					catch (ExpiredRefreshTokenException)
					{
						// If we get here, it means both the access token and refresh tokens have expired
						// Might not be necessary but better to have it than not
						Stop();
						break; // Pointless? Stop() will cancel this thread anyways
					}
				}
				catch (TaskCanceledException)
				{
					break;
				}
			}
		}

		private void Stop()
		{
			DiscordCts.Cancel();
			TokenRefreshCts.Cancel();
			DiscordRPC.Shutdown();
		}

		public async Task Update(CancellationToken cts)
		{
			while (!cts.IsCancellationRequested)
			{
				UpdatePresence();

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

		private void UpdatePresence()
		{
			var game = FetchGame();

			// Hack - This is a mess
			// So apparently, either something with `ref` in C# OR something with Discord messes up Unicode literals
			// To fix this, instead of passing a string to the struct and sending that over to RPC, we need to make a pointer to it
			// Dirty, but fixes the Unicode characters.
			// https://github.com/discordapp/discord-rpc/issues/119#issuecomment-363916563

			// TODO - Figure out why the pointer will point to junk memory after toggling the enable switch after some time (1 hour+)

			var currentStatus = game.titleName ?? CultureInfo.CurrentCulture.TextInfo.ToTitleCase(game.onlineStatus);
			var encoded = Encoding.UTF8.GetString(Encoding.UTF8.GetBytes(currentStatus));
			encoded += "\0\0"; // Null terminate for the pointer

			var pointer = Marshal.AllocCoTaskMem(Encoding.UTF8.GetByteCount(encoded));
			Marshal.Copy(Encoding.UTF8.GetBytes(encoded), 0, pointer, Encoding.UTF8.GetByteCount(encoded));

			DiscordController.presence = new DiscordRPC.RichPresence()
			{
				largeImageKey = "ps4_main",
				largeImageText = pointer,
			};

			DiscordController.presence.details = pointer;

			if (game.gameStatus != null) DiscordController.presence.state = @game.gameStatus;

			if (game.npTitleId != null)
			{
				if (!game.npTitleId.Equals(CurrentGame))
				{
					DiscordController.presence.startTimestamp = (long)(DateTime.UtcNow - new DateTime(1970, 1, 1)).TotalSeconds;
					CurrentGame = game.npTitleId;
					TimeStarted = DateTime.UtcNow;
				}
				else
				{
					DiscordController.presence.startTimestamp = (long)(TimeStarted - new DateTime(1970, 1, 1)).TotalSeconds;
				}
			}

			DiscordRPC.UpdatePresence(ref DiscordController.presence);
			lblCurrentlyPlaying.Dispatcher.Invoke(new UpdateStatusControlsCallback(UpdateStatusControls),
				new object[] { currentStatus });

			// Leak? - Not sure if this is the right method to free the marshal'd mem
			Marshal.FreeCoTaskMem(pointer);
		}

		private void UpdateStatusControls(string currentGame)
		{
			lblCurrentlyPlaying.Content = $"Status: {currentGame}";
			lblLastUpdated.Content = $"Last Updated: {DateTime.Now.ToShortTimeString()}";
		}

		private ProfileRoot GetProfile(int tries = 0)
		{
			return Task.Run(async () => await Playstation.Info()).Result; // Deadlock

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
			}

		}

		private Presence FetchGame()
		{
			var data = GetProfile();
			return data.profile.presences[0];
		}

		private void LoadComponents()
		{
			try
			{
				var tokens = Tokens.Check();

				Playstation = new PSN(tokens).Refresh();

				var info = GetProfile();

				lblWelcome.Content = $"Welcome, {info.profile.onlineId}!";

				var bitmap = new BitmapImage();
				bitmap.BeginInit();
				bitmap.UriSource = new Uri(info.profile.avatarUrls[1].avatarUrl, UriKind.Absolute);
				bitmap.EndInit();

				imgAvatar.Source = bitmap;

				SetControlState(true);
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

		private void Icon_DoubleClick(object sender, EventArgs e)
		{
			this.Show();
			this.WindowState = WindowState.Normal;
		}

		private void Button_Click(object sender, RoutedEventArgs e)
		{
			var signIn = new SignIn();
			signIn.Closed += SignIn_Closed;
			signIn.Show();
		}

		private void SignIn_Closed(object sender, EventArgs e)
		{
			if (Playstation == null) return;

			LoadComponents();
		}

		private void Window_Closing(object sender, System.ComponentModel.CancelEventArgs e)
		{
			Stop();
		}

		private void togEnableRP_PreviewMouseUp(object sender, MouseButtonEventArgs e)
		{
			if (togEnableRP.IsOn) Stop();
			else Start();
		}

		private void Window_StateChanged(object sender, EventArgs e)
		{
			if (WindowState == WindowState.Minimized) this.Hide();
		}
	}
}
