// 快速验证数据库配置的脚本
const fetch = require('node-fetch');

async function verifyDatabase() {
    const SUPABASE_URL = 'https://zopkskdrfgspslrjyini.supabase.co';
    const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvcGtza2RyZmdzcHNscmp5aW5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxODgyNTYsImV4cCI6MjA3ODc2NDI1Nn0.8RDTIgYr_xcdkMVObZuaDWqg1ylfEPaidvmqP-l3yPE';

    console.log('🔍 验证数据库配置...');

    // 检查用户表
    try {
        const userResponse = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
            headers: {
                'apikey': ANON_KEY,
                'Authorization': `Bearer ${ANON_KEY}`
            }
        });
        
        if (userResponse.ok) {
            const users = await userResponse.json();
            console.log(`✅ 用户表存在, 现有用户数: ${users.length}`);
            if (users.length > 0) {
                console.log(`   - 用户: ${users[0].username} (${users[0].password})`);
            }
        } else {
            console.log('❌ 用户表不存在或无访问权限');
        }
    } catch (error) {
        console.log('❌ 无法访问用户表:', error.message);
    }

    // 检查助手表
    try {
        const assistantResponse = await fetch(`${SUPABASE_URL}/rest/v1/assistants`, {
            headers: {
                'apikey': ANON_KEY,
                'Authorization': `Bearer ${ANON_KEY}`
            }
        });
        
        if (assistantResponse.ok) {
            const assistants = await assistantResponse.json();
            console.log(`✅ 助手表存在, 现有助手数: ${assistants.length}`);
            if (assistants.length > 0) {
                console.log('   - 助手列表:');
                assistants.forEach(assistant => {
                    console.log(`     • ${assistant.name} (${assistant.icon_name})`);
                });
            }
        } else {
            console.log('❌ 助手表不存在或无访问权限');
        }
    } catch (error) {
        console.log('❌ 无法访问助手表:', error.message);
    }

    console.log('\n📋 如果上述检查都失败，请:');
    console.log('1. 在 Supabase 控制台执行 manual_db_setup.sql');
    console.log('2. 确认 API 密钥配置正确');
    console.log('3. 重新运行此验证脚本');
}

verifyDatabase();