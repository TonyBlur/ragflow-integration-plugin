import { Alert, Button, Card, Divider, Input, Select, Space, Typography } from 'antd';
import { useState } from 'react';
import { Flexbox } from 'react-layout-kit';

import RAGFlowRender from '@/components/Render';
import { APIResponse, RAGFlowSearchResult } from '@/type';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

/**
 * 此页面用于模拟LobeChat环境，测试插件渲染与API通信
 */
export default function IntegrationTest() {
  const [query, setQuery] = useState('');
  const [apiUrl, setApiUrl] = useState('http://localhost:5000');
  const [chatId, setChatId] = useState('');
  const [agentId, setAgentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [mode, setMode] = useState<'summary' | 'knowledgeGraph'>('summary');
  const [result, setResult] = useState<RAGFlowSearchResult | undefined>();
  const [testState, setTestState] = useState<'initial' | 'loading' | 'error' | 'success'>(
    'initial',
  );
  const [apiResponse, setApiResponse] = useState<APIResponse>();

  // 测试RAGFlow API直接调用
  const testDirectAPI = async () => {
    setTestState('loading');
    setLoading(true);
    setError(undefined);
    setApiResponse(undefined);

    try {
      const response = await fetch('/api/gateway', {
        body: JSON.stringify({
          apiName: mode === 'knowledgeGraph' ? 'queryRAGFlowGraph' : 'searchRAGFlow',
          arguments: { query },
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-lobe-plugin-settings': JSON.stringify({
            RAGFLOW_AGENT_ID: agentId,
            RAGFLOW_API_URL: apiUrl,
            RAGFLOW_CHAT_ID: chatId,
          }),
        },
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`);
      }

      const data = await response.json();
      setApiResponse(data);

      // 处理API响应
      if ('result' in data && typeof data.result === 'object') {
        // 如果响应包含完整的result对象
        setResult(data.result);
      } else {
        // 处理summary或其他格式的响应
        setResult({
          answer: data.response || '无响应内容',
          errorType: data.errorType,
          graphData: { edges: [], nodes: [] },
          isError: !!data.error,
          sources: data.sources || [],
        });
      }

      setTestState('success');
    } catch (error_) {
      console.error('API测试失败:', error_);
      setTestState('error');
      setError(error_ instanceof Error ? error_.message : '未知错误');

      // 设置错误结果
      setResult({
        answer: `测试出错: ${error_ instanceof Error ? error_.message : '未知错误'}`,
        errorType: 'unknown',
        graphData: { edges: [], nodes: [] },
        isError: true,
        sources: [],
      });
    } finally {
      setLoading(false);
    }
  };

  // 测试模拟插件载荷格式
  const testPluginPayload = async () => {
    setTestState('loading');
    setLoading(true);
    setError(undefined);
    setApiResponse(undefined);

    try {
      // 模拟LobeChat插件载荷
      const payload = {
        apiName: mode === 'knowledgeGraph' ? 'queryRAGFlowGraph' : 'searchRAGFlow',
        arguments: JSON.stringify({ query }),
        identifier: 'ragflow-integration-plugin',
      };

      // 模拟插件设置
      const settings = {
        RAGFLOW_AGENT_ID: agentId,
        RAGFLOW_API_URL: apiUrl,
        RAGFLOW_CHAT_ID: chatId,
      };

      console.log('模拟插件载荷:', payload);
      console.log('模拟插件设置:', settings);

      // 发送到gateway API
      const response = await fetch('/api/gateway', {
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
          'x-lobe-plugin-settings': JSON.stringify(settings),
        },
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`);
      }

      const data = await response.json();
      setApiResponse(data);

      // 处理API响应
      if ('result' in data && typeof data.result === 'object') {
        setResult(data.result);
      } else {
        setResult({
          answer: data.response || '无响应内容',
          errorType: data.errorType,
          graphData: { edges: [], nodes: [] },
          isError: !!data.error,
          sources: data.sources || [],
        });
      }

      setTestState('success');
    } catch (error_) {
      console.error('模拟插件载荷测试失败:', error_);
      setTestState('error');
      setError(error_ instanceof Error ? error_.message : '未知错误');

      // 设置错误结果
      setResult({
        answer: `测试出错: ${error_ instanceof Error ? error_.message : '未知错误'}`,
        errorType: 'unknown',
        graphData: { edges: [], nodes: [] },
        isError: true,
        sources: [],
      });
    } finally {
      setLoading(false);
    }
  };

  // 模拟不同状态测试
  const simulateState = (state: 'loading' | 'empty' | 'error' | 'normal' | 'graph') => {
    switch (state) {
    case 'loading': {
      setLoading(true);
      setResult(undefined);
    
    break;
    }
    case 'empty': {
      setLoading(false);
      setResult(undefined);
    
    break;
    }
    case 'error': {
      setLoading(false);
      setResult({
        answer: '测试错误状态',
        errorType: 'config',
        graphData: { edges: [], nodes: [] },
        isError: true,
        sources: [],
      });
    
    break;
    }
    case 'normal': {
      setLoading(false);
      setResult({
        answer: '这是一个测试结果。\n包含多个段落的内容。\n第三行文本。',
        graphData: { edges: [], nodes: [] },
        sources: [
          { content: '测试来源1', metadata: { type: 'test' } },
          { content: '测试来源2', metadata: { page: '5', type: 'test' } },
        ],
      });
    
    break;
    }
    case 'graph': {
      setLoading(false);
      setResult({
        answer: '这是带知识图谱的测试结果',
        graphData: {
          edges: [
            { label: '关系1', source: '1', target: '2' },
            { label: '关系2', source: '2', target: '3' },
          ],
          nodes: [
            { id: '1', label: '节点1' },
            { id: '2', label: '节点2' },
            { id: '3', label: '节点3' },
          ],
        },
        sources: [{ content: '图谱测试来源', metadata: { type: 'test' } }],
      });
    
    break;
    }
    // No default
    }
  };

  return (
    <div style={{ margin: '0 auto', maxWidth: '1200px', padding: '20px' }}>
      <Title level={2}>RAGFlow 插件集成测试</Title>
      <Paragraph>此页面用于测试 RAGFlow 插件的集成情况，可以模拟不同的状态和API响应。</Paragraph>

      <Divider orientation="left">配置</Divider>
      <Flexbox gap={16}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text strong>RAGFlow API 配置</Text>
          <Input
            addonBefore="API URL"
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="http://localhost:5000"
            value={apiUrl}
          />
          <Space>
            <Input
              addonBefore="聊天ID"
              onChange={(e) => setChatId(e.target.value)}
              placeholder="可选，优先使用Agent ID"
              style={{ width: '300px' }}
              value={chatId}
            />
            <Input
              addonBefore="代理ID"
              onChange={(e) => setAgentId(e.target.value)}
              placeholder="可选"
              style={{ width: '300px' }}
              value={agentId}
            />
            <Select onChange={setMode} style={{ width: '180px' }} value={mode}>
              <Option value="summary">摘要模式</Option>
              <Option value="knowledgeGraph">知识图谱模式</Option>
            </Select>
          </Space>
          <Input
            addonBefore="查询"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="输入查询内容"
            value={query}
          />
        </Space>
      </Flexbox>

      <Divider orientation="left">测试操作</Divider>
      <Space wrap>
        <Button loading={loading} onClick={testDirectAPI} type="primary">
          测试API调用
        </Button>
        <Button loading={loading} onClick={testPluginPayload}>
          模拟插件载荷
        </Button>
        <Divider type="vertical" />
        <Button onClick={() => simulateState('loading')}>模拟加载中</Button>
        <Button onClick={() => simulateState('empty')}>模拟空结果</Button>
        <Button onClick={() => simulateState('error')}>模拟错误</Button>
        <Button onClick={() => simulateState('normal')}>模拟正常结果</Button>
        <Button onClick={() => simulateState('graph')}>模拟知识图谱</Button>
      </Space>

      {error && (
        <Alert
          description={error}
          message="测试出错"
          showIcon
          style={{ marginTop: '20px' }}
          type="error"
        />
      )}

      <Divider orientation="left">渲染测试</Divider>
      <Card title="RAGFlow 组件渲染">
        <div style={{ border: '1px dashed #ddd', borderRadius: '4px', padding: '20px' }}>
          <RAGFlowRender
            loading={loading}
            query={query || '测试查询'}
            result={result || undefined}
          />
        </div>
      </Card>

      <Divider orientation="left">API 响应</Divider>
      <Card style={{ marginTop: '20px' }} title="原始API响应数据">
        <pre
          style={{
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            maxHeight: '300px',
            overflowX: 'auto',
            overflowY: 'auto',
            padding: '10px',
          }}
        >
          {apiResponse ? JSON.stringify(apiResponse, undefined, 2) : '暂无数据'}
        </pre>
      </Card>

      <Divider orientation="left">测试状态</Divider>
      <Card style={{ marginTop: '20px' }} title="当前测试状态">
        <div>
          <p>
            <strong>查询:</strong> {query || '(无)'}
          </p>
          <p>
            <strong>模式:</strong> {mode === 'summary' ? '摘要模式' : '知识图谱模式'}
          </p>
          <p>
            <strong>状态:</strong>{' '}
            {testState === 'initial'
              ? '未测试'
              : testState === 'loading'
                ? '加载中'
                : testState === 'error'
                  ? '出错'
                  : '成功'}
          </p>
          <p>
            <strong>API URL:</strong> {apiUrl}
          </p>
          <p>
            <strong>聊天ID:</strong> {chatId || '(无)'}
          </p>
          <p>
            <strong>代理ID:</strong> {agentId || '(无)'}
          </p>
        </div>
      </Card>
    </div>
  );
}
