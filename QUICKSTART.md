# 星耀AI - 快速启动指南（Supabase配置完成后）

## 第一步：创建数据库表（2分钟）

### 方法A：使用工具
```
使用batch_create_tables或apply_migration工具
```

### 方法B：手动执行
1. 登录Supabase Dashboard
2. 进入SQL Editor
3. 执行以下SQL：

```sql
-- 创建用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 创建助手表
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

-- 插入默认用户
INSERT INTO users (username, password) VALUES ('admin', 'password');

-- 插入9个助手（先使用占位符）
INSERT INTO assistants (name, description, dify_api_key, dify_app_id, icon_name) VALUES
  ('IP策划师', '帮你构建个人IP形象和人设定位，专注于品牌定位、人设包装', 'TEMP_KEY', 'TEMP_ID', 'brain'),
  ('短视频脚本专家', '专业短视频脚本创作和优化，擅长脚本创作、内容规划', 'TEMP_KEY', 'TEMP_ID', 'video'),
  ('获客策略顾问', '制定精准获客方案和执行策略，专注于客户获取、转化优化', 'TEMP_KEY', 'TEMP_ID', 'target'),
  ('内容策划师', '内容主题策划和创意方案，擅长内容营销、话题策划', 'TEMP_KEY', 'TEMP_ID', 'file-text'),
  ('视频制作助手', '视频拍摄指导和后期建议，专注于制作流程、技术指导', 'TEMP_KEY', 'TEMP_ID', 'film'),
  ('营销文案专家', '营销文案和宣传语创作，专注于推广文案、广告创意', 'TEMP_KEY', 'TEMP_ID', 'message-square'),
  ('数据分析专家', '短视频数据分析和优化建议，专注于数据分析、效果优化', 'TEMP_KEY', 'TEMP_ID', 'bar-chart'),
  ('粉丝运营顾问', '粉丝增长和用户运营策略，专注于粉丝维护、社群运营', 'TEMP_KEY', 'TEMP_ID', 'users'),
  ('商业变现顾问', '变现模式和商业策略设计，专注于商业化、收入规划', 'TEMP_KEY', 'TEMP_ID', 'dollar-sign');
```

## 第二步：配置Dify API（可选）

### 如果有Dify API密钥：
```sql
UPDATE assistants SET 
  dify_api_key = 'your_real_api_key', 
  dify_app_id = 'your_real_app_id';
```

### 如果暂时没有：
系统可以先使用占位符部署，后续再更新。助手选择页面会正常显示，只是聊天功能需要真实API密钥才能工作。

## 第三步：获取Supabase凭证（1分钟）

1. 登录Supabase Dashboard
2. 进入Project Settings > API
3. 复制：
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 第四步：安装依赖（3分钟）

```bash
cd /workspace/xingyao-ai
npm install
```

## 第五步：本地测试（可选）

```bash
# 创建.env.local
echo "NEXT_PUBLIC_SUPABASE_URL=your_url" > .env.local
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key" >> .env.local

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000，使用 admin/password 登录测试。

## 第六步：部署到Vercel（5分钟）

### 使用Vercel CLI（推荐）：
```bash
# 安装CLI
npm install -g vercel

# 登录
vercel login

# 部署
cd /workspace/xingyao-ai
vercel

# 配置环境变量
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY

# 生产部署
vercel --prod
```

### 使用GitHub + Vercel Dashboard：
1. 推送代码到GitHub
2. 在Vercel导入仓库
3. 配置环境变量
4. 点击Deploy

## 第七步：验证（2分钟）

1. 访问Vercel提供的URL
2. 登录测试（admin/password）
3. 检查助手列表是否显示9个助手
4. 测试聊天功能（如果已配置Dify API）

## 常见问题

### Q1: 数据库表创建失败
**A**: 检查是否有Supabase访问权限

### Q2: 登录失败
**A**: 
- 检查环境变量是否正确配置
- 检查users表是否有admin用户

### Q3: 助手列表为空
**A**: 检查assistants表是否有数据

### Q4: AI回复失败
**A**: 
- 检查Dify API密钥是否正确
- 检查dify_base_url是否为 https://api.dify.ai/v1

## 时间估算

- 数据库配置: 2分钟
- 依赖安装: 3分钟
- 部署: 5分钟
- **总计: 约10分钟**

## 下一步优化（可选）

1. 为每个助手配置独立的Dify应用
2. 添加用户注册功能
3. 实现密码加密
4. 添加对话导出功能
5. 优化移动端体验
6. 添加数据统计面板

---

准备就绪！等待Supabase配置完成即可开始部署。
