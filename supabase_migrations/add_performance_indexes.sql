-- ============================================================
-- 性能优化：添加组合索引
-- 创建时间: 2025-11-25
-- ============================================================

-- 为对话列表查询添加组合索引
-- 优化查询: WHERE assistant_id = ? AND user_id = ? ORDER BY updated_at DESC
create index if not exists idx_conversations_assistant_user_updated 
  on chat_conversations(assistant_id, user_id, updated_at desc);

-- 为消息查询添加组合索引  
-- 优化查询: WHERE conversation_id = ? AND user_id = ? ORDER BY created_at
create index if not exists idx_messages_conv_user_created 
  on chat_messages(conversation_id, user_id, created_at desc);

-- 分析表以更新统计信息
analyze chat_conversations;
analyze chat_messages;

