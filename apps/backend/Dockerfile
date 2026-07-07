FROM oven/bun:1.3-alpine AS runner

WORKDIR /app/apps/backend

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S app && adduser -S -G app app

COPY --chown=app:app apps/backend/dist/index.js ./dist/index.js
COPY config.example.toml /app/config.example.toml

USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
	CMD bun -e "fetch('http://127.0.0.1:3000/api/v2/health').then(response => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["bun", "dist/index.js"]
