using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace PlaystationDiscord.Models
{
	public class Tokens
	{

		private static string ApplicationDataDirectory
		{
			get => Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData) + "/PS4Discord";
		}

		private static string TokensFile
		{
			get => ApplicationDataDirectory + "/tokens.dat";
		}

		public string access_token { get; set; }
		public string token_type { get; set; }
		public string refresh_token { get; set; }
		public int expires_in { get; set; }
		public string scope { get; set; }

		public void Write()
		{
			// TODO - Maybe use a serializer here for the entire Tokens object
			var savedTokens = $"{this.access_token}:{this.refresh_token}";
			var stored = Convert.ToBase64String(ProtectedData.Protect(Encoding.UTF8.GetBytes(savedTokens), null, DataProtectionScope.LocalMachine));
			if (!Directory.Exists(ApplicationDataDirectory)) Directory.CreateDirectory(ApplicationDataDirectory);
			File.WriteAllText(TokensFile, stored);
		}

		public static Tokens Check()
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
	}
}
