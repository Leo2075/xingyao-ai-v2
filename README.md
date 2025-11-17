# 星耀AI - 老板/创始人IP打造·短视频获客AI助手平台

专业的老板/创始人IP打造，短视频获客AI助手平台，集成Dify AI API，提供多助手管理和对话功能。

## 技术栈

- **前端框架**: Next.js 14 (App Router)
- **样式**: Tailwind CSS
- **语言**: TypeScript
- **后端**: Supabase (Database + Auth)
- **AI服务**: Dify API
- **部署**: Vercel

## 功能特性

1. **用户认证系统** - 固定账号密码登录（admin/password）
2. **助手选择页面** - 9个预设AI助手，专精不同业务领域
3. **智能对话界面** - 三栏布局设计（助手列表/对话记录/聊天窗口）
4. **Dify API集成** - 流式响应、对话历史管理
5. **响应式设计** - 完美适配桌面端和移动端

## 预设助手

1. IP策划师 - 个人IP形象和人设定位
2. 短视频脚本专家 - 专业脚本创作和优化
3. 获客策略顾问 - 精准获客方案和执行策略
4. 内容策划师 - 内容主题策划和创意方案
5. 视频制作助手 - 视频拍摄指导和后期建议
6. 营销文案专家 - 营销文案和宣传语创作
7. 数据分析专家 - 短视频数据分析和优化
8. 粉丝运营顾问 - 粉丝增长和用户运营策略
9. 商业变现顾问 - 变现模式和商业策略设计

## 项目结构

```
xingyao-ai/
├── app/
│   ├── api/                    # API路由
│   │   ├── auth/login/        # 登录API
│   │   ├── assistants/        # 助手列表API
│   │   └── dify/              # Dify API集成
│   ├── assistants/            # 助手选择页面
│   ├── chat/                  # 聊天页面
│   ├── globals.css            # 全局样式
│   ├── layout.tsx             # 根布局
│   └── page.tsx               # 登录页面
├── lib/
│   ├── supabase.ts            # Supabase客户端
│   └── types.ts               # TypeScript类型定义
├── supabase/
│   └── migrations/
│       └── init.sql           # 数据库初始化脚本
└── public/                    # 静态资源

## 本地开发

### 1. 安装依赖

```bash
cd xingyao-ai
npm install
# 或
pnpm install
```

### 2. 配置环境变量

创建 `.env.local` 文件：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. 初始化数据库

在Supabase Dashboard中执行 `supabase/migrations/init.sql` 脚本。

**重要**: 需要更新助手表中的Dify API密钥和应用ID：

```sql
UPDATE assistants 
SET dify_api_key = 'your_actual_dify_api_key', 
    dify_app_id = 'your_actual_app_id'
WHERE name = 'IP策划师';
-- 对每个助手重复此操作
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 5. 默认登录

- 用户名: `admin`
- 密码: `password`

## 部署到Vercel

### 方法一：通过Vercel Dashboard

1. 登录 [Vercel Dashboard](https://vercel.com)
2. 点击 "New Project"
3. 导入GitHub仓库
4. 配置环境变量：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. 点击 "Deploy"

### 方法二：通过Vercel CLI

```bash
npm install -g vercel
vercel login
vercel
```

按照提示完成部署配置。

## 数据库表结构

### users 表

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### assistants 表

```sql
CREATE TABLE assistants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  dify_api_key TEXT NOT NULL,
  dify_app_id VARCHAR(255) NOT NULL,
  dify_base_url TEXT DEFAULT 'https://api.dify.ai/v1',
  status VARCHAR(50) DEFAULT 'active',
  icon_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Dify API集成说明

本项目通过后端API路由集成Dify API，主要功能包括：

1. **聊天消息发送** (`/api/dify/chat`)
   - 支持流式响应
   - 自动管理对话ID
   - 实时返回AI回复

2. **对话列表获取** (`/api/dify/conversations`)
   - 获取用户的历史对话列表
   - 支持分页加载

3. **消息历史查询** (`/api/dify/messages`)
   - 查询特定对话的完整消息历史
   - 自动格式转换

## 安全注意事项

1. **API密钥保护**: Dify API密钥存储在数据库中，通过后端API调用，前端无法直接访问
2. **用户认证**: 实际生产环境建议使用更安全的认证方式（如JWT、OAuth）
3. **密码加密**: 当前使用明文密码，生产环境应使用bcrypt等加密方式

## 浏览器支持

- Chrome (推荐)
- Firefox
- Safari
- Edge

## 许可证

© 2025 星耀AI. 保留所有权利.

## 技术支持

如有问题，请联系技术支持团队。
```
