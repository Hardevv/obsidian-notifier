const statusEl = document.getElementById('status');
const vapidKeyInput = document.getElementById('vapidKey');
const subscribeBtn = document.getElementById('subscribeBtn');
const outputEl = document.getElementById('subscriptionOutput');

let swRegistration = null;

const setStatus = (text) => {
  statusEl.textContent = `Status: ${text}`;
};

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
};

const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported in this browser.');
  }

  swRegistration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
};

const getExistingSubscription = async () => {
  if (!swRegistration) return null;
  return swRegistration.pushManager.getSubscription();
};

const renderSubscription = (subscription) => {
  outputEl.value = JSON.stringify(subscription, null, 2);
};

const requestPermission = async () => {
  const result = await Notification.requestPermission();
  if (result !== 'granted') {
    throw new Error('Notification permission was not granted.');
  }
};

const subscribeToPush = async () => {
  const vapidPublicKey = vapidKeyInput.value.trim();
  if (!vapidPublicKey) {
    throw new Error('VAPID public key is required.');
  }

  const existing = await getExistingSubscription();
  if (existing) {
    renderSubscription(existing);
    setStatus('already subscribed');
    return;
  }

  const subscription = await swRegistration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  renderSubscription(subscription);
  setStatus('subscribed');
};

subscribeBtn.addEventListener('click', async () => {
  subscribeBtn.disabled = true;
  try {
    await requestPermission();
    await subscribeToPush();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    setStatus(`error - ${message}`);
  } finally {
    subscribeBtn.disabled = false;
  }
});

navigator.serviceWorker?.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'PUSH_RECEIVED') return;
  setStatus(`push received - ${event.data.title || 'notification'}`);
});

(async () => {
  try {
    await registerServiceWorker();

    const existing = await getExistingSubscription();
    if (existing) {
      renderSubscription(existing);
      setStatus('ready (already subscribed)');
      return;
    }

    setStatus('ready');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    setStatus(`error - ${message}`);
    subscribeBtn.disabled = true;
  }
})();
