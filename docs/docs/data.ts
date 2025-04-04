// RAGFlow 示例数据
export const data = {
  
  // 为了兼容原有的数据结构，保留一些字段
clothes: {
    hat: '智能帽',
    pants: '逻辑裤',
    shirt: '知识衫',
    shoes: '搜索鞋',
  },
  

mood: 'happy',
  
  
query: 'RAGFlow 是什么?',
  // RAGFlow搜索结果
result: {
    answer:
      'RAGFlow 是一个检索增强生成（Retrieval-Augmented Generation, RAG）平台，它集成了知识库检索和大型语言模型，能够基于企业知识库数据提供精准的问答和知识图谱可视化服务。RAGFlow 可以帮助企业构建自己的知识库问答系统，确保回答的准确性和可靠性。',
    graphData: {
      edges: [
        { label: '是一种', source: '1', target: '2' },
        { label: '使用', source: '1', target: '3' },
        { label: '集成', source: '1', target: '4' },
        { label: '生成', source: '1', target: '5' },
        { label: '支持构建', source: '1', target: '6' },
        { label: '基于', source: '2', target: '4' },
        { label: '检索', source: '2', target: '3' },
        { label: '增强', source: '5', target: '6' },
      ],
      nodes: [
        { id: '1', label: 'RAGFlow', size: 15, type: 'concept' },
        { id: '2', label: '检索增强生成', size: 12, type: 'concept' },
        { id: '3', label: '知识库', size: 10, type: 'entity' },
        { id: '4', label: '大型语言模型', size: 10, type: 'technology' },
        { id: '5', label: '知识图谱', size: 12, type: 'feature' },
        { id: '6', label: '问答系统', size: 12, type: 'application' },
      ],
    },
    sources: [
      {
        content:
          'RAGFlow 是一个开源的 RAG（检索增强生成）平台，可以帮助企业快速构建基于自有知识库的智能问答系统。它能够将企业文档、数据库等内容转化为知识库，并通过大型语言模型生成基于知识库的精确回答。',
        metadata: {
          page: '3',
          source: 'ragflow_introduction.pdf',
        },
      },
      {
        content:
          'RAGFlow 平台的独特之处在于它不仅提供问答功能，还能生成知识图谱，帮助用户理解信息之间的关联。这使得复杂问题的分析变得更加直观和全面。',
        metadata: {
          page: '12',
          source: 'knowledge_graph_features.pdf',
        },
      },
    ],
  },
  today: Date.now(),
};
