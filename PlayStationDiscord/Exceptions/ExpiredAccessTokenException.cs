using System;

namespace PlayStationDiscord.Exceptions
{
	class ExpiredAccessTokenException : Exception
	{
		public ExpiredAccessTokenException() { }
		public ExpiredAccessTokenException(string message) : base(message) { }
		public ExpiredAccessTokenException(string message, Exception inner) : base(message, inner) { }
	}
}
