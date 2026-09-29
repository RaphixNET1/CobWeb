using System.Diagnostics;
using System.Globalization;
using System.Net;
using System.Text.RegularExpressions;
using AngleSharp;
using AngleSharp.Dom;
using CobWebBackend.Model;
using Microsoft.Extensions.Caching.Memory;

namespace CobWebBackend.Service
{
	public record WebsiteCheck(List<WebsiteIssue> issues, int score);

	public class WebsiteCheckService
	{
		public const string HttpClientName = "websiteCheck";

		private static readonly TimeSpan RequestTimeout = TimeSpan.FromSeconds(10);
		private static readonly TimeSpan RetryDelay = TimeSpan.FromSeconds(1);
		private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(6);
		private static readonly TimeSpan SlowThreshold = TimeSpan.FromSeconds(3);
		private const int MinLinksForLegalCheck = 5;

		private static readonly Regex CopyrightRegex = new(
			@"(?:©|\(c\)|copyright)(?<tail>.{0,40})",
			RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.Compiled);
		private static readonly Regex YearRegex = new(@"\b(?:19|20)\d{2}\b", RegexOptions.Compiled);
		private static readonly Regex FixedViewportRegex = new(@"width\s*=\s*\d+", RegexOptions.IgnoreCase | RegexOptions.Compiled);
		private static readonly Regex JqueryRegex = new(
			@"jquery(?:[-./](?<v>\d+\.\d+(?:\.\d+)?)|[^""']*?[?&]ver=(?<v>\d+\.\d+(?:\.\d+)?))",
			RegexOptions.IgnoreCase | RegexOptions.Compiled);
		private static readonly Regex VersionRegex = new(@"(?<major>\d+)(?:\.(?<minor>\d+))?", RegexOptions.Compiled);

		private static readonly (string name, int supportedMajor)[] VersionedCms =
		[
			("WordPress", 6),
			("Joomla", 4),
			("TYPO3", 10),
			("Drupal", 9),
		];

		private static readonly string[] LegacyGenerators =
			["FrontPage", "Dreamweaver", "GoLive", "NetObjects", "Homepage-Baukasten", "Web.de", "iWeb", "Namo WebEditor"];

		private static readonly (string name, string marker)[] SiteBuilders =
		[
			("Jimdo", "jimdo"),
			("Wix", "wixstatic.com"),
			("Wix", "wix.com"),
			("Squarespace", "squarespace"),
			("Webnode", "webnode"),
			("Weebly", "weebly"),
			("IONOS MyWebsite", "mywebsite-editor"),
			("IONOS MyWebsite", "ionos.de"),
			("Site123", "site123"),
		];

		private static readonly Dictionary<string, int> Points = new()
		{
			[IssueCode.Unreachable] = 90,
			[IssueCode.NoHttps] = 20,
			[IssueCode.NoViewport] = 25,
			[IssueCode.FixedViewport] = 15,
			[IssueCode.OldCopyright] = 15,
			[IssueCode.NoImprint] = 20,
			[IssueCode.NoPrivacy] = 10,
			[IssueCode.LegacyTech] = 25,
			[IssueCode.OldJquery] = 10,
			[IssueCode.OldCms] = 25,
			[IssueCode.SiteBuilder] = 10,
			[IssueCode.Slow] = 10,
		};

		private readonly IHttpClientFactory httpFactory;
		private readonly IMemoryCache cache;

		public WebsiteCheckService(IHttpClientFactory httpFactory, IMemoryCache cache)
		{
			this.httpFactory = httpFactory;
			this.cache = cache;
		}

		public async Task<WebsiteCheck> CheckAsync(string url, CancellationToken ct)
		{
			if (cache.TryGetValue(url, out WebsiteCheck? cached) && cached is not null)
			{
				return cached;
			}

			var result = await RunCheckAsync(url, ct);
			cache.Set(url, result, CacheDuration);
			return result;
		}

		private async Task<WebsiteCheck> RunCheckAsync(string url, CancellationToken ct)
		{
			var page = await FetchWithRetryAsync(url, ct);
			var brokenHttps = false;

			if (page is null && url.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
			{
				page = await FetchAsync("http://" + url["https://".Length..], ct);
				brokenHttps = page is not null;
			}

			if (page?.status is HttpStatusCode.NotFound or HttpStatusCode.Gone
				&& new Uri(url) is { AbsolutePath.Length: > 1 } deepLink)
			{
				page = await FetchAsync(deepLink.GetLeftPart(UriPartial.Authority) + "/", ct) ?? page;
			}

			if (page is null || page.status is HttpStatusCode.NotFound or HttpStatusCode.Gone || (int)page.status >= 500)
			{
				return Result([Issue(IssueCode.Unreachable)]);
			}

			if ((int)page.status >= 400)
			{
				return Result([]);
			}

			var context = BrowsingContext.New(Configuration.Default);
			using var doc = await context.OpenAsync(r => r.Content(page.html), ct);
			var html = page.html;
			var issues = new List<WebsiteIssue>();

			if (brokenHttps || page.finalUrl?.Scheme != Uri.UriSchemeHttps)
			{
				issues.Add(Issue(IssueCode.NoHttps, brokenHttps ? "invalid certificate" : null));
			}

			var viewport = doc.QuerySelector("meta[name=viewport]")?.GetAttribute("content");
			if (viewport is null)
			{
				issues.Add(Issue(IssueCode.NoViewport));
			}
			else if (FixedViewportRegex.IsMatch(viewport) && !viewport.Contains("device-width", StringComparison.OrdinalIgnoreCase))
			{
				issues.Add(Issue(IssueCode.FixedViewport));
			}

			var copyrightYear = FindCopyrightYear(doc.Body?.TextContent ?? "");
			var age = DateTime.UtcNow.Year - copyrightYear;
			if (age > 3)
			{
				issues.Add(new WebsiteIssue(IssueCode.OldCopyright, age > 7 ? 25 : Points[IssueCode.OldCopyright], copyrightYear.ToString()));
			}

			CheckLegalPages(doc, issues);

			if (FindLegacyTech(doc, html) is { Count: > 0 } legacy)
			{
				issues.Add(Issue(IssueCode.LegacyTech, string.Join(", ", legacy)));
			}

			if (FindOldJquery(doc) is { } jquery)
			{
				issues.Add(Issue(IssueCode.OldJquery, jquery));
			}

			var generator = doc.QuerySelector("meta[name=generator]")?.GetAttribute("content") ?? "";
			if (FindOldCms(generator) is { } cms)
			{
				issues.Add(Issue(IssueCode.OldCms, cms));
			}
			else if (FindSiteBuilder(generator, html) is { } builder)
			{
				issues.Add(Issue(IssueCode.SiteBuilder, builder));
			}

			if (page.duration > SlowThreshold)
			{
				issues.Add(Issue(IssueCode.Slow, page.duration.TotalSeconds.ToString("0.0", CultureInfo.InvariantCulture) + " s"));
			}

			return Result(issues);
		}

		private static void CheckLegalPages(IDocument doc, List<WebsiteIssue> issues)
		{
			var links = doc.QuerySelectorAll("a")
				.Select(a => (a.TextContent + " " + a.GetAttribute("href")).ToLowerInvariant())
				.ToList();
			if (links.Count < MinLinksForLegalCheck)
			{
				return;
			}

			if (!links.Any(l => l.Contains("impressum") || l.Contains("imprint") || l.Contains("legal notice")))
			{
				issues.Add(Issue(IssueCode.NoImprint));
			}

			if (!links.Any(l => l.Contains("datenschutz") || l.Contains("privacy") || l.Contains("dsgvo")))
			{
				issues.Add(Issue(IssueCode.NoPrivacy));
			}
		}

		private static List<string> FindLegacyTech(IDocument doc, string html)
		{
			var found = new List<string>();

			if (html.Contains(".swf", StringComparison.OrdinalIgnoreCase) || html.Contains("shockwave-flash", StringComparison.OrdinalIgnoreCase))
			{
				found.Add("Flash");
			}

			if (doc.QuerySelector("frameset") is not null || html.Contains("<frameset", StringComparison.OrdinalIgnoreCase))
			{
				found.Add("Frames");
			}

			if (doc.QuerySelector("font, center, marquee, blink") is not null)
			{
				found.Add("HTML 4 tags");
			}

			if (doc.Doctype is null || !string.IsNullOrEmpty(doc.Doctype.PublicIdentifier))
			{
				found.Add("old doctype");
			}

			return found;
		}

		private static string? FindOldJquery(IDocument doc)
		{
			foreach (var script in doc.QuerySelectorAll("script[src]"))
			{
				var match = JqueryRegex.Match(script.GetAttribute("src") ?? "");
				if (match.Success && ParseVersion(match.Groups["v"].Value) is { major: < 3 })
				{
					return "jQuery " + match.Groups["v"].Value;
				}
			}
			return null;
		}

		private static string? FindOldCms(string generator)
		{
			if (LegacyGenerators.FirstOrDefault(g => generator.Contains(g, StringComparison.OrdinalIgnoreCase)) is { } legacy)
			{
				return legacy;
			}

			foreach (var (name, supportedMajor) in VersionedCms)
			{
				var index = generator.IndexOf(name, StringComparison.OrdinalIgnoreCase);
				if (index < 0)
				{
					continue;
				}

				var version = ParseVersion(generator[(index + name.Length)..]);
				if (version is { } v && v.major < supportedMajor)
				{
					return v.minor is null ? $"{name} {v.major}" : $"{name} {v.major}.{v.minor}";
				}
			}
			return null;
		}

		private static string? FindSiteBuilder(string generator, string html)
		{
			return SiteBuilders
				.FirstOrDefault(b =>
					generator.Contains(b.marker, StringComparison.OrdinalIgnoreCase) ||
					html.Contains(b.marker, StringComparison.OrdinalIgnoreCase))
				.name;
		}

		private static (int major, int? minor)? ParseVersion(string text)
		{
			var match = VersionRegex.Match(text);
			if (!match.Success)
			{
				return null;
			}

			var minor = match.Groups["minor"].Success ? int.Parse(match.Groups["minor"].Value) : (int?)null;
			return (int.Parse(match.Groups["major"].Value), minor);
		}

		private static int? FindCopyrightYear(string text)
		{
			int? newest = null;
			foreach (Match notice in CopyrightRegex.Matches(text))
			{
				foreach (Match year in YearRegex.Matches(notice.Groups["tail"].Value))
				{
					var value = int.Parse(year.Value);
					if (value <= DateTime.UtcNow.Year && (newest is null || value > newest))
					{
						newest = value;
					}
				}
			}
			return newest;
		}

		private async Task<Page?> FetchWithRetryAsync(string url, CancellationToken ct)
		{
			var page = await FetchAsync(url, ct);
			if (page is not null)
			{
				return page;
			}

			await Task.Delay(RetryDelay, ct);
			return await FetchAsync(url, ct);
		}

		private async Task<Page?> FetchAsync(string url, CancellationToken ct)
		{
			using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
			timeout.CancelAfter(RequestTimeout);

			try
			{
				var http = httpFactory.CreateClient(HttpClientName);
				var watch = Stopwatch.StartNew();
				using var res = await http.GetAsync(url, timeout.Token);
				var isHtml = res.Content.Headers.ContentType?.MediaType?.Contains("html") ?? true;
				var html = isHtml ? await res.Content.ReadAsStringAsync(timeout.Token) : "";

				return new Page(res.StatusCode, res.RequestMessage?.RequestUri, html, watch.Elapsed);
			}
			catch (Exception ex) when (
				(ex is HttpRequestException or OperationCanceledException or InvalidOperationException)
				&& !ct.IsCancellationRequested)
			{
				return null;
			}
		}

		private static WebsiteIssue Issue(string code, string? detail = null) => new(code, Points[code], detail);

		private static WebsiteCheck Result(List<WebsiteIssue> issues) =>
			new(issues.OrderByDescending(i => i.points).ToList(), Math.Min(100, issues.Sum(i => i.points)));

		private record Page(HttpStatusCode status, Uri? finalUrl, string html, TimeSpan duration);
	}
}
