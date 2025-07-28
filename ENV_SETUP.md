# 环境配置说明

## DeepSeek API Key 配置

### 方法一：使用环境变量（推荐）

1. 在项目根目录（ecosystem-network 文件夹）创建 `.env.local` 文件
2. 添加以下内容：
   ```
   NEXT_PUBLIC_DEEPSEEK_API_KEY=sk-你的实际API密钥
   ```
3. 重启开发服务器

### 方法二：直接修改代码

1. 打开 `app/api/ai-chat/route.ts` 文件
2. 找到第 6 行的 API Key 配置
3. 将 `'sk-your-actual-api-key'` 替换为你的实际 API Key

### 获取 DeepSeek API Key

1. 访问 [DeepSeek 平台](https://platform.deepseek.com/)
2. 注册/登录账号
3. 在 API Keys 页面创建新的 API Key
4. 复制 API Key（以 `sk-` 开头）

### 注意事项

- API Key 必须以 `sk-` 开头
- 不要将真实的 API Key 提交到 Git 仓库
- 建议使用环境变量方式配置，更安全 