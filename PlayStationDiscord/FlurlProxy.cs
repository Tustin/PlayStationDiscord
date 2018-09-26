using Flurl.Http.Configuration;
using System.Net;
using System.Net.Http;

namespace PlayStationDiscord
{
	public class ProxyHttpClientFactory : DefaultHttpClientFactory
	{
		private string _address;

		public ProxyHttpClientFactory(string address)
		{
			_address = address;
		}

		public override HttpMessageHandler CreateMessageHandler()
		{
			return new HttpClientHandler
			{
				Proxy = new WebProxy(_address),
				UseProxy = true
			};
		}
	}
}
