FROM node:22-bookworm-slim

# build-essential + python3 as a fallback in case a prebuilt better-sqlite3
# binary isn't available for this platform and it has to compile from source.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Build-time only placeholder: `prisma generate` (in npm ci's postinstall) and
# `next build` (which imports lib/db.ts while collecting page data) both need
# DATABASE_URL to resolve, even though neither actually connects to it. The
# real value is supplied at container runtime by Render and overrides this.
ENV DATABASE_URL="file:./data/dev.db"

COPY . .
RUN npm ci
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

RUN chmod +x docker-entrypoint.sh
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]
