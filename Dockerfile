FROM node:22-bookworm-slim AS build

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    PUPPETEER_SKIP_DOWNLOAD=true

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm check && pnpm build

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       chromium \
       ca-certificates \
       fonts-liberation \
       fonts-noto-color-emoji \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && corepack prepare pnpm@10.4.1 --activate

WORKDIR /app
COPY --from=build /app/package.json /app/pnpm-lock.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle

USER node
EXPOSE 3000
CMD ["pnpm", "start"]
