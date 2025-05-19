import { Alert, Card, Empty, Spin, Typography } from 'antd';
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
  errorAlert: css`
    margin-block-end: 16px;
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
  errorState?: { message: string, type: string; } | undefined;
  loading?: boolean;
  query?: string;
  result?: RAGFlowSearchResult;
}

// 获取错误类型对应的提示信息
const getErrorMessage = (
  errorType?: string,
): {
  description: string;
  title: string;
  type: 'error' | 'warning' | 'info';
} => {
  switch (errorType) {
    case 'timeout': {
      return {
        description: 'RAGFlow服务响应超时，可能是服务器负载过高或网络连接问题。请稍后重试。',
        title: '连接超时',
        type: 'warning',
      };
    }
    case 'connection': {
      return {
        description:
          'RAGFlow服务不可用或无法连接。请检查RAGFlow服务是否正在运行，并验证服务地址配置是否正确。',
        title: '连接失败',
        type: 'error',
      };
    }
    case 'config': {
      return {
        description: '插件配置不正确。请确保在插件设置中正确配置了RAGFlow服务地址和必要的ID信息。',
        title: '配置错误',
        type: 'info',
      };
    }
    default: {
      return {
        description: '在处理您的查询时发生了错误。请稍后重试或联系管理员。',
        title: '查询出错',
        type: 'error',
      };
    }
  }
};

// 展示加载状态的组件
const LoadingState = () => (
  <Flexbox align="center" justify="center" style={{ minHeight: 150, width: '100%' }}>
    <div style={{ textAlign: 'center' }}>
      <Spin size="large" />
      <div style={{ marginTop: '20px' }}>
        <Paragraph>正在加载RAGFlow知识库结果...</Paragraph>
      </div>
    </div>
  </Flexbox>
);

// 无结果状态的组件
const NoResultState = () => <Empty description="请在对话中发起查询" />;

// 展示错误状态的组件
const ErrorState = ({ result }: { result: RAGFlowSearchResult }) => {
  const { styles } = useStyles();
  const errorInfo = getErrorMessage(result.errorType);

  return (
    <>
      <Alert
        className={styles.errorAlert}
        description={errorInfo.description}
        message={errorInfo.title}
        showIcon
        type={errorInfo.type}
      />
      <Card className={styles.card} title="错误详情">
        <Paragraph>{result.answer}</Paragraph>
      </Card>
    </>
  );
};

// 展示正常结果的组件
const ResultContent = ({ query, result }: { query?: string; result: RAGFlowSearchResult }) => {
  const { styles } = useStyles();
  const elements = [];

  // 计算 API 模式
  const apiMode =
    result.graphData && (result.graphData.nodes.length > 0 || result.graphData.edges.length > 0)
      ? ApiMode.KNOWLEDGE_GRAPH
      : ApiMode.SUMMARY;

  // 添加查询结果卡片
  elements.push(
    <Card className={styles.card} key="result" title={`查询结果${query ? `：${query}` : ''}`}>
      {apiMode === ApiMode.SUMMARY ? (
        <ul style={{ listStyleType: 'circle', paddingLeft: '20px' }}>
          {result.answer
            .split(/\r?\n/)
            .filter(Boolean)
            .map((line: string, idx: number) => (
              <li key={idx} style={{ marginBottom: '8px' }}>
                <Text>{line}</Text>
              </li>
            ))}
        </ul>
      ) : (
        <Paragraph className={styles.answer}>{result.answer}</Paragraph>
      )}
    </Card>,
  );

  // 添加知识图谱卡片（如果有）
  if (apiMode === ApiMode.KNOWLEDGE_GRAPH && result.graphData) {
    elements.push(
      <Card className={styles.card} key="graph" title="知识图谱">
        <KnowledgeGraph data={result.graphData} loading={false} />
      </Card>,
    );
  }

  // 添加参考来源卡片（如果有）
  if (result.sources?.length > 0) {
    elements.push(
      <Card className={styles.card} key="sources" title="参考来源">
        <Flexbox gap={12} wrap="wrap">
          {result.sources.map(
            (source: { content: string; metadata?: Record<string, any> }, index: number) => (
              <div className={styles.source} key={index}>
                <div className={styles.sourceTitle}>来源 {index + 1}</div>
                <Text>{source.content}</Text>
                {source.metadata && Object.keys(source.metadata).length > 0 && (
                  <Text type="secondary">
                    {Object.entries(source.metadata)
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(' | ')}
                  </Text>
                )}
              </div>
            ),
          )}
        </Flexbox>
      </Card>,
    );
  }
  return elements;
};

// 主渲染组件
const Render = memo<RenderProps>(({ loading = false, query, result, errorState }) => {
  const { styles } = useStyles();
  const [renderCount, setRenderCount] = useState(0);

  // 增加渲染计数，用于调试
  useEffect(() => {
    setRenderCount((prev) => prev + 1);
  }, []);

  // 仅在开发环境显示调试信息
  const showDebugInfo = process.env.NODE_ENV === 'development';

  return (
    <Flexbox className={styles.container} gap={16}>
      {showDebugInfo && (
        <div
          style={{
            background: 'rgba(0,0,0,0.05)',
            borderRadius: '0 0 0 4px',
            color: '#888',
            fontSize: '10px',
            padding: '2px 5px',
            position: 'absolute',
            right: 0,
            top: 0,
            zIndex: 100,
          }}
        >
          渲染次数: {renderCount} | 状态:{' '}
          {loading ? '加载中' : result?.isError ? '错误' : result ? '有结果' : '无结果'}
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : errorState ? (
        // 使用errorState显示配置错误
        <Alert
          className={styles.errorAlert}
          description={
            errorState.message ||
            '插件配置不正确。请确保在插件设置中正确配置了RAGFlow服务地址和必要的ID信息。'
          }
          message="配置错误"
          showIcon
          type="warning"
        />
      ) : result ? result.isError ? (
        <ErrorState result={result} />
      ) : (
        <ResultContent query={query} result={result} />
      ) : (
        <NoResultState />
      )}
    </Flexbox>
  );
});

export default Render;
