export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window
export const notificationPermission = (): NotificationPermission | 'unsupported' => (notificationsSupported() ? Notification.permission : 'unsupported')

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}
/** Shows a browser notification only if the user has granted permission. Never throws. */
export function showBrowserNotification(title: string, body: string): void {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, icon: `${import.meta.env.BASE_URL}icons/icon-192.png`, tag: title })
  } catch {
    /* some mobile browsers only allow notifications via a service worker registration */
  }
}
