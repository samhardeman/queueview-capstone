<script>
    // Props
    export let level;
    export let showLabel = false;
    
    // Helper to determine color based on level
    function getColor(level) {
      switch (level) {
        case "Empty": return "#00C851";
        case "Low": return "#6DCC64";
        case "Medium": return "#FFEB3B";
        case "High": return "#FF4444";
        default: return "#9E9E9E";
      }
    }
    
    // Helper to get dot count based on level
    function getDotCount(level) {
      switch (level) {
        case "Empty": return 1;
        case "Low": return 2;
        case "Medium": return 3;
        case "High": return 4;
        default: return 0;
      }
    }
    
    // Computed level color
    $: color = getColor(level);
    
    // Computed dot count
    $: dotCount = getDotCount(level);
  </script>
  
  <div class="busyness-indicator">
    <div class="dots">
      {#each Array(4) as _, i}
        <div 
          class="dot" 
          class:active={i < dotCount}
          style="--dot-color: {color}">
        </div>
      {/each}
    </div>
    
    {#if showLabel}
      <span class="level-label" style="color: {color}">{level}</span>
    {/if}
  </div>
  
  <style>
    .busyness-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .dots {
      display: flex;
      gap: 2px;
    }
    
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #e0e0e0;
      transition: background-color 0.2s;
    }
    
    .dot.active {
      background-color: var(--dot-color, #9E9E9E);
    }
    
    .level-label {
      font-size: 14px;
      font-weight: 500;
    }
  </style>