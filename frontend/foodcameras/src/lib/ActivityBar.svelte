<script>
  // Props
  export let activeItem = 'map';
  export let isMobile = false;
  export let onItemClick = () => {};
  
  // Navigation items
  const items = [
    { id: 'map', label: 'Map', icon: '🗺️' },
    { id: 'filter', label: 'Filters', icon: '🔍' },
    { id: 'locations', label: 'Locations', icon: '📍' },
  ];
</script>

<!-- Desktop sidebar navigation -->
{#if !isMobile}
  <div class="activity-sidebar">
    {#each items as item}
      <button 
        class="nav-item" 
        class:active={activeItem === item.id}
        on:click={() => onItemClick(item.id)}
      >
        <span class="icon">{item.icon}</span>
        <span class="label">{item.label}</span>
      </button>
    {/each}
  </div>
<!-- Mobile bottom navigation -->
{:else}
  <div class="activity-bar">
    {#each items as item}
      <button 
        class="nav-item" 
        class:active={activeItem === item.id}
        on:click={() => onItemClick(item.id)}
      >
        <span class="icon">{item.icon}</span>
        <span class="label">{item.label}</span>
      </button>
    {/each}
  </div>
{/if}

<style>
  /* Common styles */
  .nav-item {
    display: flex;
    align-items: center;
    background: none;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .icon {
    font-size: 18px;
  }
  
  .label {
    font-size: 14px;
    font-weight: 500;
  }
  
  .nav-item.active {
    color: #4285f4;
  }
  
  /* Desktop sidebar */
  .activity-sidebar {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: #f8f8f8;
    border-right: 1px solid #e0e0e0;
  }
  
  .activity-sidebar .nav-item {
    padding: 15px;
    justify-content: flex-start;
    gap: 12px;
    border-left: 3px solid transparent;
    text-align: left;
  }
  
  .activity-sidebar .nav-item:hover {
    background-color: #f0f0f0;
  }
  
  .activity-sidebar .nav-item.active {
    border-left-color: #4285f4;
    background-color: rgba(66, 133, 244, 0.08);
  }
  
  /* Mobile bottom bar */
  .activity-bar {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: white;
    border-top: 1px solid #e0e0e0;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
    z-index: 100;
  }
  
  .activity-bar .nav-item {
    flex: 1;
    padding: 10px 0;
    flex-direction: column;
    gap: 4px;
    justify-content: center;
  }
  
  .activity-bar .nav-item:hover {
    background-color: #f5f5f5;
  }
  
  .activity-bar .nav-item.active {
    border-top: 2px solid #4285f4;
    background-color: rgba(66, 133, 244, 0.05);
  }
</style>