# 星耀AI - Vercel部署完整指南

## 🚀 快速部署（推荐方式）

### 方式一：通过Vercel Dashboard部署（最简单）

1. **访问Vercel控制台**
   - 打开 https://vercel.com
   - 使用GitHub账号登录

2. **导入项目**
   - 点击 "Add New..." → "Project"
   - 选择 "Import Git Repository"
   - 如果项目在GitHub：直接选择仓库
   - 如果项目在本地：先推送到GitHub（见下方说明）

3. **配置项目**
   ```
   Framework Preset: Next.js
   Root Directory: ./
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   ```

4. **配置环境变量**
   在 "Environment Variables" 部分添加以下变量：
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://zopkskdrfgspslrjyini.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvcGtza2RyZmdzcHNscmp5aW5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxODgyNTYsImV4cCI6MjA3ODc2NDI1Nn0.8RDTIgYr_xcdkMVObZuaDWqg1ylfEPaidvmqP-l3yPE
   ```

5. **点击 "Deploy"**
   - Vercel会自动构建和部署
   - 等待3-5分钟完成部署
   - 获取部署URL（如：https://xingyao-ai.vercel.app）

---

### 方式二：使用Vercel CLI部署

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
   cd /workspace/xingyao-ai
   vercel --prod
   ```

4. **按提示配置**
   - Set up and deploy? **Y**
   - Which scope? 选择你的账户
   - Link to existing project? **N**
   - What's your project's name? **xingyao-ai**
   - In which directory is your code located? **./**
   - Want to override the settings? **N**

5. **添加环境变量**
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL production
   # 输入: https://zopkskdrfgspslrjyini.supabase.co
   
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
   # 输入: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvcGtza2RyZmdzcHNscmp5aW5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxODgyNTYsImV4cCI6MjA3ODc2NDI1Nn0.8RDTIgYr_xcdkMVObZuaDWqg1ylfEPaidvmqP-l3yPE
   ```

6. **重新部署应用环境变量**
   ```bash
   vercel --prod
   ```

---

### 方式三：通过GitHub自动部署（最佳实践）

1. **创建GitHub仓库**
   ```bash
   cd /workspace/xingyao-ai
   git init
   git add .
   git commit -m "Initial commit: 星耀AI平台"
   ```

2. **推送到GitHub**
   - 在GitHub上创建新仓库（如：xingyao-ai）
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/xingyao-ai.git
   git branch -M main
   git push -u origin main
   ```

3. **连接Vercel**
   - 访问 https://vercel.com/new
   - 点击 "Import Git Repository"
   - 选择刚创建的GitHub仓库
   - 配置环境变量（同方式一）
   - 点击 "Deploy"

4. **自动部署优势**
   - 每次推送代码自动部署
   - 预览部署：每个PR都有独立预览URL
   - 回滚功能：一键回滚到任何历史版本

---

## 🔐 配置Dify API密钥

部署完成后，需要配置Dify API密钥才能使用AI对话功能：

### 步骤1：获取Dify API密钥

1. **登录Dify控制台**
   - 访问 https://cloud.dify.ai
   - 登录你的账号

2. **创建应用（如果还没有）**
   - 点击 "创建应用"
   - 选择 "聊天助手" 类型
   - 配置助手参数

3. **获取API密钥**
   - 在应用详情页面
   - 找到 "API密钥" 或 "API Access"
   - 点击 "查看" 或 "生成密钥"
   - 复制API Key（格式：app-xxxxxxxxxxxxx）

### 步骤2：更新数据库中的API密钥

**重要**：每个助手都需要配置自己的Dify API密钥。

#### 方法A：使用Supabase控制台（推荐）

1. **访问Supabase**
   - 打开 https://supabase.com/dashboard
   - 选择项目：zopkskdrfgspslrjyini

2. **打开Table Editor**
   - 左侧菜单选择 "Table Editor"
   - 选择 "assistants" 表

3. **更新API密钥**
   - 找到要配置的助手
   - 点击编辑按钮
   - 更新以下字段：
     - `dify_api_key`: 填入你的API Key（app-xxxxxxxxxxxxx）
     - `dify_app_id`: 填入App ID（如果有的话）
   - 保存更改

4. **批量更新（可选）**
   如果所有助手使用同一个API密钥，可以使用SQL：
   ```sql
   UPDATE assistants 
   SET dify_api_key = 'app-YOUR_ACTUAL_API_KEY'
   WHERE dify_api_key = 'app-VBz8EfzBpg5TIIJJGQpUVU5l';
   ```

#### 方法B：使用SQL编辑器

1. 在Supabase控制台，选择 "SQL Editor"
2. 运行以下SQL（替换YOUR_API_KEY）：
   ```sql
   -- 更新单个助手
   UPDATE assistants 
   SET dify_api_key = 'app-YOUR_ACTUAL_API_KEY'
   WHERE name = 'IP策划师';
   
   -- 或批量更新所有助手
   UPDATE assistants 
   SET dify_api_key = 'app-YOUR_ACTUAL_API_KEY';
   ```

### 步骤3：测试AI对话功能

1. **访问部署的网站**
   - 使用Vercel提供的URL

2. **登录系统**
   - 用户名：`admin`
   - 密码：`password`

3. **选择助手**
   - 在助手列表页选择任一助手

4. **测试对话**
   - 发送测试消息
   - 检查是否收到AI回复
   - 验证流式响应是否正常

---

## 📋 部署检查清单

### 部署前检查
- [ ] 已构建项目：`npm run build` 成功
- [ ] 环境变量已准备：SUPABASE_URL, SUPABASE_ANON_KEY
- [ ] 数据库已配置：users表和assistants表已创建
- [ ] 初始数据已插入：1个用户 + 9个助手

### 部署后检查
- [ ] 网站可正常访问
- [ ] 登录功能正常（admin/password）
- [ ] 助手列表正常显示
- [ ] 聊天界面布局正确
- [ ] Dify API密钥已配置（待完成）
- [ ] AI对话功能正常（待完成）

---

## 🔧 常见问题

### Q1: 部署后显示404错误
**解决方法**：
- 检查Vercel构建日志，确认构建成功
- 确认Output Directory设置为`.next`
- 重新部署项目

### Q2: 登录后跳转失败
**解决方法**：
- 检查环境变量是否正确配置
- 查看浏览器控制台错误信息
- 确认Supabase数据库连接正常

### Q3: API请求失败（CORS错误）
**解决方法**：
- Vercel部署的Next.js自动处理CORS
- 如果仍有问题，检查API路由配置
- 确认客户端请求使用相对路径（`/api/...`）

### Q4: AI对话无响应
**解决方法**：
1. 检查Dify API密钥是否正确配置
2. 在Supabase中验证assistants表的dify_api_key字段
3. 测试Dify API密钥是否有效：
   ```bash
   curl -X POST 'https://api.dify.ai/v1/chat-messages' \
     -H 'Authorization: Bearer app-YOUR_API_KEY' \
     -H 'Content-Type: application/json' \
     -d '{"query": "你好", "user": "test"}'
   ```

### Q5: 构建失败
**解决方法**：
- 检查Node.js版本（推荐v18或v20）
- 删除node_modules和.next，重新安装：
  ```bash
  rm -rf node_modules .next
  npm install
  npm run build
  ```
- 查看构建日志定位具体错误

---

## 📞 获取帮助

**Dify API文档**：https://docs.dify.ai/
**Vercel文档**：https://vercel.com/docs
**Next.js文档**：https://nextjs.org/docs
**Supabase文档**：https://supabase.com/docs

---

## ✅ 下一步行动

1. **立即行动**：
   - 选择上述三种部署方式之一
   - 完成Vercel部署
   - 获取生产环境URL

2. **配置Dify**：
   - 获取Dify API密钥
   - 更新数据库配置
   - 测试AI对话功能

3. **验证系统**：
   - 测试所有页面和功能
   - 确认响应式设计
   - 验证生产环境性能

**预计完成时间**：15-30分钟

---

**项目状态**：✅ 代码完成 | ⏳ 等待部署 | ⏳ 等待Dify配置

