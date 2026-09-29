using System.Collections.Concurrent;
using CobWebBackend.Model;
using CobWebBackend.Service;
using Microsoft.AspNetCore.Mvc;

namespace CobWebBackend.Controllers
{
	[Route("api/[controller]")]
	[ApiController]
	public class DetectionController : ControllerBase
	{
		private const double MinRadiusKm = 0.1;
		private const double MaxRadiusKm = 5;
		private const int MaxParallelChecks = 16;
		// Only the nearest websites get checked - keeps a 5 km search in a sane time frame.
		private const int MaxWebsiteChecks = 400;
		// Below this an outdated site isn't worth a call (e.g. only a missing privacy link).
		private const int MinOutdatedScore = 20;
		// Without own website: social-only businesses obviously want to be online -> hottest leads.
		private const int SocialOnlyScore = 95;
		// OSM may just miss the website tag, so this one is less certain.
		private const int NoWebsiteScore = 50;

		private readonly OverpassService overpass;
		private readonly WebsiteCheckService websiteCheck;
		private readonly ILogger<DetectionController> logger;

		public DetectionController(OverpassService overpass, WebsiteCheckService websiteCheck, ILogger<DetectionController> logger)
		{
			this.overpass = overpass;
			this.websiteCheck = websiteCheck;
			this.logger = logger;
		}

		// GET api/detection?lat=49.01&lon=12.1&radiusKm=2
		// Returns only leads: businesses without a website or with an outdated one.
		[HttpGet]
		public async Task<ActionResult<List<Business>>> Get(
			[FromQuery] double lat,
			[FromQuery] double lon,
			[FromQuery] double radiusKm,
			CancellationToken ct)
		{
			if (lat is < -90 or > 90 || lon is < -180 or > 180)
			{
				return BadRequest("lat/lon out of range.");
			}

			if (radiusKm is < MinRadiusKm or > MaxRadiusKm)
			{
				return BadRequest(FormattableString.Invariant($"radiusKm must be between {MinRadiusKm} and {MaxRadiusKm}."));
			}

			List<Business> businesses;
			try
			{
				businesses = await overpass.FindBusinessesAsync(lat, lon, radiusKm, ct);
			}
			catch (Exception ex) when ((ex is HttpRequestException or OperationCanceledException or System.Text.Json.JsonException) && !ct.IsCancellationRequested)
			{
				logger.LogWarning(ex, "Overpass request failed");
				return Problem("OpenStreetMap (Overpass) is currently not reachable.", statusCode: StatusCodes.Status502BadGateway);
			}

			// businesses is sorted by distance, so the nearest sites win.
			var toCheck = businesses
				.Where(b => b.website is not null)
				.Take(MaxWebsiteChecks)
				.ToHashSet();

			var leads = new ConcurrentBag<Business>();
			await Parallel.ForEachAsync(
				businesses.Where(b => b.website is null || toCheck.Contains(b)),
				new ParallelOptions { MaxDegreeOfParallelism = MaxParallelChecks, CancellationToken = ct },
				async (business, token) =>
				{
					if (business.website is not null)
					{
						var check = await websiteCheck.CheckAsync(business.website, token);
						var guessFailed = business.websiteFromEmail && check.issues.Any(i => i.code == IssueCode.Unreachable);
						if (!guessFailed)
						{
							if (check.score >= MinOutdatedScore)
							{
								business.status = LeadStatus.Outdated;
								business.score = check.score;
								business.issues = check.issues;
								leads.Add(business);
							}
							return;
						}

						// The email domain has no website behind it - so there is none.
						business.website = null;
						business.websiteFromEmail = false;
					}

					var social = business.facebook is not null || business.instagram is not null;
					business.status = social ? LeadStatus.SocialOnly : LeadStatus.NoWebsite;
					business.score = social ? SocialOnlyScore : NoWebsiteScore;
					leads.Add(business);
				});

			logger.LogInformation(
				"Detection: {Leads} leads out of {Total} businesses ({Checked} websites checked)",
				leads.Count, businesses.Count, toCheck.Count);
			return leads.OrderByDescending(b => b.score).ThenBy(b => b.distanceKm).ToList();
		}
	}
}
