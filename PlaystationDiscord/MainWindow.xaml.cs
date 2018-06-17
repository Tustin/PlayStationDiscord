using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Navigation;
using System.Windows.Shapes;
using System.Security.Cryptography;
using System.IO;
using System.Runtime.InteropServices;

namespace PlaystationDiscord
{
	/// <summary>
	/// Interaction logic for MainWindow.xaml
	/// </summary>
	public partial class MainWindow : Window
	{
		private Tokens m_AccountTokens;
		private PSN Playstation;
		private DiscordController DiscordController { get; set; } = new DiscordController();

		public Tokens AccountTokens
		{
			private get => m_AccountTokens;
			set
			{
				m_AccountTokens = value;
				WriteTokens();
				Playstation = new PSN(m_AccountTokens);
				Start();
				UpdatePresence();
			}
		}

		private string ApplicationDataDirectory
		{
			get => Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData) + "/PS4Discord";
		}

		private string TokensFile
		{
			get => ApplicationDataDirectory + "/tokens.dat";
		}

		private void WriteTokens()
		{
			// TODO - Maybe use a serializer here for the entire Tokens object
			var savedTokens = $"{m_AccountTokens.access_token}:{m_AccountTokens.refresh_token}";
			var stored = Convert.ToBase64String(ProtectedData.Protect(Encoding.UTF8.GetBytes(savedTokens), null, DataProtectionScope.LocalMachine));
			if (!Directory.Exists(ApplicationDataDirectory)) Directory.CreateDirectory(ApplicationDataDirectory);
			File.WriteAllText(TokensFile, stored);
		}

		private Tokens CheckForTokens()
		{
			if (!File.Exists(TokensFile)) throw new FileNotFoundException();
			var storedTokens = File.ReadAllText(TokensFile);
			var tokens = Encoding.UTF8.GetString(ProtectedData.Unprotect(Convert.FromBase64String(storedTokens), null, DataProtectionScope.LocalMachine));
			var pieces = tokens.Split(':');
			return new Tokens()
			{
				access_token = pieces[0],
				refresh_token = pieces[1]
			};
		}

		private void Start()
		{
			new DiscordController().Initialize();

			DiscordRPC.UpdatePresence(ref DiscordController.presence);
		}

		private void UpdatePresence()
		{
			var game = FetchGame();

			DiscordController.presence = new DiscordRPC.RichPresence()
			{
				largeImageKey = "ps4_main",
				largeImageText = game.titleName,
			};

			// Hack - This is a mess
			// So apparently, either something with `ref` in C# OR something with Discord messes up Unicode literals
			// To fix this, instead of passing a string to the struct and sending that over to RPC, we need to make a pointer to it
			// Dirty, but fixes the Unicode characters.
			// https://github.com/discordapp/discord-rpc/issues/119#issuecomment-363916563

			var encoded = Encoding.UTF8.GetString(Encoding.UTF8.GetBytes(game.titleName));
			encoded += "\0\0"; // Null terminate for the pointer

			var pointer = Marshal.AllocCoTaskMem(Encoding.UTF8.GetByteCount(encoded));
			Marshal.Copy(Encoding.UTF8.GetBytes(encoded), 0, pointer, Encoding.UTF8.GetByteCount(encoded));
			DiscordController.presence.details = pointer;

			if (game.gameStatus != null) DiscordController.presence.state = @game.gameStatus;

			DiscordRPC.UpdatePresence(ref DiscordController.presence);

			// Leak? - Not sure if this is the right method to free the marshal'd mem
			Marshal.FreeCoTaskMem(pointer);
		}

		private Presence FetchGame()
		{
			var data = Task.Run(async () => await Playstation.Info()).Result; // Deadlock
			return data.profile.presences[0];
		}

		public MainWindow()
		{
			InitializeComponent();

			try
			{
				var tokens = CheckForTokens();

				AccountTokens = new PSN(tokens).Refresh();

				btnSignIn.Visibility = Visibility.Hidden;
			}
			catch (FileNotFoundException)
			{
				btnSignIn.Visibility = Visibility.Visible;
			}
		}

		private void Button_Click(object sender, RoutedEventArgs e)
		{
			new SignIn().Show();
		}

		private void Window_Closing(object sender, System.ComponentModel.CancelEventArgs e)
		{
			DiscordRPC.Shutdown();
		}
	}
}
