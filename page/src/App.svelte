<script lang="ts">
  import { onMount } from 'svelte'
  import navaid from 'navaid'

  import NotificationsApp from './pages/NotificationsApp.svelte'
  import LandingPage from './pages/LandingPage.svelte'
  import { appStore } from './store/store'
  import { registerServiceWorker } from './utils/core'
  import RedirectionPage from './pages/RedirectionPage.svelte'

  let currentPage: string = 'home'

  onMount(async () => {
    appStore.updateSwRegistration(await registerServiceWorker())
    const router = navaid()

    router.on('/', () => {
      currentPage = 'landing'
    })

    router.on('/notifications', () => {
      currentPage = 'notifications'
    })

    router.on('/redirection', () => {
      currentPage = 'redirection'
    })

    router.listen()
  })
</script>

{#if currentPage === 'notifications'}
  <NotificationsApp />
{:else if currentPage === 'landing'}
  <LandingPage />
{:else if currentPage === 'redirection'}
  <RedirectionPage />
{/if}
