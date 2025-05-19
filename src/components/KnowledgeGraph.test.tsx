import { render, screen } from '@testing-library/react';

import KnowledgeGraph from './KnowledgeGraph';

describe('KnowledgeGraph', () => {
  it('显示加载状态', () => {
    render(<KnowledgeGraph loading={true} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('当没有数据时显示空状态', () => {
    render(<KnowledgeGraph />);
    expect(screen.getByText('暂无图谱数据')).toBeInTheDocument();
  });

  it('渲染知识图谱数据', () => {
    const testData = {
      edges: [{ label: 'relates to', source: '1', target: '2' }],
      nodes: [
        { id: '1', label: 'Node 1', type: 'concept' },
        { id: '2', label: 'Node 2', type: 'entity' },
      ],
    };

    render(<KnowledgeGraph data={testData} />);
    // SVG应该被渲染出来
    expect(screen.getByRole('graphics-document')).toBeInTheDocument();
    // 节点标签应该可见
    expect(screen.getByText('Node 1')).toBeInTheDocument();
    expect(screen.getByText('Node 2')).toBeInTheDocument();
  });
});
