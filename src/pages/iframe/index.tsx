import { lobeChat } from '@lobehub/chat-plugin-sdk/client';
import { memo, useEffect, useState } from 'react';

import RAGFlowRender from '@/components/RAGFlowRender';
import { RAGFlowConfig, ResponseData } from '@/type';

const Render = memo(() => {
  const [data, setData] = useState<ResponseData>();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<RAGFlowConfig>();
  const [query, setQuery] = useState('');

  const handleSearch = async (searchQuery: string) => {
    if (!config?.apiUrl) {
      // 如果没有配置API URL，提示用户
      console.error('请先在插件设置中配置RAGFlow API地址');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/ragflow', {
        body: JSON.stringify({
          config,
          query: searchQuery,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`);
      }

      const result = await response.json();
      setData(result);

      // 将结果同步回主应用
      lobeChat.setPluginMessage(result);
    } catch (error) {
      console.error('搜索出错:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初始化时从主应用同步状态
  useEffect(() => {
    lobeChat.getPluginMessage().then((data) => {
      if (data) setData(data);
    });

    // 获取插件配置
    lobeChat.getPluginSettings().then((settings) => {
      if (settings?.apiUrl) {
        setConfig({
          apiKey: settings.apiKey,
          apiUrl: settings.apiUrl,
        });
      }
    });

    // 获取查询参数
    lobeChat.getPluginPayload().then((payload) => {
      if (payload?.name === 'queryRAGFlow' && payload.arguments?.query) {
        setQuery(payload.arguments.query);
        // 如果有初始查询，立即执行
        if (payload.arguments.query) {
          handleSearch(payload.arguments.query);
        }
      }
    });
  }, []);

  return <RAGFlowRender loading={loading} query={query || data?.query} result={data?.result} />;
});

export default Render;
