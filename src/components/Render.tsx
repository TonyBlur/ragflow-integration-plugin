import { Card, Empty, Typography } from 'antd';
import { createStyles } from 'antd-style';
import { memo, useEffect, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

import { RAGFlowConfig, RAGFlowSearchResult } from '@/type';

import KnowledgeGraph from './KnowledgeGraph';

const { Paragraph, Text } = Typography;

const useStyles = createStyles(({ css, token }) => ({
  answer: css`
    font-size: 16px;
    white-space: pre-wrap;
  `,
  card: css`
    margin-block-end: 16px;
  `,
  container: css`
    width: 100%;
    padding: 16px;
  `,
  source: css`
    overflow-y: auto;

    max-height: 200px;
    margin-block-end: 8px;
    padding: 12px;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadius}px;

    font-size: 14px;

    background-color: ${token.colorBgContainer};
  `,
  sourceTitle: css`
    margin-block-end: 8px;
    font-weight: bold;
  `,
  tabButton: css`
    cursor: pointer;

    margin-inline-end: 8px;
    padding-block: 8px;
    padding-inline: 16px;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadius}px;

    background: ${token.colorBgContainer};

    &.active {
      color: white;
      background: ${token.colorPrimary};
    }
  `,
  tabContainer: css`
    margin-block-end: 16px;
  `,
}));

// 支持的API模式
enum ApiMode {
  KNOWLEDGE_GRAPH = 'knowledge_graph',
  SUMMARY = 'summary'
}

// 组件属性接口
interface RenderProps {
  // API模式选择
  apiMode?: ApiMode;
  config?: RAGFlowConfig;
  // 核心RAGFlow属性
  loading?: boolean;

  query?: string;
  result?: RAGFlowSearchResult;
}

const Render = memo<RenderProps>((props) => {
  const { styles } = useStyles();
  const { result, loading = false, query, apiMode: initialApiMode } = props;

  // 状态管理
  const [currentQuery, setCurrentQuery] = useState<string>(query || '');
  const [searchResult, setSearchResult] = useState<RAGFlowSearchResult | undefined>(result);
  const [isLoading, setIsLoading] = useState<boolean>(loading);
  const [apiMode, setApiMode] = useState<ApiMode>(initialApiMode || ApiMode.SUMMARY);

  // 当props变化时更新内部状态
  useEffect(() => {
    if (query) setCurrentQuery(query);
    if (result) setSearchResult(result);
    setIsLoading(loading);
  }, [query, result, loading]);

  // API调用函数 - 摘要模式
  const fetchSummary = async (userQuery: string) => {
    if (!userQuery) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/ragflow/summary', {
        body: JSON.stringify({ config: props.config, query: userQuery }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });

      const data = await response.json();
      setSearchResult(data.result);
    } catch (error) {
      console.error('获取摘要失败:', error);
      setSearchResult({
        answer: `查询出错: ${error instanceof Error ? error.message : '未知错误'}`,
        graphData: { edges: [], nodes: [] },
        sources: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  // API调用函数 - 知识图谱模式
  const fetchKnowledgeGraph = async (userQuery: string) => {
    if (!userQuery) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/ragflow/graph', {
        body: JSON.stringify({ config: props.config, query: userQuery }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });

      const data = await response.json();
      setSearchResult(data.result);
    } catch (error) {
      console.error('获取知识图谱失败:', error);
      setSearchResult({
        answer: `查询出错: ${error instanceof Error ? error.message : '未知错误'}`,
        graphData: { edges: [], nodes: [] },
        sources: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 切换API模式
  const switchApiMode = (mode: ApiMode) => {
    setApiMode(mode);
    if (currentQuery) {
      if (mode === ApiMode.SUMMARY) {
        fetchSummary(currentQuery);
      } else {
        fetchKnowledgeGraph(currentQuery);
      }
    }
  };

  return (
    <Flexbox className={styles.container} gap={16}>
      {/* API模式选择器 */}
      <div className={styles.tabContainer}>
        <button
          className={`${styles.tabButton} ${apiMode === ApiMode.SUMMARY ? 'active' : ''}`}
          onClick={() => switchApiMode(ApiMode.SUMMARY)}
          type="button"
        >
          问答摘要
        </button>
        <button
          className={`${styles.tabButton} ${apiMode === ApiMode.KNOWLEDGE_GRAPH ? 'active' : ''}`}
          onClick={() => switchApiMode(ApiMode.KNOWLEDGE_GRAPH)}
          type="button"
        >
          知识图谱
        </button>
      </div>

      {/* 结果展示 */}
      {searchResult ? (
        <>
          <Card bordered={false} className={styles.card} title="查询结果">
            <Paragraph className={styles.answer}>{searchResult.answer}</Paragraph>
          </Card>

          {/* 根据API模式决定是否显示知识图谱 */}
          {(apiMode === ApiMode.KNOWLEDGE_GRAPH || searchResult.graphData) && (
            <Card bordered={false} className={styles.card} title="知识图谱">
              <KnowledgeGraph
                data={searchResult.graphData || { edges: [], nodes: [] }}
                loading={isLoading}
              />
            </Card>
          )}

          {searchResult.sources && searchResult.sources.length > 0 && (
            <Card bordered={false} className={styles.card} title="参考来源">
              <Flexbox gap={12}>
                {searchResult.sources.map((source, index) => (
                  <div className={styles.source} key={index}>
                    <div className={styles.sourceTitle}>来源 {index + 1}</div>
                    <Text>{source.content}</Text>
                    {source.metadata && Object.keys(source.metadata).length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <Text type="secondary">
                          {Object.entries(source.metadata)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(' | ')}
                        </Text>
                      </div>
                    )}
                  </div>
                ))}
              </Flexbox>
            </Card>
          )}
        </>
      ) : isLoading ? undefined : (
        <Empty description="正在加载RAGFlow知识库结果..." />
      )}
    </Flexbox>
  );
});

export default Render;
