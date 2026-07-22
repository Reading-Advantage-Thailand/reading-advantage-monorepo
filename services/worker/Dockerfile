# syntax=docker/dockerfile:1

FROM node:22-alpine AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@11.8.0 --activate

WORKDIR /workspace

COPY . .

RUN pnpm --config.node-linker=isolated \
  --config.resolve-peers-from-workspace-root=false \
  install --frozen-lockfile --filter @reading-advantage/worker...
RUN ./services/worker/node_modules/.bin/tsc \
  --project services/worker/tsconfig.build.json
RUN pnpm --config.node-linker=isolated \
  --config.resolve-peers-from-workspace-root=false \
  --filter @reading-advantage/worker deploy --prod --legacy /opt/worker

FROM node:22-alpine AS runner

ENV HOST=0.0.0.0
ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /app

COPY --from=build --chown=node:node /opt/worker ./

USER node

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||'8080')+'/livez').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node","dist/main.js"]
