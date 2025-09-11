# 精尚慧 - 智能人脉管理平台

一个智能化的人脉网络管理平台，通过AI技术帮助用户发现和管理产业关系网络。

## 更新内容

### 2024年最新更新
1. **品牌更名**：从"产业生态圈基石人"更名为"精尚慧"
2. **星空背景**：首页添加优美的旋转星空动画背景（速度已优化）
3. **关系图谱优化**：点击卡片即可查看详情和关系网络，无需单独页面
4. **AI集成**：集成DeepSeek API，提供智能文档解析和关系生成
5. **用户体验**：添加"慧慧AI处理中"动画界面，提升交互体验
6. **权限管理**：添加删除人物和企业的功能

## 功能特性

### 1. 首页 (Landing Page)
- 炫酷的旋转星空背景
- 简约现代的设计风格
- 产品介绍和使命宣言
- 内测码验证系统（默认内测码：ECOSYSTEM2024）

### 2. 主控制台 (Dashboard)
- 左侧可折叠导航栏
- "我关注的列表"筛选功能
- 人物和企业卡片展示
- 点击卡片查看详情和关系图谱
- 关注/取消关注功能
- 删除权限管理

### 3. 信息收集页 (Data Input)
- **双重输入模式**：
  - 结构化表单填写
  - PDF/Word文档上传并AI解析
- **慧慧AI智能处理**：
  - 自动提取简历信息
  - 智能生成关系图谱
  - 实时处理进度展示
- 支持录入的信息包括：
  - 基本信息（姓名、公司、职位）
  - 教育背景
  - 联系方式
  - 工作履历
  - 其他补充信息

### 4. 详情模态框 (Detail Modal)
- 人物/企业详细信息展示
- 交互式关系网络图
- 关系类型标注
- 实时网络可视化

## 技术栈

- **框架**: Next.js 14 (App Router)
- **UI库**: Tailwind CSS + Radix UI
- **语言**: TypeScript
- **可视化**: react-force-graph
- **文件处理**: react-dropzone
- **图标**: lucide-react
- **AI集成**: DeepSeek API

## DeepSeek API配置

要使用AI功能，您需要配置DeepSeek API：

1. **获取API密钥**
   - 访问 [DeepSeek Platform](https://platform.deepseek.com/)
   - 注册账号并登录
   - 在API密钥管理页面创建新的API密钥

2. **配置环境变量**
   在项目根目录创建 `.env.local` 文件：
   ```
   NEXT_PUBLIC_DEEPSEEK_API_KEY=your_deepseek_api_key_here
   ```

3. **验证配置**
   - 重启开发服务器
   - 在"添加新朋友"页面上传简历测试AI功能

## Supabase 云端数据库配置（重要）

为了实现数据的云端同步，让所有用户使用同一个数据库，您需要配置 Supabase：

### 本地开发配置

1. **获取 Supabase 配置**
   - 登录 [Supabase Dashboard](https://app.supabase.com)
   - 选择您的项目
   - 进入 **Settings → API**
   - 复制 **Project URL** 和 **Anon public key**

2. **配置环境变量**
   在 `.env.local` 文件中添加：
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

### Vercel 部署配置（必须）

**⚠️ 重要：如果不配置这些环境变量，Vercel 部署的网站将无法使用云端数据！**

1. **登录 Vercel Dashboard**
   - 访问 [Vercel Dashboard](https://vercel.com/dashboard)
   - 选择您的项目

2. **添加环境变量**
   - 进入 **Settings → Environment Variables**
   - 添加以下两个变量：
     - `NEXT_PUBLIC_SUPABASE_URL` = 您的 Supabase Project URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = 您的 Supabase Anon Key

3. **重新部署**
   - 在 **Deployments** 页面
   - 点击最新部署旁边的三个点
   - 选择 **Redeploy**

4. **验证配置**
   - 部署完成后访问您的网站
   - 打开浏览器开发者工具（F12）
   - 查看控制台是否有 Supabase 相关错误
   - 如果看到黄色警告提示，说明环境变量未配置

### 故障排查

如果数据仍然使用本地存储而非云端：
1. 确认环境变量名称完全正确（包括 `NEXT_PUBLIC_` 前缀）
2. 确认环境变量值没有多余的空格或引号
3. 确认重新部署了应用
4. 清除浏览器缓存后重试

详细配置说明请参考 `ENV_CONFIG.md` 文件。

## 安装与运行

### 快速启动（推荐）

1. **Windows用户**：
   - 使用 `start-stable.bat` 获得更稳定的运行体验
   - 或双击运行 `start.bat` 文件
   - 脚本会自动寻找可用端口（3000-3008）
   - 启动成功后会显示访问地址

2. **手动启动**：

```bash
# 安装依赖
npm install

# 启动开发服务器（默认端口3000）
npm run dev

# 或指定其他端口
npm run dev -- -p 3001
```

3. 访问应用
```
http://localhost:3000（或其他端口）
```

### 内测码
默认内测码：**ECOSYSTEM2024**

## 项目结构

```
ecosystem-network/
├── app/                    # Next.js App Router页面
│   ├── page.tsx           # 首页（带星空背景）
│   ├── dashboard/         # 控制台
│   ├── add/              # 信息收集（AI增强）
│   └── relationship/     # 关系图谱（已废弃）
├── components/            # UI组件
│   ├── ui/               # 通用UI组件
│   ├── StarryBackground.tsx  # 星空背景组件
│   └── DetailModal.tsx   # 详情模态框
├── lib/                   # 工具函数
│   ├── utils.ts          # 通用工具
│   └── config.ts         # API配置
├── public/               # 静态资源
├── start.bat             # Windows启动脚本
└── start-stable.bat      # 稳定版启动脚本
```

## 常见问题

### 服务器启动失败
- 检查端口是否被占用
- 使用 `start-stable.bat` 自动重启
- 或手动指定其他端口：`npm run dev -- -p 端口号`

### 页面无法访问
- 确保服务器已启动
- 检查控制台输出的端口号
- 清除浏览器缓存或使用无痕模式

### AI功能无法使用
- 检查是否配置了DeepSeek API密钥
- 确认.env.local文件在项目根目录
- 重启开发服务器使配置生效

## 核心AI能力

1. **信息提取**: 从非结构化文档中提取人物信息
2. **关系挖掘**: 基于多维度标签匹配找到人际关系
3. **路径计算**: 计算两人之间的最短连接路径
4. **智能推荐**: 推荐可能认识的人或有价值的连接

## 商业价值

通过众包的方式建立人脉数据库，为用户提供"六度分隔理论"的实际应用场景，让社交网络具象化、可操作化。精尚慧致力于成为产业生态圈的连接器，帮助用户发现更多商业机会。 