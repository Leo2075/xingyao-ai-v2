# 星耀AI 双模式架构迁移指南

本文档说明如何将系统从单一 Dify 模式升级为支持 **Dify + 中转站** 双模式架构。

## 一、迁移步骤

### 步骤 1：执行数据库迁移

在 Supabase Dashboard 中执行以下 SQL：

```sql
-- 文件位置：supabase/migrations/add_dual_mode_config.sql
-- 复制该文件的全部内容并在 Supabase SQL Editor 中执行
```

**执行方式**：
1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择您的项目
3. 点击左侧 "SQL Editor"
4. 粘贴 `supabase/migrations/add_dual_mode_config.sql` 的内容
5. 点击 "Run" 执行

### 步骤 2：配置环境变量

在 `.env.local` 或 Vercel 环境变量中添加：

```env
# 管理后台密码（必填，请修改为强密码）
ADMIN_PASSWORD=your-secure-password-here
```

### 步骤 3：部署代码

```bash
# 本地测试
npm run dev

# 部署到 Vercel
git add .
git commit -m "feat: 支持 Dify + 中转站双模式"
git push
```

## 二、管理后台使用

### 访问地址

```
https://your-domain.com/admin
```

### 默认密码

- 如果未设置 `ADMIN_PASSWORD` 环境变量，默认密码为：`admin123`
- **强烈建议**：在生产环境中设置强密码

### 功能说明

| 功能 | 说明 |
|:---|:---|
| **模式切换** | 点击 "Dify" 或 "中转站" 按钮一键切换 |
| **Dify 配置** | 配置 Dify API URL 和 Key |
| **中转站配置** | 配置中转站 URL、Key、模型名称、历史消息数 |
| **高级参数** | 调整 Temperature、Max Tokens、Top P 等 |
| **系统提示词** | 编辑助手的人设和角色定义 |
| **新增助手** | 创建新的 AI 助手 |
| **删除助手** | 软删除助手（可恢复） |

## 三、配置示例

### Dify 模式配置

```
Dify URL: https://api.dify.ai/v1
Dify Key: app-xxxxxxxxxxxxxxxx
```

### 中转站模式配置

```
中转站 URL: https://your-oneapi.com/v1/chat/completions
API Key: sk-xxxxxxxxxxxxxxxx
模型名称: claude-haiku-4-5-20251001
历史消息数: 20
```

### 常用模型名称

| 厂商 | 模型名称 |
|:---|:---|
| Claude | `claude-haiku-4-5-20251001`、`claude-3-5-sonnet-20241022` |
| OpenAI | `gpt-4-turbo`、`gpt-4o`、`gpt-3.5-turbo` |
| 通义千问 | `qwen-turbo`、`qwen-plus`、`qwen-max` |

## 四、API 接口说明

### 公开接口

| 接口 | 方法 | 说明 |
|:---|:---|:---|
| `/api/assistants` | GET | 获取助手列表（不含敏感信息） |
| `/api/dify/chat` | POST | 发送聊天消息（自动根据模式调用） |

### 管理接口（需要认证）

| 接口 | 方法 | 说明 |
|:---|:---|:---|
| `/api/admin/auth` | POST | 管理员登录 |
| `/api/admin/assistants` | GET | 获取所有助手（含配置） |
| `/api/admin/assistants` | POST | 新增助手 |
| `/api/admin/assistants/[id]` | PATCH | 更新助手配置 |
| `/api/admin/assistants/[id]` | DELETE | 删除助手 |

### 认证方式

在请求头中添加：

```
Authorization: Bearer <ADMIN_PASSWORD>
```

## 五、数据库字段说明

### 新增字段

| 字段 | 类型 | 说明 |
|:---|:---|:---|
| `api_mode` | VARCHAR(20) | 调用模式：`dify` 或 `relay` |
| `dify_url` | TEXT | Dify API 地址 |
| `dify_key` | TEXT | Dify API Key |
| `relay_url` | TEXT | 中转站 API 地址 |
| `relay_key` | TEXT | 中转站 API Key |
| `relay_model` | VARCHAR(100) | 中转站模型名称 |
| `system_prompt` | TEXT | 系统提示词 |
| `temperature` | FLOAT | 温度（默认 0.8） |
| `max_tokens` | INT | 最大输出 Token（默认 2500） |
| `top_p` | FLOAT | 核采样（默认 1.0） |
| `frequency_penalty` | FLOAT | 频率惩罚（默认 0） |
| `presence_penalty` | FLOAT | 存在惩罚（默认 0） |
| `context_window` | INT | 历史消息数（默认 20） |
| `advanced_config` | JSONB | 高级配置 |

## 六、回滚方案

如果需要回滚到纯 Dify 模式：

```sql
-- 将所有助手切换回 Dify 模式
UPDATE assistants SET api_mode = 'dify';
```

## 七、常见问题

### Q: 切换模式后对话历史会丢失吗？

A: 不会。对话历史存储在 `chat_messages` 表中，与调用模式无关。

### Q: 中转站模式下如何处理历史消息？

A: 系统会自动从数据库查询最近 N 条消息（由 `context_window` 配置），并拼接到请求中。

### Q: 前端代码需要改动吗？

A: 不需要。后端返回的 SSE 格式保持兼容，前端无感知。

### Q: 如何测试配置是否正确？

A: 在管理后台修改配置后，直接在聊天页面发送消息测试即可。

## 八、性能对比

| 指标 | Dify 模式 | 中转站模式 |
|:---|:---:|:---:|
| 首字延迟 (TTFT) | ~600ms | ~400ms |
| 网络跳转数 | 3 跳 | 2 跳 |
| 历史消息管理 | Dify 自动 | 后端自动 |
| 知识库 (RAG) | ✅ 支持 | ❌ 不支持 |

---

**文档版本**：v1.0  
**更新日期**：2025-11-25

