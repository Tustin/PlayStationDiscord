using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PlayStationDiscord.Models
{
	[Serializable]
	public class ConfigModel
	{
		public string ETag { get; set; } = default(string);
	}
}
