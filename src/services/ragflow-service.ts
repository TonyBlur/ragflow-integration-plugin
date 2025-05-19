// 为 Node.js 环境明确导入 fetch
import http from 'node:http';
import https from 'node:https';
import fetch from 'node-fetch';

import { RAGFlowConfig, RAGFlowSearchResult } from '@/type';
import { logSafeConfig } from '@/utils/logSafeConfig';

// API 模式类型
export type APIMode = 'summary' | 'knowledgeGraph';

/**
 * 与RAGFlow服务进行交互的服务
 */
export const RAGFlowService = {
  /**
   * 向RAGFlow发送查询请求
   * @param query 用户查询
   * @param config RAGFlow API配置
   * @param mode API模式: summary(摘要)或knowledgeGraph(知识图谱)
   */
  async search(
    query: string,
    config: RAGFlowConfig,
    mode: APIMode = 'summary',
  ): Promise<RAGFlowSearchResult> {
    try {
      // 代理配置检测：如设置了 HTTP_PROXY 或 http_proxy，则跳过自定义 agent
      const skipAgent = !!(process.env.HTTP_PROXY || process.env.http_proxy);
      const getAgent = (protocol: string) =>
        skipAgent
          ? undefined
          : protocol === 'http:'
            ? new http.Agent({ family: 4 })
            : new https.Agent({ family: 4 });

      // 使用兼容的属性读取方式，支持多种属性名格式
      // 获取有效值，支持多种属性名格式
      const getEffectiveValue = (key: string): string | undefined => {
        // 不同的属性名变体
        const variants = [
          `ragflow${key.charAt(0).toUpperCase() + key.slice(1)}`, // ragflowApiUrl
          `RAGFLOW_${key.toUpperCase()}`, // RAGFLOW_API_URL
          key, // apiUrl
        ];

        for (const variant of variants) {
          const value = config[variant];
          if (value && typeof value === 'string' && value.trim() !== '' && value !== 'undefined') {
            return value.trim();
          }
        }
        return undefined;
      };

      const ragflowApiUrl = getEffectiveValue('apiUrl') || '';
      const ragflowApiKey = getEffectiveValue('apiKey');
      const agentId = getEffectiveValue('agentId');
      const chatId = getEffectiveValue('chatId');

      // 直接检查关键配置是否存在
      if (!ragflowApiUrl) {
        throw new Error('配置错误: 未配置 RAGFlow API 地址');
      }

      if (!agentId && !chatId) {
        throw new Error('配置错误: 未配置 Agent ID 或 Chat ID，请至少提供一个');
      }

      console.log('[RAGFlowService] 使用的配置:', {
        agentId,
        chatId,
        hasApiKey: !!ragflowApiKey,
        ragflowApiUrl,
      });

      // 构建请求头
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // 如果提供了API密钥，添加到请求头
      if (ragflowApiKey) {
        headers['Authorization'] = `Bearer ${ragflowApiKey}`;
      }

      // 确保查询参数有效
      let safeQuery = query;
      if (!safeQuery || typeof safeQuery !== 'string' || safeQuery.trim() === '') {
        console.warn('查询参数无效，使用默认值');
        safeQuery = '请提供一个有效的查询';
      }

      // 使用 OpenAI 兼容的消息格式
      const messages = [
        {
          content: safeQuery,
          role: 'user',
        },
      ];

      // 根据模式添加系统消息
      if (mode === 'knowledgeGraph') {
        messages.unshift({
          content: '请生成包含知识图谱的完整回答，并确保包含所有相关实体和关系。',
          role: 'system',
        });
      }

      // 构建符合 OpenAI 兼容 API 的请求体
      const requestBody = {
        messages,
        model: 'ragflow-model',
        stream: false, // 默认不使用流式响应
      };

      // 详细记录配置
      console.log('[RAGFlowService调试] 搜索配置:', {
        agentId,
        chatId,
        directAgentId: config.agentId,
        directChatId: config.chatId,
        hasApiKey: !!ragflowApiKey,
        ragflowAgentId: config.ragflowAgentId,
        ragflowApiUrl,
        ragflowChatId: config.ragflowChatId,
      });

      // 根据文档：若提供 agentId 则调用 Agents 端点，否则使用 Chat 端点
      let endpoint: string;
      if (agentId) {
        console.log('使用 Agent ID 调用 RAGFlow:', agentId);
        // 1. 创建 Agent 会话
        const sessionEndpoint = `/api/v1/agents/${agentId}/sessions`;
        const sessionUrlObj = new URL(sessionEndpoint, ragflowApiUrl);
        const sessionAgent = getAgent(sessionUrlObj.protocol);
        const sessionController = new AbortController();
        const sessionTimeoutId = setTimeout(() => {
          sessionController.abort();
          console.log('Agent会话请求超时，已取消');
        }, 30_000); // 缩短超时时间以提高用户体验

        const sessionReqBody = { model: requestBody.model };

        let sessionResp;
        try {
          sessionResp = await fetch(sessionUrlObj.toString(), {
            agent: sessionAgent,
            body: JSON.stringify(sessionReqBody),
            headers,
            method: 'POST',
            signal: sessionController.signal,
          });

          if (!sessionResp.ok) {
            const errText = await sessionResp.text();
            throw new Error(`创建Agent会话失败: ${sessionResp.status} - ${errText}`);
          }
        } catch (error: any) {
          clearTimeout(sessionTimeoutId);
          if (error?.name === 'AbortError') {
            throw new Error('连接RAGFlow Agent服务超时，请检查服务是否正常运行');
          }
          if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND') {
            throw new Error(`无法连接到RAGFlow服务(${error.code})，请检查服务是否正常运行`);
          }
          throw error;
        }

        clearTimeout(sessionTimeoutId); // 清理超时定时器
        const sessionJson = (await sessionResp.json()) as any;
        console.log('Agent 会话响应:', JSON.stringify(sessionJson, undefined, 2));
        const sessionId =
          sessionJson.data?.session_id ||
          sessionJson.data?.id ||
          sessionJson.session_id ||
          sessionJson.id;
        if (!sessionId) throw new Error('未获取到 session_id');

        // 2. 使用 session_id 调用 Agent 完成 API
        const completeEndpoint = `/api/v1/agents/${agentId}/completions`;
        const completeUrlObj = new URL(completeEndpoint, ragflowApiUrl);
        const completeAgent = getAgent(completeUrlObj.protocol);
        const completeUrl = completeUrlObj.toString();
        console.log(`使用 Agent 完成接口: ${completeUrl}`);
        const completeController = new AbortController();
        const completeTimeoutId = setTimeout(() => {
          completeController.abort();
          console.log('Agent完成请求超时，已取消');
        }, 40_000); // 给完成操作多一点时间

        // 使用 OpenAI 兼容请求体格式，确保查询参数不为空
        const validQuery = query.trim() || '请提供有效的查询';
        console.log('Agent调用使用的查询:', validQuery);
        const agentReqBody = { question: validQuery, session_id: sessionId, stream: false };

        let completeResp;
        try {
          completeResp = await fetch(completeUrlObj.toString(), {
            agent: completeAgent,
            body: JSON.stringify(agentReqBody),
            headers,
            method: 'POST',
            signal: completeController.signal,
          });

          if (!completeResp.ok) {
            const errTxt = await completeResp.text();
            throw new Error(`Agent 完成错误: ${completeResp.status} - ${errTxt}`);
          }
        } catch (error: any) {
          clearTimeout(completeTimeoutId);
          if (error?.name === 'AbortError') {
            throw new Error('RAGFlow Agent处理查询超时，可能是查询复杂或服务负载过高');
          }
          if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND') {
            throw new Error(`无法连接到RAGFlow服务(${error.code})，请检查服务是否正常运行`);
          }
          throw error;
        }

        clearTimeout(completeTimeoutId); // 清理超时定时器
        const completeJson = (await completeResp.json()) as any;
        console.log('Agent 完成原始响应:', JSON.stringify(completeJson, undefined, 2));
        const answer =
          completeJson.data?.answer ?? completeJson.choices?.[0]?.message?.content ?? '暂无回答';
        return { answer, graphData: { edges: [], nodes: [] }, sources: [] };
      } else if (chatId) {
        endpoint = `/api/v1/chats_openai/${chatId}/chat/completions`;
      } else {
        throw new Error(
          '未配置聊天或代理 ID，请在插件设置中填写 RAGFLOW_AGENT_ID 或 RAGFLOW_CHAT_ID',
        );
      }

      // 输出详细日志
      logSafeConfig(config, 'RAGFlow服务 - 搜索配置');
      console.log(`RAGFlow请求URL: ${ragflowApiUrl}${endpoint}`);
      console.log(
        `RAGFlow请求头: ${JSON.stringify({ ...headers, Authorization: headers.Authorization ? '******' : undefined }, undefined, 2)}`,
      );
      console.log(`RAGFlow请求体: ${JSON.stringify(requestBody, undefined, 2)}`);

      let response;
      try {
        // 构建请求 URL，并使用用户输入的 ragflowApiUrl
        const urlObj = new URL(endpoint, ragflowApiUrl);
        const url = urlObj.toString();
        console.log(`使用 API URL: ${url}`);
        const controller = new AbortController();
        // 超时 30 秒后取消请求
        const timeoutId = setTimeout(() => {
          controller.abort();
          console.log('请求超时，已取消');
        }, 30_000);

        // 根据协议选择 agent，强制 IPv4
        const agent = getAgent(urlObj.protocol);
        // 发起请求
        response = await fetch(url, {
          agent,
          body: JSON.stringify(requestBody),
          headers,
          method: 'POST',
          signal: controller.signal,
        }).finally(() => {
          // 无论成功失败都清理超时计时器
          clearTimeout(timeoutId);
        });

        console.log(`RAGFlow响应状态: ${response.status} ${response.statusText}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`RAGFlow API错误响应: ${errorText}`);
          throw new Error(
            `RAGFlow API响应错误: ${response.status} ${response.statusText} - ${errorText}`,
          );
        }
      } catch (fetchError: any) {
        console.error('RAGFlow API请求失败:', fetchError);

        // 根据错误类型返回更友好的错误信息
        if (fetchError.name === 'AbortError') {
          throw new Error('连接RAGFlow服务超时，请检查服务是否正常运行');
        }

        if (fetchError.code === 'ECONNREFUSED' || fetchError.code === 'ENOTFOUND') {
          throw new Error(
            `无法连接到RAGFlow服务(${fetchError.code})，请检查RAGFlow服务是否正常运行`,
          );
        }

        if (fetchError.message && fetchError.message.includes('timed out')) {
          throw new Error('连接RAGFlow服务超时，请检查网络连接和服务状态');
        }

        throw new Error(`RAGFlow服务连接失败: ${fetchError?.message || '未知错误'}`);
      }

      const data = (await response!.json()) as any;
      console.log(`RAGFlow响应数据: ${JSON.stringify(data, undefined, 2)}`);

      // 处理 OpenAI 兼容格式的响应
      // 从返回的 choices 中提取回答内容
      const answer = data.choices?.[0]?.message?.content || '暂无回答';

      // 提取源文档信息（如果有的话）
      // 注意：OpenAI 兼容格式可能需要在自定义属性中查找源文档
      const sources = data.sources || [];

      // 提取知识图谱数据（如果有的话）
      const graphData = data.graph_data || {
        edges: [],
        nodes: [],
      };

      // 记录成功响应
      console.log('RAGFlow 请求成功，响应内容长度:', answer.length);
      console.log(
        `来源数量: ${sources.length}, 图谱节点: ${graphData.nodes.length}, 边: ${graphData.edges.length}`,
      );

      return {
        answer,
        graphData,
        sources,
      };
    } catch (error) {
      console.error('RAGFlow查询出错:', error);

      // 确定错误类型
      let errorType: 'timeout' | 'connection' | 'config' | 'unknown' = 'unknown';
      if (error instanceof Error) {
        if (error.message.includes('超时')) errorType = 'timeout';
        else if (error.message.includes('无法连接') || error.message.includes('连接失败'))
          errorType = 'connection';
        else if (error.message.includes('未配置')) errorType = 'config';
      }

      return {
        answer: `查询出错: ${error instanceof Error ? error.message : '未知错误'}`,
        errorType,
        graphData: {
          edges: [],
          nodes: [],
        },
        isError: true,
        sources: [],
      };
    }
  },
};
