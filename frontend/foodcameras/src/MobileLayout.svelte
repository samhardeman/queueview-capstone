<script>
  import { onMount } from 'svelte';
  import L from 'leaflet';
  import "leaflet/dist/leaflet.css";
  import ActivityBar from './lib/ActivityBar.svelte';

  let map;
  let locations = [];
  let currentIndex = 0;
  let currentImage = "";
  let isLocationExpanded = false;

  const fetchLocations = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/locations');
      locations = await response.json();
      if (locations.length) {
        initializeMarkers();
        selectLocation(0);
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  };

  const initializeMarkers = () => {
    locations.forEach((loc, index) => {
      if (loc.latitude && loc.longitude) {
        L.marker([loc.latitude, loc.longitude])
          .addTo(map)
          .on('click', () => selectLocation(index));
      }
    });
  };

  const selectLocation = async (index) => {
    currentIndex = index;
    const loc = locations[index];
    map.setView([loc.latitude, loc.longitude], 20);

    const res = await fetch(`http://localhost:5000/api/location/${loc.name}`);
    const details = await res.json();
    if (details && details[0].image) {
      currentImage = `http://localhost:5000/api/image/${details[0].image}`;
    }
  };

  onMount(() => {
    map = L.map('map').setView([33.512950, -112.127405], 17);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    fetchLocations();
  });
</script>

<style>
  .mobile-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }
  .map-container {
    flex: 1;
    position: relative;
  }
  .bottom-sheet {
    position: absolute;
    bottom: 0;
    width: 100%;
    background: white;
    padding: 15px;
    box-shadow: 0 -2px 10px rgba(0,0,0,0.2);
    border-radius: 15px 15px 0 0;
    transition: transform 0.3s ease;
  }
</style>

<div class="mobile-container">
  <div class="map-container" id="map"></div>

  <div 
    class="bottom-sheet" 
    style="transform: translateY({isLocationExpanded ? '0%' : '80%'});" 
    on:click={() => isLocationExpanded = !isLocationExpanded}
  >
    <h3>{locations[currentIndex]?.name || "Location"}</h3>
    {#if currentImage}
      <img src={currentImage} alt="Location" />
    {/if}
    <ActivityBar locationName={locations[currentIndex]?.name} />
  </div>
</div>
