<script>
    import { onMount, afterUpdate } from 'svelte';
    import L from 'leaflet';
    
    // Props
    export let map;
    export let markers = [];
    export let locations = [];
    export let filteredLocations = [];
    export let selectedLocationIndex = 0;
    export let onMarkerClick = () => {};
    export let getMarkerHtml;
    
    // Default map center
    const DEFAULT_CENTER = [33.512950, -112.127405];
    const DEFAULT_ZOOM = 17;
    
    // Initialize map on mount
    onMount(() => {
      // Create map
      map = L.map('map').setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      
      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
      
      // Create markers when locations are loaded
      if (locations.length > 0) {
        createMarkers();
      }
      
      // Clean up on component destroy
      return () => {
        if (map) {
          map.remove();
        }
      };
    });
    
    // Watch for changes in locations and update markers
    $: if (map && locations.length > 0 && markers.length === 0) {
      createMarkers();
    }
    
    // Create markers for all locations
    function createMarkers() {
      // Clear existing markers if any
      markers.forEach(marker => {
        if (map) map.removeLayer(marker);
      });
      markers = [];
      
      // Create markers for each location
      locations.forEach((location, index) => {
        if (location.latitude && location.longitude) {
          const marker = L.marker([location.latitude, location.longitude], {
            icon: L.divIcon({
              className: 'custom-marker',
              html: getMarkerHtml(location.trafficLevel, !location.isOpen, index === selectedLocationIndex)
            })
          }).addTo(map);
          
          // Add click handler
          marker.on('click', () => {
            onMarkerClick(location, index);
          });
          
          markers.push(marker);
        }
      });
    }
    
    // When selectedLocationIndex changes, update markers
    $: if (map && markers.length > 0 && selectedLocationIndex !== undefined) {
      markers.forEach((marker, index) => {
        if (marker && marker.getElement()) {
          marker.setIcon(L.divIcon({
            className: 'custom-marker',
            html: getMarkerHtml(
              locations[index].trafficLevel,
              !locations[index].isOpen,
              index === selectedLocationIndex
            )
          }));
        }
      });
    }
    
    // Center the map on location bounds when filtered locations change
    $: if (map && filteredLocations.length > 0) {
      const bounds = [];
      filteredLocations.forEach(loc => {
        if (loc.latitude && loc.longitude) {
          bounds.push([loc.latitude, loc.longitude]);
        }
      });
      
      if (bounds.length > 0) {
        try {
          map.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: 19
          });
        } catch (e) {
          console.warn("Could not fit bounds:", e);
        }
      }
    }
    
    // Handles map resize when parent container size changes
    afterUpdate(() => {
      if (map) {
        setTimeout(() => {
          map.invalidateSize();
        }, 100);
      }
    });
  </script>
  
  <div id="map" class="map-container"></div>
  
  <style>
    .map-container {
      width: 100%;
      height: 100%;
      z-index: 1;
    }
    
    :global(.custom-marker) {
      background-color: transparent !important;
      border: none !important;
    }
    
    :global(.leaflet-div-icon) {
      background: transparent;
      border: none;
    }
    
    :global(.leaflet-marker-icon) {
      transition: opacity 0.3s ease;
    }
    
    :global(.leaflet-control-zoom) {
      margin: 15px !important;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2) !important;
    }
    
    :global(.leaflet-control-zoom a) {
      background-color: #fff !important;
      color: #333 !important;
      border-color: #ddd !important;
    }
    
    :global(.leaflet-control-zoom a:hover) {
      background-color: #f5f5f5 !important;
    }
  </style>