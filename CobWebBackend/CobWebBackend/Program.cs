
using Microsoft.Extensions.Configuration;
using AngleSharp;

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
			builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
				p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

			var app = builder.Build();
			app.UseCors();

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
