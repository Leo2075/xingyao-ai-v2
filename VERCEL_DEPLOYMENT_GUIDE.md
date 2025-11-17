# 星耀AI - Vercel部署配置说明

## 环境变量配置

在Vercel项目设置中添加以下环境变量：

```
NEXT_PUBLIC_SUPABASE_URL=https://zopkskdrfgspslrjyini.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvcGtza2RyZmdzcHNscmp5aW5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxODgyNTYsImV4cCI6MjA3ODc2NDI1Nn0.8RDTIgYr_xcdkMVObZuaDWqg1ylfEPaidvmqP-l3yPE
```

## 部署方式

### 方式1：使用Vercel CLI（推荐）
```bash
cd /workspace/xingyao-ai
vercel --prod
```

### 方式2：通过GitHub
1. 推送代码到GitHub仓库
2. 在Vercel Dashboard导入仓库
3. 配置环境变量
4. 点击Deploy

## 部署前检查清单

- [x] 数据库表已创建
- [x] 预设用户已插入
- [x] 预设助手已插入
- [ ] Dify API密钥已配置（待用户提供）
- [x] 环境变量准备就绪
- [x] 项目构建成功
- [x] 本地测试通过

## 注意事项

1. 确保Vercel项目设置中的Node.js版本设置为18或以上
2. 部署后需要在生产环境重新测试所有功能
3. Dify API密钥配置后才能完整测试AI对话功能
