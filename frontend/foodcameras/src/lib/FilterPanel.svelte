<script>
    // Props
    export let filterOpenOnly = false;
    export let allowedLevels = new Set(["Empty", "Low", "Medium", "High"]);
    export let minStars = 0;
    export let minQuality = 0;
    export let maxTurnaround = 999;
    export let allTags = [];
    export let selectedTags = new Set();
    export let toggleTag;
    export let toggleTagMenu;
    export let isTagMenuOpen = false;
    
    // Busyness levels with color codes
    const busynessLevels = [
      { name: "Empty", color: "#00C851" },
      { name: "Low", color: "#6DCC64" },
      { name: "Medium", color: "#FFEB3B" },
      { name: "High", color: "#FF4444" }
    ];
    
    // Toggle a busyness level filter
    function toggleLevel(level) {
      if (allowedLevels.has(level)) {
        allowedLevels.delete(level);
      } else {
        allowedLevels.add(level);
      }
      allowedLevels = new Set([...allowedLevels]); // Trigger reactivity
    }
    
    // Reset all filters to default values
    function resetFilters() {
      filterOpenOnly = false;
      allowedLevels = new Set(["Empty", "Low", "Medium", "High"]);
      selectedTags = new Set();
      minStars = 0;
      minQuality = 0;
      maxTurnaround = 999;
    }
  </script>
  
  <div class="filter-panel">
    <div class="filter-header">
      <h2>Filters</h2>
      <button class="reset-button" on:click={resetFilters}>Reset All</button>
    </div>
    
    <div class="filter-section">
      <label class="filter-label">Open Status</label>
      <div class="toggle-switch">
        <input 
          type="checkbox" 
          id="openToggle"
          bind:checked={filterOpenOnly}
        />
        <label for="openToggle">
          <span class="toggle-label">{filterOpenOnly ? 'Open Only' : 'All Locations'}</span>
        </label>
      </div>
    </div>
    
    <div class="filter-section">
      <label class="filter-label">Busyness Levels</label>
      <div class="busyness-buttons">
        {#each busynessLevels as level}
          <button 
            class="busyness-button"
            class:excluded={!allowedLevels.has(level.name)}
            style="--level-color: {level.color}"
            on:click={() => toggleLevel(level.name)}
          >
            {level.name}
          </button>
        {/each}
      </div>
    </div>
    
    <div class="filter-section">
      <label class="filter-label">
        Tags 
        <button class="view-all-tags" on:click={toggleTagMenu}>
          {isTagMenuOpen ? 'Close' : 'View All'}
        </button>
      </label>
      
      <div class="tags-preview">
        {#if selectedTags.size === 0}
          <span class="no-tags">No tags selected</span>
        {:else}
          <div class="selected-tags">
            {#each [...selectedTags] as tag}
              <span class="tag">
                {tag}
                <button class="remove-tag" on:click={() => toggleTag(tag)}>×</button>
              </span>
            {/each}
          </div>
        {/if}
      </div>
    </div>
    
    <div class="filter-section">
      <label class="filter-label">Minimum Rating</label>
      <div class="star-filter">
        {#each [1, 2, 3, 4, 5] as star}
          <button 
            class="star-button"
            class:active={star <= minStars}
            on:click={() => minStars = star === minStars ? 0 : star}
          >
            ★
          </button>
        {/each}
        {#if minStars > 0}
          <button class="clear-stars" on:click={() => minStars = 0}>Clear</button>
        {/if}
      </div>
    </div>
    
    <div class="filter-section">
      <label class="filter-label">Minimum Quality</label>
      <div class="slider-container">
        <input 
          type="range" 
          min="0" 
          max="5" 
          step="1" 
          bind:value={minQuality}
        />
        <span class="slider-value">{minQuality === 0 ? 'Any' : minQuality}</span>
      </div>
    </div>
    
    <div class="filter-section">
      <label class="filter-label">Maximum Wait Time (minutes)</label>
      <div class="slider-container">
        <input 
          type="range" 
          min="5" 
          max="60" 
          step="5" 
          bind:value={maxTurnaround}
        />
        <span class="slider-value">{maxTurnaround === 999 ? 'Any' : maxTurnaround}</span>
      </div>
    </div>
  </div>
  
  <style>
    .filter-panel {
      padding: 15px;
      background: #f8f8f8;
      border-bottom: 1px solid #ddd;
    }
    
    .filter-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    
    .filter-header h2 {
      margin: 0;
      font-size: 18px;
      color: #333;
    }
    
    .reset-button {
      background: none;
      border: none;
      color: #666;
      font-size: 14px;
      cursor: pointer;
      text-decoration: underline;
    }
    
    .reset-button:hover {
      color: #333;
    }
    
    .filter-section {
      margin-bottom: 15px;
    }
    
    .filter-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 500;
      margin-bottom: 8px;
      color: #333;
      font-size: 14px;
    }
    
    .view-all-tags {
      background: none;
      border: none;
      color: #4285f4;
      font-size: 12px;
      cursor: pointer;
      padding: 0;
    }
    
    /* Toggle switch */
    .toggle-switch {
      position: relative;
      display: inline-block;
    }
    
    .toggle-switch input {
      display: none;
    }
    
    .toggle-switch label {
      display: block;
      width: 100%;
      height: 34px;
      background-color: #f0f0f0;
      border-radius: 17px;
      cursor: pointer;
      position: relative;
      transition: background-color 0.3s;
      padding: 0 15px;
      display: flex;
      align-items: center;
    }
    
    .toggle-switch input:checked + label {
      background-color: #e0f2e9;
    }
    
    .toggle-switch label::after {
      content: "";
      position: absolute;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: white;
      top: 4px;
      left: 4px;
      transition: transform 0.3s;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }
    
    .toggle-switch input:checked + label::after {
      transform: translateX(100%);
      background-color: #4CAF50;
    }
    
    .toggle-label {
      margin-left: 40px;
      font-size: 14px;
      color: #666;
    }
    
    /* Busyness buttons */
    .busyness-buttons {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    
    .busyness-button {
      flex: 1;
      min-width: 60px;
      padding: 8px 0;
      border: none;
      border-radius: 4px;
      background-color: var(--level-color);
      color: white;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.2s;
      font-size: 13px;
    }
    
    .busyness-button.excluded {
      opacity: 0.4;
    }
    
    /* Tags preview */
    .tags-preview {
      min-height: 40px;
      background: white;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
      padding: 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }
    
    .no-tags {
      color: #888;
      font-style: italic;
      font-size: 13px;
    }
    
    .selected-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    
    .tag {
      background: #e0e0e0;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .remove-tag {
      background: none;
      border: none;
      color: #666;
      font-size: 14px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }
    
    /* Star filter */
    .star-filter {
      display: flex;
      align-items: center;
    }
    
    .star-button {
      background: none;
      border: none;
      font-size: 20px;
      color: #ccc;
      cursor: pointer;
      padding: 4px;
    }
    
    .star-button.active {
      color: #ffc107;
    }
    
    .clear-stars {
      margin-left: 10px;
      background: none;
      border: none;
      font-size: 12px;
      color: #888;
      cursor: pointer;
      text-decoration: underline;
    }
    
    /* Sliders */
    .slider-container {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .slider-container input {
      flex: 1;
    }
    
    .slider-value {
      min-width: 30px;
      text-align: right;
      font-weight: 500;
      color: #666;
    }
    
    input[type="range"] {
      -webkit-appearance: none;
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: #e0e0e0;
      outline: none;
    }
    
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #4285f4;
      cursor: pointer;
    }
    
    input[type="range"]::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #4285f4;
      cursor: pointer;
      border: none;
    }
  </style>