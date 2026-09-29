
using Microsoft.Extensions.Configuration;
using AngleSharp;
using CobWebBackend.Service;

namespace CobWebBackend
{
    public class Program
    {
        public static void Main(string[] args)
        {
			var builder = WebApplication.CreateBuilder(args);

			builder.Services.AddHttpClient("site", c =>
			{
				c.Timeout = TimeSpan.FromSeconds(15);
				c.DefaultRequestHeaders.UserAgent.ParseAdd("SweepBot/0.1 (+deine@mail.at)");
			});
			builder.Services.AddHttpClient<OverpassService>(c =>
			{
				// Overpass itself may take up to 25s (see query timeout).
				c.Timeout = TimeSpan.FromSeconds(35);
				c.DefaultRequestHeaders.UserAgent.ParseAdd("CobWeb/0.1 (+https://github.com/RaphixNET1/CobWeb)");
			});
			builder.Services.AddHttpClient(WebsiteCheckService.HttpClientName, c =>
			{
				// Browser-like headers: many small sites answer bots with 403 or a stripped page.
				c.DefaultRequestHeaders.UserAgent.ParseAdd(
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 (compatible; CobWeb/0.1)");
				c.DefaultRequestHeaders.Accept.ParseAdd("text/html,application/xhtml+xml;q=0.9,*/*;q=0.8");
				c.DefaultRequestHeaders.AcceptLanguage.ParseAdd("de-DE,de;q=0.9,en;q=0.8");
			});
			builder.Services.AddMemoryCache();
			builder.Services.AddSingleton<WebsiteCheckService>();
			builder.Services.AddControllers();
			builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
				p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

			var app = builder.Build();
			app.UseCors();
			app.MapControllers();

			// Lets the frontend show whether the API is reachable.
			app.MapGet("/api/health", () => Results.Ok());

			app.MapGet("/api/check", async (string url, IHttpClientFactory f, CancellationToken ct) =>
			{
				var http = f.CreateClient("site");
				using var res = await http.GetAsync(url, ct);
				var html = await res.Content.ReadAsStringAsync(ct);

				var ctx = BrowsingContext.New(Configuration.Default);
				var doc = await ctx.OpenAsync(r => r.Content(html), ct);

				return Results.Ok(new
				{
					url,
					statusCode = (int)res.StatusCode,
					isHttps = res.RequestMessage?.RequestUri?.Scheme == "https",
					hasViewport = doc.QuerySelector("meta[name=viewport]") is not null
				});
			});

			app.Run();
		}
    }
}
