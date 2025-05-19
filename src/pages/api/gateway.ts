import { NextApiRequest, NextApiResponse } from 'next';

import { RAGFlowService } from '@/services/ragflow-service';
import { RAGFlowConfig } from '@/type';
import { extractRAGFlowConfig, logConfigSummary } from '@/utils/configUtils';
import { logRequestDetails } from '@/utils/logRequestDetails';
import { ensureValidQuery } from '@/utils/queryUtils';

// 类型定义
interface RequestArguments {
  [key: string]: any;
  query?: string;
}

interface RequestBody {
  apiName?: string;
  arguments?: string | RequestArguments;
  config?: Partial<RAGFlowConfig>;
  identifier?: string;
  name?: string;
  query?: string;
}

// 辅助函数：从请求主体中提取查询
function extractQueryFromBody(body: RequestBody): string | undefined {
  // 情况 1: 直接从 body 中获取 query
  if (body.query) {
    return String(body.query);
  }

  // 情况 2: 从 arguments 中获取
  if (body.arguments) {
    let args: RequestArguments;

    // 解析 arguments 如果它是字符串
    if (typeof body.arguments === 'string') {
      try {
        args = JSON.parse(body.arguments);
      } catch {
        return body.arguments; // 如果解析失败，直接使用字符串
      }
    } else {
      args = body.arguments;
    }

    // 从参数中提取查询
    if (args.query) {
      return String(args.query);
    }

    // 尝试查找第一个字符串属性
    const firstStringProp = Object.entries(args).find(([, v]) => typeof v === 'string');

    if (firstStringProp) {
      return String(firstStringProp[1]);
    }

    // 如果都没有找到，返回整个参数对象的字符串形式
    return JSON.stringify(args);
  }

  return undefined;
}

// 为所有请求正确处理 CORS
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 设置 CORS 头信息，允许来自任何源的请求
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-lobe-trace, x-lobe-chat-auth, x-lobe-plugin-settings, x-ragflow-api-url, x-ragflow-agent-id, x-ragflow-chat-id',
  );

  // 预检请求处理
  if (req.method === 'OPTIONS') {
    console.log('Gateway: 收到 OPTIONS 预检请求');
    res.status(200).end();
    return;
  }

  try {
    // 针对 GET 请求，返回一个简单的状态检查响应
    if (req.method === 'GET') {
      console.log('Gateway: 收到 GET 请求');
      return res.status(200).json({
        message: 'RAGFlow 插件网关正常运行',
        status: 'ok',
        timestamp: new Date().toISOString(),
      });
    }

    // 针对 POST 请求，处理实际的 RAGFlow 查询
    if (req.method === 'POST') {
      console.log('Gateway: 收到 POST 请求');

      try {
        // 使用详细日志记录器记录请求信息
        logRequestDetails(req, 'RAGFlow Gateway');

        // 解析请求体
        const body: RequestBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

        console.log('解析后的请求体:', body);

        // 提取查询和配置
        const query = extractQueryFromBody(body);

        if (!query) {
          return res.status(400).json({
            details: '未能从请求中提取有效的查询内容',
            error: '无效的查询参数',
          });
        }

        // 验证查询
        const validQuery = ensureValidQuery(query);
        if (!validQuery) {
          return res.status(400).json({
            details: '查询内容为空或格式不正确',
            error: '无效的查询参数',
          });
        }

        // 处理配置
        const lobeSettings =
          typeof req.headers['x-lobe-plugin-settings'] === 'string'
            ? JSON.parse(req.headers['x-lobe-plugin-settings'])
            : {};

        const config = extractRAGFlowConfig({
          ...lobeSettings,
          ...body.config,
        });

        // 记录配置摘要
        logConfigSummary(config, '处理后的请求配置');

        // 确定API模式
        const mode =
          body.apiName === 'queryRAGFlowGraph' || body.name === 'queryRAGFlowGraph'
            ? ('knowledgeGraph' as const)
            : ('summary' as const);

        // 调用RAGFlow服务
        try {
          const result = await RAGFlowService.search(validQuery, config, mode);
          return res.status(200).json(result);
        } catch (error) {
          console.error('RAGFlow服务调用失败:', error);
          const errorResponse = {
            query: validQuery,
            result: {
              answer: `查询失败: ${error instanceof Error ? error.message : '未知错误'}`,
              errorType: 'service_error',
              graphData: { edges: [], nodes: [] },
              isError: true,
              sources: [],
            },
          };
          return res.status(500).json(errorResponse);
        }
      } catch (error) {
        console.error('请求处理失败:', error);
        return res.status(400).json({
          error: '请求处理失败',
          message: error instanceof Error ? error.message : '未知错误',
        });
      }
    }

    // 对于其他方法，返回 405 Method Not Allowed
    return res.status(405).json({ error: '不支持的请求方法' });
  } catch (error) {
    const errMsg = `服务器错误: ${error instanceof Error ? error.message : '未知错误'}`;
    console.error('处理请求时发生服务器错误:', errMsg);
    return res.status(500).json({
      error: true,
      errorType: 'server',
      response: errMsg,
    });
  }
}
