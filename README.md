# Stremio Eurostreaming Addon

An addon for Stremio that provides Italian streams for TV series from Eurostreaming.

## Requirements

- Node.js v20 or higher
- npm
- Docker (optional, for containerized deployment)

## Environment Variables

The following environment variables are required:

- `TMDB_API_KEY`: Your TMDB API key for series lookup
- `PORT`: (optional) The port to run the server on (default: 7000)

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Create a .env file with your TMDB API key:
```
TMDB_API_KEY=your_api_key_here
```

3. Build and run:
```bash
npm run build
npm start
```

The addon will be available at `http://localhost:7000`.

## Docker Deployment

1. Build the Docker image:
```bash
docker build -t stremio-eurostreaming .
```

2. Run the container:
```bash
docker run -p 7000:7000 -e TMDB_API_KEY=your_api_key_here stremio-eurostreaming
```

## Deployment on Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Use the following settings:
   - Environment: Docker
   - Build Command: (leave empty, using Dockerfile)
   - Start Command: (leave empty, using Dockerfile)
4. Add the environment variable:
   - Key: `TMDB_API_KEY`
   - Value: Your TMDB API key

## Installing in Stremio

1. Run the addon (either locally or deployed)
2. Open Stremio
3. Go to the addons page
4. Click "Enter addon URL"
5. Enter the addon URL (e.g., `http://localhost:7000/manifest.json` for local development)
