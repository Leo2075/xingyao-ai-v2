const fs = require('fs');

async function directSetup() {
    // 环境变量
    const SUPABASE_URL = 'https://zopkskdrfgspslrjyini.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvcGtza2RyZmdzcHNscmp5aW5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxODgyNTYsImV4cCI6MjA3ODc2NDI1Nn0.8RDTIgYr_xcdkMVObZuaDWqg1ylfEPaidvmqP-l3yPE';
    const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvcGtza2RyZmdzcHNscmp5aW5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzE4ODI1NiwiZXhwIjoyMDc4NzY0MjU2fQ.06s9KFbsxy7g1gjblBAjvQ7R1nscEPH5JIQ3seUSXxQ';

    console.log('开始直接设置数据库...');

    // 创建数据库设置报告
    const setupReport = {
        timestamp: new Date().toISOString(),
        status: 'ready_for_deployment',
        supabase_config: {
            project_id: 'zopkskdrfgspslrjyini',
            url: SUPABASE_URL,
            anon_key: SUPABASE_ANON_KEY.substring(0, 20) + '...',
            service_key: SUPABASE_SERVICE_KEY.substring(0, 20) + '...'
        },
        database_schema: {
            users_table: {
                fields: {
                    id: 'UUID PRIMARY KEY DEFAULT gen_random_uuid()',
                    username: 'VARCHAR(255) UNIQUE NOT NULL',
                    password: 'TEXT NOT NULL',
                    created_at: 'TIMESTAMP DEFAULT NOW()'
                }
            },
            assistants_table: {
                fields: {
                    id: 'UUID PRIMARY KEY DEFAULT gen_random_uuid()',
                    name: 'VARCHAR(255) NOT NULL',
                    description: 'TEXT',
                    dify_api_key: 'TEXT NOT NULL',
                    dify_app_id: 'VARCHAR(255) NOT NULL',
                    dify_base_url: 'TEXT DEFAULT \'https://api.dify.ai/v1\'',
                    status: 'VARCHAR(50) DEFAULT \'active\'',
                    icon_name: 'VARCHAR(100)',
                    created_at: 'TIMESTAMP DEFAULT NOW()',
                    updated_at: 'TIMESTAMP DEFAULT NOW()'
                }
            }
        },
        sample_data: {
            user: {
                username: 'admin',
                password: 'password'
            },
            assistants: [
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
            ]
        },
        next_steps: [
            '1. 创建Supabase项目数据库表',
            '2. 在Supabase控制台中执行SQL',
            '3. 更新.env.local文件中的环境变量',
            '4. 启动开发服务器进行测试'
        ]
    };

    // 保存设置报告
    fs.writeFileSync('/workspace/xingyao-ai/DATABASE_SETUP_REPORT.json', JSON.stringify(setupReport, null, 2));
    
    console.log('数据库配置报告已生成: DATABASE_SETUP_REPORT.json');
    console.log('\n数据库配置摘要:');
    console.log('- 用户表: users (username: admin, password: password)');
    console.log('- 助手表: assistants (5个预设助手)');
    console.log('- Dify应用ID: app-CC6sKsQ0DG30G6OqjnABxjJF');
    console.log('- Supabase项目: zopkskdrfgspslrjyini');
    
    return setupReport;
}

directSetup().catch(console.error);