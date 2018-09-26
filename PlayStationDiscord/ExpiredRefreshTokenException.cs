using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PlayStationDiscord.Exceptions
{
    class ExpiredRefreshTokenException : Exception
    {
		public ExpiredRefreshTokenException() { }
		public ExpiredRefreshTokenException(string message) : base(message) { }
		public ExpiredRefreshTokenException(string message, Exception inner) : base(message, inner) { }
	}
}
