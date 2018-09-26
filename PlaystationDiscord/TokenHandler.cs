using PlayStationSharp.API;
using PlayStationSharp.Exceptions.Auth;
using PlayStationSharp.Extensions;
using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;

namespace PlaystationDiscord
{
	public static class TokenHandler
	{
		private static string ApplicationDataDirectory => Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData) + "/PlayStationDiscord";

		private static string TokensFile => ApplicationDataDirectory + "/tokens.dat";

		public static void Write(OAuthTokens tokens)
		{
			// TODO - Maybe use a serializer here for the entire Tokens object
			var savedTokens = $"{tokens.Authorization}:{tokens.Refresh}";
			var stored = Convert.ToBase64String(ProtectedData.Protect(Encoding.UTF8.GetBytes(savedTokens), null, DataProtectionScope.LocalMachine));
			if (!Directory.Exists(ApplicationDataDirectory)) Directory.CreateDirectory(ApplicationDataDirectory);
			File.WriteAllText(TokensFile, stored);
		}

		public static Account Check()
		{
			if (!File.Exists(TokensFile)) throw new FileNotFoundException();
			var storedTokens = File.ReadAllText(TokensFile);
			var storedTokensDecrypted = Encoding.UTF8.GetString(ProtectedData.Unprotect(Convert.FromBase64String(storedTokens), null, DataProtectionScope.LocalMachine));
			var pieces = storedTokensDecrypted.Split(':');

			try
			{
				var tokens = new OAuthTokens(pieces[1]);
				return new Account(tokens);
			}
			catch (Exception)
			{
				// Throw it back up.
				throw;
			}
		}
	}
}