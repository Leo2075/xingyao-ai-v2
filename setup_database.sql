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

-- 删除所有现有数据（重新配置）
TRUNCATE TABLE assistants CASCADE;
TRUNCATE TABLE users CASCADE;

-- 插入默认用户
INSERT INTO users (username, password) VALUES ('admin', 'password');

-- 插入实际助手配置（使用用户提供的Dify应用ID）
INSERT INTO assistants (name, description, dify_api_key, dify_app_id, icon_name) VALUES
  ('IP策划师', '帮你构建个人IP形象和人设定位，专注于品牌定位、人设包装', 'YOUR_DIFY_API_KEY', 'app-CC6sKsQ0DG30G6OqjnABxjJF', 'brain'),
  ('短视频脚本专家', '专业短视频脚本创作和优化，擅长脚本创作、内容规划', 'YOUR_DIFY_API_KEY', 'app-CC6sKsQ0DG30G6OqjnABxjJF', 'video'),
  ('获客策略顾问', '制定精准获客方案和执行策略，专注于客户获取、转化优化', 'YOUR_DIFY_API_KEY', 'app-CC6sKsQ0DG30G6OqjnABxjJF', 'target'),
  ('内容策划师', '内容主题策划和创意方案，擅长内容营销、话题策划', 'YOUR_DIFY_API_KEY', 'app-CC6sKsQ0DG30G6OqjnABxjJF', 'file-text'),
  ('视频制作助手', '视频拍摄指导和后期建议，专注于制作流程、技术指导', 'YOUR_DIFY_API_KEY', 'app-CC6sKsQ0DG30G6OqjnABxjJF', 'film');