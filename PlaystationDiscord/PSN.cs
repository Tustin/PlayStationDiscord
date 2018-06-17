using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Flurl;
using Flurl.Http;

namespace PlaystationDiscord
{
	public class PSN
	{
		private Tokens tokens;

		public PSN(Tokens tokens)
		{
			this.tokens = tokens;	
		}

		public async Task<ProfileRoot> Info()
		{
			// TODO - simplify the query string
			return await "https://us-prof.np.community.playstation.net/userProfile/v1/users/me/profile2?fields=npId,onlineId,avatarUrls,plus,aboutMe,languagesUsed,trophySummary(@default,progress,earnedTrophies),isOfficiallyVerified,personalDetail(@default,profilePictureUrls),personalDetailSharing,personalDetailSharingRequestMessageFlag,primaryOnlineStatus,presences(@titleInfo,hasBroadcastData),friendRelation,requestMessageFlag,blocking,mutualFriendsCount,following,followerCount,friendsCount,followingUsersCount&avatarSizes=m,xl&profilePictureSizes=m,xl&languagesUsedLanguageSet=set3&psVitaTitleIcon=circled&titleIconSize=s"
				.WithOAuthBearerToken(tokens.access_token)
				.GetJsonAsync<ProfileRoot>();
		}



	}
}
