namespace PlaystationDiscord
{
	public class ConsoleInformation
	{

		public string ImageKeyName { get; protected set; }

		public string Name { get; protected set; }

		public string ClientId { get; protected set; }


		public ConsoleInformation(string name, string imageKey, string clientId)
		{
			this.Name = name;
			this.ImageKeyName = imageKey;
			this.ClientId = clientId;
		}
	}
}