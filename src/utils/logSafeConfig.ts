import { RAGFlowConfig } from '@/type';

/**
 * 确保值是字符串或undefined
 * @param value 待检查的值
 * @returns 字符串或undefined
 */
const ensureString = (value: any): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (value === 'undefined' || value === 'null') return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return String(value);
};

/**
 * 将 RAGFlow 配置输出为安全的格式（隐藏敏感信息）
 * @param config RAGFlow 配置对象
 * @param label 日志标签
 * @returns 用于日志输出的安全配置对象
 */
export const logSafeConfig = (config: Partial<RAGFlowConfig>, label: string = 'RAGFlow配置') => {
  if (!config) {
    console.log(`${label}: 配置为空`);
    return;
  } // 获取有效值，支持多种属性名格式
  const getEffectiveValue = (key: string): string | undefined => {
    // 不同的属性名变体
    const variants = [
      `ragflow${key.charAt(0).toUpperCase() + key.slice(1)}`, // ragflowApiUrl
      `RAGFLOW_${key.toUpperCase()}`, // RAGFLOW_API_URL
      key, // apiUrl
    ];

    for (const variant of variants) {
      const value = ensureString(config[variant]);
      if (value) return value;
    }

    return undefined;
  };

  // 提取所有关键配置值
  const apiUrl = getEffectiveValue('apiUrl');
  const apiKey = getEffectiveValue('apiKey');
  const agentId = getEffectiveValue('agentId');
  const chatId = getEffectiveValue('chatId');

  // 创建一个安全版本的配置对象，隐藏敏感信息
  const safeConfig = {
    agentId: agentId || '未设置',
    apiKey: apiKey ? '已设置 ******' : '未设置',
    apiUrl: apiUrl ? `${apiUrl.slice(0, 15)}${apiUrl.length > 15 ? '...' : ''}` : '未设置',
    chatId: chatId || '未设置',
  };

  // 输出配置信息
  console.log(`----- ${label} -----`);
  console.log('API URL:', safeConfig.apiUrl);
  console.log('API Key:', safeConfig.apiKey);
  console.log('Agent ID:', safeConfig.agentId);
  console.log('Chat ID:', safeConfig.chatId);
  console.log(
    '配置状态:',
    apiUrl
      ? !agentId && !chatId
        ? '❌ 缺少 Agent ID 和 Chat ID'
        : '✅ 配置完整'
      : '❌ 缺少 API URL',
  );
  console.log('------------------------');

  // 如果有任何配置问题，打印更详细的调试信息
  if (!apiUrl || (!agentId && !chatId)) {
    console.log('[调试] 配置详情:', {
      RAGFLOW_AGENT_ID: config.RAGFLOW_AGENT_ID,
      RAGFLOW_API_URL: config.RAGFLOW_API_URL,
      agentId: config.agentId,
      apiUrl: config.apiUrl,
      ragflowAgentId: config.ragflowAgentId,
      ragflowApiUrl: config.ragflowApiUrl,
    });
  }
  console.log('------------------------');

  return safeConfig;
};
