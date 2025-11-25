-- 开启 UUID 扩展（如果尚未开启）
create extension if not exists "uuid-ossp";

-- 1. 对话会话表 (Storing Conversations)
create table if not exists chat_conversations (
  id uuid primary key default uuid_generate_v4(), -- 对应 Dify 的 conversation_id
  user_id text not null,                          -- 用户标识 (例如 "user-123" 或 "anon")
  title text,                                     -- 会话标题 (可选)
  assistant_id text,                              -- 关联的助手 ID
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 创建索引以加速查询
create index if not exists idx_conversations_user_id on chat_conversations(user_id);
create index if not exists idx_conversations_updated_at on chat_conversations(updated_at desc);
-- 组合索引：针对常见查询 (assistant_id, user_id, updated_at)
create index if not exists idx_conversations_assistant_user_updated 
  on chat_conversations(assistant_id, user_id, updated_at desc);

-- 2. 消息记录表 (Storing Messages)
create table if not exists chat_messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references chat_conversations(id), -- 关联到会话
  role text not null check (role in ('user', 'assistant')),      -- 角色
  content text not null,                                           -- 消息内容
  user_id text not null,                                           -- 冗余字段方便查询
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  metadata jsonb                                                   -- 存储额外信息 (如 token usage)
);

-- 创建索引
create index if not exists idx_messages_conversation_id on chat_messages(conversation_id);
create index if not exists idx_messages_created_at on chat_messages(created_at);
-- 组合索引：针对常见查询 (conversation_id, user_id, created_at)
create index if not exists idx_messages_conv_user_created 
  on chat_messages(conversation_id, user_id, created_at desc);

