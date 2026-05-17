export const env = {
  port: Number(Bun.env.PORT || 3000),
  host: Bun.env.HOSTNAME || "0.0.0.0",
  frontendOrigin: Bun.env.FRONTEND_ORIGIN || "http://frontend:3000",
  configPath: Bun.env.CONFIG_PATH || "/app/config.toml",
};
