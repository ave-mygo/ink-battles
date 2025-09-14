import TOML from '@iarna/toml';
import fs from 'fs';
import path from 'path';

// 配置接口定义
interface Config {
  openai: {
    reviewer: {
      api_key: string;
      base_url: string;
      model: string;
    };
    grader: {
      api_key: string;
      base_url: string;
      model: string;
    };
    pro: {
      api_key: string;
      base_url: string;
      model: string;
    };
  };
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

let config: Config | null = null;

function getConfig(): Config {
  if (config) {
    return config;
  }

  const configPath = path.join(process.cwd(), 'config.toml');
  
  try {
    // 尝试读取 TOML 配置文件
    if (fs.existsSync(configPath)) {
      const tomlContent = fs.readFileSync(configPath, 'utf-8');
      config = TOML.parse(tomlContent) as Config;
      return config;
    }
  } catch (error) {
    console.warn('读取 config.toml 失败，回退到环境变量:', error);
  }

  // 回退到环境变量配置
  config = {
    openai: {
      reviewer: {
        api_key: process.env.OPENAI_API_KEY_1 || '',
        base_url: process.env.OPENAI_BASE_URL_1 || '',
        model: process.env.OPENAI_MODEL_1 || 'gemini-2.5-flash',
      },
      grader: {
        api_key: process.env.OPENAI_API_KEY_2 || '',
        base_url: process.env.OPENAI_BASE_URL_2 || '',
        model: process.env.OPENAI_MODEL_2 || 'gemini-2.5-pro',
      },
      pro: {
        api_key: process.env.OPENAI_API_KEY_3 || '',
        base_url: process.env.OPENAI_BASE_URL_3 || '',
        model: process.env.OPENAI_MODEL_3 || 'gemini-2.5-pro',
      },
    },
    mongodb: {
      host: process.env.MONGO_HOST || '192.168.3.4',
      port: Number.parseInt(process.env.MONGO_PORT || '27017'),
      user: process.env.MONGO_USER,
      password: process.env.MONGO_PASS,
    },
    afdian: {
      api_token: process.env.AFDIAN_API_TOKEN || '',
      user_id: process.env.AFDIAN_USER_ID || '',
      client_id: process.env.AFDIAN_CLIENT_ID || '',
      client_secret: process.env.AFDIAN_CLIENT_SECRET || '',
      redirect_uri: process.env.AFDIAN_REDIRECT_URI || '',
    },
    api: {
      key: process.env.API_KEY || '',
      user: Number.parseInt(process.env.API_USER || '0'),
    },
    email: {
      host: process.env.EMAIL_HOST || '',
      port: Number.parseInt(process.env.EMAIL_PORT || '465'),
      user: process.env.EMAIL_USER || '',
      password: process.env.EMAIL_PASS || '',
    },
    jwt: {
      secret: process.env.JWT_SECRET || '',
    },
    app: {
      base_url: process.env.NEXT_PUBLIC_BASE_URL || '',
    },
  };

  return config;
}

export { getConfig };
export type { Config };
