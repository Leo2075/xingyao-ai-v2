# 星耀AI - 快速部署指南

## 🚀 一键部署到Vercel（5分钟完成）

### 方式1：导入现有项目（推荐）

1. **访问Vercel**
   - 打开：https://vercel.com/new
   - 使用GitHub/GitLab/Bitbucket账号登录

2. **导入项目**
   - 点击 "Import Git Repository"
   - 如果项目在GitHub：选择仓库
   - 如果项目在本地：
     ```bash
     # 在xingyao-ai目录下执行
     git init
     git add .
     git commit -m "Initial commit"
     # 推送到GitHub后在Vercel导入
     ```

3. **配置环境变量**（重要！）
   在Vercel项目配置中添加：
   
   ```
   变量名: NEXT_PUBLIC_SUPABASE_URL
   值: https://zopkskdrfgspslrjyini.supabase.co
   
   变量名: NEXT_PUBLIC_SUPABASE_ANON_KEY
   值: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvcGtza2RyZmdzcHNscmp5aW5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxODgyNTYsImV4cCI6MjA3ODc2NDI1Nn0.8RDTIgYr_xcdkMVObZuaDWqg1ylfEPaidvmqP-l3yPE
   ```

4. **部署**
   - 点击 "Deploy"
   - 等待3-5分钟
   - 获取部署URL（例如：https://xingyao-ai-xxx.vercel.app）

---

## 🔐 配置Dify API密钥（必需步骤）

当前数据库中的API密钥是无效的测试密钥，必须更新为真实密钥才能使用AI对话功能。

### 步骤1：获取Dify API密钥

1. 访问 https://cloud.dify.ai
2. 登录账号
3. 点击 "创建应用" → 选择 "聊天助手"
4. 创建后进入应用详情
5. 找到 "API访问" → 点击 "API密钥"
6. 复制API Key（格式：app-xxxxxxxxxxxxx）

### 步骤2：更新数据库

**使用Supabase控制台更新**：

1. 访问 https://supabase.com/dashboard
2. 选择项目：`zopkskdrfgspslrjyini`
3. 左侧菜单 → "SQL Editor"
4. 运行以下SQL（替换YOUR_ACTUAL_API_KEY）：

```sql
-- 批量更新所有助手的API密钥
UPDATE assistants 
SET dify_api_key = 'app-YOUR_ACTUAL_API_KEY';

-- 验证更新
SELECT name, dify_api_key FROM assistants;
```

---

## ✅ 测试验证

部署完成并配置API密钥后：

1. **访问部署的URL**
2. **登录**
   - 用户名：`admin`
   - 密码：`password`
3. **选择任一助手**（如：IP策划师）
4. **发送测试消息**（如："你好，介绍一下你的功能"）
5. **验证AI回复**

如果看到流式响应的AI回复，说明部署成功！

---

## 📋 部署检查清单

- [ ] Vercel部署完成
- [ ] 环境变量已配置（2个）
- [ ] 获取了Dify API密钥
- [ ] 数据库中的API密钥已更新
- [ ] 登录功能测试通过
- [ ] 助手列表显示正常
- [ ] AI对话功能测试通过

---

## 🆘 常见问题

### Q: 部署后显示404
**A**: 检查Vercel构建日志，确认构建成功。Framework Preset应为"Next.js"。

### Q: 登录后无反应
**A**: 
1. 检查浏览器控制台错误
2. 确认环境变量配置正确
3. 验证Supabase数据库连接

### Q: AI对话无响应或报错
**A**: 
1. 确认已更新Dify API密钥
2. 测试API密钥是否有效：
   ```bash
   curl -X POST 'https://api.dify.ai/v1/chat-messages' \
     -H 'Authorization: Bearer app-YOUR_API_KEY' \
     -H 'Content-Type: application/json' \
     -d '{"query": "你好", "user": "test"}'
   ```
3. 检查Supabase中assistants表的dify_api_key字段

### Q: 部署很慢
**A**: Next.js首次部署需要3-5分钟，这是正常现象。后续更新会更快。

---

## 📞 获取帮助

- **Vercel文档**: https://vercel.com/docs
- **Dify文档**: https://docs.dify.ai/
- **Next.js文档**: https://nextjs.org/docs
- **Supabase文档**: https://supabase.com/docs

---

**项目状态**：
- ✅ 代码100%完成
- ✅ 数据库已配置
- ⏳ 等待Vercel部署
- ⏳ 等待Dify API密钥配置

**预计完成时间**: 10-15分钟
