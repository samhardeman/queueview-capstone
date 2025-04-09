<script>
  import { onMount } from 'svelte';
  import L from 'leaflet';
  import "leaflet/dist/leaflet.css";
  import ActivityBar from './lib/ActivityBar.svelte';

  let map;
  let locations = [];
  let currentIndex = 0;
  let currentImage = "";
  let sidebarMode = 'list';

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
          .on('click', () => {
            selectLocation(index);
            sidebarMode = 'detail';
          });
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
  .desktop-layout {
    display: flex;
    height: 100vh;
  }
  .sidebar {
    width: 320px;
    background: #fff;
    padding: 20px;
    border-right: 1px solid #ccc;
    overflow-y: auto;
  }
  .map-container {
    flex: 1;
    position: relative;
  }
</style>

<div class="desktop-layout">
  <div class="sidebar">
    {#if sidebarMode === 'list'}
      <h3>Locations</h3>
      {#each locations as loc, i}
        <div on:click={() => { currentIndex = i; sidebarMode = 'detail'; }}>
          <p>{loc.name}</p>
        </div>
      {/each}
    {:else}
      <button on:click={() => sidebarMode = 'list'}>← Back</button>
      <h3>{locations[currentIndex]?.name || "Location"}</h3>
      {#if currentImage}
        <img src={currentImage} alt="Location" />
      {/if}
      <ActivityBar locationName={locations[currentIndex]?.name} />
    {/if}
  </div>

  <div class="map-container" id="map"></div>
</div>
