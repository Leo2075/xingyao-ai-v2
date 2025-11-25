-- ============================================================
-- 星耀AI - 数据库迁移：移除 Dify 相关字段
-- 执行此脚本前请确保已备份数据
-- ============================================================

-- 1. 删除 Dify 相关字段
ALTER TABLE assistants DROP COLUMN IF EXISTS api_mode;
ALTER TABLE assistants DROP COLUMN IF EXISTS dify_url;
ALTER TABLE assistants DROP COLUMN IF EXISTS dify_key;
ALTER TABLE assistants DROP COLUMN IF EXISTS dify_api_key;
ALTER TABLE assistants DROP COLUMN IF EXISTS dify_app_id;
ALTER TABLE assistants DROP COLUMN IF EXISTS dify_base_url;
ALTER TABLE assistants DROP COLUMN IF EXISTS key_ref;

-- 2. 确保中转站必需字段存在
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS relay_url TEXT;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS relay_key TEXT;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS relay_model TEXT;

-- 3. 确保模型参数字段存在
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS system_prompt TEXT;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS temperature DECIMAL(3,2) DEFAULT 0.8;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS max_tokens INTEGER DEFAULT 2500;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS top_p DECIMAL(3,2) DEFAULT 1.0;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS frequency_penalty DECIMAL(3,2) DEFAULT 0;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS presence_penalty DECIMAL(3,2) DEFAULT 0;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS context_window INTEGER DEFAULT 20;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS advanced_config JSONB;

-- 4. 添加字段注释
COMMENT ON COLUMN assistants.relay_url IS '中转站 API 地址';
COMMENT ON COLUMN assistants.relay_key IS '中转站 API 密钥';
COMMENT ON COLUMN assistants.relay_model IS '模型名称，如 claude-haiku-4-5-20251001';
COMMENT ON COLUMN assistants.system_prompt IS '系统提示词';
COMMENT ON COLUMN assistants.temperature IS '温度参数 (0-2)';
COMMENT ON COLUMN assistants.max_tokens IS '最大输出 token 数';
COMMENT ON COLUMN assistants.top_p IS '核采样参数 (0-1)';
COMMENT ON COLUMN assistants.frequency_penalty IS '频率惩罚 (-2 到 2)';
COMMENT ON COLUMN assistants.presence_penalty IS '存在惩罚 (-2 到 2)';
COMMENT ON COLUMN assistants.context_window IS '发送给大模型的历史消息数量';
COMMENT ON COLUMN assistants.advanced_config IS '高级配置（JSON 格式）';

-- 5. 显示最终表结构
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'assistants'
ORDER BY ordinal_position;

