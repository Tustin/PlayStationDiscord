using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using Flurl;
using Flurl.Http;
using Newtonsoft.Json;

namespace PlaystationDiscord
{
	public class PSN
	{
		Tokens m_Tokens;

		public Tokens Tokens
		{
			get => m_Tokens;
		}

		public PSN(Tokens tokens)
		{
			this.m_Tokens = tokens;
		}

		public async Task<ProfileRoot> Info()
		{
			// TODO - simplify the query string
			return await "https://us-prof.np.community.playstation.net/userProfile/v1/users/me/profile2?fields=npId,onlineId,avatarUrls,plus,aboutMe,languagesUsed,trophySummary(@default,progress,earnedTrophies),isOfficiallyVerified,personalDetail(@default,profilePictureUrls),personalDetailSharing,personalDetailSharingRequestMessageFlag,primaryOnlineStatus,presences(@titleInfo,hasBroadcastData),friendRelation,requestMessageFlag,blocking,mutualFriendsCount,following,followerCount,friendsCount,followingUsersCount&avatarSizes=m,xl&profilePictureSizes=m,xl&languagesUsedLanguageSet=set3&psVitaTitleIcon=circled&titleIconSize=s"
				.WithOAuthBearerToken(m_Tokens.access_token)
				.GetJsonAsync<ProfileRoot>();
		}

		// TODO - Throw exception on an expired refresh token
		public PSN Refresh()
		{
			// Hack - Have to do this again, thanks to encoding issues
			var request = (HttpWebRequest)WebRequest.Create("https://auth.api.sonyentertainmentnetwork.com/2.0/oauth/token");

			var post = $"grant_type=refresh_token&refresh_token={this.m_Tokens.refresh_token}&scope=psn:clientapp&";

			var data = Encoding.ASCII.GetBytes(post);

			request.Method = "POST";
			request.ContentType = "application/x-www-form-urlencoded";
			request.ContentLength = data.Length;
			// base64 encoded client-id:client-secret for the remote play app
			request.Headers["Authorization"] = "Basic YmE0OTVhMjQtODE4Yy00NzJiLWIxMmQtZmYyMzFjMWI1NzQ1Om12YWlaa1JzQXNJMUlCa1k=";

			using (var stream = request.GetRequestStream())
			{
				stream.Write(data, 0, data.Length);
			}

			var response = (HttpWebResponse)request.GetResponse();

			var responseString = new StreamReader(response.GetResponseStream()).ReadToEnd();

			this.m_Tokens = JsonConvert.DeserializeObject<Tokens>(responseString);

			return this;
		}

		public static PSN Login(string code)
		{
			var request = (HttpWebRequest)WebRequest.Create("https://auth.api.sonyentertainmentnetwork.com/2.0/oauth/token");

			var post = $"grant_type=authorization_code&code={code}&redirect_uri=https://remoteplay.dl.playstation.net/remoteplay/redirect&";

			var data = Encoding.ASCII.GetBytes(post);

			request.Method = "POST";
			request.ContentType = "application/x-www-form-urlencoded";
			request.ContentLength = data.Length;
			// base64 encoded client-id:client-secret for the remote play app
			request.Headers["Authorization"] = "Basic YmE0OTVhMjQtODE4Yy00NzJiLWIxMmQtZmYyMzFjMWI1NzQ1Om12YWlaa1JzQXNJMUlCa1k=";

			using (var stream = request.GetRequestStream())
			{
				stream.Write(data, 0, data.Length);
			}

			var response = (HttpWebResponse)request.GetResponse();

			var responseString = new StreamReader(response.GetResponseStream()).ReadToEnd();
			
			var token = JsonConvert.DeserializeObject<Tokens>(responseString);

			return new PSN(token);
		}

	}
}
