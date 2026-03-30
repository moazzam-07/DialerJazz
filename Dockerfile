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
RUN cd client && npm ci

COPY client/ ./client/
RUN cd client && npm run build

# 3. Install + build SERVER
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci

COPY server/ ./server/
RUN cd server && npm run build

# ─── Stage 2: Production ──────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# Copy server production deps
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

# Copy built server
COPY --from=builder /app/server/dist ./server/dist

# Copy built client (served as static files by Express)
COPY --from=builder /app/client/dist ./client/dist

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "server/dist/index.js"]
