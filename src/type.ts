// RAGFlow 相关接口定义
export interface RAGFlowConfig {
  chatId?: string;
  ragflowApiKey?: string;
  ragflowApiUrl: string; // 添加chatId字段，用于指定聊天ID
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

export interface RAGFlowSearchResult {
  answer: string;
  graphData?: KnowledgeGraphData;
  sources: {
    content: string;
    metadata: Record<string, any>;
  }[];
}

export interface ResponseData {
  query: string;
  result: RAGFlowSearchResult;
}

export interface RequestData {
  config?: RAGFlowConfig;
  query: string;
}
