<script lang="ts">
  import { onMount } from 'svelte'
  import { Card, Reminder } from '../components'
  import { LOCAL_STORAGE_VAPID_KEY } from '../consts'
  import {
    getExistingSubscription,
    registerServiceWorker,
    removeSavedVAPIDKey,
    requestNotificationPermission,
    urlBase64ToUint8Array,
  } from '../utils/core'
  import { appStore } from '../store/store'

  let swRegistration: ServiceWorkerRegistration | null = null
  let pubVapidKey: string | null = null
  const setPubVapidKey = (key: string | null) => {
    pubVapidKey = key
  }
  let existingSubscription: PushSubscription | null = null

  let isRedirectRoute = false
  let reminderText = ''
  let deeplink = ''
  let isLoading = true
  let error = null

  const subscribeToPush = async (swRegistration: ServiceWorkerRegistration | null) => {
    const normalizedKey = pubVapidKey?.trim()
    if (!normalizedKey) throw new Error('VAPID public key is required.')

    localStorage.setItem(LOCAL_STORAGE_VAPID_KEY, normalizedKey)

    if (existingSubscription) return
    if (!swRegistration) throw new Error('Service worker is not registered.')

    existingSubscription = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(normalizedKey),
    })
  }

  const enablePushNotifications = async () => {
    try {
      await requestNotificationPermission()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error enabling push notifications:', message)
    }
  }

  onMount(async () => {
    swRegistration = $appStore.swRegistration
    const normalizedPath = window.location.pathname.replace(/\/$/, '')
    isRedirectRoute = normalizedPath.endsWith('/redirection-page')
    const params = new URLSearchParams(window.location.search)
    pubVapidKey = params.get('pubKey')

    if (isRedirectRoute) {
      const searchParams = new URLSearchParams(window.location.search)
      deeplink = searchParams.get('deeplink') || ''
      reminderText = searchParams.get('reminderText') || 'Reminder'

      //TODO: use navigator
      if (deeplink)
        setTimeout(() => {
          window.location.replace(deeplink)
        }, 100)

      return
    }

    try {
      existingSubscription = await getExistingSubscription(swRegistration)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error during service worker registration or subscription check:', message)
    }

    if (pubVapidKey && !existingSubscription) await subscribeToPush(swRegistration)

    setTimeout(
      () => {
        isLoading = false
      },
      (Math.floor(Math.random() * 3) + 1) * 1000
    )
  })
</script>

{#if isRedirectRoute}
  <Reminder {reminderText} {deeplink} />
{:else}
  <Card
    title="🔔 Obsidian Notifier PWA"
    subtitle="This app only receives push notifications and shows them on your device."
    height="700px">
    {#if isLoading && !error}
      <div class="spinner"></div>
    {/if}

    {#if error}
      <p class="error">Error: {JSON.stringify(error)}</p>
    {/if}

    {#if !isLoading && existingSubscription}
      <div class="row">
        <p>
          You already have subscribed to notification service. If you want, you can remove it by
          clicking
          <button
            class="button-warn mt-m"
            type="button"
            on:click={() => removeSavedVAPIDKey(setPubVapidKey, swRegistration)}
            >Unsubscribe from notifications</button>
        </p>
        <hr />
        <div>
          {#if existingSubscription}
            Your current subscription is copy it and paste to <code>push-subscriptions.json</code>
            inside your Node server:
            <p class="text-s mt-s">
              It has to be done for each device you want to have notifications on
            </p>
            <br />
            <textarea
              readonly
              class="mt-s"
              rows={15}
              value={JSON.stringify(existingSubscription, null, 2)}></textarea>
          {/if}
        </div>

        {#if Notification.permission !== 'granted'}
          <button type="button" on:click={enablePushNotifications}
            >Enable push notifications</button>
        {/if}
      </div>
    {/if}
  </Card>
{/if}

<style>
  .spinner {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: 3px solid #3a3a3a;
    border-top-color: #7aa2ff;
    animation: spin 0.8s linear infinite;
    flex: 0 0 auto;
    margin: 0 auto;
    margin-top: 38px;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
