import { Card, Empty, Typography } from 'antd';
import { createStyles } from 'antd-style';
import { memo, useEffect, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

import { RAGFlowSearchResult } from '@/type';

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
}));

// 支持的API模式
enum ApiMode {
  KNOWLEDGE_GRAPH = 'knowledge_graph',
  SUMMARY = 'summary',
}

// 组件属性接口
interface RenderProps {
  // 核心RAGFlow属性
  loading?: boolean;
  query?: string;
  result?: RAGFlowSearchResult;
}

const Render = memo<RenderProps>((props) => {
  const { styles } = useStyles();
  const { result, loading = false, query } = props;

  // 状态管理
  const [searchResult, setSearchResult] = useState<RAGFlowSearchResult | undefined>(result);
  const [isLoading, setIsLoading] = useState<boolean>(loading);

  // 自动检测API模式 - 基于返回结果判断
  const [apiMode, setApiMode] = useState<ApiMode>(ApiMode.SUMMARY);

  // 当props变化时更新内部状态
  useEffect(() => {
    if (result) {
      setSearchResult(result);
      // 根据结果中的graphData字段判断API模式
      if (
        result.graphData &&
        (result.graphData.nodes.length > 0 || result.graphData.edges.length > 0)
      ) {
        setApiMode(ApiMode.KNOWLEDGE_GRAPH);
      } else {
        setApiMode(ApiMode.SUMMARY);
      }
    }
    setIsLoading(loading);
  }, [query, result, loading]);

  return (
    <Flexbox className={styles.container} gap={16}>
      {/* 结果展示 */}
      {searchResult ? (
        <>
          <Card bordered={false} className={styles.card} title="查询结果">
            <Paragraph className={styles.answer}>{searchResult.answer}</Paragraph>
          </Card>

          {/* 根据API模式决定是否显示知识图谱 */}
          {apiMode === ApiMode.KNOWLEDGE_GRAPH && searchResult.graphData && (
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
