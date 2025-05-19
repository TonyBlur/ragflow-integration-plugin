// 合并错误处理工具
import { lobeChat } from '@lobehub/chat-plugin-sdk/client';
import React from 'react';

import { ResponseData } from '@/type';

/**
 * 强制重置插件状态
 * 当检测到异常情况时调用此函数，强制结束加载状态并显示错误信息
 */
export const forceReset = (
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setData: React.Dispatch<React.SetStateAction<ResponseData>>,
  reason = '未知原因',
) => {
  console.log(`[强制重置] 触发强制重置，原因: ${reason}`);

  // 1. 强制结束加载状态
  try {
    setLoading(false);
    console.log('[强制重置] 已设置loading=false');
  } catch (error) {
    console.error('[强制重置] 设置loading状态失败:', error);
  }

  // 2. 设置特定的错误数据
  const resetData: ResponseData = {
    query: '强制重置',
    result: {
      answer: `RAGFlow插件已从异常状态恢复。原因: ${reason}。如果问题持续存在，请刷新页面或重新开始对话。`,
      errorType: 'recoverable',
      graphData: { edges: [], nodes: [] },
      isError: true,
      sources: [],
    },
  };

  try {
    setData(resetData);
    console.log('[强制重置] 已设置重置数据');
  } catch (error) {
    console.error('[强制重置] 设置数据状态失败:', error);
  }

  // 3. 尝试通知LobeChat
  try {
    lobeChat.setPluginMessage(resetData);
    console.log('[强制重置] 已通知LobeChat');
  } catch (error) {
    console.error('[强制重置] 通知LobeChat失败:', error);
  }

  return resetData;
};

// 定义错误处理器状态类型
interface ErrorHandlerState {
  setData: React.Dispatch<React.SetStateAction<ResponseData>>;
  setErrorState?: React.Dispatch<
    React.SetStateAction<{ message: string, type: string; } | undefined>
  >;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

// 错误处理器单例
class ErrorHandler {
  private static instance: ErrorHandler;
  private state: ErrorHandlerState | undefined;
  private isInstalled = false;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  setup(state: ErrorHandlerState): void {
    this.state = state;

    if (this.isInstalled) {
      console.log('[全局错误处理] 已经安装，更新状态设置器');
    } else {
      console.log('[全局错误处理] 安装全局错误处理器');
      this.setupUnhandledErrorListener();
      this.isInstalled = true;
    }
  }

  private setupUnhandledErrorListener(): void {
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  private handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    console.error('[全局错误处理] 未处理的Promise异常:', event.reason);
    event.preventDefault();

    if (this.state) {
      forceReset(
        this.state.setLoading,
        this.state.setData,
        `未处理的Promise错误: ${event.reason?.message || '未知异常'}`,
      );
    }
  };

  cleanup(): void {
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
    this.isInstalled = false;
    this.state = undefined;
  }
}

// 导出新的错误处理器设置函数
export const setupGlobalErrorHandler = (
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setData: React.Dispatch<React.SetStateAction<ResponseData>>,
  setErrorState?: React.Dispatch<
    React.SetStateAction<{ message: string, type: string; } | undefined>
  >,
): void => {
  ErrorHandler.getInstance().setup({ setData, setErrorState, setLoading });
};

// 导出清理函数
export const cleanupErrorHandler = (): void => {
  ErrorHandler.getInstance().cleanup();
};
