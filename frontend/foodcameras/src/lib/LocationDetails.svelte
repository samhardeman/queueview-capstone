<script>
    import { onMount } from 'svelte';
    import BusynessIndicator from './BusynessIndicator.svelte';
    
    // Props
    export let location;
    export let isMobile = false;
    export let onClose = () => {};
    
    // State
    let detailData = null;
    let hoursData = null;
    let orderedHours = [];
    let isLoading = true;
    
    // Helper functions
    function formatTime(timeStr) {
      const [hour, minute] = timeStr.split(':').map(Number);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const h = hour % 12 || 12;
      return `${h}:${minute.toString().padStart(2, '0')} ${ampm}`;
    }
    
    function formatHours(open, close) {
      if (open === "00:00" && close === "00:00") return "Closed";
      return `${formatTime(open)} - ${formatTime(close)}`;
    }
    
    // Load detail data on mount
    onMount(async () => {
      isLoading = true;
      try {
        // Fetch detailed location data
        const detailRes = await fetch(`http://localhost:5000/api/location/${location.name}`);
        detailData = await detailRes.json();
        
        // Fetch hours data
        const hoursRes = await fetch(`http://localhost/api/hours/${location.name}`);
        hoursData = await hoursRes.json();
        
        // Order hours to start with current day
        const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        const currentDay = new Date().toLocaleString('en-US', { weekday: 'long' });
        const idx = weekDays.indexOf(currentDay);
        const orderedDays = weekDays.slice(idx).concat(weekDays.slice(0, idx));
        
        orderedHours = orderedDays.map(day => ({
          day,
          open: hoursData[day]?.open || "00:00",
          close: hoursData[day]?.close || "00:00",
          isToday: day === currentDay
        }));
      } catch (error) {
        console.error("Error loading details:", error);
      } finally {
        isLoading = false;
      }
    });
  </script>
  
  <div class="details-container" class:mobile={isMobile}>
    <div class="details-header">
      <h2>{location.name}</h2>
      <button class="close-button" on:click={onClose}>×</button>
    </div>
    
    {#if isLoading}
      <div class="loading">Loading details...</div>
    {:else}
      <!-- Main content -->
      <div class="details-content">
        <!-- Image -->
        {#if detailData && detailData[0]?.image}
          <div class="image-container">
            <img src={`http://localhost:5000/api/image/${detailData[0].image}`} alt={location.name} />
          </div>
        {/if}
        
        <!-- Status and traffic level -->
        <div class="status-row">
          <div class="status-pill" class:open={location.isOpen} class:closed={!location.isOpen}>
            {location.isOpen ? 'Open Now' : 'Closed'}
          </div>
          
          <div class="traffic-level">
            <span>Current traffic:</span>
            <BusynessIndicator level={location.trafficLevel} showLabel={true} />
          </div>
        </div>
        
        <!-- Details -->
        <div class="metrics">
          <div class="metric">
            <span class="label">Rating:</span>
            <div class="stars">
              {#each Array(5) as _, i}
                <span class="star">{i < location.stars ? '★' : '☆'}</span>
              {/each}
              <span class="value">({location.stars.toFixed(1)})</span>
            </div>
          </div>
          
          <div class="metric">
            <span class="label">Quality:</span>
            <div class="quality-bar">
              <div class="quality-fill" style="width: {location.quality * 20}%"></div>
            </div>
            <span class="value">{location.quality}/5</span>
          </div>
          
          <div class="metric">
            <span class="label">Avg. Wait:</span>
            <span class="value">{location.turnaround} min</span>
          </div>
        </div>
        
        <!-- Tags -->
        <div class="tags-section">
          <h3>Tags</h3>
          <div class="tags">
            {#each location.tags.split(',').map(t => t.trim()) as tag}
              <span class="tag">{tag}</span>
            {/each}
          </div>
        </div>
        
        <!-- Hours -->
        <div class="hours-section">
          <h3>Hours of Operation</h3>
          <div class="hours-table">
            {#each orderedHours as hour}
              <div class="hour-row" class:today={hour.isToday}>
                <div class="day">{hour.day}</div>
                <div class="time">{formatHours(hour.open, hour.close)}</div>
              </div>
            {/each}
          </div>
        </div>
        
        <!-- Description if available -->
        {#if detailData && detailData[0]?.description}
          <div class="description">
            <h3>About</h3>
            <p>{detailData[0].description}</p>
          </div>
        {/if}
      </div>
    {/if}
  </div>
  
  <style>
    .details-container {
      background: white;
      border-radius: 8px;
      overflow-y: auto;
      max-height: 100%;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      z-index: 100;
    }
    
    /* Desktop styling */
    .details-container:not(.mobile) {
      position: absolute;
      top: 0;
      right: 0;
      width: 400px;
      height: 100%;
      border-left: 1px solid #ddd;
    }
    
    /* Mobile styling */
    .details-container.mobile {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1000;
    }
    
    .details-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 20px;
      border-bottom: 1px solid #eee;
      position: sticky;
      top: 0;
      background: white;
      z-index: 10;
    }
    
    .details-header h2 {
      margin: 0;
      font-size: 20px;
    }
    
    .close-button {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      margin: 0;
      line-height: 1;
      color: #666;
    }
    
    .close-button:hover {
      color: #000;
    }
    
    .details-content {
      padding: 20px;
    }
    
    .loading {
      padding: 30px;
      text-align: center;
      color: #666;
    }
    
    .image-container {
      margin-bottom: 20px;
      border-radius: 8px;
      overflow: hidden;
    }
    
    .image-container img {
      width: 100%;
      height: auto;
      display: block;
    }
    
    .status-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .status-pill {
      padding: 6px 12px;
      border-radius: 16px;
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
    
    .traffic-level {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .metrics {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
      padding: 15px;
      background: #f9f9f9;
      border-radius: 8px;
    }
    
    .metric {
      display: flex;
      align-items: center;
    }
    
    .label {
      width: 80px;
      font-weight: 500;
      color: #666;
    }
    
    .stars {
      color: #ffc107;
      display: flex;
      align-items: center;
    }
    
    .value {
      margin-left: 8px;
      color: #333;
    }
    
    .quality-bar {
      width: 100px;
      height: 8px;
      background: #eee;
      border-radius: 4px;
      overflow: hidden;
      margin: 0 8px;
    }
    
    .quality-fill {
      height: 100%;
      background: linear-gradient(to right, #4caf50, #8bc34a);
      border-radius: 4px;
    }
    
    .tags-section, .hours-section, .description {
      margin-bottom: 20px;
    }
    
    .tags-section h3, .hours-section h3, .description h3 {
      font-size: 16px;
      margin-bottom: 10px;
      color: #333;
    }
    
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .tag {
      background: #f0f0f0;
      padding: 6px 12px;
      border-radius: 16px;
      font-size: 13px;
      color: #555;
    }
    
    .hours-table {
      border: 1px solid #eee;
      border-radius: 8px;
      overflow: hidden;
    }
    
    .hour-row {
      display: flex;
      border-bottom: 1px solid #eee;
    }
    
    .hour-row:last-child {
      border-bottom: none;
    }
    
    .today {
      background-color: #f0f7ff;
      font-weight: 500;
    }
    
    .day {
      padding: 10px;
      flex: 1;
      border-right: 1px solid #eee;
      min-width: 100px;
    }
    
    .time {
      padding: 10px;
      flex: 2;
    }
    
    .description p {
      line-height: 1.6;
      color: #555;
      margin: 0;
    }
  </style>