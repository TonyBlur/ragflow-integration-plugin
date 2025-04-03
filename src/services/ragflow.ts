import { RAGFlowConfig, RAGFlowSearchResult } from '@/type';

/**
 * 与RAGFlow服务进行交互的服务
 */
export const RAGFlowService = {
  /**
   * 向RAGFlow发送查询请求
   * @param query 用户查询
   * @param config RAGFlow API配置
   */
  async search(query: string, config: RAGFlowConfig): Promise<RAGFlowSearchResult> {
    try {
      const { apiUrl, apiKey } = config;

      // 构建请求头
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // 如果提供了apiKey，添加到请求头
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      // 发送请求到RAGFlow服务，根据RAGFlow API文档 https://ragflow.io/docs/dev/http_api_reference
      const response = await fetch(`${apiUrl}/api/search`, {
        body: JSON.stringify({
          
include_graph: true,
          
          // RAGFlow API 特定参数
max_sources: 5,
          prompt_type: 'chat',
          query, // 指定为聊天类型的查询
        }),
        headers,
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`RAGFlow API响应错误: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // 从RAGFlow API响应中提取需要的数据
      return {
        answer: data.answer || '暂无回答',
        graphData: data.graph_data || {
          edges: [],
          nodes: [],
        },
        sources: data.sources || [],
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
