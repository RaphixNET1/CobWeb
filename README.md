# CobWeb 🕸️

Pick a location and radius on the map, and CobWeb finds businesses in that area and checks whether their websites are outdated (e.g. missing HTTPS or mobile viewport).

> Early development – things may change.

## Tech Stack

- **Frontend:** Angular 22, Leaflet
- **Backend:** ASP.NET Core
- **Map & search:** OpenStreetMap, Nominatim

## Run Locally

**Requirements:** Node.js (LTS), Angular CLI, .NET SDK

```bash
git clone https://github.com/RaphixNET1/CobWeb.git
cd CobWeb/CobWeb
```

Backend:

```bash
cd CobWebBackend/CobWebBackend
dotnet run
```

Frontend (second terminal):

```bash
cd CobWebF
npm install
ng serve
```

Open http://localhost:4200. Make sure the API URL in the frontend config matches the backend URL.

## Hosting

```bash
# Frontend → static files in dist/cob-web-f/browser/
cd CobWebF && ng build

# Backend → ./publish
cd CobWebBackend/CobWebBackend && dotnet publish -c Release -o ./publish
```

Serve the frontend files with any web server (e.g. nginx) and run the backend with `dotnet CobWebBackend.dll`. Point `/api` to the backend via reverse proxy, and allow your domain in the backend's CORS settings.

Please respect the [OSM tile](https://operations.osmfoundation.org/policies/tiles/) and [Nominatim](https://operations.osmfoundation.org/policies/nominatim/) usage policies.

## Contributing

Contributions are welcome! Check the issues, fork the repo, and open a pull request.

