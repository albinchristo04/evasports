// utils/pushService.ts

// Helper function to convert VAPID public key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function getVapidPublicKey(): Promise<string> {
  try {
    const response = await fetch('/api/vapid-public-key');
    if (!response.ok) {
      throw new Error('Failed to fetch VAPID public key from server.');
    }
    const data = await response.json();
    if (!data.publicKey) {
      throw new Error('VAPID public key not found in server response.');
    }
    return data.publicKey;
  } catch (error) {
    console.error('Error fetching VAPID public key:', error);
    throw error; // Re-throw to be caught by the caller
  }
}


export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported by this browser.');
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered with scope:', registration.scope);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

export async function askNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Notifications are not supported by this browser.');
    return 'denied';
  }
  const permission = await Notification.requestPermission();
  return permission;
}

export async function subscribeUserToPush(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push messaging is not supported by this browser.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready; // Ensures SW is active
    if (!registration.pushManager) {
        console.warn('PushManager is not available on service worker registration.');
        return null;
    }

    // Check if already subscribed
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('User is already subscribed.');
      return existingSubscription;
    }
    
    const vapidPublicKey = await getVapidPublicKey();
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey,
    });
    console.log('User is subscribed:', subscription);
    return subscription;

  } catch (error) {
    console.error('Failed to subscribe the user to push notifications:', error);
    if (Notification.permission === 'denied') {
        console.warn('Permission for notifications was denied.');
    }
    return null;
  }
}

export async function sendSubscriptionToBackend(subscription: PushSubscription, matchId: string): Promise<Response | null> {
  if (!subscription) return null;
  try {
    const response = await fetch('/api/push-subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscription: subscription.toJSON(), matchId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to send subscription to backend and parse error.' }));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }
    console.log('Subscription sent to backend successfully.');
    return response;
  } catch (error) {
    console.error('Error sending subscription to backend:', error);
    throw error; // Re-throw to be handled by the caller
  }
}

// Placeholder for unsubscription logic (to be implemented in a later phase)
export async function unsubscribeUserFromPush(matchId: string): Promise<boolean> {
  console.warn('unsubscribeUserFromPush for matchId not fully implemented yet.');
  // 1. Get current subscription: const subscription = await registration.pushManager.getSubscription();
  // 2. If subscription exists:
  //    a. Call subscription.unsubscribe()
  //    b. Send request to backend to remove this specific subscription for the matchId
  // 3. Return success/failure
  return false;
}
