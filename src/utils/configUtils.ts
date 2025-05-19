// 合并配置辅助工具
import { RAGFlowConfig } from '@/type';

/**
 * 辅助函数，检查值是否为空
 */
const isNullOrEmpty = (value: any): boolean =>
  value === undefined ||
  value === null ||
  value === '' ||
  value === 'undefined' ||
  value === 'null' ||
  (typeof value === 'string' && value.trim() === '');

/**
 * 创建默认插件设置
 * 在初始化时或者配置不正确时使用
 */
export const createDefaultPluginSettings = () => {
  // 在开发环境中使用更宽松的默认设置
  const isDev = process.env.NODE_ENV === 'development';

  return {
    
    RAGFLOW_AGENT_ID: isDev ? 'default-agent' : '',
    
RAGFLOW_API_KEY: '',
    // 标准命名格式的键
RAGFLOW_API_URL: isDev ? 'http://localhost:5000' : '',
    RAGFLOW_CHAT_ID: '',
  };
};

/**
 * 从配置对象中提取值，支持多种键名和大小写
 * @param settings 配置对象
 * @param keys 可能的键名数组
 * @returns 找到的值或 undefined
 */
export const getConfigValue = (settings: Record<string, any>, keys: string[]) => {
  if (!settings) return;

  for (const key of keys) {
    // 检查直接匹配
    if (settings[key] !== undefined && settings[key] !== '' && settings[key] !== 'undefined')
      return settings[key];

    // 检查小写匹配
    const lowerKey = key.toLowerCase();
    if (
      settings[lowerKey] !== undefined &&
      settings[lowerKey] !== '' &&
      settings[lowerKey] !== 'undefined'
    )
      return settings[lowerKey];

    // 检查无下划线匹配
    const noUnderscoreKey = key.replaceAll('_', '');
    if (
      settings[noUnderscoreKey] !== undefined &&
      settings[noUnderscoreKey] !== '' &&
      settings[noUnderscoreKey] !== 'undefined'
    )
      return settings[noUnderscoreKey];

    // 检查小写无下划线
    const lowerNoUnderscoreKey = noUnderscoreKey.toLowerCase();
    if (
      settings[lowerNoUnderscoreKey] !== undefined &&
      settings[lowerNoUnderscoreKey] !== '' &&
      settings[lowerNoUnderscoreKey] !== 'undefined'
    )
      return settings[lowerNoUnderscoreKey];
  }

  return;
};

/**
 * 从插件设置中提取必要的配置
 * @param settings 插件设置对象
 */
export const extractNecessarySettings = (settings: Record<string, any>) => {
  const extract = (key: string, aliases: string[]) => {
    // 先检查原始key
    if (settings[key]) return settings[key];

    // 然后检查别名
    for (const alias of aliases) {
      if (settings[alias]) return settings[alias];
    }

    // 最后检查小写变体
    for (const alias of [key, ...aliases]) {
      if (settings[alias.toLowerCase()]) return settings[alias.toLowerCase()];
    }

    return '';
  };

  return {
    agentId: extract('RAGFLOW_AGENT_ID', ['ragflowAgentId', 'agentId', 'AGENT_ID']),
    apiKey: extract('RAGFLOW_API_KEY', ['ragflowApiKey', 'apiKey', 'API_KEY']),
    apiUrl: extract('RAGFLOW_API_URL', ['ragflowApiUrl', 'apiUrl', 'API_URL']),
    chatId: extract('RAGFLOW_CHAT_ID', ['ragflowChatId', 'chatId', 'CHAT_ID']),
  };
};

/**
 * 从插件设置中提取 RAGFlow 配置
 * @param settings 插件设置对象
 */
export const extractRAGFlowConfig = (settings: Record<string, any>): RAGFlowConfig => {
  // 开发环境的默认值
  const isDev = process.env.NODE_ENV === 'development';
  const defaultApiUrl =
    process.env.NEXT_PUBLIC_RAGFLOW_API_URL || (isDev ? 'http://localhost:5000' : '');
  const defaultAgentId = process.env.NEXT_PUBLIC_RAGFLOW_AGENT_ID || (isDev ? 'default-agent' : '');

  if (!settings) {
    console.log('[配置提取] 设置对象为空，返回开发环境默认配置');
    return isDev ? {
        RAGFLOW_AGENT_ID: defaultAgentId,
        RAGFLOW_API_URL: defaultApiUrl,
        agentId: defaultAgentId,
        apiUrl: defaultApiUrl,
        ragflowAgentId: defaultAgentId,
        ragflowApiUrl: defaultApiUrl,
      } as RAGFlowConfig : { ragflowApiUrl: '' } as RAGFlowConfig;
  }

  // 获取基本配置值，带默认值
  const apiUrl =
    getConfigValue(settings, ['RAGFLOW_API_URL', 'ragflowApiUrl', 'apiUrl', 'API_URL']) ||
    defaultApiUrl;
  const apiKey =
    getConfigValue(settings, ['RAGFLOW_API_KEY', 'ragflowApiKey', 'apiKey', 'API_KEY']) || '';
  const agentId =
    getConfigValue(settings, ['RAGFLOW_AGENT_ID', 'ragflowAgentId', 'agentId', 'AGENT_ID']) ||
    defaultAgentId;
  const chatId =
    getConfigValue(settings, ['RAGFLOW_CHAT_ID', 'ragflowChatId', 'chatId', 'CHAT_ID']) || '';

  console.log('[配置提取] 有效提取值:', {
    agentId,
    apiUrl,
    chatId,
    hasApiKey: !!apiKey,
  });
  // 创建具有所有可能属性名的配置对象
  return {
    
    RAGFLOW_AGENT_ID: agentId,
    
RAGFLOW_API_KEY: apiKey,
    
RAGFLOW_API_URL: apiUrl,
    
RAGFLOW_CHAT_ID: chatId,
    // 按字母顺序排列所有属性
agentId: agentId,
    apiKey: apiKey,
    apiUrl: apiUrl,
    chatId: chatId,
    ragflowAgentId: agentId,
    ragflowApiKey: apiKey,
    ragflowApiUrl: apiUrl,
    ragflowChatId: chatId,
  };
};

/**
 * 安全地输出配置摘要（隐藏敏感信息）
 * @param config 配置对象
 * @param title 日志标题
 */
export const logConfigSummary = (config: Partial<RAGFlowConfig>, title: string = '配置摘要') => {
  const getEffectiveValue = (key: string): string => {
    const variants = [
      key,
      `RAGFLOW_${key.toUpperCase()}`,
      `ragflow${key.charAt(0).toUpperCase()}${key.slice(1)}`,
    ];

    for (const variant of variants) {
      if (!isNullOrEmpty(config[variant]) && typeof config[variant] === 'string') {
        return config[variant];
      }
    }

    return '未设置';
  };

  // 按字母顺序构建安全的摘要对象
  const safeSummary = {
    agentId: getEffectiveValue('agentId'),
    apiKey: getEffectiveValue('apiKey') ? '已设置(已隐藏)' : '未设置',
    apiUrl: getEffectiveValue('apiUrl'),
    chatId: getEffectiveValue('chatId'),
    ragflowAgentId: getEffectiveValue('ragflowAgentId'),
    ragflowApiKey: getEffectiveValue('ragflowApiKey') ? '已设置(已隐藏)' : '未设置',
    ragflowApiUrl: getEffectiveValue('ragflowApiUrl'),
    ragflowChatId: getEffectiveValue('ragflowChatId'),
  };

  console.log(`[${title}]:`, safeSummary);

  // 检查配置是否完整
  const hasValidUrl = !isNullOrEmpty(safeSummary.apiUrl) && safeSummary.apiUrl !== '未设置';
  const hasValidIds =
    (!isNullOrEmpty(safeSummary.agentId) && safeSummary.agentId !== '未设置') ||
    (!isNullOrEmpty(safeSummary.chatId) && safeSummary.chatId !== '未设置');

  const configStatus = hasValidUrl
    ? hasValidIds
      ? '✅ 配置完整'
      : '❌ 缺少 Agent ID 和 Chat ID'
    : '❌ 缺少 API URL';

  console.log(`[${title}] 配置状态: ${configStatus}`);
};

/**
 * 验证 RAGFlow 配置有效性
 * @param config 配置对象
 */
export const validateRAGFlowConfig = (config: RAGFlowConfig) => {
  const errors: string[] = [];

  // 记录配置信息
  logConfigSummary(config, '验证 RAGFlow 配置');
  // 更详细地记录配置内容，以便调试
  console.log('[配置调试] 验证配置对象:', {
    
    

RAGFLOW_AGENT_ID: config.RAGFLOW_AGENT_ID,
    



// 大写属性
RAGFLOW_API_URL: config.RAGFLOW_API_URL,
    


// 兼容属性
agentId: config.agentId,
    


agentIdType: typeof config.agentId,

    
    

chatId: config.chatId,
    

ragflowAgentId: config.ragflowAgentId,

    
    
ragflowAgentIdType: typeof config.ragflowAgentId,
    
ragflowApiKey: config.ragflowApiKey ? '已设置' : '未设置',

    
    // 规范化属性
ragflowApiUrl: config.ragflowApiUrl,
    
// 记录类型
ragflowApiUrlType: typeof config.ragflowApiUrl,
    
ragflowChatId: config.ragflowChatId,
  });
  // 获取有效API URL - 检查所有可能的属性名
  let effectiveApiUrl = config.ragflowApiUrl || config.RAGFLOW_API_URL || (config as any).apiUrl;

  // 检查 API URL
  if (isNullOrEmpty(effectiveApiUrl)) {
    console.error('配置验证错误: 未配置 RAGFlow API 地址');
    errors.push('未配置 RAGFlow API 地址');
  } else if (
    effectiveApiUrl &&
    !effectiveApiUrl.startsWith('http://') &&
    !effectiveApiUrl.startsWith('https://')
  ) {
    console.warn('配置警告: RAGFlow API 地址应以 http:// 或 https:// 开头，将尝试自动添加 http://');
    effectiveApiUrl = `http://${effectiveApiUrl}`;
    // 更新所有API URL属性
    config.ragflowApiUrl = effectiveApiUrl;
    if ('RAGFLOW_API_URL' in config) config.RAGFLOW_API_URL = effectiveApiUrl;
    if ('apiUrl' in config) (config as any).apiUrl = effectiveApiUrl;
  }

  // 检查所有可能的Agent ID和Chat ID属性名
  const hasAgentId =
    !isNullOrEmpty(config.ragflowAgentId) ||
    !isNullOrEmpty(config.agentId) ||
    !isNullOrEmpty(config.RAGFLOW_AGENT_ID);

  const hasChatId =
    !isNullOrEmpty(config.ragflowChatId) ||
    !isNullOrEmpty(config.chatId) ||
    !isNullOrEmpty(config.RAGFLOW_CHAT_ID);

  console.log('[配置调试] 属性检查结果:', { hasAgentId, hasChatId });

  // 检查 Agent ID 或 Chat ID
  if (!hasAgentId && !hasChatId) {
    console.error('配置验证错误: 未配置 Agent ID 或 Chat ID，请至少提供一个');
    errors.push('未配置 Agent ID 或 Chat ID，请至少提供一个');
  }
  // 如果有效URL存在，确保更新所有URL属性
  if (effectiveApiUrl && !isNullOrEmpty(effectiveApiUrl)) {
    config.ragflowApiUrl = effectiveApiUrl;
    config.RAGFLOW_API_URL = effectiveApiUrl;
    config.apiUrl = effectiveApiUrl;
  }

  // 同步AgentID和ChatID的值 - 确保如果一个属性有值，所有对应属性都有相同的值
  const effectiveAgentId = config.ragflowAgentId || config.RAGFLOW_AGENT_ID || config.agentId;
  if (effectiveAgentId) {
    config.ragflowAgentId = effectiveAgentId;
    config.RAGFLOW_AGENT_ID = effectiveAgentId;
    config.agentId = effectiveAgentId;
  }

  const effectiveChatId = config.ragflowChatId || config.RAGFLOW_CHAT_ID || config.chatId;
  if (effectiveChatId) {
    config.ragflowChatId = effectiveChatId;
    config.RAGFLOW_CHAT_ID = effectiveChatId;
    config.chatId = effectiveChatId;
  }
  // 确保所有值都被更新到config对象中
  config.ragflowApiUrl = effectiveApiUrl || config.ragflowApiUrl || '';
  config.RAGFLOW_API_URL = effectiveApiUrl || config.RAGFLOW_API_URL || '';
  config.apiUrl = effectiveApiUrl || config.apiUrl || '';

  config.ragflowAgentId = effectiveAgentId || config.ragflowAgentId || '';
  config.RAGFLOW_AGENT_ID = effectiveAgentId || config.RAGFLOW_AGENT_ID || '';
  config.agentId = effectiveAgentId || config.agentId || '';

  config.ragflowChatId = effectiveChatId || config.ragflowChatId || '';
  config.RAGFLOW_CHAT_ID = effectiveChatId || config.RAGFLOW_CHAT_ID || '';
  config.chatId = effectiveChatId || config.chatId || '';

  // 调试输出最终配置
  console.log('[配置验证] 最终配置对象:', {
    RAGFLOW_AGENT_ID: config.RAGFLOW_AGENT_ID,
    RAGFLOW_API_URL: config.RAGFLOW_API_URL,
    agentId: config.agentId,
    apiUrl: config.apiUrl,
    ragflowAgentId: config.ragflowAgentId,
    ragflowApiUrl: config.ragflowApiUrl,
  });

  // 增强配置信息，提供规范化的值
  const enhancedConfig = {
    ...config,
    endpoint: effectiveApiUrl,
    hasAgentId: !isNullOrEmpty(effectiveAgentId),
    hasApiKey: !isNullOrEmpty(config.ragflowApiKey || config.RAGFLOW_API_KEY || config.apiKey),
    hasChatId: !isNullOrEmpty(effectiveChatId),
    isValid: errors.length === 0,
  };

  return {
    enhancedConfig,
    errorMessage: errors.join('；'),
    errors,
    isValid: errors.length === 0,
  };
};

/**
 * 验证插件设置是否有效
 * @param settings 插件设置对象
 */
export const validatePluginSettings = (settings: Record<string, any>) => {
  const { apiUrl, agentId, chatId } = extractNecessarySettings(settings);

  const errors: string[] = [];

  // 验证API URL
  if (!apiUrl) {
    errors.push('未配置RAGFlow API地址');
  } else if (
    !apiUrl.toLowerCase().startsWith('http://') &&
    !apiUrl.toLowerCase().startsWith('https://')
  ) {
    errors.push('RAGFlow API地址必须以http://或https://开头');
  }

  // 验证Agent ID或Chat ID
  if (!agentId && !chatId) {
    errors.push('未配置Agent ID或Chat ID，至少需要一个');
  }

  return {
    errorMessage: errors.join('；'),
    errors,
    isValid: errors.length === 0,
  };
};

/**
 * 规范化插件设置中的URL
 * 确保URL格式正确
 * @param settings 插件设置对象
 */
export const normalizePluginSettings = (settings: Record<string, any>) => {
  const normalized = { ...settings };

  // 处理API URL
  if (
    normalized.RAGFLOW_API_URL &&
    !normalized.RAGFLOW_API_URL.toLowerCase().startsWith('http://') &&
    !normalized.RAGFLOW_API_URL.toLowerCase().startsWith('https://')
  ) {
    normalized.RAGFLOW_API_URL = 'http://' + normalized.RAGFLOW_API_URL;
  }

  return normalized;
};
