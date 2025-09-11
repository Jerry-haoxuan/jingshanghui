# 环境变量配置说明

## 重要：Vercel 部署配置

为了让应用在 Vercel 上正确使用 Supabase 云端数据库，您需要配置以下环境变量：

### 1. 获取 Supabase 配置信息

1. 登录您的 [Supabase Dashboard](https://app.supabase.com)
2. 选择您的项目
3. 进入 **Settings → API**
4. 您将看到以下信息：
   - **Project URL**: 您的 Supabase 项目 URL
   - **Anon public key**: 公开的匿名密钥

### 2. 在 Vercel 中配置环境变量

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择您的项目
3. 进入 **Settings → Environment Variables**
4. 添加以下环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 您的 Supabase Project URL | 例如：https://xxxxx.supabase.co |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 您的 Supabase Anon Key | 以 eyJ 开头的长字符串 |

### 3. 重新部署

配置环境变量后，您需要重新部署应用：

1. 在 Vercel Dashboard 中进入 **Deployments**
2. 点击最新部署旁边的三个点
3. 选择 **Redeploy**

### 4. 本地开发配置

对于本地开发，创建 `.env.local` 文件：

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

注意：`.env.local` 文件不应提交到 Git 仓库。

## 验证配置

部署后，您可以通过以下方式验证配置是否成功：

1. 访问您的 Vercel 部署网站
2. 打开浏览器开发者工具（F12）
3. 查看控制台是否有 Supabase 连接相关的错误
4. 检查数据是否正确从云端加载

## 故障排查

如果数据仍然使用本地存储而非云端：

1. 确认环境变量名称完全正确（包括 `NEXT_PUBLIC_` 前缀）
2. 确认环境变量值没有多余的空格或引号
3. 确认重新部署了应用
4. 检查浏览器控制台是否有错误信息

