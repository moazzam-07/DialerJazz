# ─── Stage 1: Build ───────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Accept VITE_ env vars at build time (baked into client bundle)
ARG VITE_API_URL=/api
ARG VITE_INSFORGE_BASE_URL
ARG VITE_INSFORGE_ANON_KEY

# 1. Install root deps (concurrently)
COPY package.json package-lock.json ./
RUN npm ci

# 2. Install + build CLIENT
COPY client/package.json client/package-lock.json ./client/
RUN cd client && npm ci --legacy-peer-deps

COPY client/ ./client/
RUN cd client && npm run build

# 3. Server dependencies are installed in stage 2, no build needed for server when using tsx

# ─── Stage 2: Production ──────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# Copy server package and install production deps
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

# Install tsx globally to handle ESM resolution for dependencies
RUN npm install -g tsx

# Copy server source code (we run src directly with tsx)
COPY server/src ./server/src

# Copy built client (served as static files by Express)
COPY --from=builder /app/client/dist ./client/dist

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["tsx", "server/src/index.ts"]
