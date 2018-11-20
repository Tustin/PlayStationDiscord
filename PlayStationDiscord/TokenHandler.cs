using PlayStationSharp.API;
using PlayStationSharp.Exceptions.Auth;
using PlayStationSharp.Extensions;
using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;

namespace PlayStationDiscord
{
	public static class TokenHandler
	{
		private static string TokensFile => Config.ApplicationDataDirectory + "/tokens.dat";

		/// <summary>
		/// Write PSN OAuth tokens to <see cref="TokensFile"/>.
		/// </summary>
		/// <param name="tokens"></param>
		public static void Write(OAuthTokens tokens)
		{
			var savedTokens = $"{tokens.Authorization}:{tokens.Refresh}";
			var stored = Convert.ToBase64String(
				ProtectedData.Protect(
					Encoding.UTF8.GetBytes(savedTokens), null, DataProtectionScope.LocalMachine
				)
			);

			File.WriteAllText(TokensFile, stored);
		}

		/// <summary>
		/// Deletes <see cref="TokensFile"/>.
		/// </summary>
		public static void Delete()
		{
			if (!File.Exists(TokensFile))
			{
				return;
			}

			try
			{
				File.Delete(TokensFile);
			}
			catch (UnauthorizedAccessException)
			{
				Logger.Write("Insufficent permissions when trying to delete tokens file.");
			}
			catch (Exception ex)
			{
				Logger.Write($"Unable to delete tokens file {ex.ToString()}");
			}
		}

		/// <summary>
		/// Checks <see cref="TokensFile"/> and decrypts the OAuth tokens to login to PSN.
		/// </summary>
		/// <returns></returns>
		public static Account Check()
		{
			if (!File.Exists(TokensFile))
			{
				throw new FileNotFoundException();
			}

			var storedTokens = File.ReadAllText(TokensFile);

			var storedTokensDecrypted = Encoding.UTF8.GetString(
				ProtectedData.Unprotect(
					Convert.FromBase64String(storedTokens), null, DataProtectionScope.LocalMachine
				)
			);

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