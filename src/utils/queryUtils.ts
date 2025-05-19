// 查询参数处理工具
/**
 * 确保查询参数有效
 * 此函数能够处理各种类型的输入并将其转换为有效的查询字符串
 * @param query 用户输入的查询参数，可能是字符串、对象或其他类型
 * @returns 处理后的有效查询字符串
 */
export const ensureValidQuery = (query?: any): string => {
  console.log('验证查询参数类型:', typeof query);

  // 如果查询完全不存在或是空值
  if (query === undefined || query === null) {
    console.log('查询参数为undefined或null，返回默认值');
    return '请提供查询内容';
  }

  // 尝试从可能是对象或其他类型的输入中提取字符串
  let queryString: string = '';
  if (typeof query === 'object') {
    // 对象可能包含查询字符串的常见字段
    const obj = query as Record<string, any>;
    const possibleFields = ['query', 'text', 'content', 'question', 'message', 'prompt', 'input'];

    // 尝试查找第一个有效的字段
    for (const field of possibleFields) {
      if (obj[field] && typeof obj[field] === 'string' && obj[field].trim()) {
        queryString = obj[field];
        console.log(`从对象提取查询参数 ${field}:`, queryString);
        break;
      }
    }

    // 如果没找到，转换整个对象为字符串
    if (!queryString) {
      try {
        queryString = JSON.stringify(query);
        console.log('将对象转换为JSON字符串:', queryString);
      } catch {
        queryString = String(query);
      }
    }
  } else {
    // 直接转换为字符串
    queryString = String(query);
    console.log('非对象类型，直接转换为字符串:', queryString);
  }

  // 去除首尾空格
  queryString = queryString.trim();

  // 如果处理后的字符串为空，使用默认值
  if (!queryString) {
    console.log('处理后的查询字符串为空，返回默认值');
    return '请提供查询内容';
  }

  // 检查字符串长度
  if (queryString.length > 1000) {
    console.log('查询字符串过长，截断处理');
    queryString = queryString.slice(0, 1000) + '...';
  }

  console.log('最终处理后的查询字符串:', queryString);
  return queryString;
};

/**
 * 分析查询，提取有价值的信息
 * @param query 查询字符串
 * @returns 分析结果
 */
export const analyzeQuery = (query: string) => {
  // 简单的查询分析
  const isQuestion = query.includes('?') || query.includes('？');
  const hasMentionOf = (text: string) => query.toLowerCase().includes(text.toLowerCase());

  return {
    hasMentionOf,
    isQuestion,
    length: query.length,
    words: query.split(/\s+/).length,
  };
};

/**
 * 格式化查询记录
 * @param query 原始查询
 * @param processedQuery 处理后的查询
 */
export const formatQueryLog = (query: any, processedQuery: string) => {
  let queryInfo = '';

  if (typeof query === 'object') {
    try {
      queryInfo = JSON.stringify(query);
    } catch {
      queryInfo = '[无法序列化的对象]';
    }
  } else {
    queryInfo = String(query);
  }

  if (queryInfo === processedQuery) {
    return `查询: "${processedQuery}"`;
  }

  return `原始查询: "${queryInfo}" => 处理后: "${processedQuery}"`;
};
