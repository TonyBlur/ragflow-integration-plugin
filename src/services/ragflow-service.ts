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
      const { apiUrl, apiKey } = config;

      // 构建请求头
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // 如果提供了apiKey，添加到请求头
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      // 根据模式设置不同的请求参数
      const requestParams: Record<string, any> = {
        max_sources: 5,
        query,
        response_format: 'json', // 添加 response_format 参数，确保返回 JSON 格式
      };

      // 根据不同的模式设置特定参数
      if (mode === 'summary') {
        // 摘要模式：专注于生成高质量的回答，不一定需要知识图谱
        requestParams.prompt_type = 'chat';
        requestParams.include_graph = false;
      } else if (mode === 'knowledgeGraph') {
        // 知识图谱模式：确保生成的响应包含完整的知识图谱数据
        requestParams.prompt_type = 'knowledge_graph';
        requestParams.include_graph = true;
        requestParams.graph_depth = 2; // 知识图谱深度，根据需要调整
      }

      // 发送请求到RAGFlow服务，参考 RAGFlow API 文档 https://ragflow.io/docs/dev/http_api_reference
      const response = await fetch(`${apiUrl}/api/search`, {
        body: JSON.stringify(requestParams),
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
