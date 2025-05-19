import { Button, Card, Divider, Select, Space, Typography } from 'antd';
import { useState } from 'react';

import RAGFlowRender from '@/components/Render';
import { RAGFlowSearchResult } from '@/type';

const { Paragraph } = Typography;

export default function TestPage() {
  const [loading, setLoading] = useState(false);
  const [scenario, setScenario] = useState<string>('normal');

  // 测试数据
  const testData: Record<string, RAGFlowSearchResult> = {
    config: {
      answer: '发生错误：配置错误',
      errorType: 'config',
      graphData: { edges: [], nodes: [] },
      isError: true,
      sources: [],
    },
    connection: {
      answer: '发生错误：无法连接到RAGFlow服务',
      errorType: 'connection',
      graphData: { edges: [], nodes: [] },
      isError: true,
      sources: [],
    },
    error: {
      answer: '发生错误：连接超时',
      errorType: 'timeout',
      graphData: { edges: [], nodes: [] },
      isError: true,
      sources: [],
    },
    graph: {
      answer: '知识图谱测试',
      graphData: {
        edges: [{ label: '关系', source: '1', target: '2' }],
        nodes: [
          { id: '1', label: '节点1' },
          { id: '2', label: '节点2' },
        ],
      },
      sources: [],
    },
    normal: {
      answer: '这是正常的测试回复。\n包含多行内容。\n这是第三行。',
      graphData: { edges: [], nodes: [] },
      sources: [
        { content: '测试来源内容1', metadata: { page: '1', source: '文档1' } },
        { content: '测试来源内容2', metadata: { page: '2', source: '文档2' } },
      ],
    },
  };

  return (
    <div style={{ margin: '0 auto', maxWidth: '1000px', padding: '20px' }}>
      <Card style={{ marginBottom: '20px' }} title="RAGFlow组件测试页面">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Paragraph>
            这个页面用于测试RAGFlow知识库插件的各种状态显示。请使用下面的控件切换不同的状态来验证UI渲染是否正确。
          </Paragraph>

          <Divider orientation="left">控制面板</Divider>

          <div>
            <Space>
              <Button
                danger={loading}
                onClick={() => setLoading(!loading)}
                type={loading ? 'primary' : 'default'}
              >
                {loading ? '取消加载状态' : '显示加载状态'}
              </Button>

              <Select
                onChange={(value) => setScenario(value)}
                options={[
                  { label: '正常结果', value: 'normal' },
                  { label: '超时错误', value: 'error' },
                  { label: '连接错误', value: 'connection' },
                  { label: '配置错误', value: 'config' },
                  { label: '知识图谱', value: 'graph' },
                  { label: '无结果', value: 'none' },
                ]}
                style={{ width: 200 }}
                value={scenario}
              />
            </Space>
          </div>

          <div style={{ marginTop: '10px' }}>
            <Paragraph>
              <strong>当前状态:</strong> 加载={loading ? '是' : '否'}, 场景={scenario}
            </Paragraph>
          </div>
        </Space>
      </Card>
      <Card
        bordered={true}
        title={
          <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
            <span>组件渲染结果</span>
            <div style={{ fontSize: '14px' }}>
              状态:{' '}
              <span
                style={{
                  color: loading ? 'orange' : 'green',
                  fontWeight: 'bold',
                }}
              >
                {loading ? '加载中' : '已加载'}
              </span>
            </div>
          </div>
        }
      >
        <div
          style={{
            backgroundColor: '#f9f9f9',
            border: '1px dashed #ccc',
            minHeight: '300px',
            padding: '10px',
          }}
        >
          <RAGFlowRender
            loading={loading}
            query="测试查询"
            result={scenario === 'none' ? undefined : testData[scenario]}
          />
        </div>
      </Card>

      <Card bordered={true} style={{ marginTop: '20px' }} title="组件调试信息">
        <pre
          style={{
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            overflow: 'auto',
            padding: '10px',
          }}
        >
          {' '}
          {JSON.stringify(
            {
              hasResult: scenario !== 'none',
              loading,
              resultData:
                scenario === 'none'
                  ? 'undefined'
                  : JSON.stringify(testData[scenario]).slice(0, 100) + '...',
              scenario,
            },
            undefined,
            2,
          )}
        </pre>
      </Card>
    </div>
  );
}
