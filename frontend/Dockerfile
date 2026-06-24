# ── Frontend Dockerfile ─────────────────────────────────────
# Stage 1: Build React app
FROM node:20-slim AS build

WORKDIR /app
COPY package.json package-lock.json* ./
# npm ci is strict about lockfile/npm-version sync; fall back to npm install
# so the image still builds if the lockfile drifts during active development.
RUN npm ci || npm install
COPY . .

ARG REACT_APP_GOOGLE_CLIENT_ID
ENV REACT_APP_GOOGLE_CLIENT_ID=$REACT_APP_GOOGLE_CLIENT_ID
# Default to a relative /api so the nginx-served build proxies to the backend.
# Override at build time for a remote API (e.g. on Vercel).
ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL
# The image build produces the bundle; linting is enforced separately in CI.
# Decouple them so source lint issues don't block the production build.
ENV CI=false
ENV DISABLE_ESLINT_PLUGIN=true

RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
