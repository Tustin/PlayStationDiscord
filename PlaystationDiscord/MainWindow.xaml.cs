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
				Playstation = new PSN(m_AccountTokens);
				Start();
				UpdatePresence();
			}
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
				largeImageText = "PlayStation 4",
			};

			DiscordController.presence.details = game.titleName;

			DiscordRPC.UpdatePresence(ref DiscordController.presence);
		}

		private Presence FetchGame()
		{
			var data = Task.Run(async () => await Playstation.Info()).Result; // Deadlock
			return data.profile.presences[0];
		}

		public MainWindow()
		{
			InitializeComponent();
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
