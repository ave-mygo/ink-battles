# syntax=docker/dockerfile:1

FROM gcr.io/distroless/nodejs24-debian13:nonroot AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --chown=nonroot:nonroot apps/frontend/.next/standalone ./
COPY --chown=nonroot:nonroot apps/frontend/.next/static ./apps/frontend/.next/static
COPY --chown=nonroot:nonroot apps/frontend/public ./apps/frontend/public

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
	CMD ["/nodejs/bin/node", "-e", "fetch('http://127.0.0.1:3000/favicon.png').then(response => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["apps/frontend/server.js"]
