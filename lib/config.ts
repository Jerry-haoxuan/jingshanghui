// DeepSeek API 配置
export const DEEPSEEK_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || '',
  apiUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat'
}

// 提示：请在.env.local文件中设置您的DeepSeek API密钥
// NEXT_PUBLIC_DEEPSEEK_API_KEY=sk-your_api_key_here
// 
// 注意：API密钥必须以 sk- 开头 