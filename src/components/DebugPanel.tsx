import React, { useEffect, useState } from 'react';

import { ErrorState, ResponseData } from '@/type';

// 调试面板属性
interface DebugPanelProps {
  data: ResponseData;
  errorState?: ErrorState;
  loading: boolean;
}

/**
 * 调试面板组件，仅在开发环境中显示
 * 提供实时状态监控和手动控制功能
 */
const DebugPanel: React.FC<DebugPanelProps> = ({ loading, data, errorState }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [renders, setRenders] = useState(0);
  const [startTime] = useState(Date.now());
  const [currentTime, setCurrentTime] = useState(Date.now());

  // 统计渲染次数
  useEffect(() => {
    setRenders((prev) => prev + 1);
  }, []);

  // 更新计时器
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);
  // 仅在开发环境显示
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  const uptime = Math.floor((currentTime - startTime) / 1000);

  // 获取错误状态显示
  const getErrorDisplay = () => {
    if (errorState) {
      return `✗ ${errorState.type}: ${errorState.message}`;
    }
    if (data?.result && 'isError' in data.result && data.result.isError) {
      return `✗ ${data.result.errorType || '未知错误'}`;
    }
    return '✓ 无错误';
  };

  // 简洁模式
  if (!isExpanded) {
    return (
      <div
        onClick={() => setIsExpanded(true)}
        style={{
          background: loading ? '#ff7875' : '#52c41a',
          borderRadius: '4px',
          bottom: '10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          color: 'white',
          cursor: 'pointer',
          fontSize: '12px',
          padding: '4px 8px',
          position: 'fixed',
          right: '10px',
          zIndex: 1000,
        }}
      >
        {loading ? '⚠️ 加载中' : '✅ 已加载'} ({renders})
      </div>
    );
  }

  // 详细模式
  return (
    <div
      style={{
        background: 'rgba(0,0,0,0.8)',
        borderRadius: '4px',
        bottom: '10px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        color: 'white',
        fontSize: '12px',
        maxHeight: '400px',
        maxWidth: '300px',
        overflowY: 'auto',
        padding: '10px',
        position: 'fixed',
        right: '10px',
        zIndex: 1000,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <strong>RAGFlow调试面板</strong>
        <span onClick={() => setIsExpanded(false)} style={{ color: '#ff7875', cursor: 'pointer' }}>
          收起
        </span>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <div>
          状态:{' '}
          <span style={{ color: loading ? '#ff7875' : '#52c41a' }}>
            {loading ? '⚠️ 加载中' : '✅ 已加载'}
          </span>
        </div>
        <div>渲染次数: {renders}</div>
        <div>运行时间: {uptime}秒</div>
        <div>错误状态: {getErrorDisplay()}</div>
      </div>

      <div style={{ borderTop: '1px solid #555', marginTop: '8px', paddingTop: '8px' }}>
        <div>查询: {data?.query || '未设置'}</div>
        <div>回答长度: {data?.result?.answer ? data.result.answer.length : 0}字符</div>
        <div>来源数量: {data?.result?.sources?.length || 0}</div>
        <div>图谱节点: {data?.result?.graphData?.nodes?.length || 0}</div>
      </div>

      <div style={{ borderTop: '1px solid #555', marginTop: '8px', paddingTop: '8px' }}>
        {' '}
        <button
          onClick={(e) => {
            e.stopPropagation();
            console.log('调试数据:', data);
          }}
          style={{
            background: '#1890ff',
            border: 'none',
            borderRadius: '2px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '12px',
            marginRight: '4px',
            padding: '3px 8px',
          }}
          type="button"
        >
          打印数据
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.location.reload();
          }}
          style={{
            background: '#722ed1',
            border: 'none',
            borderRadius: '2px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '12px',
            padding: '3px 8px',
          }}
          type="button"
        >
          重新加载
        </button>
      </div>

      <div style={{ color: '#aaa', fontSize: '10px', marginTop: '8px' }}>
        最后更新: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default DebugPanel;
