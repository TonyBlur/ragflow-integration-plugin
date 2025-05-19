import { render, screen } from '@testing-library/react';

import { ResponseData } from '@/type';

import Render from './Render';

describe('Render', () => {
  it('显示加载状态', () => {
    render(<Render loading={true} />);
    expect(screen.getByRole('alert')).toHaveTextContent('加载中');
  });

  it('显示错误状态', () => {
    const errorState = {
      message: '连接失败',
      type: 'connection',
    };
    render(<Render errorState={errorState} loading={false} />);
    expect(screen.getByRole('alert')).toHaveTextContent('连接失败');
  });

  it('正确渲染查询结果', () => {
    const testData: ResponseData = {
      query: '测试查询',
      result: {
        answer: '测试回答',
        graphData: {
          edges: [],
          nodes: [],
        },
        sources: [
          {
            content: '来源1',
            metadata: { type: 'document' },
          },
        ],
      },
    };

    render(<Render loading={false} query={testData.query} result={testData.result} />);

    expect(screen.getByText('测试回答')).toBeInTheDocument();
    expect(screen.getByText('来源1')).toBeInTheDocument();
  });

  it('处理未定义的结果', () => {
    render(<Render loading={false} />);
    expect(screen.getByText('等待查询...')).toBeInTheDocument();
  });
});
