import { createApp } from "./app";
import { env } from "./env";

const startServer = async () => {
	const app = await createApp();

	app.listen({ hostname: env.host, port: env.port });

	console.log(`Ink Battles backend listening on http://${env.host}:${env.port}`);
};

void startServer();
