import { NextApiRequest, NextApiResponse } from 'next';

import { RAGFlowService } from '@/services/ragflow-service';
import { RequestData, ResponseData } from '@/type';

/**
 * 主 RAGFlow API 处理函数
 * 注意：这是一个通用的处理函数，会根据请求决定使用哪种模式
 * 大多数情况下，推荐直接使用 /api/ragflow/summary 或 /api/ragflow/graph 端点
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      query: '',
      result: {
        answer: '错误: 只支持 POST 请求',
        graphData: { edges: [], nodes: [] },
        sources: [],
      },
    });
  }

  try {
    const {
      query,
      config,
      mode = 'summary',
    } = req.body as RequestData & { mode?: 'summary' | 'knowledgeGraph' };

    // 确保配置了RAGFlow API URL
    if (!config?.apiUrl) {
      return res.status(400).json({
        query,
        result: {
          answer: '错误: 未配置RAGFlow API地址，请在插件设置中配置',
          graphData: { edges: [], nodes: [] },
          sources: [],
        },
      });
    }

    // 调用RAGFlow服务进行查询，使用指定的模式
    const result = await RAGFlowService.search(query, config, mode);

    return res.status(200).json({
      query,
      result,
    });
  } catch (error) {
    console.error('RAGFlow API 错误:', error);
    return res.status(500).json({
      query: req.body?.query || '',
      result: {
        answer: `错误: ${error instanceof Error ? error.message : '未知错误'}`,
        graphData: { edges: [], nodes: [] },
        sources: [],
      },
    });
  }
}
