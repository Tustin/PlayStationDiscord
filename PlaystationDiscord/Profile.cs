using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PlaystationDiscord
{
	public class AvatarUrl
	{
		public string size { get; set; }
		public string avatarUrl { get; set; }
	}

	public class EarnedTrophies
	{
		public int platinum { get; set; }
		public int gold { get; set; }
		public int silver { get; set; }
		public int bronze { get; set; }
	}

	public class TrophySummary
	{
		public int level { get; set; }
		public int progress { get; set; }
		public EarnedTrophies earnedTrophies { get; set; }
	}

	public class PersonalDetail
	{
		public string firstName { get; set; }
		public string lastName { get; set; }
	}

	public class Presence
	{
		public string onlineStatus { get; set; }
		public string platform { get; set; }
		public string npTitleId { get; set; }
		public string titleName { get; set; }
		public string npTitleIconUrl { get; set; }
		public bool hasBroadcastData { get; set; }
	}

	public class Profile
	{
		public string onlineId { get; set; }
		public string npId { get; set; }
		public List<AvatarUrl> avatarUrls { get; set; }
		public int plus { get; set; }
		public string aboutMe { get; set; }
		public List<string> languagesUsed { get; set; }
		public TrophySummary trophySummary { get; set; }
		public bool isOfficiallyVerified { get; set; }
		public PersonalDetail personalDetail { get; set; }
		public string personalDetailSharing { get; set; }
		public bool personalDetailSharingRequestMessageFlag { get; set; }
		public string primaryOnlineStatus { get; set; }
		public List<Presence> presences { get; set; }
		public string friendRelation { get; set; }
		public bool requestMessageFlag { get; set; }
		public bool blocking { get; set; }
		public int friendsCount { get; set; }
		public int mutualFriendsCount { get; set; }
		public bool following { get; set; }
		public int followingUsersCount { get; set; }
		public int followerCount { get; set; }
	}

	public class ProfileRoot
	{
		public Profile profile { get; set; }
	}
}
