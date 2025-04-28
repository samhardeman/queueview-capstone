<script>
    // Props
    export let allTags = [];
    export let selectedTags = new Set();
    export let toggleTag;
    export let close;
    
    // Local state
    let searchQuery = "";
    
    // Filtered tags based on search
    $: filteredTags = searchQuery 
      ? allTags.filter(tag => 
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : allTags;
  </script>
  
  <div class="tag-menu-overlay" on:click|self={close}>
    <div class="tag-menu">
      <div class="tag-menu-header">
        <h3>Select Tags</h3>
        <button class="close-button" on:click={close}>×</button>
      </div>
      
      <div class="search-bar">
        <input 
          type="text" 
          placeholder="Search tags..." 
          bind:value={searchQuery}
          autocomplete="off"
        />
        {#if searchQuery}
          <button class="clear-search" on:click={() => searchQuery = ""}>×</button>
        {/if}
      </div>
      
      <div class="selected-count">
        {selectedTags.size} tags selected
        {#if selectedTags.size > 0}
          <button class="clear-all" on:click={() => { selectedTags = new Set(); }}>
            Clear All
          </button>
        {/if}
      </div>
      
      <div class="tags-container">
        {#if filteredTags.length === 0}
          <div class="no-results">No tags found matching "{searchQuery}"</div>
        {:else}
          {#each filteredTags as tag}
            <div 
              class="tag-item" 
              class:selected={selectedTags.has(tag)}
              on:click={() => toggleTag(tag)}
            >
              <span class="checkbox">
                {#if selectedTags.has(tag)}
                  <span class="checkmark">✓</span>
                {/if}
              </span>
              <span class="tag-name">{tag}</span>
            </div>
          {/each}
        {/if}
      </div>
      
      <div class="tag-menu-footer">
        <button class="done-button" on:click={close}>Done</button>
      </div>
    </div>
  </div>
  
  <style>
    .tag-menu-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
    
    .tag-menu {
      background: white;
      width: 90%;
      max-width: 500px;
      max-height: 80vh;
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }
    
    .tag-menu-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 20px;
      border-bottom: 1px solid #eee;
    }
    
    .tag-menu-header h3 {
      margin: 0;
      font-size: 18px;
      color: #333;
    }
    
    .close-button {
      background: none;
      border: none;
      font-size: 24px;
      color: #666;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }
    
    .search-bar {
      padding: 10px 20px;
      position: relative;
    }
    
    .search-bar input {
      width: 100%;
      padding: 10px 35px 10px 15px;
      border-radius: 20px;
      border: 1px solid #ddd;
      font-size: 14px;
      outline: none;
    }
    
    .search-bar input:focus {
      border-color: #4285f4;
      box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.1);
    }
    
    .clear-search {
      position: absolute;
      right: 30px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #888;
      font-size: 18px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }
    
    .selected-count {
      padding: 0 20px 10px;
      font-size: 14px;
      color: #666;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .clear-all {
      background: none;
      border: none;
      color: #4285f4;
      font-size: 13px;
      cursor: pointer;
      padding: 0;
      text-decoration: underline;
    }
    
    .tags-container {
      flex: 1;
      overflow-y: auto;
      padding: 0 20px 10px;
    }
    
    .tag-item {
      padding: 12px 15px;
      border-radius: 6px;
      margin-bottom: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      transition: background-color 0.2s;
    }
    
    .tag-item:hover {
      background-color: #f5f5f5;
    }
    
    .tag-item.selected {
      background-color: #e8f0fe;
    }
    
    .checkbox {
      width: 18px;
      height: 18px;
      border-radius: 4px;
      border: 2px solid #ddd;
      margin-right: 12px;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    
    .tag-item.selected .checkbox {
      background-color: #4285f4;
      border-color: #4285f4;
    }
    
    .checkmark {
      color: white;
      font-size: 12px;
      line-height: 1;
    }
    
    .tag-name {
      font-size: 14px;
      color: #333;
    }
    
    .no-results {
      padding: 30px 0;
      text-align: center;
      color: #888;
      font-style: italic;
    }
    
    .tag-menu-footer {
      padding: 15px 20px;
      border-top: 1px solid #eee;
      text-align: right;
    }
    
    .done-button {
      background-color: #4285f4;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 8px 20px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .done-button:hover {
      background-color: #3367d6;
    }
  </style>