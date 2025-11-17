// 星耀AI - Dify API密钥更新脚本
// 使用方法: node update_dify_key.js YOUR_ACTUAL_DIFY_API_KEY

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 错误：找不到Supabase环境变量');
  console.log('请确保.env.local文件包含：');
  console.log('  NEXT_PUBLIC_SUPABASE_URL');
  console.log('  NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const newApiKey = process.argv[2];

if (!newApiKey) {
  console.error('❌ 错误：请提供Dify API密钥');
  console.log('使用方法：');
  console.log('  node update_dify_key.js app-YOUR_ACTUAL_API_KEY');
  process.exit(1);
}

if (!newApiKey.startsWith('app-')) {
  console.warn('⚠️  警告：Dify API密钥通常以"app-"开头');
  console.log('您提供的密钥：', newApiKey);
  console.log('继续更新...\n');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateDifyApiKey() {
  console.log('🔄 正在更新Dify API密钥...\n');
  
  try {
    // 更新所有助手的API密钥
    const { data, error } = await supabase
      .from('assistants')
      .update({ dify_api_key: newApiKey })
      .select();

    if (error) {
      throw error;
    }

    console.log('✅ 成功更新！');
    console.log(`📊 已更新 ${data.length} 个助手的API密钥\n`);
    
    // 显示更新后的助手列表
    console.log('更新后的助手列表：');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    data.forEach((assistant, index) => {
      console.log(`${index + 1}. ${assistant.name}`);
      console.log(`   API密钥: ${assistant.dify_api_key.substring(0, 15)}...`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✨ 下一步：');
    console.log('1. 访问您的Vercel部署URL');
    console.log('2. 登录（admin/password）');
    console.log('3. 选择任一助手');
    console.log('4. 测试AI对话功能');
    
  } catch (error) {
    console.error('❌ 更新失败：', error.message);
    process.exit(1);
  }
}

updateDifyApiKey();
