# Portfolio Deployment Guide

## Docker Image auf GHCR

Das Projekt wird automatisch als Docker Image zu GitHub Container Registry (ghcr.io) gepusht bei jedem Push auf `main`/`master`.

### Automatischer Build

Der GitHub Actions Workflow (`.github/workflows/docker-publish.yml`) baut und pusht automatisch:
- Bei Push auf main/master → `latest` tag
- Bei Git Tags `v*` → Version tags (z.B. `v1.0.0`)
- Multi-platform support: `linux/amd64` und `linux/arm64`

### Image Tags

```bash
ghcr.io/rikoxcode/portfolio:latest          # Latest main branch
ghcr.io/rikoxcode/portfolio:main            # Main branch
ghcr.io/rikoxcode/portfolio:v1.0.0          # Specific version
ghcr.io/rikoxcode/portfolio:1.0             # Major.minor version
ghcr.io/rikoxcode/portfolio:main-abc1234    # Commit SHA
```

## Lokale Entwicklung

```bash
# Development mit lokalem Build
docker-compose up -d

# MongoDB separat starten
docker-compose up -d mongo

# App lokal (ohne Docker)
npm install
npm start
```

## Production Deployment

```bash
# Mit GHCR Image (Production)
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Logs anzeigen
docker-compose -f docker-compose.prod.yml logs -f app

# Stoppen
docker-compose -f docker-compose.prod.yml down
```

## Environment Variables

Erstelle eine `.env` Datei:

```env
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=your-secure-password
ADMIN_PASSWORD=your-admin-password
SESSION_SECRET=your-secret-key-change-this
```

## Image Privacy

Das Image ist standardmäßig **public** in GHCR. Um es privat zu machen:

1. Gehe zu: https://github.com/RikoxCode/Portfolio/pkgs/container/portfolio
2. **Package settings** → **Change visibility** → **Private**

## Manual Image Build & Push

```bash
# Login zu GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Build
docker build -t ghcr.io/rikoxcode/portfolio:latest .

# Push
docker push ghcr.io/rikoxcode/portfolio:latest

# Multi-platform build
docker buildx build --platform linux/amd64,linux/arm64 \
  -t ghcr.io/rikoxcode/portfolio:latest \
  --push .
```

## Troubleshooting

### Image Pull Permission denied
- Stelle sicher, dass das Package public ist ODER
- Login mit Personal Access Token: `docker login ghcr.io -u USERNAME`

### MongoDB Connection refused
- Prüfe ob MongoDB Container läuft: `docker-compose ps`
- Prüfe MongoDB Logs: `docker-compose logs mongo`

### Port bereits in Verwendung
- Ändere Port in docker-compose.yml: `"3001:3000"`
- Oder stoppe andere Services auf Port 3000
