/* global navigator document atob Notification console localStorage URL Blob URL URLSearchParams window */

let statusEl = null;
let vapidKeyInput = null;
let subscribeBtn = null;
let outputEl = null;
let downloadSubscriptionBtn = null;
let errorWrapperEl = null;
let contentWrapperEl = null;
let keyExistsWrapperEl = null
let error = null

let swRegistration = null;
const LOCAL_STORAGE_VAPID_KEY = 'obsidian-notifier-vapid-public-key';
const LOCAL_STORAGE_SUBSCRIPTION = 'obsidian-notifier-push-subscription';

const setStatus = (text) => {
  if (!statusEl) return;
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

  swRegistration = await navigator.serviceWorker.register('./sw.js');
  await navigator.serviceWorker.ready;
};

const getExistingSubscription = async () => {
  if (!swRegistration) return null;
  return swRegistration.pushManager.getSubscription();
};


const tryLoadStoredSubscription = () => {
  const value = localStorage.getItem(LOCAL_STORAGE_SUBSCRIPTION);
  if (!value?.trim()) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const saveSubscriptionInLS = (subscription) => {
  localStorage.setItem(LOCAL_STORAGE_SUBSCRIPTION, JSON.stringify(subscription));
};

const requestNotificationPermission = async () => {
  const result = await Notification.requestPermission();
  if (result !== 'granted') {
    throw new Error('Notification permission was not granted.');
  }
};

const tryLoadVapidFromStorage = () => {
  const storedKey = localStorage.getItem(LOCAL_STORAGE_VAPID_KEY) || '';
  if (storedKey.trim()) {
    vapidKeyInput.value = storedKey.trim();
    return true;
  }
  return false;
};

const subscribeToPush = async () => {
  const vapidPublicKey = vapidKeyInput.value.trim();
  if (!vapidPublicKey) throw new Error('VAPID public key is required. Paste it manually.');

  localStorage.setItem(LOCAL_STORAGE_VAPID_KEY, vapidPublicKey);

  const existing = await getExistingSubscription();
  if (existing) {
    saveSubscriptionInLS(existing);
    setStatus('already subscribed');
    return;
  }

  const subscription = await swRegistration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  saveSubscriptionInLS(subscription);
  setStatus('subscribed');
};

const init = async () => {
  const params = new URLSearchParams(window.location.search);
  const pubKeyFromUrl = params.get('pubKey');
  const storedSubscription = tryLoadStoredSubscription();
  if (!pubKeyFromUrl && !storedSubscription) {
    error = 'Url corrupted: missing pubKey query parameter. Please provide VAPID public key in the URL, eg. https://hardevv.github.io/obsidian-notifier/?pubKey=YOUR';
    document.getElementById('error-message').innerText = error
  }

  contentWrapperEl = document.getElementById('content-wrapper');

  if (error) {
    errorWrapperEl = document.getElementById('error-wrapper');
    contentWrapperEl.classList.add('hidden');
    errorWrapperEl.classList.remove('hidden');
    return;
  }

  if (storedSubscription) {
    keyExistsWrapperEl = document.getElementById('key-exists-wrapper');
    contentWrapperEl.classList.add('hidden');
    keyExistsWrapperEl.classList.remove('hidden');
  }

  if (pubKeyFromUrl) {
    try {
      await requestNotificationPermission();
      await subscribeToPush();
    } catch (err) {
      const message = err instanceof Error ? error.message : 'Unknown error';
      setStatus(`error - ${message}`);
    }
  }

  statusEl = document.getElementById('status');
  vapidKeyInput = document.getElementById('vapidKey');
  subscribeBtn = document.getElementById('subscribeBtn');
  outputEl = document.getElementById('subscriptionOutput');
  downloadSubscriptionBtn = document.getElementById('downloadSubscriptionBtn');

  navigator.serviceWorker?.addEventListener('message', (event) => {
    if (!event.data || event.data.type !== 'PUSH_RECEIVED') return;
    setStatus(`push received - ${event.data.title || 'notification'}`);
  });

  try {
    await registerServiceWorker();

    tryLoadVapidFromStorage();

    const existing = await getExistingSubscription();
    if (existing) {
      setStatus('ready (already subscribed)');
      return;
    }

    setStatus(vapidKeyInput.value.trim() ? 'ready' : 'ready (paste VAPID public key manually)');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    setStatus(`error - ${message}`);
    subscribeBtn.disabled = true;
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init();
  });
} else {
  init();
}