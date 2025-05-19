/**
 * 调试工具：记录请求详情
 * @param req 请求对象
 * @param context 上下文名称
 */
export const logRequestDetails = (req: any, context: string = 'API请求') => {
  console.log(`[${context}] 开始记录请求信息 ========`);

  try {
    // 记录请求方法和URL
    console.log(`请求方法: ${req.method}`);
    console.log(`请求路径: ${req.url}`);

    // 记录请求头
    console.log('请求头:');
    const headers = req.headers || {};
    for (const key of Object.keys(headers)) {
      // 不记录敏感信息，如Authorization头
      const value = key.toLowerCase().includes('auth') ? '[REDACTED]' : headers[key];
      console.log(`  ${key}: ${value}`);
    }

    // 记录请求体
    if (req.body) {
      console.log('请求体:');
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

      // 分析请求体结构
      console.log('  请求体类型:', typeof body);
      if (typeof body === 'object' && body !== null) {
        console.log('  顶层字段:', Object.keys(body).join(', '));

        // 记录常见字段
        if ('query' in body) console.log('  查询:', body.query);
        if ('apiName' in body) console.log('  API名称:', body.apiName);

        // 记录arguments字段
        if ('arguments' in body) {
          console.log('  参数字段类型:', typeof body.arguments);

          let args;
          if (typeof body.arguments === 'string') {
            try {
              args = JSON.parse(body.arguments);
              console.log('  解析后的参数类型:', typeof args);
              console.log('  解析后的参数:', args);
            } catch {
              console.log('  参数无法解析为JSON，直接使用字符串');
              args = body.arguments;
            }
          } else {
            args = body.arguments;
          }

          // 打印参数中的query
          if (args && typeof args === 'object' && 'query' in args) {
            console.log('  参数中的查询:', args.query);
          }
        }
      } else {
        console.log('  请求体内容:', body);
      }
    } else {
      console.log('  没有请求体或请求体为空');
    }
  } catch (error) {
    console.error('记录请求详情时出错:', error);
  }

  console.log(`[${context}] 请求信息记录完毕 ========`);
};
