// RAGFlow 相关接口定义
export interface RAGFlowConfig {
  // 允许其他属性 - 灵活处理可能的名称变种
  [key: string]: any;
  RAGFLOW_AGENT_ID?: string;
  RAGFLOW_API_KEY?: string;
  // 大写命名格式 - LobeChat/manifest 使用
  RAGFLOW_API_URL?: string;

  RAGFLOW_CHAT_ID?: string;
  agentId?: string;
  apiKey?: string;
  apiUrl?: string;

  // 简化的兼容性属性
  chatId?: string;
  ragflowAgentId?: string;
  ragflowApiKey?: string;
  ragflowApiUrl: string;

  // 规范化的命名属性 - 主要使用
  ragflowChatId?: string;
}

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  size?: number;
  type?: string;
}

export interface KnowledgeGraphEdge {
  label?: string;
  source: string;
  target: string;
}

export interface KnowledgeGraphData {
  edges: KnowledgeGraphEdge[];
  nodes: KnowledgeGraphNode[];
}

export interface ErrorState {
  message: string;
  type: string;
}

export interface RAGFlowSearchResult {
  answer: string;
  errorType?: string;
  graphData: KnowledgeGraphData;
  isError?: boolean;
  sources: Array<{
    content: string;
    metadata?: Record<string, any>;
  }>;
}

export interface ResponseData {
  error?: ErrorState;
  query: string;
  result: RAGFlowSearchResult;
}

export interface RequestData {
  config?: RAGFlowConfig;
  query: string;
}

// API响应类型
export type APIResponse =
  | {
      error?: string;
      errorType?: string;
      response?: string;
      sources?: Array<{
        content: string;
        metadata?: Record<string, any>;
      }>;
    }
  | ResponseData;
