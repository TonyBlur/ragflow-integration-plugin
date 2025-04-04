import { RAGFlowConfig, RAGFlowSearchResult } from '@/type';

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
      const { apiUrl, apiKey, chatId = 'default' } = config;

      // 构建请求头
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // 如果提供了apiKey，添加到请求头
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      // 使用 OpenAI 兼容的消息格式
      const messages = [
        {
          content: query,
          role: 'user',
        },
      ];

      // 构建符合 OpenAI 兼容 API 的请求体
      const requestBody = {
        // RAGFlow会自动解析，可以设置为任意值
messages, 
        model: 'ragflow-model',
        stream: false, // 默认不使用流式响应
      };

      // 根据模式添加系统消息
      if (mode === 'knowledgeGraph') {
        messages.unshift({
          content: '请生成包含知识图谱的完整回答，并确保包含所有相关实体和关系。',
          role: 'system'
        });
      }

      // 使用 OpenAI 兼容的 API 端点
      const endpoint = `/api/v1/chats_openai/${chatId}/chat/completions`;
      
      // 发送请求到 RAGFlow 服务
      const response = await fetch(`${apiUrl}${endpoint}`, {
        body: JSON.stringify(requestBody),
        headers,
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`RAGFlow API响应错误: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

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

      return {
        answer,
        graphData,
        sources,
      };
    } catch (error) {
      console.error('RAGFlow查询出错:', error);
      return {
        answer: `查询出错: ${error instanceof Error ? error.message : '未知错误'}`,
        graphData: {
          edges: [],
          nodes: [],
        },
        sources: [],
      };
    }
  },
};
