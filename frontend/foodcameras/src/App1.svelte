<script>
  import { onMount } from 'svelte';
  import MobileLayout from './MobileLayout.svelte';
  import DesktopLayout from './DesktopLayout.svelte';

  let isMobile = false;

  const checkMobile = () => {
    isMobile = window.innerWidth <= 768;
  };

  onMount(() => {
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  });
</script>

{#if isMobile}
  <MobileLayout />
{:else}
  <DesktopLayout />
{/if}
