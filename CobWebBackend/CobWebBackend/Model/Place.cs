namespace CobWebBackend.Model
{
	public class Place
	{

		public int id { get; set; }
		public string name { get; set; }
		public string region { get; set; }
		public double lat { get; set; }
		public double lon { get; set; }
		public double? distanceKm {get; set;}

	}
}
