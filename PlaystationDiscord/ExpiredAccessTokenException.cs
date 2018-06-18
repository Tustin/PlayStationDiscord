using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PlaystationDiscord.Exceptions
{
	class ExpiredAccessTokenException : Exception
	{
		public ExpiredAccessTokenException() { }
		public ExpiredAccessTokenException(string message) : base(message) { }
		public ExpiredAccessTokenException(string message, Exception inner) : base(message, inner) { }
	}
}
