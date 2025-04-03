import { Card, Empty, Typography } from 'antd';
import { createStyles } from 'antd-style';
import { memo } from 'react';
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

interface RAGFlowRenderProps {
  loading?: boolean;
  query?: string;
  result?: RAGFlowSearchResult;
}

// 使用与接口一致的参数名
const RAGFlowRender = memo<RAGFlowRenderProps>(({ result, loading = false }) => {
  const { styles } = useStyles();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //const unusedQuery = query;

  return (
    <Flexbox className={styles.container} gap={16}>
      {result ? (
        <>
          <Card bordered={false} className={styles.card} title="查询结果">
            <Paragraph className={styles.answer}>{result.answer}</Paragraph>
          </Card>

          <Card bordered={false} className={styles.card} title="知识图谱">
            <KnowledgeGraph data={result.graphData} loading={loading} />
          </Card>

          {result.sources && result.sources.length > 0 && (
            <Card bordered={false} className={styles.card} title="参考来源">
              <Flexbox gap={12}>
                {result.sources.map((source, index) => (
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
      ) : loading ? undefined : (
        <Empty description="正在加载RAGFlow知识库结果..." />
      )}
    </Flexbox>
  );
});

export default RAGFlowRender;
