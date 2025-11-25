-- ============================================================
-- 星耀AI 双模式架构迁移脚本
-- 支持 Dify 和 中转站 两种调用模式
-- ============================================================

-- 1. 添加调用模式字段
ALTER TABLE assistants 
  ADD COLUMN IF NOT EXISTS api_mode VARCHAR(20) DEFAULT 'dify' 
    CHECK (api_mode IN ('dify', 'relay'));

-- 2. 添加 Dify 配置字段
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS dify_url TEXT;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS dify_key TEXT;

-- 3. 添加中转站配置字段
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS relay_url TEXT;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS relay_key TEXT;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS relay_model VARCHAR(100);

-- 4. 添加通用模型参数
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS system_prompt TEXT;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS temperature FLOAT DEFAULT 0.8;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS max_tokens INT DEFAULT 2500;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS top_p FLOAT DEFAULT 1.0;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS frequency_penalty FLOAT DEFAULT 0.0;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS presence_penalty FLOAT DEFAULT 0.0;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS context_window INT DEFAULT 20;

-- 5. 添加高级配置（JSON 扩展字段）
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS advanced_config JSONB DEFAULT '{}'::jsonb;

-- 6. 迁移旧数据：将 dify_api_key 和 dify_base_url 复制到新字段
UPDATE assistants 
SET 
  dify_url = COALESCE(dify_base_url, 'https://api.dify.ai/v1'),
  dify_key = dify_api_key
WHERE dify_url IS NULL AND dify_api_key IS NOT NULL;

-- 7. 设置默认的系统提示词（根据助手名称）
UPDATE assistants SET system_prompt = '你是一个专业的个人IP策划师，擅长帮助创业者和企业家打造独特的个人品牌形象。' WHERE name LIKE '%IP%' AND system_prompt IS NULL;
UPDATE assistants SET system_prompt = '你是一个短视频脚本创作专家，擅长创作吸引人的短视频文案和脚本。' WHERE name LIKE '%脚本%' AND system_prompt IS NULL;
UPDATE assistants SET system_prompt = '你是一个获客策略顾问，擅长制定精准的获客方案和执行策略。' WHERE name LIKE '%获客%' AND system_prompt IS NULL;
UPDATE assistants SET system_prompt = '你是一个内容策划师，擅长内容主题策划和创意方案设计。' WHERE name LIKE '%内容%' AND system_prompt IS NULL;
UPDATE assistants SET system_prompt = '你是一个视频制作助手，擅长视频拍摄指导和后期制作建议。' WHERE name LIKE '%视频%' AND system_prompt IS NULL;
UPDATE assistants SET system_prompt = '你是一个营销文案专家，擅长营销文案和宣传语创作。' WHERE name LIKE '%文案%' AND system_prompt IS NULL;
UPDATE assistants SET system_prompt = '你是一个数据分析专家，擅长短视频数据分析和优化建议。' WHERE name LIKE '%数据%' AND system_prompt IS NULL;
UPDATE assistants SET system_prompt = '你是一个粉丝运营顾问，擅长粉丝增长和用户运营策略。' WHERE name LIKE '%粉丝%' AND system_prompt IS NULL;
UPDATE assistants SET system_prompt = '你是一个商业变现顾问，擅长变现模式和商业策略设计。' WHERE name LIKE '%变现%' AND system_prompt IS NULL;

-- 8. 为其他未匹配的助手设置通用提示词
UPDATE assistants SET system_prompt = '你是一个专业的AI助手，擅长帮助用户解决问题。' WHERE system_prompt IS NULL;

-- 9. 创建索引优化查询
CREATE INDEX IF NOT EXISTS idx_assistants_api_mode ON assistants(api_mode);

-- 10. 添加字段注释
COMMENT ON COLUMN assistants.api_mode IS '调用模式: dify=Dify平台, relay=中转站(OpenAI格式)';
COMMENT ON COLUMN assistants.dify_url IS 'Dify API 地址';
COMMENT ON COLUMN assistants.dify_key IS 'Dify API Key';
COMMENT ON COLUMN assistants.relay_url IS '中转站 API 地址';
COMMENT ON COLUMN assistants.relay_key IS '中转站 API Key';
COMMENT ON COLUMN assistants.relay_model IS '中转站使用的模型名称';
COMMENT ON COLUMN assistants.system_prompt IS '系统提示词';
COMMENT ON COLUMN assistants.context_window IS '历史消息条数，仅在relay模式下生效';
COMMENT ON COLUMN assistants.advanced_config IS '高级参数，如 {"stop": ["Human:", "AI:"], "n": 1}';

-- ============================================================
-- 迁移完成后，可以选择删除旧字段（可选，建议先保留一段时间）
-- ALTER TABLE assistants DROP COLUMN IF EXISTS dify_api_key;
-- ALTER TABLE assistants DROP COLUMN IF EXISTS dify_base_url;
-- ALTER TABLE assistants DROP COLUMN IF EXISTS dify_app_id;
-- ============================================================

