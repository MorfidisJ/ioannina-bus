import { registerPlugin, Capacitor } from '@capacitor/core';

export interface WidgetBridgePluginType {
  setWidgetStop(options: { stopCode: string; stopName: string }): Promise<{ success: boolean; stopCode: string; stopName: string }>;
  getWidgetStop(): Promise<{ stopCode: string; stopName: string }>;
}

export const WidgetBridge = registerPlugin<WidgetBridgePluginType>('WidgetBridge', {
  web: {
    async setWidgetStop(options: { stopCode: string; stopName: string }) {
      localStorage.setItem('ioannina_bus_widget_stop_code', options.stopCode);
      localStorage.setItem('ioannina_bus_widget_stop_name', options.stopName);
      return { success: true, ...options };
    },
    async getWidgetStop() {
      const stopCode = localStorage.getItem('ioannina_bus_widget_stop_code') || '930';
      const stopName = localStorage.getItem('ioannina_bus_widget_stop_name') || 'Φιλοσοφική (#930)';
      return { stopCode, stopName };
    }
  }
});

/**
 * Sync selected stop to Android Home Screen Widget
 */
export async function syncActiveStopToWidget(stopCode: string, stopName: string): Promise<boolean> {
  try {
    await WidgetBridge.setWidgetStop({ stopCode, stopName });
    return true;
  } catch (err) {
    console.warn('Failed to sync stop to home screen widget:', err);
    return false;
  }
}
