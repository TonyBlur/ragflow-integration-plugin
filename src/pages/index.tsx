import { lobeChat } from '@lobehub/chat-plugin-sdk/client';
import { memo, useEffect, useRef, useState } from 'react';

import DebugPanel from '@/components/DebugPanel';
import RAGFlowRender from '@/components/Render';
import { ResponseData } from '@/type';
import { extractRAGFlowConfig, logConfigSummary, validateRAGFlowConfig } from '@/utils/configUtils';
import { forceReset, setupGlobalErrorHandler } from '@/utils/errorUtils';
import { ensureValidQuery } from '@/utils/queryUtils';

const Render = memo(() => {
  // 调试：跟踪渲染次数
  const renderCount = useRef(0);
  console.log(`[DEBUG] 组件渲染次数: ${++renderCount.current}`);

  // 使用ref追踪组件是否已经初始化
  const isInitialized = useRef(false);
  console.log(`[DEBUG] isInitialized: ${isInitialized.current}`);

  // 设置初始数据
  const [data, setData] = useState<ResponseData>({
    query: '初始化中',
    result: {
      answer: '欢迎使用RAGFlow插件，请稍候...',
      graphData: { edges: [], nodes: [] },
      sources: [],
    },
  });

  const [loading, setLoading] = useState(true); // 初始化时显示加载状态
  const [pluginSettings, setPluginSettings] = useState<Record<string, any>>({});
  const [errorState, setErrorState] = useState<{ message: string, type: string; } | undefined>();
  const handleSearch = async (query: string, settingsContext?: Record<string, any>) => {
    console.log('开始搜索:', query);
    setLoading(true);

    // 定义超时计时器
    const searchTimeout = setTimeout(() => {
      console.log('搜索超时: 强制结束加载状态');
      setLoading(false);
      const errorResult: ResponseData = {
        query,
        result: {
          answer: `搜索超时: 请求处理时间过长，请检查RAGFlow服务状态`,
          errorType: 'timeout',
          graphData: { edges: [], nodes: [] },
          isError: true,
          sources: [],
        },
      };
      setData(errorResult);
      try {
        lobeChat.setPluginMessage(errorResult);
      } catch (error) {
        console.error('向LobeChat发送超时信息失败:', error);
      }
    }, 30_000); // 30秒超时

    try {
      const headerSettings = settingsContext ?? pluginSettings;
      console.log(
        '设置请求头:',
        JSON.stringify(
          {
            ...headerSettings,
            'x-lobe-plugin-settings': 'present',
          },
          undefined,
          2,
        ),
      );

      // 使用配置辅助工具
      // 提取配置并确保格式正确
      const config = extractRAGFlowConfig(headerSettings);

      // 输出配置摘要
      logConfigSummary(config, '搜索请求配置');

      // 验证配置
      const configResult = validateRAGFlowConfig(config);

      if (!configResult.isValid) {
        console.error('配置验证失败:', configResult.errorMessage);
        throw new Error(`配置错误: ${configResult.errorMessage}`);
      }

      console.log('配置验证通过:', configResult.enhancedConfig);

      // 准备请求参数，确保查询有效
      const validQuery = ensureValidQuery(query);
      console.log('确保有效的查询:', validQuery);

      const requestBody = {
        apiName: 'searchRAGFlow',
        arguments: {
          query: validQuery,
        },
      };

      if (!validQuery || validQuery.trim() === '') {
        throw new Error('查询内容不能为空，请提供有效的问题');
      }
      console.log(`发送请求到 /api/gateway，查询: "${query}"，请求体:`, requestBody);

      // 确保配置对象包含所有必要的属性
      const enhancedSettings = {
        ...headerSettings,
      };

      // 确保配置项存在且不为空
      if (
        !enhancedSettings.RAGFLOW_API_URL &&
        !enhancedSettings.ragflowApiUrl &&
        !enhancedSettings.apiUrl
      ) {
        console.error('[API请求] 缺少API URL设置，请检查配置');
        throw new Error('配置错误: 未设置RAGFlow API地址');
      }

      if (
        !enhancedSettings.RAGFLOW_AGENT_ID &&
        !enhancedSettings.ragflowAgentId &&
        !enhancedSettings.agentId &&
        !enhancedSettings.RAGFLOW_CHAT_ID &&
        !enhancedSettings.ragflowChatId &&
        !enhancedSettings.chatId
      ) {
        console.error('[API请求] 缺少Agent ID或Chat ID设置，请检查配置');
        throw new Error('配置错误: 未设置Agent ID或Chat ID，请至少提供一个');
      }

      // 提取可能的配置值
      const effectiveApiUrl =
        enhancedSettings.RAGFLOW_API_URL ||
        enhancedSettings.ragflowApiUrl ||
        enhancedSettings.apiUrl ||
        '';
      const effectiveAgentId =
        enhancedSettings.RAGFLOW_AGENT_ID ||
        enhancedSettings.ragflowAgentId ||
        enhancedSettings.agentId ||
        '';
      const effectiveChatId =
        enhancedSettings.RAGFLOW_CHAT_ID ||
        enhancedSettings.ragflowChatId ||
        enhancedSettings.chatId ||
        '';

      console.log('[API请求] 有效配置值:', {
        agentId: effectiveAgentId,
        apiUrl: effectiveApiUrl,
        chatId: effectiveChatId,
      });

      // 发起API请求
      const response = await fetch('/api/gateway', {
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
          'x-lobe-plugin-settings': JSON.stringify(enhancedSettings),
          
          'x-ragflow-agent-id': effectiveAgentId,
          // 添加额外的头部确保配置传递
'x-ragflow-api-url': effectiveApiUrl,
          'x-ragflow-chat-id': effectiveChatId,
        },
        method: 'POST',
      });

      // 检查HTTP状态
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`请求失败: ${response.status} - ${errorText}`);
      }

      // 解析响应JSON
      let json;
      try {
        json = await response.json();
        console.log('收到API响应:', json);
      } catch (jsonError) {
        console.error('解析响应JSON失败:', jsonError);
        throw new Error(
          `响应解析失败: ${jsonError instanceof Error ? jsonError.message : '未知错误'}`,
        );
      }

      let result: ResponseData; // 处理可能的错误响应
      if (json.isError || json.error) {
        console.log('收到带错误标记的响应:', json);
        result = {
          query,
          result: {
            // 首选answer字段，兼容不同API返回格式
            answer: json.answer || json.response || json.error || '未知错误',
            errorType: json.errorType || 'unknown',
            graphData: { edges: [], nodes: [] },
            isError: true,
            sources: json.sources || [],
          },
        };
      } else if (json.query !== undefined && json.result !== undefined) {
        // KnowledgeGraph 模式返回整个结果对象
        console.log('收到知识图谱模式响应');
        result = json;
      } else if (
        json.response !== undefined ||
        json.answer !== undefined ||
        json.sources !== undefined
      ) {
        // Summary 模式返回 response/answer 和 sources
        console.log('收到摘要模式响应');
        result = {
          query,
          result: {
            // 首选answer字段，兼容不同API返回格式
            answer: json.answer || json.response || '',
            graphData: { edges: [], nodes: [] },
            sources: json.sources || [],
          },
        };
      } else {
        // 未知响应格式
        console.error('响应格式错误:', json);
        result = {
          query,
          result: {
            answer: '错误: API响应格式不符合预期',
            errorType: 'unknown',
            graphData: { edges: [], nodes: [] },
            isError: true,
            sources: [],
          },
        };
      }

      console.log('设置数据:', result);
      setData(result);

      // 将结果同步回LobeChat
      try {
        lobeChat.setPluginMessage(result);
      } catch (error) {
        console.error('向LobeChat发送结果失败:', error);
      }
    } catch (error) {
      console.error('搜索出错:', error);

      // 确定错误类型
      let errorType: 'timeout' | 'connection' | 'config' | 'unknown' = 'unknown';
      const errorMessage = error instanceof Error ? error.message : '未知错误';

      if (errorMessage.includes('超时')) errorType = 'timeout';
      else if (
        errorMessage.includes('无法连接') ||
        errorMessage.includes('连接失败') ||
        errorMessage.includes('ECONNREFUSED')
      )
        errorType = 'connection';
      else if (errorMessage.includes('未配置')) errorType = 'config';

      // 构造更友好的错误消息
      let userFriendlyMessage = `搜索出错: ${errorMessage}`;

      // 根据错误类型提供更有帮助的错误消息
      switch (errorType) {
      case 'config': {
        userFriendlyMessage =
          '配置错误\n' +
          '插件配置不正确。请确保在插件设置中正确配置了RAGFlow服务地址和必要的ID信息。\n\n' +
          '错误详情\n' +
          errorMessage.replace('配置错误: ', '');
      
      break;
      }
      case 'connection': {
        userFriendlyMessage =
          '连接错误\n' +
          '无法连接到RAGFlow服务，请检查：\n' +
          '1. RAGFlow服务是否正在运行\n' +
          '2. 服务地址是否正确配置\n' +
          '3. 网络连接是否正常\n\n' +
          '错误详情\n' +
          errorMessage;
      
      break;
      }
      case 'timeout': {
        userFriendlyMessage =
          '请求超时\n' +
          'RAGFlow服务响应时间过长。这可能是因为:\n' +
          '1. 服务器负载过高\n' +
          '2. 查询过于复杂\n' +
          '3. 网络连接不稳定\n\n' +
          '请稍后重试或简化您的查询。';
      
      break;
      }
      default: { if (
        errorMessage.includes('请求失败: 400') &&
        errorMessage.includes('请提供查询参数')
      ) {
        userFriendlyMessage =
          '查询参数错误\n' +
          '系统无法处理您的查询。请尝试：\n' +
          '1. 提供一个更具体的问题\n' +
          '2. 确保问题不为空\n' +
          '3. 如果问题包含特殊字符，尝试重新表述';
      }
      }
      }

      // 构造带有错误标记的结果对象
      const errorResult: ResponseData = {
        query,
        result: {
          answer: userFriendlyMessage,
          errorType,
          graphData: { edges: [], nodes: [] },
          isError: true,
          sources: [],
        },
      };

      setData(errorResult);

      try {
        lobeChat.setPluginMessage(errorResult);
      } catch (error_) {
        console.error('向LobeChat发送错误信息失败:', error_);
      }
    } finally {
      // 清除超时计时器
      clearTimeout(searchTimeout);
      // 无论成功或失败，都确保结束loading状态
      setLoading(false);
    }
  };

  const handleGraph = async (query: string, settingsContext?: Record<string, any>) => {
    setLoading(true);
    try {
      const headerSettings = settingsContext ?? pluginSettings;

      // 兼容不同的大小写和命名格式查找配置项
      const getConfigValue = (keys: string[]) => {
        for (const key of keys) {
          // 检查直接匹配
          if (headerSettings[key] !== undefined && headerSettings[key] !== '')
            return headerSettings[key];

          // 检查小写匹配
          const lowerKey = key.toLowerCase();
          if (headerSettings[lowerKey] !== undefined && headerSettings[lowerKey] !== '')
            return headerSettings[lowerKey];

          // 检查无下划线匹配
          const noUnderscoreKey = key.replaceAll('_', '');
          if (
            headerSettings[noUnderscoreKey] !== undefined &&
            headerSettings[noUnderscoreKey] !== ''
          )
            return headerSettings[noUnderscoreKey];
        }
        return;
      };

      // 获取配置值（尝试多种可能的键名）
      const apiUrl = getConfigValue(['RAGFLOW_API_URL', 'ragflowApiUrl', 'apiUrl', 'API_URL']);
      const apiKey = getConfigValue(['RAGFLOW_API_KEY', 'ragflowApiKey', 'apiKey', 'API_KEY']);
      const agentId = getConfigValue(['RAGFLOW_AGENT_ID', 'ragflowAgentId', 'agentId', 'AGENT_ID']);
      const chatId = getConfigValue(['RAGFLOW_CHAT_ID', 'ragflowChatId', 'chatId', 'CHAT_ID']);

      console.log('图谱模式提取的配置:', {
        agentId: agentId ? '已设置' : '未设置',
        apiKey: apiKey ? '已设置' : '未设置',
        apiUrl: apiUrl ? '已设置' : '未设置',
        chatId: chatId ? '已设置' : '未设置',
      });

      // 验证配置
      const configResult = validateRAGFlowConfig({
        agentId: agentId,
        chatId: chatId,
        ragflowApiKey: apiKey,
        ragflowApiUrl: apiUrl,
      });

      if (!configResult.isValid) {
        console.error('图谱模式配置验证失败:', configResult.errorMessage);
        throw new Error(`配置错误: ${configResult.errorMessage}`);
      }

      console.log('图谱模式配置验证通过:', configResult.enhancedConfig);

      // 准备请求参数，确保查询有效
      const validQuery = ensureValidQuery(query);
      const requestBody = {
        apiName: 'queryRAGFlowGraph',
        arguments: {
          query: validQuery,
        },
      };

      console.log(`发送图谱请求到 /api/gateway，查询: "${validQuery}"，请求体:`, requestBody);

      const response = await fetch('/api/gateway', {
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
          'x-lobe-plugin-settings': JSON.stringify(headerSettings),
        },
        method: 'POST',
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`请求失败: ${response.status} - ${errorText}`);
      }
      const json = await response.json();
      console.log('图谱API响应:', json);

      // 检查是否有 query 和 result 结构
      if (json.query && json.result) {
        // 标准格式，直接使用
        const resultData: ResponseData = { query: json.query, result: json.result };
        setData(resultData);
        lobeChat.setPluginMessage(resultData);
      } else if (json.response) {
        // 处理具有 response 格式的返回
        const resultData: ResponseData = {
          query,
          result: {
            answer: json.response,
            graphData: json.graphData || { edges: [], nodes: [] },
            sources: json.sources || [],
          },
        };
        setData(resultData);
        lobeChat.setPluginMessage(resultData);
      } else {
        // 不符合预期的格式，创建错误响应
        console.error('响应格式错误:', json);
        const errorResult: ResponseData = {
          query,
          result: {
            answer: '错误: API响应格式不符合预期',
            errorType: 'unknown',
            graphData: { edges: [], nodes: [] },
            isError: true,
            sources: [],
          },
        };
        setData(errorResult);
        lobeChat.setPluginMessage(errorResult);
      }
    } catch (error) {
      console.error('Graph 查询出错:', error);
      // 确定错误类型
      let errorType: 'timeout' | 'connection' | 'config' | 'unknown' = 'unknown';
      const errorMessage = error instanceof Error ? error.message : '未知错误';

      if (errorMessage.includes('超时')) errorType = 'timeout';
      else if (
        errorMessage.includes('无法连接') ||
        errorMessage.includes('连接失败') ||
        errorMessage.includes('ECONNREFUSED')
      )
        errorType = 'connection';
      else if (errorMessage.includes('未配置') || errorMessage.includes('配置错误'))
        errorType = 'config';

      // 构建更友好的错误消息
      let userFriendlyMessage = errorMessage;
      if (errorType === 'config') {
        userFriendlyMessage =
          '配置错误\n' +
          '插件配置不正确。请确保在插件设置中正确配置了RAGFlow服务地址和必要的ID信息。\n\n' +
          '错误详情\n' +
          errorMessage.replace('配置错误: ', '');
      }

      // 构造带有错误标记的结果对象
      const errData: ResponseData = {
        query,
        result: {
          answer: `搜索出错: ${userFriendlyMessage}`,
          errorType,
          graphData: { edges: [], nodes: [] },
          isError: true,
          sources: [],
        },
      };
      setData(errData);
      lobeChat.setPluginMessage(errData);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    console.log('[DEBUG] useEffect 触发');

    // 防止重复初始化
    if (isInitialized.current) {
      console.log('[DEBUG] 已初始化，跳过');
      return;
    }

    console.log('[DEBUG] 设置 isInitialized = true');
    isInitialized.current = true;
    // 设置安全超时，确保loading状态不会无限持续
    console.log('[DEBUG] 设置安全超时');
    const safetyTimeout = setTimeout(() => {
      console.log('[DEBUG] 安全超时触发：强制结束加载状态');

      // 使用强制重置工具
      forceReset(setLoading, setData, '初始化安全超时(2.5秒)触发');
    }, 2500); // 缩短为2.5秒超时，更快发现问题
    async function initPlugin() {
      console.log('[DEBUG] =========== initPlugin 开始 ===========');

      // 确保初始状态为加载中
      console.log('[DEBUG] 确保加载状态为true');
      setLoading(true);

      try {
        console.log('[DEBUG] 尝试获取插件设置');
        // 获取插件设置
        let settings: Record<string, any> = {};

        // 在开发环境中添加默认值，以便测试
        if (process.env.NODE_ENV === 'development') {
          console.log('[DEBUG] 开发环境: 设置默认的插件配置用于测试');
          settings = {
            RAGFLOW_AGENT_ID: process.env.NEXT_PUBLIC_RAGFLOW_AGENT_ID || 'default-agent',
            RAGFLOW_API_KEY: process.env.NEXT_PUBLIC_RAGFLOW_API_KEY || '',
            RAGFLOW_API_URL: process.env.NEXT_PUBLIC_RAGFLOW_API_URL || 'http://localhost:5000',
          };
        }

        try {
          // 添加超时处理
          const settingsPromise = lobeChat.getPluginSettings();
          const settingsTimeout = new Promise<null>((_, reject) => {
            setTimeout(() => reject(new Error('获取插件设置超时')), 3000); // 增加超时时间
          });

          const lobeSettings =
            ((await Promise.race([settingsPromise, settingsTimeout])) as any) || {};
          console.log('[DEBUG] 从LobeChat获取到插件设置:', {
            ...lobeSettings,
            RAGFLOW_API_KEY: lobeSettings.RAGFLOW_API_KEY ? '******' : undefined,
          });

          // 合并设置，LobeChat设置优先
          if (Object.keys(lobeSettings).length > 0) {
            settings = { ...settings, ...lobeSettings };
          }

          // 立即验证插件设置格式是否正确
          const getConfigValue = (keys: string[]) => {
            for (const key of keys) {
              // 检查直接匹配
              if (settings[key] !== undefined && settings[key] !== '') return settings[key];

              // 检查小写匹配
              const lowerKey = key.toLowerCase();
              if (settings[lowerKey] !== undefined && settings[lowerKey] !== '')
                return settings[lowerKey];

              // 检查无下划线匹配
              const noUnderscoreKey = key.replaceAll('_', '');
              if (settings[noUnderscoreKey] !== undefined && settings[noUnderscoreKey] !== '')
                return settings[noUnderscoreKey];
            }
            return;
          };

          // 获取配置值（尝试多种可能的键名）
          const apiUrl = getConfigValue(['RAGFLOW_API_URL', 'ragflowApiUrl', 'apiUrl', 'API_URL']);
          const apiKey = getConfigValue(['RAGFLOW_API_KEY', 'ragflowApiKey', 'apiKey', 'API_KEY']);
          const agentId = getConfigValue([
            'RAGFLOW_AGENT_ID',
            'ragflowAgentId',
            'agentId',
            'AGENT_ID',
          ]);
          const chatId = getConfigValue(['RAGFLOW_CHAT_ID', 'ragflowChatId', 'chatId', 'CHAT_ID']);

          console.log('[DEBUG] 初始化阶段提取的配置:', {
            agentId: agentId ? '已设置' : '未设置',
            apiKey: apiKey ? '已设置' : '未设置',
            apiUrl: apiUrl ? apiUrl.slice(0, 10) + '...' : '未设置',
            chatId: chatId ? '已设置' : '未设置',
          }); // 强制设置默认值，以确保有效性
          const defaultApiUrl = process.env.NEXT_PUBLIC_RAGFLOW_API_URL || 'http://localhost:5000';
          const defaultAgentId = process.env.NEXT_PUBLIC_RAGFLOW_AGENT_ID || 'default-agent';

          // 手动检查并提取有效值
          const effectiveApiUrl =
            apiUrl ||
            settings.RAGFLOW_API_URL ||
            settings.ragflowApiUrl ||
            settings.apiUrl ||
            defaultApiUrl;
          const effectiveApiKey =
            apiKey || settings.RAGFLOW_API_KEY || settings.ragflowApiKey || settings.apiKey || '';
          const effectiveAgentId =
            agentId ||
            settings.RAGFLOW_AGENT_ID ||
            settings.ragflowAgentId ||
            settings.agentId ||
            defaultAgentId;
          const effectiveChatId =
            chatId || settings.RAGFLOW_CHAT_ID || settings.ragflowChatId || settings.chatId || '';

          console.log('[DEBUG] 提取得到有效的配置值:', {
            agentId: effectiveAgentId,
            apiUrl: effectiveApiUrl,
            chatId: effectiveChatId,
            hasApiKey: !!effectiveApiKey,
          });

          // 保存规范化的设置 - 确保所有属性名都有相同的有效值
          const normalizedSettings = {
            // 保留原始设置
            ...settings,

            
            RAGFLOW_AGENT_ID: effectiveAgentId,
            
RAGFLOW_API_KEY: effectiveApiKey,
            // 使用标准的大写属性名 - LobeChat 接口使用的格式
RAGFLOW_API_URL: effectiveApiUrl,
            RAGFLOW_CHAT_ID: effectiveChatId,

            
            
agentId: effectiveAgentId,
            


apiKey: effectiveApiKey,
            

// 简化属性名 - 用于背景兼容
apiUrl: effectiveApiUrl,
            

chatId: effectiveChatId,

            
            
ragflowAgentId: effectiveAgentId,
            
ragflowApiKey: effectiveApiKey,
            // 设置小写带前缀属性名 - 代码中多处使用的格式
ragflowApiUrl: effectiveApiUrl,
            ragflowChatId: effectiveChatId,
          };

          // 调试输出规范化后的最终配置值
          console.log('[DEBUG] 规范化后的最终配置值:', {
            RAGFLOW_AGENT_ID: normalizedSettings.RAGFLOW_AGENT_ID,
            RAGFLOW_API_URL: normalizedSettings.RAGFLOW_API_URL,
            agentId: normalizedSettings.agentId,
            apiUrl: normalizedSettings.apiUrl,
            ragflowAgentId: normalizedSettings.ragflowAgentId,
            ragflowApiUrl: normalizedSettings.ragflowApiUrl,
          });

          // 强健性检查:确保URL是以http/https开头的
          if (
            normalizedSettings.RAGFLOW_API_URL &&
            typeof normalizedSettings.RAGFLOW_API_URL === 'string'
          ) {
            const urlStr = normalizedSettings.RAGFLOW_API_URL.trim();
            if (
              urlStr &&
              !urlStr.toLowerCase().startsWith('http://') &&
              !urlStr.toLowerCase().startsWith('https://')
            ) {
              console.log('[DEBUG] 修复API URL格式:', urlStr);
              normalizedSettings.RAGFLOW_API_URL = 'http://' + urlStr;
            }
          }
          // 增强的配置验证，确保我们不会向下传递无效的URL
          if (
            !normalizedSettings.RAGFLOW_API_URL ||
            normalizedSettings.RAGFLOW_API_URL === 'undefined'
          ) {
            console.warn('[DEBUG] 警告: API URL为空或无效');
            // 在开发环境下使用默认值
            if (process.env.NODE_ENV === 'development') {
              console.log('[DEBUG] 使用开发环境默认URL');
              normalizedSettings.RAGFLOW_API_URL = 'http://localhost:5000';
            }
          }
          // 验证配置
          const configUrl = normalizedSettings.RAGFLOW_API_URL;
          const configAgentId = normalizedSettings.RAGFLOW_AGENT_ID;
          const configChatId = normalizedSettings.RAGFLOW_CHAT_ID;

          // 执行完整验证
          const validationErrors: string[] = [];

          // 验证API URL
          if (!configUrl || configUrl === 'undefined') {
            validationErrors.push('未配置RAGFlow API URL');
          } else if (
            !configUrl.toLowerCase().startsWith('http://') &&
            !configUrl.toLowerCase().startsWith('https://')
          ) {
            console.warn(`[DEBUG] API URL格式不正确: ${configUrl}, 尝试修复`);
            normalizedSettings.RAGFLOW_API_URL = 'http://' + configUrl;
          }

          // 验证Agent ID或Chat ID
          if (
            (!configAgentId || configAgentId === 'undefined') &&
            (!configChatId || configChatId === 'undefined')
          ) {
            validationErrors.push('未配置Agent ID或Chat ID，至少需要其中一个');
          }
          // 如果有验证错误
          if (validationErrors.length > 0) {
            console.error('[DEBUG] 配置验证失败:', validationErrors.join('; '));
            // 设置错误状态，但在开发环境下可以继续运行
            setErrorState({ message: validationErrors.join('；'), type: 'config' });

            if (process.env.NODE_ENV === 'development') {
              console.log('[DEBUG] 开发环境中继续执行，但会显示配置警告');
            }
          } else {
            // 清除错误状态（如果之前有设置）
            setErrorState(undefined);
          }

          // 打印最终配置
          console.log('[DEBUG] 最终配置:', {
            agentId: normalizedSettings.RAGFLOW_AGENT_ID ? '已设置' : '未设置',
            apiKey: normalizedSettings.RAGFLOW_API_KEY ? '已设置' : '未设置',
            apiUrl: normalizedSettings.RAGFLOW_API_URL
              ? normalizedSettings.RAGFLOW_API_URL.slice(0, 10) + '...'
              : '未设置',
            chatId: normalizedSettings.RAGFLOW_CHAT_ID ? '已设置' : '未设置',
          });

          setPluginSettings(normalizedSettings);
        } catch (error) {
          console.warn('[DEBUG] 获取插件设置失败，继续使用空设置:', error);
        }

        // 获取插件载荷
        console.log('[DEBUG] 尝试获取插件载荷');
        let payload: any;
        try {
          // 添加超时处理
          const payloadPromise = lobeChat.getPluginPayload();
          const payloadTimeout = new Promise<null>((_, reject) => {
            setTimeout(() => reject(new Error('获取插件载荷超时')), 2000);
          });

          payload = await Promise.race([payloadPromise, payloadTimeout]);
          console.log('[DEBUG] 获取到插件载荷:', payload);

          // 调试：直接检查payload类型
          console.log('[DEBUG] payload类型:', typeof payload);
          console.log('[DEBUG] payload是否为null:', payload === null);
          console.log('[DEBUG] payload是否有arguments:', payload && 'arguments' in payload);
        } catch (error) {
          console.error('[DEBUG] 获取载荷出错:', error);
          throw new Error(`获取插件载荷失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }

        // 测试环境下，如果无法获取payload，则使用一个模拟的payload
        if (!payload || !payload.arguments) {
          console.log('[DEBUG] 未获取到有效payload或arguments，检查是否为开发环境');

          if (process.env.NODE_ENV === 'development') {
            console.log('[DEBUG] 开发环境中，使用测试payload');
            payload = {
              apiName: 'searchRAGFlow',
              arguments: { query: '测试查询' },
            };
          } else {
            console.error('[DEBUG] 生产环境中，未获取到有效payload');
            throw new Error('初始化失败：未获取到插件载荷(payload.arguments)');
          }
        } // 处理查询参数
        console.log('[DEBUG] 开始处理查询参数');
        const apiName = payload.apiName || payload.name || 'searchRAGFlow';
        console.log('[DEBUG] apiName:', apiName);

        let queryArg: string = '';

        console.log('[DEBUG] payload.arguments 类型:', typeof payload.arguments);

        // 详细解析不同格式的arguments
        if (typeof payload.arguments === 'string') {
          console.log('[DEBUG] arguments是字符串，尝试解析JSON');
          try {
            const parsed = JSON.parse(payload.arguments);
            console.log('[DEBUG] 解析JSON成功:', parsed);

            if (typeof parsed === 'object' && parsed !== null) {
              if ('query' in parsed) {
                queryArg = String(parsed.query);
                console.log('[DEBUG] 从JSON对象中提取query:', queryArg);
              } else {
                queryArg = JSON.stringify(parsed);
                console.log('[DEBUG] JSON对象中无query字段，使用整个对象:', queryArg);
              }
            } else if (typeof parsed === 'string') {
              queryArg = parsed;
              console.log('[DEBUG] 解析结果为字符串:', queryArg);
            } else {
              queryArg = String(parsed);
              console.log('[DEBUG] 解析结果转为字符串:', queryArg);
            }
          } catch {
            console.log('[DEBUG] JSON解析失败，直接使用字符串');
            queryArg = payload.arguments;
          }
        } else if (typeof payload.arguments === 'object' && payload.arguments !== null) {
          console.log('[DEBUG] arguments是对象');

          if ('query' in payload.arguments) {
            queryArg = String(payload.arguments.query);
            console.log('[DEBUG] 从对象中提取query:', queryArg);
          } else {
            console.log('[DEBUG] 对象中无query字段，检查其他字段');

            // 尝试在对象的顶层属性中找到一个字符串
            const firstStringProp = Object.entries(payload.arguments).find(
              ([, v]) => typeof v === 'string',
            );

            if (firstStringProp) {
              queryArg = String(firstStringProp[1]);
              console.log('[DEBUG] 使用对象中的第一个字符串属性:', firstStringProp[0], queryArg);
            } else {
              queryArg = JSON.stringify(payload.arguments);
              console.log('[DEBUG] 无字符串属性，使用整个对象的JSON:', queryArg);
            }
          }
        } else {
          console.log('[DEBUG] arguments不是字符串也不是对象，使用默认查询');
          queryArg = '默认查询';
        }

        if (!queryArg) {
          console.log('[DEBUG] 未能提取到有效查询，使用默认值');
          if (process.env.NODE_ENV === 'development') {
            queryArg = '测试查询 - ' + new Date().toISOString();
          } else {
            throw new Error('初始化失败：未获取到查询参数(query)');
          }
        }

        console.log('[DEBUG] 最终查询参数:', queryArg);

        // 统一调用对应处理函数
        if (apiName === 'queryRAGFlowGraph') {
          console.log('[DEBUG] 调用 handleGraph 处理:', queryArg);
          await handleGraph(queryArg, settings);
        } else {
          console.log('[DEBUG] 调用 handleSearch 处理:', queryArg);
          await handleSearch(queryArg, settings);
        }
      } catch (error) {
        console.error('[DEBUG] 插件初始化错误:', error);

        // 确定错误类型
        let errorType: 'timeout' | 'connection' | 'config' | 'unknown' = 'unknown';
        const errorMessage = error instanceof Error ? error.message : '未知错误';

        console.log('[DEBUG] 错误信息:', errorMessage);

        if (errorMessage.includes('超时')) errorType = 'timeout';
        else if (
          errorMessage.includes('无法连接') ||
          errorMessage.includes('连接失败') ||
          errorMessage.includes('ECONNREFUSED')
        )
          errorType = 'connection';
        else if (errorMessage.includes('未配置') || errorMessage.includes('初始化失败'))
          errorType = 'config';

        console.log('[DEBUG] 错误类型:', errorType);

        // 构造错误结果
        const errorData: ResponseData = {
          query: '初始化错误',
          result: {
            answer: `初始化错误: ${errorMessage}`,
            errorType,
            graphData: { edges: [], nodes: [] },
            isError: true,
            sources: [],
          },
        };

        // 设置错误数据并通知 LobeChat
        console.log('[DEBUG] 设置错误数据');
        setData(errorData);

        try {
          console.log('[DEBUG] 尝试向LobeChat发送错误信息');
          lobeChat.setPluginMessage(errorData);
          console.log('[DEBUG] 向LobeChat发送错误信息成功');
        } catch (error_) {
          console.error('[DEBUG] 向LobeChat发送错误信息失败:', error_);
        }
      } finally {
        // 确保一定会执行这些清理代码
        try {
          // 无论什么情况，都确保结束加载状态
          console.log('[DEBUG] 初始化完成，强制设置loading状态为false');
          setLoading(false);

          // 使用setTimeout确保状态更新
          setTimeout(() => {
            console.log('[DEBUG] 再次确认loading状态为false');
            setLoading(false);
          }, 100);
        } finally {
          console.log('[DEBUG] 清理安全超时');
          clearTimeout(safetyTimeout);
          console.log('[DEBUG] =========== initPlugin 结束 ===========');
        }
      }
    }
    console.log('开始执行初始化');
    initPlugin();

    // 清除effect时清除超时
    return () => clearTimeout(safetyTimeout);
  }, []);
  // 设置全局错误处理
  useEffect(() => {
    console.log('[DEBUG] 初始化全局错误处理器');
    setupGlobalErrorHandler(setLoading, setData, setErrorState);
  }, []);
  // 输出传递给组件的简要状态
  console.log('[DEBUG] 传递给 RAGFlowRender 组件的状态:', {
    hasQuery: !!data?.query,
    hasResult: !!data?.result,
    isError: data?.result?.isError,
    loading,
  });

  // 添加调试按钮 - 仅用于开发环境
  const isDevEnv = process.env.NODE_ENV === 'development';
  // 紧急解决方案：在组件挂载后检查loading状态
  useEffect(() => {
    // 设置紧急重置计时器 - 任何环境都执行
    console.log('[DEBUG] 设置紧急解决方案的计时器');
    const emergencyFix = setTimeout(() => {
      console.log('[DEBUG] 紧急解决方案触发：检查loading状态');

      // 使用刚才创建的强制重置工具
      if (loading && data?.query === '初始化中') {
        console.log('[DEBUG] 检测到可能的无限加载状态，执行强制重置');
        forceReset(setLoading, setData, '检测到可能的无限加载状态');
      } else {
        console.log('[DEBUG] 加载状态正常，无需重置');
      }
    }, 3000);

    return () => clearTimeout(emergencyFix);
  }, [loading, data?.query]);
  return (
    <>
      {isDevEnv && (
        <div
          style={{
            background: 'rgba(255,255,255,0.9)',
            border: '1px solid #ddd',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            padding: '10px',
            position: 'fixed',
            right: '10px',
            top: '10px',
            zIndex: 1000,
          }}
        >
          <div style={{ fontSize: '12px', marginBottom: '8px' }}>
            调试状态: {loading ? '加载中' : data?.result?.isError ? '错误' : '已加载'}
          </div>
          <button
            onClick={() => {
              console.log('[DEBUG] 使用强制重置功能');
              forceReset(setLoading, setData, '用户手动触发');
            }}
            style={{
              background: loading ? '#ff4d4f' : '#52c41a',
              border: 'none',
              borderRadius: '2px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px',
              marginRight: '4px',
              padding: '4px 8px',
            }}
            type="button"
          >
            {loading ? '🔄 强制结束加载' : '✅ 已加载完成'}
          </button>
          <button
            onClick={() => {
              console.log('[DEBUG] 模拟正常响应');
              setLoading(false);
              setErrorState(undefined);
              setData({
                query: '示例查询',
                result: {
                  answer: '这是一个示例回答。\n包含多行文本。\n用于测试显示效果。',
                  graphData: { edges: [], nodes: [] },
                  isError: false,
                  sources: [
                    { content: '示例来源1', metadata: { type: 'test' } },
                    { content: '示例来源2', metadata: { type: 'test' } },
                  ],
                },
              });
            }}
            style={{
              background: '#1890ff',
              border: 'none',
              borderRadius: '2px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px',
              padding: '4px 8px',
            }}
            type="button"
          >
            🧪 模拟正常响应
          </button>
        </div>
      )}
      <RAGFlowRender
        errorState={errorState}
        loading={loading}
        query={data?.query}
        result={data?.result}
      />
      <DebugPanel data={data} errorState={errorState} loading={loading} />
    </>
  );
});

export default Render;
