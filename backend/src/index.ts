import { createApp } from "./app";
import { env } from "./env";
import '@sinclair/typebox/compiler'

/**
 * 启动服务器
 * 创建应用实例并监听指定的主机和端口
 */
const startServer = async () => {
	const app = await createApp();

	app.listen({ hostname: env.host, port: env.port });

	console.log(`Ink Battles backend listening on http://${env.host}:${env.port}`);
};

void startServer();
