<script>
  import { onMount } from 'svelte';
  import L from 'leaflet';
  import "leaflet/dist/leaflet.css";
  import ActivityBar from './lib/ActivityBar.svelte';
  import LocationCard from './lib/LocationCard.svelte';
  import LocationDetails from './lib/LocationDetails.svelte';
  import FilterPanel from './lib/FilterPanel.svelte';
  import MapView from './lib/MapView.svelte';
  import TagMenu from './lib/TagMenu.svelte';
  import BusynessIndicator from './lib/BusynessIndicator.svelte';

  // State for locations and filtering
  let map;
  let locations = [];
  let filteredLocations = [];
  let selectedLocation = null;
  let selectedLocationIndex = 0;
  let isDetailsOpen = false;
  let isTagMenuOpen = false;
  let isLoading = true;
  let markers = [];

  // Mobile-specific state
  let isMobile = false;
  let isFiltersExpanded = true;
  let isLocationsExpanded = true;

  // Filter variables
  let filterOpenOnly = false;
  let allowedLevels = new Set(["Empty", "Low", "Medium", "High"]);
  let selectedTags = new Set();
  let minStars = 0;
  let minQuality = 0;
  let maxTurnaround = 999;

  // Compute all unique tags from locations
  $: allTags = Array.from(
    new Set(locations.flatMap(loc => loc.tags.split(',').map(t => t.trim())))
  );

  // Filter locations based on current filter settings
  $: {
    filteredLocations = locations
      .map((loc, index) => ({ ...loc, originalIndex: index }))
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
    
    if (map && markers.length > 0) {
      updateMarkerOpacity();
    }
  }

  // Update marker opacity based on filtered status
  function updateMarkerOpacity() {
    const filteredIndices = new Set(filteredLocations.map(loc => loc.originalIndex));
    
    locations.forEach((loc, index) => {
      if (markers[index]) {
        const markerElement = markers[index].getElement();
        if (markerElement) {
          if (filteredIndices.has(index)) {
            markerElement.style.opacity = "1";
          } else {
            markerElement.style.opacity = "0.4";
          }
        }
      }
    });
  }

  // Check for mobile/desktop based on screen width
  function checkMobile() {
    isMobile = window.innerWidth <= 768;
    
    // Set default states based on device
    if (!isMobile) {
      isFiltersExpanded = true;
      isLocationsExpanded = true;
    }
  }

  // Generate HTML for marker icons
  function getMarkerHtml(level, closed = false, selected = false) {
    let bgColor;
    
    if (closed) {
      bgColor = "#9E9E9E";
    } else {
      if (level === "Empty" || level === "Low") {
        bgColor = "#00C851";
      } else if (level === "Medium") {
        bgColor = "#FFEB3B";
      } else if (level === "High") {
        bgColor = "#ff4444";
      } else {
        bgColor = "#9E9E9E";
      }
    }
    
    const borderRadius = selected ? "0" : "50%";
    const transform = selected ? "rotate(45deg)" : "";
    
    return `<div style="
      background-color: ${bgColor};
      border: 2px solid #000;
      border-radius: ${borderRadius};
      width: 16px;
      height: 16px;
      transform: ${transform};
      box-shadow: 0 0 8px rgba(0,0,0,0.6);
    "></div>`;
  }

  // Select a location to view details
  function selectLocation(location, index) {
    selectedLocation = location;
    selectedLocationIndex = index;
    isDetailsOpen = true;
    
    if (isMobile) {
      isFiltersExpanded = false;
      isLocationsExpanded = false;
    }
    
    // Center the map on the selected location
    if (map && location.latitude && location.longitude) {
      map.setView([location.latitude, location.longitude], 18);
    }
    
    // Update markers to show which one is selected
    updateMarkers();
  }

  // Update markers appearance
  function updateMarkers() {
    if (!map || markers.length === 0) return;
    
    markers.forEach((marker, index) => {
      const isSelected = index === selectedLocationIndex;
      const isFiltered = filteredLocations.some(loc => loc.originalIndex === index);
      const opacity = isFiltered ? "1" : "0.4";
      
      // Update marker appearance
      marker.setIcon(L.divIcon({
        className: 'custom-marker',
        html: getMarkerHtml(locations[index].trafficLevel, !locations[index].isOpen, isSelected),
      }));
      
      marker.getElement().style.opacity = opacity;
    });
  }

  // Toggle filters panel
  function toggleFilters() {
    isFiltersExpanded = !isFiltersExpanded;
  }

  // Toggle locations panel
  function toggleLocations() {
    isLocationsExpanded = !isLocationsExpanded;
  }

  // Toggle tag menu
  function toggleTagMenu() {
    isTagMenuOpen = !isTagMenuOpen;
  }

  // Close details view
  function closeDetails() {
    isDetailsOpen = false;
    
    if (isMobile) {
      isLocationsExpanded = true;
    }
  }

  // Toggle a tag in the filter
  function toggleTag(tag) {
    if (selectedTags.has(tag)) {
      selectedTags.delete(tag);
    } else {
      selectedTags.add(tag);
    }
    selectedTags = new Set([...selectedTags]);
  }

  // Check if a location is currently open
  function isOpenNow(hoursData) {
    const currentDay = new Date().toLocaleString('en-US', { weekday: 'long' });
    const todaysHours = hoursData[currentDay];
    
    if (!todaysHours || (todaysHours.open === "00:00" && todaysHours.close === "00:00")) {
      return false;
    }
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const [openHour, openMinute] = todaysHours.open.split(':').map(Number);
    const [closeHour, closeMinute] = todaysHours.close.split(':').map(Number);
    
    const openMinutes = openHour * 60 + openMinute;
    const closeMinutes = closeHour * 60 + closeMinute;
    
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  }

  // Fetch locations from API
  async function fetchLocations() {
    try {
      const response = await fetch('http://localhost:5000/api/locations');
      locations = await response.json();
      
      // Pre-fetch hours data for all locations
      await Promise.all(locations.map(async (loc, index) => {
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
      
      isLoading = false;
    } catch (error) {
      console.error("Error fetching locations:", error);
      isLoading = false;
    }
  }

  // Initialize app on mount
  onMount(() => {
    // Set up responsive handling
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Fetch locations
    fetchLocations();
    
    // Clean up event listener on component destroy
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  });
</script>

<svelte:head>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
</svelte:head>

<main class={isMobile ? 'mobile-layout' : 'desktop-layout'}>
  <!-- Left sidebar for desktop, collapsible panels for mobile -->
  <div class="sidebar" class:expanded={isFiltersExpanded || isLocationsExpanded}>
    <!-- Filters toggle for mobile -->
    {#if isMobile}
      <div class="mobile-toggles">
        <button class="toggle-button" on:click={toggleFilters}>
          {isFiltersExpanded ? '▲ Hide Filters' : '▼ Show Filters'}
        </button>
        <button class="toggle-button" on:click={toggleLocations}>
          {isLocationsExpanded ? '▲ Hide Locations' : '▼ Show Locations'}
        </button>
      </div>
    {/if}
    
    <!-- Filters panel -->
    {#if isFiltersExpanded}
      <FilterPanel 
        bind:filterOpenOnly 
        bind:allowedLevels 
        bind:minStars 
        bind:minQuality 
        bind:maxTurnaround 
        allTags={allTags} 
        bind:selectedTags 
        {toggleTag}
        {toggleTagMenu}
        isTagMenuOpen={isTagMenuOpen}
      />
    {/if}
    
    <!-- Tag menu overlay -->
    {#if isTagMenuOpen}
      <TagMenu 
        allTags={allTags} 
        bind:selectedTags 
        {toggleTag} 
        close={() => isTagMenuOpen = false}
      />
    {/if}
    
    <!-- Locations list -->
    {#if isLocationsExpanded}
      <div class="locations-list">
        <h2>Locations {filteredLocations.length}/{locations.length}</h2>
        {#if filteredLocations.length === 0 && !isLoading}
          <p class="no-results">No locations match your filters</p>
        {:else if isLoading}
          <p class="loading">Loading locations...</p>
        {:else}
          {#each filteredLocations as location, index (location.name)}
            <LocationCard 
              location={location} 
              isSelected={selectedLocation && selectedLocation.name === location.name}
              onClick={() => selectLocation(location, location.originalIndex)}
            />
          {/each}
        {/if}
      </div>
    {/if}
  </div>
  
  <!-- Map area -->
  <div class="map-container" class:with-details={isDetailsOpen && !isMobile}>
    <MapView 
      bind:map 
      bind:markers 
      locations={locations}
      filteredLocations={filteredLocations}
      selectedLocationIndex={selectedLocationIndex}
      onMarkerClick={(location, index) => selectLocation(location, index)}
      getMarkerHtml={getMarkerHtml}
    />
  </div>
  
  <!-- Location details panel (overlay for desktop, full screen for mobile) -->
  {#if isDetailsOpen && selectedLocation}
    <LocationDetails 
      location={selectedLocation} 
      isMobile={isMobile} 
      onClose={closeDetails}
    />
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: 'Roboto', sans-serif;
    overflow: hidden;
    height: 100vh;
  }
  
  main {
    display: flex;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }
  
  .desktop-layout {
    flex-direction: row;
  }
  
  .mobile-layout {
    flex-direction: column;
  }
  
  .sidebar {
    background: #f5f5f5;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    z-index: 10;
  }
  
  .desktop-layout .sidebar {
    width: 350px;
    height: 100%;
    border-right: 1px solid #ddd;
  }
  
  .mobile-layout .sidebar {
    width: 100%;
    max-height: 70vh;
  }
  
  .mobile-toggles {
    display: flex;
    justify-content: space-between;
    padding: 10px;
    background: #e0e0e0;
  }
  
  .toggle-button {
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 20px;
    padding: 5px 15px;
    font-size: 14px;
    cursor: pointer;
  }
  
  .locations-list {
    padding: 10px;
    overflow-y: auto;
  }
  
  .locations-list h2 {
    margin-top: 0;
    margin-bottom: 10px;
    font-size: 18px;
  }
  
  .map-container {
    flex: 1;
    height: 100%;
    position: relative;
  }
  
  .with-details {
    position: relative;
  }
  
  .no-results, .loading {
    text-align: center;
    padding: 20px;
    color: #666;
  }
  
  /* Hide scrollbar for Chrome, Safari and Opera */
  ::-webkit-scrollbar {
    width: 6px;
  }
  
  ::-webkit-scrollbar-track {
    background: #f1f1f1;
  }
  
  ::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 3px;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
  
  /* Desktop specific styles */
  @media (min-width: 769px) {
    .mobile-toggles {
      display: none;
    }
  }
  
  /* Mobile specific styles */
  @media (max-width: 768px) {
    .sidebar:not(.expanded) {
      max-height: 40px;
    }
  }
</style>