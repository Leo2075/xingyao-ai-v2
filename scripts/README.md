# 性能测试工具

## 使用方法

### 1. 运行性能测试

```bash
# 设置测试环境变量
export TEST_ASSISTANT_ID="your-assistant-id"
export TEST_CONVERSATION_ID="your-conversation-id"
export TEST_USER_ID="test-user-123"

# 运行测试
node scripts/test-performance.js
```

### 2. Windows PowerShell

```powershell
$env:TEST_ASSISTANT_ID="your-assistant-id"
$env:TEST_CONVERSATION_ID="your-conversation-id"
$env:TEST_USER_ID="test-user-123"
node scripts/test-performance.js
```

### 3. 一次性运行

```bash
TEST_ASSISTANT_ID=your-id TEST_CONVERSATION_ID=conv-id node scripts/test-performance.js
```

## 输出示例

```
🚀 星耀AI - 性能测试
📍 API地址: http://localhost:3000
🔄 每项测试运行 10 次

📋 测试对话列表加载性能...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ 测试 1: 145.23ms (15 条对话)
  ✓ 测试 2: 132.45ms (15 条对话)
  ...

📊 统计结果:
  平均: 138.56ms
  最快: 125.34ms
  最慢: 156.78ms
  P50:  136.45ms
  P95:  152.34ms

💬 测试消息加载性能...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ 测试 1: 178.56ms (10 条消息)
  ✓ 测试 2: 165.34ms (10 条消息)
  ...

📊 统计结果:
  平均: 172.34ms
  最快: 158.23ms
  最慢: 189.45ms
  P50:  170.12ms
  P95:  185.67ms

═══════════════════════════════════════════════════
🎯 性能测试总结
═══════════════════════════════════════════════════

对话列表加载:
  • 平均响应时间: 138.56ms
  • P95 响应时间: 152.34ms
  ✅ 性能优秀 (< 200ms)

消息加载:
  • 平均响应时间: 172.34ms
  • P95 响应时间: 185.67ms
  ✅ 性能优秀 (< 250ms)

建议:
  • 性能表现良好！
  • 可以考虑进一步优化前端加载体验

═══════════════════════════════════════════════════
```

## 性能基准

| 指标 | 优秀 | 良好 | 需优化 |
|------|------|------|--------|
| 对话列表 | < 200ms | 200-500ms | > 500ms |
| 消息加载 | < 250ms | 250-500ms | > 500ms |

## 故障排查

### 测试失败

如果测试失败，请检查：

1. **应用是否在运行**
   ```bash
   # 启动开发服务器
   npm run dev
   ```

2. **数据库连接是否正常**
   - 检查 Supabase 配置
   - 验证网络连接

3. **测试数据是否存在**
   - 确认助手ID存在
   - 确认对话ID存在

### 性能问题

如果性能不理想：

1. **应用数据库索引**
   ```bash
   # 在 Supabase SQL Editor 执行
   supabase_migrations/add_performance_indexes.sql
   ```

2. **检查数据库查询**
   - 在 Supabase 控制台查看慢查询日志
   - 使用 EXPLAIN ANALYZE 分析查询计划

3. **网络延迟**
   - 检查到数据库的网络延迟
   - 考虑使用距离更近的数据库区域

## 持续监控

建议在以下情况运行测试：

- ✅ 代码优化后
- ✅ 数据库结构变更后
- ✅ 部署到生产环境前
- ✅ 定期性能检查（每周/每月）

