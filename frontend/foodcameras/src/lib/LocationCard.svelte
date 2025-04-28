<script>
    import BusynessIndicator from './BusynessIndicator.svelte';
    
    // Props
    export let location;
    export let isSelected = false;
    export let onClick = () => {};
  </script>
  
  <div class="location-card" class:selected={isSelected} on:click={onClick}>
    <div class="location-header">
      <h3>{location.name}</h3>
      <span class="status" class:open={location.isOpen} class:closed={!location.isOpen}>
        {location.isOpen ? 'Open' : 'Closed'}
      </span>
    </div>
    
    <div class="details">
      <BusynessIndicator level={location.trafficLevel} />
      
      <div class="meta">
        <!-- Stars display -->
        <div class="stars">
          {#each Array(5) as _, i}
            <span class="star">{i < location.stars ? '★' : '☆'}</span>
          {/each}
        </div>
        
        <!-- Tags -->
        <div class="tags">
          {#each location.tags.split(',').map(t => t.trim()).slice(0, 2) as tag}
            <span class="tag">{tag}</span>
          {/each}
          {#if location.tags.split(',').length > 2}
            <span class="tag">+{location.tags.split(',').length - 2}</span>
          {/if}
        </div>
      </div>
    </div>
  </div>
  
  <style>
    .location-card {
      background: white;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 10px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      transition: box-shadow 0.2s, transform 0.2s;
    }
    
    .location-card:hover {
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
      transform: translateY(-2px);
    }
    
    .location-card.selected {
      border-left: 4px solid #4CAF50;
      background-color: #f8f8f8;
    }
    
    .location-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .location-header h3 {
      margin: 0;
      font-size: 16px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .status {
      font-size: 12px;
      padding: 3px 8px;
      border-radius: 12px;
      font-weight: 500;
    }
    
    .open {
      background-color: #e8f5e9;
      color: #2e7d32;
    }
    
    .closed {
      background-color: #ffebee;
      color: #c62828;
    }
    
    .details {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .meta {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    
    .stars {
      color: #ffc107;
      font-size: 14px;
      margin-bottom: 4px;
    }
    
    .tags {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 4px;
    }
    
    .tag {
      background: #eeeeee;
      border-radius: 12px;
      padding: 2px 6px;
      font-size: 11px;
      color: #666;
    }
  </style>