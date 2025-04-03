import { Spin } from 'antd';
import { createStyles } from 'antd-style';
import * as d3 from 'd3';
import { useEffect, useRef, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

import { KnowledgeGraphData, KnowledgeGraphNode } from '@/type';

// 扩展 KnowledgeGraphNode 类型以包含 d3 将添加的属性
interface ExtendedNode extends KnowledgeGraphNode {
  fx?: number | undefined;
  fy?: number | undefined;
  index?: number;
  vx?: number;
  vy?: number;
  x?: number;
  y?: number;
}

const useStyles = createStyles(({ css, token }) => ({
  container: css`
    position: relative;

    overflow: hidden;

    width: 100%;
    height: 500px;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadius}px;
  `,
  noData: css`
    display: flex;
    align-items: center;
    justify-content: center;

    height: 100%;

    color: ${token.colorTextDisabled};
  `,
  tooltip: css`
    pointer-events: none;

    position: absolute;

    padding: 8px;
    border-radius: ${token.borderRadiusSM}px;

    opacity: 0;
    background: ${token.colorBgElevated};
    box-shadow: ${token.boxShadow};

    transition: opacity 0.2s;
  `,
}));

interface KnowledgeGraphProps {
  data?: KnowledgeGraphData;
  loading?: boolean;
}

// 拖拽中函数移到外部作用域
const dragged = (event: any) => {
  event.subject.fx = event.x;
  event.subject.fy = event.y;
};

// 拖拽函数定义（提前定义，解决使用前定义的问题）
const createDragHandlers = (simulation: d3.Simulation<d3.SimulationNodeDatum, undefined>) => {
  // 拖拽开始
  const dragstarted = (event: any) => {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  };

  // 拖拽结束
  const dragended = (event: any) => {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = undefined;
    event.subject.fy = undefined;
  };

  return { dragended, dragged, dragstarted };
};

// 根据节点类型获取颜色（提前定义，解决使用前定义的问题）
const getNodeColor = (type?: string): string => {
  const colorMap: Record<string, string> = {
    concept: '#ff7f0e',
    default: '#7f7f7f',
    document: '#2ca02c',
    entity: '#1f77b4',
    event: '#e377c2',
    location: '#8c564b',
    organization: '#9467bd',
    person: '#d62728',
  };

  return type && colorMap[type] ? colorMap[type] : colorMap.default;
};

const KnowledgeGraph = ({ data, loading = false }: KnowledgeGraphProps) => {
  const { styles } = useStyles();
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [hasRendered, setHasRendered] = useState(false);

  useEffect(() => {
    if (!data || data.nodes.length === 0 || !svgRef.current) return;

    // 清除之前渲染的图形
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // 创建力导向图 - 使用类型断言来满足 d3 的类型要求
    const simulation = d3
      .forceSimulation(data.nodes as unknown as d3.SimulationNodeDatum[])
      .force(
        'link',
        d3
          .forceLink(data.edges)
          .id((d: any) => d.id)
          .distance(100),
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // 获取拖拽处理函数
    const { dragstarted, dragged, dragended } = createDragHandlers(simulation);

    // 添加边
    const link = svg
      .append('g')
      .selectAll('line')
      .data(data.edges)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1);

    // 创建箭头标记
    svg
      .append('defs')
      .selectAll('marker')
      .data(['end'])
      .enter()
      .append('marker')
      .attr('id', (d) => d)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#999');

    // 添加节点组
    const node = svg
      .append('g')
      .selectAll('g')
      .data(data.nodes)
      .enter()
      .append('g')
      .call(
        d3
          .drag<SVGGElement, any>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended),
      );

    // 添加节点圆形
    node
      .append('circle')
      .attr('r', (d) => d.size || 8)
      .attr('fill', (d) => getNodeColor(d.type))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5);

    // 添加节点文本
    node
      .append('text')
      .text((d) => d.label)
      .attr('x', 12)
      .attr('y', 3)
      .style('font-size', '10px');

    // 设置提示框
    node
      .on('mouseover', function (event, d) {
        const tooltip = d3.select(tooltipRef.current);
        tooltip.transition().duration(200).style('opacity', 0.9);
        tooltip
          .html(`<strong>${d.label}</strong>${d.type ? `<br>类型: ${d.type}` : ''}`)
          .style('left', event.pageX + 10 + 'px')
          .style('top', event.pageY - 28 + 'px');
      })
      .on('mouseout', function () {
        d3.select(tooltipRef.current).transition().duration(500).style('opacity', 0);
      });

    // 更新模拟
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as any).x)
        .attr('y1', (d) => (d.source as any).y)
        .attr('x2', (d) => (d.target as any).x)
        .attr('y2', (d) => (d.target as any).y);

      // 使用类型断言处理节点定位
      node.attr('transform', (d) => {
        const nodeWithPos = d as ExtendedNode;
        return `translate(${nodeWithPos.x || 0},${nodeWithPos.y || 0})`;
      });
    });

    // 添加缩放功能
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 5])
      .on('zoom', (event) => {
        svg.selectAll('g').attr('transform', event.transform);
      });

    svg.call(zoom);

    setHasRendered(true);

    return () => {
      simulation.stop();
    };
  }, [data]);

  if (loading) {
    return (
      <Flexbox align="center" className={styles.container} justify="center">
        <Spin size="large" tip="知识图谱加载中..." />
      </Flexbox>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.noData}>
          {hasRendered ? '暂无相关知识图谱数据' : '请输入查询获取知识图谱'}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <svg height="100%" ref={svgRef} width="100%" />
      <div className={styles.tooltip} ref={tooltipRef} />
    </div>
  );
};

export default KnowledgeGraph;
