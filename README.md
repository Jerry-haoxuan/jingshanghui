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
- **数据库**: 阿里云 RDS PostgreSQL（`pg` 库连接）
- **服务器**: 阿里云 ECS + PM2 + Nginx
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

## 部署信息（阿里云）

| 项目 | 详情 |
|------|------|
| 网站地址 | https://hhaix.tech |
| 服务器 | 阿里云 ECS，IP：47.102.130.175 |
| 数据库 | 阿里云 RDS PostgreSQL，实例：pgm-uf63572vz9s9fve1 |
| 进程管理 | PM2，进程名：jsh |
| HTTPS | Let's Encrypt 证书，自动续期 |

---

## 更新代码流程（每次修改后执行）

### 第一步：本地提交推送

```bash
git add .
git commit -m "更新说明"
git push origin main
```

### 第二步：SSH 登录服务器

```bash
ssh root@47.102.130.175
# 密码：Qinhaoxuan520
```

### 第三步：拉取代码、重新构建、重启

```bash
cd /var/www/jingshanghui
git pull origin main && npm run build && pm2 restart jsh
```

等待 2-3 分钟构建完成，刷新网页即可看到最新版本。

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 `http://localhost:3000`

### 内测码
默认内测码：**ECOSYSTEM2024**

## 项目结构

```
├── app/                    # Next.js App Router 页面和 API
│   ├── page.tsx           # 首页（登录/注册）
│   ├── dashboard/         # 主控制台
│   ├── api/               # 后端接口
│   └── ...                # 其他页面
├── components/            # UI 组件
├── lib/                   # 工具库
│   ├── db.ts             # 数据库连接池（阿里云 RDS）
│   ├── cloudStore.ts     # 数据 CRUD
│   ├── userStore.ts      # 用户管理
│   └── ...
├── public/               # 静态资源
├── server-setup.sh       # 服务器初始化脚本（一次性）
└── update.sh             # 服务器一键更新脚本
```

## 常见问题

### 网站无法访问
- SSH 登录服务器，执行 `pm2 status` 检查应用是否在线
- 执行 `pm2 logs jsh` 查看错误日志

### 页面数据不显示
- 检查 RDS 白名单是否包含 ECS 内网 IP
- 执行 `pm2 logs jsh` 查看数据库连接错误

### AI 功能无法使用
- 检查 `.env.local` 中是否配置了 `DEEPSEEK_API_KEY`
- 重新构建并重启：`npm run build && pm2 restart jsh`

## 核心AI能力

1. **信息提取**: 从非结构化文档中提取人物信息
2. **关系挖掘**: 基于多维度标签匹配找到人际关系
3. **路径计算**: 计算两人之间的最短连接路径
4. **智能推荐**: 推荐可能认识的人或有价值的连接

## 商业价值

通过众包的方式建立人脉数据库，为用户提供"六度分隔理论"的实际应用场景，让社交网络具象化、可操作化。精尚慧致力于成为产业生态圈的连接器，帮助用户发现更多商业机会。 