FROM gcr.io/distroless/cc-debian13:nonroot AS runtime

WORKDIR /app

ENV CONFIG_PATH=/app/config.toml

COPY --chown=nonroot:nonroot apps/auth/target/release/ink-auth-service /usr/local/bin/ink-auth-service

EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["/usr/local/bin/ink-auth-service", "--healthcheck"]

CMD ["/usr/local/bin/ink-auth-service"]
