namespace CobWebBackend.Model
{
	public class Business
	{
		// OSM reference, e.g. "node/123456".
		public string id { get; set; } = "";
		public string name { get; set; } = "";
		// Human readable OSM category, e.g. "Hairdresser".
		public string category { get; set; } = "";
		// null = no website known.
		public string? website { get; set; }
		// True when the website was not in OSM but derived from the email domain.
		public bool websiteFromEmail { get; set; }
		public string? address { get; set; }
		public double lat { get; set; }
		public double lon { get; set; }
		public double distanceKm { get; set; }

		// Contact data from OSM - what you need to reach out.
		public string? phone { get; set; }
		public string? email { get; set; }
		public string? openingHours { get; set; }
		public string? facebook { get; set; }
		public string? instagram { get; set; }

		// LeadStatus.*
		public string status { get; set; } = "";
		// 0-100, higher = better lead.
		public int score { get; set; }
		// Findings of the website check, empty without website.
		public List<WebsiteIssue> issues { get; set; } = [];
	}

	public static class LeadStatus
	{
		public const string NoWebsite = "noWebsite";
		// Only Facebook/Instagram - obviously wants to be online, but has no own site.
		public const string SocialOnly = "socialOnly";
		public const string Outdated = "outdated";
	}

	// code = IssueCode.*, detail = e.g. "2016" for an old copyright or "Joomla 2.5" for an old CMS.
	public record WebsiteIssue(string code, int points, string? detail = null);

	public static class IssueCode
	{
		// Offline, DNS error, timeout, 404 or 5xx.
		public const string Unreachable = "unreachable";
		// Not served via https (or only with a broken certificate).
		public const string NoHttps = "noHttps";
		// No <meta name="viewport"> - not built for mobile.
		public const string NoViewport = "noViewport";
		// Viewport with a fixed pixel width - "mobile" in name only.
		public const string FixedViewport = "fixedViewport";
		public const string OldCopyright = "oldCopyright";
		// No link to an Impressum - legally required in DE/AT.
		public const string NoImprint = "noImprint";
		public const string NoPrivacy = "noPrivacy";
		// Flash, framesets, <font>/<center>/<marquee>, missing HTML5 doctype.
		public const string LegacyTech = "legacyTech";
		public const string OldJquery = "oldJquery";
		public const string OldCms = "oldCms";
		// Jimdo, Wix & co. - works, but upsell potential.
		public const string SiteBuilder = "siteBuilder";
		public const string Slow = "slow";
	}
}
