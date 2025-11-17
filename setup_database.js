const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zopkskdrfgspslrjyini.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvcGtza2RyZmdzcHNscmp5aW5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzE4ODI1NiwiZXhwIjoyMDc4NzY0MjU2fQ.06s9KFbsxy7g1gjblBAjvQ7R1nscEPH5JIQ3seUSXxQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  try {
    console.log('开始设置数据库...');

    // 1. 创建用户表
    console.log('创建用户表...');
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username VARCHAR(255) UNIQUE NOT NULL,
          password TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `
    });

    // 2. 创建助手表
    console.log('创建助手表...');
    await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });

    // 3. 插入默认用户
    console.log('插入默认用户...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([{ username: 'admin', password: 'password' }])
      .select();

    if (userError) {
      console.error('插入用户失败:', userError);
    } else {
      console.log('用户创建成功:', userData);
    }

    // 4. 插入助手配置
    console.log('插入助手配置...');
    const { data: assistantData, error: assistantError } = await supabase
      .from('assistants')
      .insert([
        {
          name: 'IP策划师',
          description: '帮你构建个人IP形象和人设定位，专注于品牌定位、人设包装',
          dify_api_key: 'YOUR_DIFY_API_KEY',
          dify_app_id: 'app-CC6sKsQ0DG30G6OqjnABxjJF',
          icon_name: 'brain'
        },
        {
          name: '短视频脚本专家',
          description: '专业短视频脚本创作和优化，擅长脚本创作、内容规划',
          dify_api_key: 'YOUR_DIFY_API_KEY',
          dify_app_id: 'app-CC6sKsQ0DG30G6OqjnABxjJF',
          icon_name: 'video'
        },
        {
          name: '获客策略顾问',
          description: '制定精准获客方案和执行策略，专注于客户获取、转化优化',
          dify_api_key: 'YOUR_DIFY_API_KEY',
          dify_app_id: 'app-CC6sKsQ0DG30G6OqjnABxjJF',
          icon_name: 'target'
        },
        {
          name: '内容策划师',
          description: '内容主题策划和创意方案，擅长内容营销、话题策划',
          dify_api_key: 'YOUR_DIFY_API_KEY',
          dify_app_id: 'app-CC6sKsQ0DG30G6OqjnABxjJF',
          icon_name: 'file-text'
        },
        {
          name: '视频制作助手',
          description: '视频拍摄指导和后期建议，专注于制作流程、技术指导',
          dify_api_key: 'YOUR_DIFY_API_KEY',
          dify_app_id: 'app-CC6sKsQ0DG30G6OqjnABxjJF',
          icon_name: 'film'
        }
      ])
      .select();

    if (assistantError) {
      console.error('插入助手失败:', assistantError);
    } else {
      console.log('助手配置成功:', assistantData);
    }

    console.log('数据库设置完成！');

    // 验证数据
    console.log('\n验证数据:');
    const { data: users } = await supabase.from('users').select('*');
    const { data: assistants } = await supabase.from('assistants').select('*');
    
    console.log('用户数据:', users);
    console.log('助手数量:', assistants?.length);

  } catch (error) {
    console.error('设置数据库时出错:', error);
  }
}

setupDatabase();