export const env = {
	port: Number(Bun.env.PORT || 3000),
	host: Bun.env.HOSTNAME || "0.0.0.0",
	frontendOrigin: Bun.env.FRONTEND_ORIGIN || "http://frontend:3000",
	appBaseUrl: Bun.env.APP_BASE_URL || "http://localhost:3001",
	configPath: Bun.env.CONFIG_PATH || "/app/config.toml",
	maxJsonBodyBytes: Number(Bun.env.MAX_JSON_BODY_BYTES || 4 * 1024 * 1024),
	analysisMaxArticleChars: Number(Bun.env.ANALYSIS_MAX_ARTICLE_CHARS || 400_000),
	analysisMaxOutputChars: Number(Bun.env.ANALYSIS_MAX_OUTPUT_CHARS || 1024 * 1024),
	analysisMaxConcurrentTasks: Number(Bun.env.ANALYSIS_MAX_CONCURRENT_TASKS || 2),
	analysisMaxQueuedTasks: Number(Bun.env.ANALYSIS_MAX_QUEUED_TASKS || 20),
	analysisMaxActiveTasksPerUser: Number(Bun.env.ANALYSIS_MAX_ACTIVE_TASKS_PER_USER || 5),
	analysisMaxModeChars: Number(Bun.env.ANALYSIS_MAX_MODE_CHARS || 200),
	analysisMaxFingerprintChars: Number(Bun.env.ANALYSIS_MAX_FINGERPRINT_CHARS || 128),
	analysisGuestResultTtlMinutes: Number(Bun.env.ANALYSIS_GUEST_RESULT_TTL_MINUTES || 15),
	allowedOrigins: (Bun.env.ALLOWED_ORIGINS || "http://localhost:3001")
		.split(",")
		.map(origin => origin.trim())
		.filter(Boolean),
};
