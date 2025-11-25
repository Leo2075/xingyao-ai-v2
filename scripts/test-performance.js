/**
 * 性能测试脚本
 * 用于测试对话列表和消息加载的响应时间
 * 
 * 使用方法：
 * node scripts/test-performance.js
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'

// 测试配置
const TEST_CONFIG = {
  assistantId: process.env.TEST_ASSISTANT_ID || 'your-assistant-id',
  userId: process.env.TEST_USER_ID || 'test-user-123',
  conversationId: process.env.TEST_CONVERSATION_ID || 'your-conversation-id',
  iterations: 10, // 每个测试运行次数
}

// 格式化时间
const formatTime = (ms) => {
  return `${ms.toFixed(2)}ms`
}

// 测试对话列表加载
async function testConversationsList() {
  console.log('\n📋 测试对话列表加载性能...')
  console.log('━'.repeat(50))
  
  const times = []
  
  for (let i = 0; i < TEST_CONFIG.iterations; i++) {
    const start = performance.now()
    
    try {
      const response = await fetch(`${API_BASE}/api/dify/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistantId: TEST_CONFIG.assistantId,
          userId: TEST_CONFIG.userId,
        }),
      })
      
      const data = await response.json()
      const end = performance.now()
      const duration = end - start
      
      times.push(duration)
      
      if (response.ok) {
        console.log(`  ✓ 测试 ${i + 1}: ${formatTime(duration)} (${data.conversations?.length || 0} 条对话)`)
      } else {
        console.log(`  ✗ 测试 ${i + 1}: 失败 - ${data.error}`)
      }
    } catch (error) {
      console.log(`  ✗ 测试 ${i + 1}: 错误 - ${error.message}`)
    }
  }
  
  // 计算统计数据
  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const min = Math.min(...times)
  const max = Math.max(...times)
  const sorted = [...times].sort((a, b) => a - b)
  const p50 = sorted[Math.floor(sorted.length * 0.5)]
  const p95 = sorted[Math.floor(sorted.length * 0.95)]
  
  console.log('\n📊 统计结果:')
  console.log(`  平均: ${formatTime(avg)}`)
  console.log(`  最快: ${formatTime(min)}`)
  console.log(`  最慢: ${formatTime(max)}`)
  console.log(`  P50:  ${formatTime(p50)}`)
  console.log(`  P95:  ${formatTime(p95)}`)
  
  return { avg, min, max, p50, p95 }
}

// 测试消息加载
async function testMessagesList() {
  console.log('\n💬 测试消息加载性能...')
  console.log('━'.repeat(50))
  
  const times = []
  
  for (let i = 0; i < TEST_CONFIG.iterations; i++) {
    const start = performance.now()
    
    try {
      const response = await fetch(`${API_BASE}/api/dify/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: TEST_CONFIG.conversationId,
          userId: TEST_CONFIG.userId,
          cursorRounds: 0,
          rounds: 5,
        }),
      })
      
      const data = await response.json()
      const end = performance.now()
      const duration = end - start
      
      times.push(duration)
      
      if (response.ok) {
        console.log(`  ✓ 测试 ${i + 1}: ${formatTime(duration)} (${data.messages?.length || 0} 条消息)`)
      } else {
        console.log(`  ✗ 测试 ${i + 1}: 失败 - ${data.error}`)
      }
    } catch (error) {
      console.log(`  ✗ 测试 ${i + 1}: 错误 - ${error.message}`)
    }
  }
  
  // 计算统计数据
  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const min = Math.min(...times)
  const max = Math.max(...times)
  const sorted = [...times].sort((a, b) => a - b)
  const p50 = sorted[Math.floor(sorted.length * 0.5)]
  const p95 = sorted[Math.floor(sorted.length * 0.95)]
  
  console.log('\n📊 统计结果:')
  console.log(`  平均: ${formatTime(avg)}`)
  console.log(`  最快: ${formatTime(min)}`)
  console.log(`  最慢: ${formatTime(max)}`)
  console.log(`  P50:  ${formatTime(p50)}`)
  console.log(`  P95:  ${formatTime(p95)}`)
  
  return { avg, min, max, p50, p95 }
}

// 生成性能报告
function generateReport(conversationsStats, messagesStats) {
  console.log('\n' + '═'.repeat(50))
  console.log('🎯 性能测试总结')
  console.log('═'.repeat(50))
  
  console.log('\n对话列表加载:')
  console.log(`  • 平均响应时间: ${formatTime(conversationsStats.avg)}`)
  console.log(`  • P95 响应时间: ${formatTime(conversationsStats.p95)}`)
  
  if (conversationsStats.avg < 200) {
    console.log('  ✅ 性能优秀 (< 200ms)')
  } else if (conversationsStats.avg < 500) {
    console.log('  ⚠️  性能良好 (200-500ms)')
  } else {
    console.log('  ❌ 性能需要优化 (> 500ms)')
  }
  
  console.log('\n消息加载:')
  console.log(`  • 平均响应时间: ${formatTime(messagesStats.avg)}`)
  console.log(`  • P95 响应时间: ${formatTime(messagesStats.p95)}`)
  
  if (messagesStats.avg < 250) {
    console.log('  ✅ 性能优秀 (< 250ms)')
  } else if (messagesStats.avg < 500) {
    console.log('  ⚠️  性能良好 (250-500ms)')
  } else {
    console.log('  ❌ 性能需要优化 (> 500ms)')
  }
  
  console.log('\n建议:')
  if (conversationsStats.avg > 200 || messagesStats.avg > 250) {
    console.log('  • 确认已执行数据库索引迁移')
    console.log('  • 检查数据库连接延迟')
    console.log('  • 考虑启用缓存策略')
  } else {
    console.log('  • 性能表现良好！')
    console.log('  • 可以考虑进一步优化前端加载体验')
  }
  
  console.log('\n' + '═'.repeat(50))
}

// 主函数
async function main() {
  console.log('🚀 星耀AI - 性能测试')
  console.log(`📍 API地址: ${API_BASE}`)
  console.log(`🔄 每项测试运行 ${TEST_CONFIG.iterations} 次`)
  
  // 检查配置
  if (!TEST_CONFIG.assistantId || TEST_CONFIG.assistantId === 'your-assistant-id') {
    console.error('\n❌ 错误: 请设置 TEST_ASSISTANT_ID 环境变量')
    console.log('\n使用方法:')
    console.log('  TEST_ASSISTANT_ID=your-id TEST_CONVERSATION_ID=conv-id node scripts/test-performance.js')
    process.exit(1)
  }
  
  try {
    // 运行测试
    const conversationsStats = await testConversationsList()
    await new Promise(resolve => setTimeout(resolve, 1000)) // 等待1秒
    const messagesStats = await testMessagesList()
    
    // 生成报告
    generateReport(conversationsStats, messagesStats)
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message)
    process.exit(1)
  }
}

// 运行测试
main()

