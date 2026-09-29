using System.Globalization;
using System.Text.Json;
using CobWebBackend.Model;

namespace CobWebBackend.Service
{
	public class OverpassService
	{
		private static readonly string[] InterpreterUrls =
		[
			"https://overpass-api.de/api/interpreter",
			"https://overpass.private.coffee/api/interpreter",
			"https://maps.mail.ru/osm/tools/overpass/api/interpreter",
		];
		private static readonly TimeSpan AttemptTimeout = TimeSpan.FromSeconds(30);
		private const int MaxResults = 2000;
		private const double EarthRadiusKm = 6371;

 
		private static readonly string[] BusinessKeys =
			["shop", "craft", "office", "amenity", "healthcare", "tourism", "leisure"];

		private static readonly HashSet<string> IgnoredValues =
		[
			"school", "kindergarten", "college", "university", "place_of_worship", "townhall",
			"police", "fire_station", "courthouse", "prison", "library", "hospital", "grave_yard",
			"parking", "parking_entrance", "bicycle_parking", "toilets", "bench", "shelter",
			"waste_basket", "recycling", "drinking_water", "fountain", "post_box", "telephone",
			"playground", "park", "pitch", "garden", "nature_reserve", "track", "slipway",
			"attraction", "viewpoint", "artwork", "information", "picnic_site", "camp_pitch",
			"government", "diplomatic", "yes",
			"charging_station", "atm", "vending_machine", "bank", "bureau_de_change", "money_transfer",
			"fuel", "car_sharing", "car_rental", "bicycle_rental", "boat_rental", "parcel_locker",
			"post_office", "taxi", "gambling", "casino", "social_facility", "community_centre",
			"public_bookcase", "shower", "lockers", "photo_booth", "ticket", "hunting_stand",
		];

		private static readonly HashSet<string> FreemailDomains =
		[
			"gmail.com", "googlemail.com", "gmx.de", "gmx.at", "gmx.net", "gmx.ch", "web.de", "t-online.de",
			"yahoo.com", "yahoo.de", "outlook.com", "outlook.de", "hotmail.com", "hotmail.de", "live.com",
			"live.de", "icloud.com", "me.com", "aol.com", "aon.at", "a1.net", "chello.at", "freenet.de",
			"arcor.de", "online.de", "posteo.de", "mail.de", "gmx.com", "protonmail.com", "proton.me",
			"kabelmail.de", "vodafone.de", "ewe.net", "bluewin.ch", "utanet.at", "inode.at", "tele2.at",
		];

		private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

		private readonly HttpClient http;
		private readonly ILogger<OverpassService> logger;

		public OverpassService(HttpClient http, ILogger<OverpassService> logger)
		{
			this.http = http;
			this.logger = logger;
		}

		public async Task<List<Business>> FindBusinessesAsync(double lat, double lon, double radiusKm, CancellationToken ct)
		{
			var body = await QueryAsync(BuildQuery(lat, lon, radiusKm * 1000), ct);

			return (body.elements ?? [])
				.Select(e => ToBusiness(e, lat, lon))
				.OfType<Business>()
				.GroupBy(b => (b.name.ToLowerInvariant(), DedupeKey(b)))
				.Select(g => g.MinBy(b => b.distanceKm)!)
				.Where(b => b.distanceKm <= radiusKm)
				.OrderBy(b => b.distanceKm)
				.Take(MaxResults)
				.ToList();
		}

		private async Task<OverpassResponse> QueryAsync(string query, CancellationToken ct)
		{
			for (var i = 0; ; i++)
			{
				using var attempt = CancellationTokenSource.CreateLinkedTokenSource(ct);
				attempt.CancelAfter(AttemptTimeout);

				try
				{
					using var res = await http.PostAsync(
						InterpreterUrls[i],
						new FormUrlEncodedContent([new("data", query)]),
						attempt.Token);
					res.EnsureSuccessStatusCode();

					await using var stream = await res.Content.ReadAsStreamAsync(attempt.Token);
					return await JsonSerializer.DeserializeAsync<OverpassResponse>(stream, JsonOptions, attempt.Token)
						?? new OverpassResponse([]);
				}
				catch (Exception ex) when (
					(ex is HttpRequestException or OperationCanceledException or JsonException)
					&& !ct.IsCancellationRequested
					&& i < InterpreterUrls.Length - 1)
				{
					logger.LogWarning("Overpass {Url} failed ({Error}), trying next instance", InterpreterUrls[i], ex.Message);
				}
			}
		}

		private static string BuildQuery(double lat, double lon, double radiusM)
		{
			var around = string.Create(CultureInfo.InvariantCulture, $"around:{radiusM:0},{lat},{lon}");
			var keys = string.Join('|', BusinessKeys);

			return $"""
				[out:json][timeout:25];
				nwr({around})["name"][~"^({keys})$"~"."];
				out center tags;
				""";
		}

		private static Business? ToBusiness(OverpassElement e, double centerLat, double centerLon)
		{
			var tags = e.tags;
			if (tags is null || !tags.TryGetValue("name", out var name))
			{
				return null;
			}

			var (key, value) = BusinessKeys
				.Where(tags.ContainsKey)
				.Select(k => (k, tags[k]))
				.FirstOrDefault();
			if (key is null || IgnoredValues.Contains(value))
			{
				return null;
			}

			if (tags.ContainsKey("brand") || tags.ContainsKey("brand:wikidata"))
			{
				return null;
			}

			var email = FirstValue(tags, "email", "contact:email");
			var website = NormalizeWebsite(FirstValue(tags, "website", "contact:website", "url"));
			var websiteFromEmail = false;
			if (website is null && EmailDomain(email) is { } domain)
			{
				website = NormalizeWebsite(domain);
				websiteFromEmail = website is not null;
			}

			var lat = e.lat ?? e.center?.lat;
			var lon = e.lon ?? e.center?.lon;
			if (lat is null || lon is null)
			{
				return null;
			}

			return new Business
			{
				id = $"{e.type}/{e.id}",
				name = name.Trim(),
				category = Prettify(value),
				website = website,
				websiteFromEmail = websiteFromEmail,
				address = BuildAddress(tags),
				phone = FirstValue(tags, "phone", "contact:phone", "contact:mobile", "mobile"),
				email = email,
				openingHours = tags.GetValueOrDefault("opening_hours"),
				facebook = SocialUrl(FirstValue(tags, "contact:facebook", "facebook"), "https://www.facebook.com/"),
				instagram = SocialUrl(FirstValue(tags, "contact:instagram", "instagram"), "https://www.instagram.com/"),
				lat = lat.Value,
				lon = lon.Value,
				distanceKm = Math.Round(DistanceKm(centerLat, centerLon, lat.Value, lon.Value), 2),
			};
		}

		private static string? NormalizeWebsite(string? raw)
		{
			var first = raw?.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).FirstOrDefault();
			if (string.IsNullOrEmpty(first))
			{
				return null;
			}

			var url = first.Contains("://") ? first : $"http://{first}";
			return Uri.TryCreate(url, UriKind.Absolute, out var uri) && uri.Scheme is "http" or "https"
				? uri.ToString()
				: null;
		}

		private static string? FirstValue(Dictionary<string, string> tags, params string[] keys)
		{
			return keys
				.Select(k => tags.GetValueOrDefault(k)?.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).FirstOrDefault())
				.FirstOrDefault(v => !string.IsNullOrEmpty(v));
		}

		private static string? EmailDomain(string? email)
		{
			var at = email?.LastIndexOf('@') ?? -1;
			if (at < 0)
			{
				return null;
			}

			var domain = email![(at + 1)..].Trim().ToLowerInvariant();
			return domain.Contains('.') && !FreemailDomains.Contains(domain) ? domain : null;
		}

		private static string? SocialUrl(string? raw, string baseUrl)
		{
			if (string.IsNullOrEmpty(raw))
			{
				return null;
			}

			if (raw.StartsWith("http", StringComparison.OrdinalIgnoreCase))
			{
				return raw;
			}

			return raw.Contains('.') && raw.Contains('/') ? $"https://{raw}" : baseUrl + raw.TrimStart('@');
		}

		private static string DedupeKey(Business b)
		{
			if (b.website is null)
			{
				return "";
			}

			var uri = new Uri(b.website);
			var host = uri.Host.StartsWith("www.") ? uri.Host[4..] : uri.Host;
			return host + uri.AbsolutePath.TrimEnd('/');
		}

		private static string? BuildAddress(Dictionary<string, string> tags)
		{
			var street = string.Join(' ', new[] { tags.GetValueOrDefault("addr:street"), tags.GetValueOrDefault("addr:housenumber") }
				.Where(s => !string.IsNullOrWhiteSpace(s)));
			var city = string.Join(' ', new[] { tags.GetValueOrDefault("addr:postcode"), tags.GetValueOrDefault("addr:city") }
				.Where(s => !string.IsNullOrWhiteSpace(s)));
			var address = string.Join(", ", new[] { street, city }.Where(s => s.Length > 0));

			return address.Length > 0 ? address : null;
		}

		private static string Prettify(string osmValue)
		{
			var text = osmValue.Split(';')[0].Replace('_', ' ').Trim();
			return text.Length > 0 ? char.ToUpperInvariant(text[0]) + text[1..] : text;
		}

		private static double DistanceKm(double lat1, double lon1, double lat2, double lon2)
		{
			var dLat = ToRadians(lat2 - lat1);
			var dLon = ToRadians(lon2 - lon1);
			var h = Math.Pow(Math.Sin(dLat / 2), 2) +
				Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) * Math.Pow(Math.Sin(dLon / 2), 2);

			return 2 * EarthRadiusKm * Math.Asin(Math.Sqrt(h));
		}

		private static double ToRadians(double degrees) => degrees * Math.PI / 180;

		private record OverpassResponse(List<OverpassElement>? elements);

		private record OverpassElement(
			string type,
			long id,
			double? lat,
			double? lon,
			OverpassCenter? center,
			Dictionary<string, string>? tags);

		private record OverpassCenter(double lat, double lon);
	}
}
