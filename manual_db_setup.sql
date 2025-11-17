-- ===============================================
-- 星耀AI 数据库手动设置脚本
-- 请在 Supabase 控制台 > SQL Editor 中执行
-- 项目ID: zopkskdrfgspslrjyini
-- ===============================================

-- 1. 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. 创建助手表
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

-- 3. 插入默认用户
INSERT INTO users (username, password) VALUES ('admin', 'password')
ON CONFLICT (username) DO NOTHING;

-- 4. 插入助手配置
INSERT INTO assistants (name, description, dify_api_key, dify_app_id, icon_name) VALUES
  ('IP策划师', '帮你构建个人IP形象和人设定位，专注于品牌定位、人设包装', 'YOUR_DIFY_API_KEY', 'app-CC6sKsQ0DG30G6OqjnABxjJF', 'brain'),
  ('短视频脚本专家', '专业短视频脚本创作和优化，擅长脚本创作、内容规划', 'YOUR_DIFY_API_KEY', 'app-CC6sKsQ0DG30G6OqjnABxjJF', 'video'),
  ('获客策略顾问', '制定精准获客方案和执行策略，专注于客户获取、转化优化', 'YOUR_DIFY_API_KEY', 'app-CC6sKsQ0DG30G6OqjnABxjJF', 'target'),
  ('内容策划师', '内容主题策划和创意方案，擅长内容营销、话题策划', 'YOUR_DIFY_API_KEY', 'app-CC6sKsQ0DG30G6OqjnABxjJF', 'file-text'),
  ('视频制作助手', '视频拍摄指导和后期建议，专注于制作流程、技术指导', 'YOUR_DIFY_API_KEY', 'app-CC6sKsQ0DG30G6OqjnABxjJF', 'film')
ON CONFLICT DO NOTHING;

-- 5. 验证数据
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'assistants' as table_name, COUNT(*) as count FROM assistants;

-- 6. 查看用户数据
SELECT username, password, created_at FROM users;

-- 7. 查看助手数据
SELECT name, dify_app_id, icon_name FROM assistants ORDER BY created_at;