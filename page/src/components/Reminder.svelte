<script>
  import { Card } from './'

  export let reminderText
  export let deeplink
</script>

<Card title="🔔 Reminder" subtitle="This page is meant to be opened via a push notification.">
  <div class="reminder-txt">
    <img src={`${import.meta.env.BASE_URL}check.jpg`} width="28" alt="check" />
    <span>{reminderText}</span>
  </div>

  {#if deeplink}
    <a href={deeplink}>Open Obsidian</a>
  {:else}
    <p>Missing deeplink query parameter.</p>
  {/if}
  <p class="caption">It will open Obsidian with your reminder.</p>
</Card>
