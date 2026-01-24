// 模型配置事件系统
// 用于在模型配置变更时通知相关组件自动刷新

type EventListener = () => void;

class ModelConfigEventBus {
  private listeners: EventListener[] = [];

  // 订阅事件
  subscribe(listener: EventListener): () => void {
    this.listeners.push(listener);
    // 返回取消订阅函数
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // 发布事件（通知所有监听器）
  publish(): void {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Error in model config event listener:', error);
      }
    });
  }

  // 清空所有监听器
  clear(): void {
    this.listeners = [];
  }
}

// 导出单例
export const modelConfigEventBus = new ModelConfigEventBus();

// 便捷函数：触发模型配置变更事件
export function triggerModelConfigChanged() {
  modelConfigEventBus.publish();
}
