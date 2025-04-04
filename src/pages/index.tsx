import { lobeChat } from '@lobehub/chat-plugin-sdk/client';
import { memo, useEffect, useState } from 'react';

import RAGFlowRender from '@/components/Render';
import { RAGFlowConfig, ResponseData } from '@/type';

const Render = memo(() => {
  const [data, setData] = useState<ResponseData>();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<RAGFlowConfig>();

  // 将 handleSearch 函数定义提前，解决 no-use-before-define 错误
  const handleSearch = async (query: string) => {
    if (!config?.ragflowApiUrl) {
      // 如果没有配置API URL，提示用户
      console.error('请先在插件设置中配置RAGFlow API地址');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/ragflow', {
        body: JSON.stringify({
          config,
          query,
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

      // 将结果同步回LobeChat
      lobeChat.setPluginMessage(result);
    } catch (error) {
      console.error('搜索出错:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 获取插件消息
    lobeChat.getPluginMessage().then((e: ResponseData) => {
      if (e) setData(e);
    });

    // 获取插件配置
    lobeChat.getPluginSettings().then((settings) => {
      if (settings?.RAGFLOW_API_URL) {
        setConfig({
          ragflowApiKey: settings.RAGFLOW_API_KEY,
          ragflowApiUrl: settings.RAGFLOW_API_URL,
        });
      }
    });

    // 获取查询参数
    lobeChat.getPluginPayload().then((payload) => {
      if (
        payload?.name === 'queryRAGFlow' &&
        payload.arguments?.query && // 如果有初始查询，立即执行
        payload.arguments.query
      ) {
        handleSearch(payload.arguments.query);
      }
    });
  }, []);

  return <RAGFlowRender loading={loading} query={data?.query} result={data?.result} />;
});

export default Render;
