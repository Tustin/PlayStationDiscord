using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Windows;
using System.Net;
using Newtonsoft.Json;

namespace PlaystationDiscord
{
	/// <summary>
	/// Interaction logic for SignIn.xaml
	/// </summary>
	public partial class SignIn : Window
	{

		public SignIn()
		{
			InitializeComponent();
			browser.Navigate("https://id.sonyentertainmentnetwork.com/signin/?service_entity=urn:service-entity:psn&response_type=code&client_id=ba495a24-818c-472b-b12d-ff231c1b5745&redirect_uri=https://remoteplay.dl.playstation.net/remoteplay/redirect&scope=psn:clientapp&request_locale=en_US&ui=pr&service_logo=ps&layout_type=popup&smcid=remoteplay&PlatformPrivacyWs1=exempt&error=login_required&error_code=4165&error_description=User+is+not+authenticated#/signin?entry=%2Fsignin");
		}

		private void browser_LoadCompleted(object sender, System.Windows.Navigation.NavigationEventArgs e)
		{
			var url = browser.Source;
			if (!url.ToString().StartsWith("https://remoteplay.dl.playstation.net/remoteplay/redirect")) return;

			// Hack/Fix Me! - Dirty way of stripping out each kvp from the query string
			
			var query = url.Query.Remove(0, 1);
			var @params = query.Split('&').ToDictionary(a => a.Split('=')[0], a => Uri.UnescapeDataString(a.Split('=')[1]));

			// TODO - Remove for prod builds
			Debug.Assert(@params["code"] != null);

			// Another Hack - Sony likes to verify the redirect uri in the request
			// Problem is, nearly all libraries that can send form encoded POST requests will also encode the redirect uri param
			// Thus the redirect uri won't match and the API rejects the request

			var login = PSN.Login(@params["code"]);

			(Application.Current.MainWindow as MainWindow).Playstation = login;
			
			this.Close();
		}
	}
}
