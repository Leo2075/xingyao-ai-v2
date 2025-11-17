# 星耀AI 部署指南

## 部署前准备

### 1. Supabase配置

#### 1.1 创建数据库表

在Supabase Dashboard的SQL Editor中执行以下SQL：

```sql
-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 创建助手表
CREATE TABLE IF NOT EXISTS assistants (
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

-- 插入默认用户（用户名: admin, 密码: password）
INSERT INTO users (username, password) VALUES ('admin', 'password');

-- 插入预设助手
INSERT INTO assistants (name, description, dify_api_key, dify_app_id, icon_name) VALUES
  ('IP策划师', '帮你构建个人IP形象和人设定位，专注于品牌定位、人设包装', 'YOUR_DIFY_API_KEY_1', 'YOUR_APP_ID_1', 'brain'),
  ('短视频脚本专家', '专业短视频脚本创作和优化，擅长脚本创作、内容规划', 'YOUR_DIFY_API_KEY_2', 'YOUR_APP_ID_2', 'video'),
  ('获客策略顾问', '制定精准获客方案和执行策略，专注于客户获取、转化优化', 'YOUR_DIFY_API_KEY_3', 'YOUR_APP_ID_3', 'target'),
  ('内容策划师', '内容主题策划和创意方案，擅长内容营销、话题策划', 'YOUR_DIFY_API_KEY_4', 'YOUR_APP_ID_4', 'file-text'),
  ('视频制作助手', '视频拍摄指导和后期建议，专注于制作流程、技术指导', 'YOUR_DIFY_API_KEY_5', 'YOUR_APP_ID_5', 'film'),
  ('营销文案专家', '营销文案和宣传语创作，专注于推广文案、广告创意', 'YOUR_DIFY_API_KEY_6', 'YOUR_APP_ID_6', 'message-square'),
  ('数据分析专家', '短视频数据分析和优化建议，专注于数据分析、效果优化', 'YOUR_DIFY_API_KEY_7', 'YOUR_APP_ID_7', 'bar-chart'),
  ('粉丝运营顾问', '粉丝增长和用户运营策略，专注于粉丝维护、社群运营', 'YOUR_DIFY_API_KEY_8', 'YOUR_APP_ID_8', 'users'),
  ('商业变现顾问', '变现模式和商业策略设计，专注于商业化、收入规划', 'YOUR_DIFY_API_KEY_9', 'YOUR_APP_ID_9', 'dollar-sign');
```

**重要**: 请将上述SQL中的 `YOUR_DIFY_API_KEY_*` 和 `YOUR_APP_ID_*` 替换为实际的Dify API密钥和应用ID。

#### 1.2 获取Supabase凭证

在Supabase Dashboard的Settings > API中获取：
- `SUPABASE_URL` (Project URL)
- `SUPABASE_ANON_KEY` (anon public key)

### 2. Dify API配置

为每个助手在Dify平台创建对应的应用，并获取：
- API Key
- App ID

## Vercel部署步骤

### 方法一：通过GitHub + Vercel Dashboard

1. **推送代码到GitHub**

```bash
cd xingyao-ai
git init
git add .
git commit -m "Initial commit: 星耀AI platform"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

2. **连接Vercel**

- 访问 https://vercel.com
- 点击 "New Project"
- 选择GitHub仓库
- 配置项目：
  - Framework Preset: Next.js
  - Root Directory: ./
  - Build Command: `npm run build` (默认)
  - Output Directory: `.next` (默认)

3. **配置环境变量**

在Vercel项目设置中添加环境变量：

```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

4. **部署**

点击 "Deploy" 按钮，等待部署完成。

### 方法二：通过Vercel CLI

1. **安装Vercel CLI**

```bash
npm install -g vercel
```

2. **登录Vercel**

```bash
vercel login
```

3. **部署项目**

```bash
cd xingyao-ai
vercel
```

按照提示完成配置：
- Set up and deploy?: Y
- Which scope?: 选择你的账号
- Link to existing project?: N
- What's your project's name?: xingyao-ai
- In which directory is your code located?: ./
- Want to override the settings?: N

4. **配置环境变量**

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

为每个环境（Production, Preview, Development）设置相同的值。

5. **重新部署**

```bash
vercel --prod
```

## 部署后验证

### 1. 访问网站

打开Vercel提供的部署URL（如 `https://xingyao-ai.vercel.app`）

### 2. 测试登录

- 用户名: `admin`
- 密码: `password`

### 3. 测试功能

1. 登录成功后应该跳转到助手选择页面
2. 页面应该显示9个预设助手
3. 点击任意助手进入聊天页面
4. 测试发送消息和接收AI回复
5. 检查对话历史记录功能

## 常见问题排查

### 问题1: 登录失败

**症状**: 输入正确的用户名密码后显示错误

**排查步骤**:
1. 检查Supabase数据库中users表是否有数据
2. 检查环境变量配置是否正确
3. 查看Vercel部署日志中的错误信息

### 问题2: 助手列表为空

**症状**: 助手选择页面显示"暂无可用助手"

**排查步骤**:
1. 检查Supabase数据库中assistants表是否有数据
2. 检查assistants表中status字段是否为'active'
3. 查看浏览器控制台的网络请求错误

### 问题3: AI回复失败

**症状**: 发送消息后没有AI回复或显示错误

**排查步骤**:
1. 检查assistants表中的dify_api_key是否正确
2. 检查dify_base_url是否正确（默认: https://api.dify.ai/v1）
3. 在Dify平台验证API Key是否有效
4. 查看Vercel Function Logs中的错误信息

### 问题4: 环境变量未生效

**症状**: 部署后环境变量相关的功能不工作

**解决方案**:
1. 确认环境变量名称前缀为 `NEXT_PUBLIC_`
2. 在Vercel Dashboard中重新部署项目
3. 清除浏览器缓存后重试

## 性能优化建议

1. **启用CDN**: Vercel自动提供全球CDN
2. **图片优化**: 使用Next.js Image组件
3. **代码分割**: Next.js自动进行代码分割
4. **缓存策略**: 配置适当的HTTP缓存头

## 安全加固建议

1. **密码加密**: 
   - 当前使用明文密码
   - 生产环境建议使用bcrypt加密
   - 修改登录API以支持密码哈希验证

2. **API密钥保护**:
   - Dify API密钥存储在数据库中
   - 通过后端API调用，前端无法访问
   - 建议定期轮换API密钥

3. **CORS配置**:
   - 配置允许的域名
   - 限制API访问来源

4. **速率限制**:
   - 添加API请求速率限制
   - 防止恶意请求和DDoS攻击

## 监控和日志

### Vercel Analytics

在Vercel Dashboard中启用Analytics：
- 访问统计
- 性能监控
- 错误追踪

### Supabase Logs

在Supabase Dashboard中查看：
- API请求日志
- 数据库查询日志
- 错误日志

## 更新和维护

### 更新代码

```bash
git add .
git commit -m "Update: <description>"
git push origin main
```

Vercel会自动检测到更新并重新部署。

### 数据库迁移

如需修改数据库结构：
1. 在Supabase Dashboard的SQL Editor中执行迁移SQL
2. 更新相关的TypeScript类型定义
3. 更新API路由代码
4. 测试并部署

## 备份策略

### 数据库备份

Supabase提供自动备份功能（Pro计划）：
- 每日自动备份
- 可手动创建备份点
- 支持恢复到任意时间点

### 代码备份

- GitHub仓库自动保存所有代码历史
- 建议使用Git标签标记重要版本

## 技术支持

如遇到问题，请检查：
1. Vercel部署日志
2. Supabase数据库日志
3. 浏览器开发者工具控制台
4. Network面板查看API请求

---

部署完成后，你的星耀AI平台就可以为用户提供专业的AI助手服务了！
