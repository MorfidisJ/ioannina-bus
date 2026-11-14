import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { ArrivalAlarm } from '../types';

const ALARMS_STORAGE_KEY = 'ioannina_bus_alarms_v1';

/**
 * Check if notifications are supported and permitted
 */
export async function checkNotificationPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await LocalNotifications.checkPermissions();
      return status.display === 'granted';
    } catch {
      return false;
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    return Notification.permission === 'granted';
  }

  return false;
}

/**
 * Request notification permissions from user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await LocalNotifications.requestPermissions();
      return res.display === 'granted';
    } catch (e) {
      console.warn('Capacitor LocalNotifications permission request failed:', e);
      return false;
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const res = await Notification.requestPermission();
      return res === 'granted';
    } catch (e) {
      console.warn('Browser Notification permission request failed:', e);
      return false;
    }
  }

  return false;
}

/**
 * Play a transit chime melody using Web Audio API (zero audio file dependencies)
 */
export function playAlarmChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Pleasant transit chime notes: E5 (659Hz) -> G#5 (830Hz) -> B5 (987Hz)
    const notes = [
      { freq: 659.25, start: 0, duration: 0.2 },
      { freq: 830.61, start: 0.18, duration: 0.2 },
      { freq: 987.77, start: 0.36, duration: 0.45 }
    ];

    notes.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    });
  } catch (e) {
    console.warn('Could not play audio chime:', e);
  }

  // Device vibration pattern if available
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate([250, 150, 250, 150, 400]);
    } catch {}
  }
}

/**
 * Dispatch an arrival push notification
 */
export async function sendArrivalNotification(
  alarm: ArrivalAlarm,
  minutesLeft: number,
  lang: 'el' | 'en' = 'el'
) {
  // Always trigger sound and vibration
  playAlarmChime();

  const title = lang === 'el'
    ? `🚌 Το λεωφορείο πλησιάζει! (Γραμμή ${alarm.lineCode})`
    : `🚌 Bus is arriving! (Line ${alarm.lineCode})`;

  const body = lang === 'el'
    ? minutesLeft <= 1
      ? `Η γραμμή ${alarm.lineCode} (${alarm.lineName}) φτάνει τώρα στη στάση "${alarm.stopName}"!`
      : `Η γραμμή ${alarm.lineCode} (${alarm.lineName}) φτάνει στη στάση "${alarm.stopName}" σε ${minutesLeft} λεπτά.`
    : minutesLeft <= 1
      ? `Line ${alarm.lineCode} is arriving now at "${alarm.stopName}"!`
      : `Line ${alarm.lineCode} arrives at "${alarm.stopName}" in ${minutesLeft} minutes.`;

  // Native Android notification
  if (Capacitor.isNativePlatform()) {
    try {
      const notifId = Math.floor(Math.random() * 100000);
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: notifId,
            schedule: { at: new Date(Date.now() + 100) },
            sound: undefined,
            actionTypeId: '',
            extra: {
              stopCode: alarm.stopCode,
              lineCode: alarm.lineCode
            }
          }
        ]
      });
      return;
    } catch (e) {
      console.warn('LocalNotifications.schedule failed:', e);
    }
  }

  // Web Browser Notification fallback
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: `bus-alarm-${alarm.id}`
      });
    } catch (e) {
      console.warn('Web notification display failed:', e);
    }
  }
}

/**
 * Alarm Persistence Utilities
 */
export function loadSavedAlarms(): ArrivalAlarm[] {
  try {
    const raw = localStorage.getItem(ALARMS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAlarms(alarms: ArrivalAlarm[]) {
  try {
    localStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(alarms));
  } catch {}
}

