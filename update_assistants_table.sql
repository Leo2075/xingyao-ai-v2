-- ===============================================
-- 星耀AI 数据库结构调整脚本
-- 移除dify_app_id字段，添加真实的Dify API Key
-- ===============================================

-- 1. 移除assistants表中的dify_app_id字段
ALTER TABLE assistants DROP COLUMN IF EXISTS dify_app_id;

-- 2. 更新现有助手的dify_api_key为真实密钥
UPDATE assistants SET 
  dify_api_key = 'app-CC6sKsQ0DG30G6OqjnABxjJF',
  updated_at = NOW();

-- 3. 验证更新后的表结构
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'assistants' 
ORDER BY ordinal_position;

-- 4. 查看更新后的助手数据
SELECT name, dify_api_key, dify_base_url, status, icon_name FROM assistants;

-- 5. 确认所有助手数据都使用了正确的API Key
SELECT 
  name,
  CASE WHEN dify_api_key = 'app-CC6sKsQ0DG30G6OqjnABxjJF' THEN '✓ 正确' ELSE '✗ 需要更新' END as api_key_status
FROM assistants;