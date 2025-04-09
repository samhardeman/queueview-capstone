<script>
  import { onMount } from 'svelte';
  import L from 'leaflet';
  import "leaflet/dist/leaflet.css";
  import ActivityBar from './lib/ActivityBar.svelte';

  let map;
  let locations = []; // Minimal list loaded from /api/locations
  let currentIndex = 0;
  let currentImage = "";
  let orderedHours = []; // Ordered hours for the current location
  let currentIsClosed = false;


  // Mobile-specific state
  let isMobile = false;
  let isLocationExpanded = false;
  let filtersExpanded = false;

  // Responsive detection
  const checkMobile = () => {
    isMobile = window.innerWidth <= 768;
  };

  // Sidebar mode: "list" shows all locations, "detail" shows one location's details.
  let sidebarMode = 'list';

  // Filter variables:
  let filterOpenOnly = false;
  let allowedLevels = new Set(["Empty", "Low", "Medium", "High"]);

  // New filter variables:
  let selectedTags = new Set();
  let minStars = 0;      // 0 means no star filtering.
  let minQuality = 0;    // 0 means no quality filtering.
  let maxTurnaround = 999; // Very high default so all locations show.

  // Lazy loading for images
  const lazyLoadImage = (img) => {
    const src = img.dataset.src;
    if (src) {
      img.src = src;
      img.removeAttribute('data-src');
    }
  };

  // Reactive: compute all unique tags from locations.
  $: allTags = Array.from(
    new Set(locations.flatMap(loc => loc.tags.split(',').map(t => t.trim())))
  );

  // Reactive: compute filtered locations including original index.
  $: filteredLocations = locations
    .map((loc, index) => ({ ...loc, index }))
    .filter(loc => {
      const meetsOpen = !filterOpenOnly || loc.isOpen;
      const meetsBusyness = allowedLevels.has(loc.trafficLevel);
      const locTags = loc.tags.split(',').map(t => t.trim());
      const meetsTags =
        selectedTags.size === 0 ||
        locTags.some(tag => selectedTags.has(tag));
      const meetsStars = loc.stars >= minStars;
      const meetsQuality = loc.quality >= minQuality;
      const meetsTurnaround = loc.turnaround <= maxTurnaround;
      return meetsOpen && meetsBusyness && meetsTags && meetsStars && meetsQuality && meetsTurnaround;
    });

  // Array to store each location's marker.
  let markers = [];

  // Reactive open status text.
  $: openStatus = currentIsClosed ? 'Closed' : 'Open';

  // Cache to store detailed data fetched from /api/location/[name]
  let locationDetailsCache = {};

  // Helper: convert a "HH:MM" string (24-hour) to 12-hour format.
  function formatTime(timeStr) {
    let [hour, minute] = timeStr.split(':').map(Number);
    let ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${hour}:${minute.toString().padStart(2, '0')} ${ampm}`;
  }

  // Helper: if open and close are "00:00", return "Closed", otherwise format them.
  function formatHours(open, close) {
    if (open === "00:00" && close === "00:00") return "Closed";
    return `${formatTime(open)} - ${formatTime(close)}`;
  }

  // Helper: determine if a location is currently open based on its hours data.
  function isOpenNow(hoursData) {
    const currentDay = new Date().toLocaleString('en-US', { weekday: 'long' });
    const todaysHours = hoursData[currentDay];
    if (!todaysHours || (todaysHours.open === "00:00" && todaysHours.close === "00:00")) {
      return false;
    }
    let now = new Date();
    let currentMinutes = now.getHours() * 60 + now.getMinutes();
    let [openHour, openMinute] = todaysHours.open.split(':').map(Number);
    let [closeHour, closeMinute] = todaysHours.close.split(':').map(Number);
    let openMinutes = openHour * 60 + openMinute;
    let closeMinutes = closeHour * 60 + closeMinute;
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  }

  // Returns HTML for a marker icon.
  const getIconHtml = (level, closed = false, selected = false) => {
    let bg;
    if (closed) {
      bg = "#9E9E9E";
    } else {
      if (level === "Empty" || level === "Low") {
        bg = "#00C851";
      } else if (level === "Medium") {
        bg = "#FFEB3B";
      } else if (level === "High") {
        bg = "#ff4444";
      } else {
        bg = "#9E9E9E";
      }
    }
    const borderRadius = selected ? "0" : "50%";
    const transform = selected ? "rotate(45deg)" : "";
    return `<div style="
      background-color: ${bg};
      border: 2px solid #000;
      border-radius: ${borderRadius};
      width: 16px;
      height: 16px;
      transform: ${transform};
      box-shadow: 0 0 8px rgba(0,0,0,0.6);
    "></div>`;
  };

  // Pre-fetch hours for all locations so we can mark them as open or closed.
  const prefetchAllHours = async () => {
    await Promise.all(locations.map(async loc => {
      try {
        const res = await fetch(`http://localhost:5000/api/hours/${loc.name}`);
        const hoursData = await res.json();
        loc.hoursData = hoursData;
        loc.isOpen = isOpenNow(hoursData);
      } catch (error) {
        console.error("Error fetching hours for", loc.name, error);
        loc.isOpen = false;
      }
    }));
  };

  // Fetch the minimal list of locations.
  const fetchLocations = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/locations');
      locations = await response.json();
      if (locations.length) {
        await prefetchAllHours();
        await initializeMarkers();
        // Automatically select the first location.
        await selectLocation(0);
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  };

  // Initialize markers for all locations
  const initializeMarkers = () => {
    // Clear existing markers if any
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    locations.forEach((loc, index) => {
      if (loc.latitude && loc.longitude) {
        const marker = L.marker([loc.latitude, loc.longitude], {
          icon: L.divIcon({
            className: 'custom-icon',
            html: getIconHtml(loc.trafficLevel, !loc.isOpen, index === currentIndex)
          })
        }).addTo(map);
        
        marker.on('click', () => {
          selectLocation(index);
          sidebarMode = 'detail';
        });
        
        markers.push(marker);
      }
    });
  };

  // Fetch detailed data (including image) for a given location.
  const fetchLocationDetails = async (name) => {
    try {
      const response = await fetch(`http://localhost:5000/api/location/${name}`);
      return await response.json();
    } catch (error) {
      console.error(`Error fetching details for ${name}:`, error);
      return null;
    }
  };

  // Update the current image URL.
  const updateCurrentImage = (image) => {
    currentImage = `http://localhost:5000/api/image/${image}`;
  };

  // Fetch hours data for the selected location (for the sidebar).
  const fetchHoursDataForSidebar = async (name) => {
    try {
      const response = await fetch(`http://localhost:5000/api/hours/${name}`);
      const data = await response.json();
      const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      const currentDay = new Date().toLocaleString('en-US', { weekday: 'long' });
      let idx = weekDays.indexOf(currentDay);
      if (idx === -1) idx = 0;
      const orderedDays = weekDays.slice(idx).concat(weekDays.slice(0, idx));
      orderedHours = orderedDays.map(day => ({ day, open: data[day]?.open, close: data[day]?.close }));
      const todaysHours = data[currentDay];
      if (!todaysHours || (todaysHours.open === "00:00" && todaysHours.close === "00:00")) {
        currentIsClosed = true;
      } else {
        currentIsClosed = !isOpenNow(data);
      }
    } catch (error) {
      console.error("Error fetching hours data for sidebar:", error);
    }
  };

  // Update the icons for all markers based on the current selection.
  function updateMarkersIcons() {
    locations.forEach((loc, i) => {
      const marker = markers[i];
      marker.setIcon(L.divIcon({
        className: 'custom-icon',
        html: getIconHtml(loc.trafficLevel, !loc.isOpen, i === currentIndex)
      }));
    });
  }

  // When a location is selected, update markers, fetch details, and center the map.
  const selectLocation = async (index) => {
    currentIndex = index;
    const loc = locations[index];

    if (loc.latitude && loc.longitude) {
      map.setView([loc.latitude, loc.longitude], 20);
    }

    if (!locationDetailsCache[loc.name]) {
      locationDetailsCache[loc.name] = await fetchLocationDetails(loc.name);
    }
    const details = locationDetailsCache[loc.name];
    if (details && details[0].image) {
      updateCurrentImage(details[0].image);
    }
    await fetchHoursDataForSidebar(loc.name);
    updateMarkersIcons();
  };

  // Toggle a tag filter.
  function toggleTag(tag) {
    if (selectedTags.has(tag)) {
      selectedTags.delete(tag);
    } else {
      selectedTags.add(tag);
    }
    selectedTags = new Set([...selectedTags]);
  }

  // Initialize map on mount
  onMount(() => {
    map = L.map('map').setView([33.512950, -112.127405], 17);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    fetchLocations();
  });
</script>

<!-- Sidebar -->
<div class="sidebar">
  {#if sidebarMode === 'list'}
    <!-- Filter UI -->
    <div class="filters">
      <button class="filter-button {filterOpenOnly ? 'active' : ''}" on:click={() => filterOpenOnly = !filterOpenOnly}>
        {filterOpenOnly ? "Open Only" : "Show All"}
      </button>
      <div class="busyness-filters">
        {#each ["Empty", "Low", "Medium", "High"] as level}
          <button
            class="filter-button { !allowedLevels.has(level) ? 'active' : '' }"
            on:click={() => {
              if (allowedLevels.has(level)) {
                allowedLevels.delete(level);
              } else {
                allowedLevels.add(level);
              }
              allowedLevels = new Set([...allowedLevels]);
            }}>
            {level}
          </button>
        {/each}
      </div>

      <!-- Extra Filters -->
      <div class="extra-filters">
        <div class="filter-group">
          <label>Tags:</label>
          <div class="tags">
            {#each allTags as tag}
              <button class="filter-button {selectedTags.has(tag) ? 'active' : ''}" on:click={() => toggleTag(tag)}>
                {tag}
              </button>
            {/each}
          </div>
        </div>
        <div class="filter-group">
          <label>Min Stars:</label>
          <div class="star-selector">
            {#each [1,2,3,4,5] as star}
              <span 
                class="star {star <= minStars ? 'selected' : ''}" 
                on:click={() => minStars = star}>
                ★
              </span>
            {/each}
            <button class="reset-button" on:click={() => minStars = 0}>Reset</button>
          </div>
        </div>
        <div class="filter-group">
          <label>Min Quality:</label>
          <select bind:value={minQuality}>
            <option value="0">All</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Max Turnaround (min):</label>
          <input type="number" bind:value={maxTurnaround} min="1" max="999" />
        </div>
      </div>
    </div>

    <!-- List View -->
    <div class="locations-list">
      {#each filteredLocations as loc}
        <div class="location-entry {loc.index === currentIndex ? 'selected' : ''}" 
             on:click={() => { selectLocation(loc.index); sidebarMode = 'detail'; }}>
          <div class="dot">
            {@html getIconHtml(loc.trafficLevel, !loc.isOpen, loc.index === currentIndex)}
          </div>
          <div class="info">
            <div class="name">{loc.name}</div>
            <div class="status" style="color: {loc.isOpen ? 'green' : 'red'};">
              {loc.isOpen ? 'Open' : 'Closed'}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {:else if sidebarMode === 'detail'}
    <!-- Detail View -->
    <div class="detail-view">
      <button class="back-arrow" on:click={() => sidebarMode = 'list'}>← Back</button>
      <h3 id="location-name">{locations[currentIndex]?.name || "Location"}</h3>
      <h5 id="traffic-level">
        {locations[currentIndex]?.trafficLevel || ""} - <span style="color: {currentIsClosed ? 'red' : 'green'};">{openStatus}</span>
      </h5>
      {#if currentImage}
        <img class="sidebar-image" src={currentImage} alt="Location Image" />
      {/if}
      <div class="hours-column">
        {#each orderedHours as hr}
          <div class="day">
            <div class="day-name">{hr.day}</div>
            <div class="time">{formatHours(hr.open, hr.close)}</div>
          </div>
        {/each}
      </div>
      <ActivityBar locationName={locations[currentIndex]?.name} />
      <div class="buttons">
        <button on:click={() => selectLocation((currentIndex - 1 + locations.length) % locations.length)}>
          Previous
        </button>
        <button on:click={() => selectLocation((currentIndex + 1) % locations.length)}>
          Next
        </button>
      </div>
    </div>
  {/if}
</div>

<!-- Map Container -->
<div id="map" style="height: 100%;"></div>

<style>
  /* Map container styling */
  #map {
    position: absolute;
    top: 0;
    left: 320px; /* Adjusted to account for sidebar width */
    height: 100%;
    width: calc(100% - 320px); /* Adjusted to account for sidebar width */
    z-index: 0;
  }
  /* Sidebar styling */
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 320px;
    height: 100vh;
    background: #fff;
    border-right: 1px solid #522398;
    padding: 20px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
    z-index: 1;
    overflow-y: auto;
    font-family: 'Arial', sans-serif;
  }
  /* Rest of the styles remain the same as in the previous artifact */
  .sidebar h3, .sidebar h5 {
    margin: 0;
    padding-bottom: 10px;
    color: #522398;
  }
  .sidebar-image {
    width: 100%;
    height: auto;
    max-height: 200px;
    object-fit: cover;
    border-radius: 8px;
    margin-bottom: 15px;
    border: 2px solid #522398;
  }
  /* Filters styling */
  .filters {
    display: flex;
    flex-direction: column;
    margin-bottom: 10px;
  }
  .busyness-filters, .extra-filters .tags {
    display: flex;
    gap: 5px;
    margin-top: 5px;
    flex-wrap: wrap;
  }
  .extra-filters {
    margin-top: 10px;
  }
  .filter-group {
    margin-bottom: 10px;
  }
  .filter-group label {
    font-weight: bold;
    margin-right: 5px;
    color: #000000;
  }
  .filter-button {
    padding: 5px 10px;
    background-color: #ffffff;
    color: #000000;
    border: 2px solid;
    border-radius: 50px;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
  }
  .filter-button.active {
    background-color: #998cad;
  }
  /* Star selector styling */
  .star-selector {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .star {
    font-size: 20px;
    cursor: pointer;
    color: #ccc;
    transition: color 0.2s;
  }
  .star:hover,
  .star.selected {
    color: gold;
  }
  .reset-button {
    background: none;
    border: none;
    color: #522398;
    cursor: pointer;
    font-size: 14px;
    padding: 0 5px;
  }
  /* Locations list styling */
  .locations-list {
    height: 70vh;
    overflow-y: auto;
  }
  .location-entry {
    display: flex;
    align-items: center;
    padding: 8px;
    border-bottom: 1px solid #ccc;
    cursor: pointer;
  }
  .location-entry.selected {
    background-color: #f0f0f0;
  }
  .location-entry:hover {
    background-color: #e0e0e0;
  }
  .dot {
    margin-right: 10px;
  }
  .info {
    display: flex;
    flex-direction: column;
  }
  .name {
    font-weight: bold;
    color: #522398;
  }
  .status {
    font-size: 12px;
  }
  /* Detail view back arrow */
  .back-arrow {
    background: none;
    border: none;
    color: #522398;
    font-size: 18px;
    margin-bottom: 10px;
    cursor: pointer;
  }
  /* Hours column styling */
  .hours-column {
    display: flex;
    flex-direction: column;
    margin-bottom: 15px;
  }
  .hours-column .day {
    margin-bottom: 5px;
    text-align: left;
    font-size: 12px;
    color: #522398;
  }
  .hours-column .day .day-name {
    font-weight: bold;
  }
  .hours-column .day .time {
    font-size: 10px;
  }
  /* Buttons styling */
  .buttons {
    display: flex;
    justify-content: space-between;
    margin-top: 15px;
  }
  .buttons button {
    flex: 1;
    margin: 0 5px;
    padding: 10px;
    background: #522398;
    color: #fff;
    border: none;
    border-radius: 50px;
    cursor: pointer;
    font-size: 16px;
    font-weight: bold;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
  }
  .buttons button:hover {
    background: #3e187b;
  }
  .custom-icon {
    display: flex;
    align-items: center;
  }
</style>