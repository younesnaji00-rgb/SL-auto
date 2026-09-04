# Cloud Run image for white-label demo deployments.
# NEXT_PUBLIC_* values are baked at build time from .env.production
# (created by scripts/deploy-demo.ps1 from .env.demo — never committed).
FROM node:20-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
# Cloud Run provides PORT; `next start` honors it.
EXPOSE 8080
CMD ["npm", "start"]
