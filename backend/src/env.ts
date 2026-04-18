export const env = {
	port: Number(Bun.env.PORT || 3000),
	host: Bun.env.HOSTNAME || "0.0.0.0",
	frontendOrigin: Bun.env.FRONTEND_ORIGIN || "http://frontend:3000",
	appBaseUrl: Bun.env.APP_BASE_URL || "http://localhost:3001",
	configPath: Bun.env.CONFIG_PATH || "/app/config.toml",
	allowedOrigins: (Bun.env.ALLOWED_ORIGINS || "http://localhost:3001")
		.split(",")
		.map(origin => origin.trim())
		.filter(Boolean),
};
