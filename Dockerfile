# Phase 6.5 — local development only.
# Not a production image: no multi-stage build, no standalone output,
# no hardening. Runs `next dev`. See PRODUCTION_TRANSFORMATION_PLAN.md ("10.5").

FROM node:20-bookworm-slim

WORKDIR /app

# pnpm 11+ requires Node 22.13+; pinned to the latest pnpm 10.x release,
# which reads this repo's lockfileVersion 9.0 and supports Node 20.
RUN corepack enable && corepack prepare pnpm@10 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["pnpm", "dev"]
