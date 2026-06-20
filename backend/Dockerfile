# ── Backend Dockerfile ──────────────────────────────────────
# base → dev (with devDeps) → prod (slim, non-root). Default target = prod.
FROM node:20-slim AS base

# Puppeteer needs these system deps for headless Chrome
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# ── Dev stage: full deps (incl. nodemon) for hot-reload ─────
FROM base AS dev
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
EXPOSE 5000
CMD ["npx", "nodemon", "server.js"]

# ── Production stage (default): prod-only deps, non-root ────
FROM base AS prod
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY . .

# Non-root user for security
RUN groupadd -r erm && useradd -r -g erm -s /bin/false erm \
    && chown -R erm:erm /app
USER erm

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
