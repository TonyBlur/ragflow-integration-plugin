import { NextApiRequest, NextApiResponse } from 'next';

import { RAGFlowService } from '@/services/ragflow-service';
import { RequestData } from '@/type';

// 确保返回格式与 LobeChat 插件期望的格式一致 (直接返回字符串)
export default async function handler(req: NextApiRequest, res: NextApiResponse<string>) {
  console.log('Received request for /api/ragflow/summary');
  console.log('Method:', req.method);

  // 设置 CORS 头信息，允许来自任何源的请求
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-lobe-trace, x-lobe-chat-auth, x-lobe-plugin-settings',
  );

  // 尝试从 x-lobe-plugin-settings 头获取插件设置
  const pluginSettingsHeader = req.headers['x-lobe-plugin-settings'];
  let pluginSettings: Record<string, any> = {};
  if (pluginSettingsHeader && typeof pluginSettingsHeader === 'string') {
    try {
      pluginSettings = JSON.parse(pluginSettingsHeader);
      console.log('Summary API pluginSettings from header:', pluginSettings);
    } catch {
      console.warn('Summary API: 无法解析 x-lobe-plugin-settings 头');
    }
  }

  // 预检请求处理
  if (req.method === 'OPTIONS') {
    console.log('Summary API: 收到 OPTIONS 预检请求');
    res.status(200).end();
    return;
  }

  // 记录收到的请求体
  console.log('Body:', JSON.stringify(req.body, undefined, 2));

  if (req.method !== 'POST') {
    console.error('Method Not Allowed:', req.method);
    // 返回错误字符串
    return res.status(405).send('错误: 只支持 POST 请求');
  }

  try {
    // 显式检查请求体是否存在
    if (!req.body) {
      console.error('Bad Request: Missing request body');
      return res.status(400).send('错误: 请求缺少必要的请求体');
    }

    const reqData = req.body as RequestData;
    const cfg = reqData.config || ({} as any);
    if (!cfg.ragflowApiUrl) {
      cfg.ragflowApiUrl = pluginSettings.RAGFLOW_API_URL || process.env.RAGFLOW_API_URL;
      cfg.ragflowApiKey = pluginSettings.RAGFLOW_API_KEY || process.env.RAGFLOW_API_KEY;
    }
    // 赋值回使用的 config
    const { query } = reqData;
    console.log('Using summary config:', { ragflowApiUrl: cfg.ragflowApiUrl });
    if (!cfg.ragflowApiUrl) {
      console.error('Bad Request: Missing RAGFlow API URL');
      return res.status(400).send('错误: 未配置RAGFlow API地址，请在插件设置中配置');
    }

    // 记录提取的数据
    console.log('Extracted Query:', query);
    console.log('Extracted Config:', cfg ? JSON.stringify(cfg, undefined, 2) : 'undefined'); // 验证查询是否存在
    if (typeof query !== 'string' || query.trim() === '') {
      console.error('Bad Request: Invalid or missing query parameter');
      // 返回错误字符串
      return res.status(400).send('错误: 缺少有效的查询参数');
    }

    console.log(`Calling RAGFlowService.search with query: "${query}" and mode: "summary"`);
    // 调用RAGFlow服务进行查询 - 摘要模式
    const result = await RAGFlowService.search(query, cfg, 'summary');
    console.log('RAGFlowService.search returned:', JSON.stringify(result, undefined, 2));

    // 直接返回 answer 字符串
    console.log('Returning 200 OK with answer string:', result.answer);
    return res.status(200).send(result.answer);
  } catch (error) {
    console.error('RAGFlow API Handler Error:', error);
    // 确保错误响应始终是字符串
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    const errorResponseString = `服务器错误: ${errorMessage}`;
    console.error('Returning 500 Internal Server Error with string:', errorResponseString);
    return res.status(500).send(errorResponseString);
  }
}
