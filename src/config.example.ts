// 定义配置类型
interface SystemModelConfig {
	api_key: string;
	base_url: string;
	model: string;
}

interface GradingModelConfig {
	name: string;
	description: string;
	api_key: string;
	base_url: string;
	model: string;
	enabled: boolean;
}

interface Config {
	system_models: {
		validator: SystemModelConfig;
		search: SystemModelConfig;
	};
	grading_models: GradingModelConfig[];
	mongodb: {
		host: string;
		port: number;
		user?: string;
		password?: string;
	};
	afdian: {
		api_token: string;
		user_id: string;
		client_id: string;
		client_secret: string;
		redirect_uri: string;
	};
	api: {
		key: string;
		user: number;
	};
	email: {
		host: string;
		port: number;
		user: string;
		password: string;
	};
	jwt: {
		secret: string;
	};
	app: {
		base_url: string;
	};
}

// 配置数据
const config: Config = {
	system_models: {
		validator: {
			api_key: "",
			base_url: "",
			model: "",
		},
		search: {
			api_key: "",
			base_url: "",
			model: "",
		},
	},
	grading_models: [{
		name: "",
		description: "",
		api_key: "",
		base_url: "",
		model: "",
		enabled: true,
	}, {
		name: "",
		description: "",
		api_key: "",
		base_url: "",
		model: "",
		enabled: true,
	}, {
		name: "",
		description: "",
		api_key: "",
		base_url: "",
		model: "",
		enabled: false,
	}],
	mongodb: {
		host: "192.168.3.4",
		port: 27017,
		user: undefined,
		password: undefined,
	},
	afdian: {
		api_token: "",
		user_id: "",
		client_id: "",
		client_secret: "",
		redirect_uri: "",
	},
	api: {
		key: "",
		user: 0,
	},
	email: {
		host: "",
		port: 0,
		user: "",
		password: "",
	},
	jwt: {
		secret: "",
	},
	app: {
		base_url: "",
	},
};

function getConfig(): Config {
	return config;
}

// 工具函数：获取所有可用的评分模型
export function getAvailableGradingModels(): GradingModelConfig[] {
	return Object.values(config.grading_models).filter(model => model.enabled);
}

// 工具函数：获取特定评分模型
export function getGradingModel(modelId: string): GradingModelConfig | null {
	return config.grading_models.find(model => model.name === modelId) || null;
}

export { getConfig };
export type { Config, GradingModelConfig, SystemModelConfig };
