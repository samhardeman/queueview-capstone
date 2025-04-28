// Main app logic
document.addEventListener('DOMContentLoaded', () => {
    // State
    let map;
    let markers = [];
    let locations = [];
    let filteredLocations = [];
    let selectedLocation = null;
    let selectedLocationIndex = -1;
    
    // UI elements
    const mapContainer = document.getElementById('map');
    const locationsList = document.getElementById('locations-list');
    const filtersPanel = document.getElementById('filters-panel');
    const detailsPanel = document.getElementById('details-panel');
    const filterToggle = document.getElementById('filter-toggle');
    const locationToggle = document.getElementById('location-toggle');
    
    // Check if device is mobile
    const isMobile = window.innerWidth <= 768;
    
    // Initialize map
    function initMap() {
      map = L.map('map').setView([33.512950, -112.127405], 17);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
      
      // Add locate control (find my location)
      try {
        L.control.locate({
          position: 'topleft',
          icon: 'fa fa-location-arrow',
          showPopup: false,
          strings: {
            title: "Show my location"
          },
          locateOptions: {
            enableHighAccuracy: true
          }
        }).addTo(map);
      } catch (error) {
        console.warn("Locate control not available:", error.message);
        // Fallback: Add a simple button that uses browser geolocation
        const locateControl = L.Control.extend({
          options: {
            position: 'topleft'
          },
          onAdd: function() {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            const button = L.DomUtil.create('a', 'locate-button', container);
            button.innerHTML = '📍';
            button.title = 'Show my location';
            button.href = '#';
            button.style.fontSize = '18px';
            button.style.textAlign = 'center';
            button.style.lineHeight = '30px';
            
            L.DomEvent.on(button, 'click', function(e) {
              L.DomEvent.stopPropagation(e);
              L.DomEvent.preventDefault(e);
              
              navigator.geolocation.getCurrentPosition(
                function(position) {
                  const latlng = [position.coords.latitude, position.coords.longitude];
                  map.setView(latlng, 17);
                  
                  // Add a marker
                  const locationMarker = L.marker(latlng, {
                    icon: L.divIcon({
                      className: 'current-location-marker',
                      html: '<div style="background-color:#2196F3; border-radius:50%; width:14px; height:14px; border:3px solid white;"></div>'
                    })
                  }).addTo(map);
                  
                  // Remove after 30 seconds
                  setTimeout(() => {
                    map.removeLayer(locationMarker);
                  }, 30000);
                },
                function(error) {
                  console.error("Error getting location:", error.message);
                  alert("Could not get your location. Please check your browser permissions.");
                }
              );
            });
            
            return container;
          }
        });
        
        map.addControl(new locateControl());
      }
    }
    
    // Fetch locations from API
    async function fetchLocations() {
      try {
        const response = await fetch('http://localhost:5000/api/locations');
        let rawLocations = await response.json();
        
        // Process the locations according to the provided API format
        locations = rawLocations.map(loc => ({
          name: loc.name,
          latitude: parseFloat(loc.latitude),
          longitude: parseFloat(loc.longitude),
          trafficLevel: loc.trafficLevel || "Empty", // Default to Empty if not provided
          stars: loc.stars || 0,
          quality: loc.quality || 0,
          turnaround: loc.turnaround || 10,
          tags: loc.tags || "",
          id: loc.id,
          building: loc.building,
          money: loc.money
        }));
        
        // Pre-fetch hours for each location using the existing API format
        await Promise.all(locations.map(async (location, index) => {
          try {
            const hoursResponse = await fetch(`http://localhost:5000/api/hours/${location.name}`);
            const hoursData = await hoursResponse.json();
            location.hoursData = hoursData;
            
            // Process hours data according to the provided API format
            const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
            const currentDay = new Date().toLocaleString('en-US', { weekday: 'long' });
            let idx = weekDays.indexOf(currentDay);
            if (idx === -1) idx = 0;
            const orderedDays = weekDays.slice(idx).concat(weekDays.slice(0, idx));
            location.orderedHours = orderedDays.map(day => ({ 
              day, 
              open: hoursData[day]?.open, 
              close: hoursData[day]?.close 
            }));
            
            // Check if location is currently open based on the API hours format
            const todaysHours = hoursData[currentDay];
            if (!todaysHours || (todaysHours.open === "00:00" && todaysHours.close === "00:00")) {
              location.isOpen = false;
            } else {
              location.isOpen = isLocationOpen(hoursData);
            }
          } catch (error) {
            console.error(`Error fetching hours for ${location.name}:`, error);
            location.isOpen = false;
            location.hoursData = {};
            location.orderedHours = [];
          }
        }));
        
        // Apply default filters
        filterLocations();
        
        // Create markers for all locations
        createMarkers();
        
        // Render location list
        renderLocationsList();
      } catch (error) {
        console.error('Error fetching locations:', error);
      }
    }
    
    // Filter locations based on current filters
    function filterLocations() {
      // Get filter values
      const openOnly = document.getElementById('open-only').checked;
      const busynessFilters = {
        Empty: document.getElementById('level-empty').checked,
        Low: document.getElementById('level-low').checked,
        Medium: document.getElementById('level-medium').checked,
        High: document.getElementById('level-high').checked
      };
      
      const minStars = parseInt(document.getElementById('min-stars').value) || 0;
      const minQuality = parseInt(document.getElementById('min-quality').value) || 0;
      const maxTurnaround = parseInt(document.getElementById('max-turnaround').value) || 999;
      
      // Get selected tags
      const selectedTags = [];
      document.querySelectorAll('.tag-checkbox:checked').forEach(checkbox => {
        selectedTags.push(checkbox.value);
      });
      
      // Apply filters
      filteredLocations = locations.filter(location => {
        // Open/closed filter
        if (openOnly && !location.isOpen) return false;
        
        // Busyness level filter
        if (!busynessFilters[location.trafficLevel]) return false;
        
        // Stars, quality, and turnaround filters
        if (location.stars < minStars) return false;
        if (location.quality < minQuality) return false;
        if (location.turnaround > maxTurnaround) return false;
        
        // Tags filter
        if (selectedTags.length > 0) {
          const locationTags = location.tags.split(',').map(tag => tag.trim());
          if (!locationTags.some(tag => selectedTags.includes(tag))) return false;
        }
        
        return true;
      });
      
      // Update markers visibility
      updateMarkerVisibility();
      
      // Update locations list
      renderLocationsList();
    }
    
    // Create markers for all locations
    function createMarkers() {
      // Clear existing markers
      markers.forEach(marker => map.removeLayer(marker));
      markers = [];
      
      // Create new markers
      locations.forEach((location, index) => {
        const isFiltered = filteredLocations.includes(location);
        const isSelected = selectedLocationIndex === index;
        const marker = createMarker(location, index, isFiltered, isSelected);
        markers.push(marker);
      });
    }
    
    // Create a single marker
    function createMarker(location, index, isFiltered, isSelected) {
      const marker = L.marker([location.latitude, location.longitude], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: createMarkerHtml(location.trafficLevel, !location.isOpen, isSelected)
        }),
        opacity: isFiltered ? 1 : 0.4
      }).addTo(map);
      
      marker.on('click', () => {
        selectLocation(index);
      });
      
      return marker;
    }
    
    // Create HTML for marker icon
    function createMarkerHtml(level, closed, selected) {
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
    
    // Update marker visibility based on filtered locations
    function updateMarkerVisibility() {
      locations.forEach((location, index) => {
        const isFiltered = filteredLocations.includes(location);
        if (markers[index]) {
          markers[index].setOpacity(isFiltered ? 1 : 0.4);
        }
      });
      
      // If filtered locations exist, fit map to their bounds
      if (filteredLocations.length > 0) {
        const bounds = filteredLocations.map(loc => [loc.latitude, loc.longitude]);
        if (bounds.length > 0) {
          map.fitBounds(bounds);
        }
      }
    }
    
    // Render the locations list
    function renderLocationsList() {
      locationsList.innerHTML = '';
      
      // Show count
      const countElement = document.createElement('div');
      countElement.classList.add('locations-count');
      countElement.textContent = `Locations ${filteredLocations.length}/${locations.length}`;
      locationsList.appendChild(countElement);
      
      // Show locations
      filteredLocations.forEach((location, index) => {
        const locationCard = document.createElement('div');
        locationCard.classList.add('location-card');
        if (selectedLocation && selectedLocation.name === location.name) {
          locationCard.classList.add('selected');
        }
        
        locationCard.innerHTML = `
          <div class="location-header">
            <h3>${location.name}</h3>
            <span class="status ${location.isOpen ? 'open' : 'closed'}">
              ${location.isOpen ? 'Open' : 'Closed'}
            </span>
          </div>
          
          <div class="details">
            <div class="busyness-indicator">
              ${createBusynessIndicator(location.trafficLevel)}
            </div>
            
            <div class="meta">
              <div class="stars">
                ${createStarsHtml(location.stars)}
              </div>
              
              <div class="tags">
                ${createTagsHtml(location.tags)}
              </div>
            </div>
          </div>
        `;
        
        locationCard.addEventListener('click', () => {
          const locationIndex = locations.findIndex(loc => loc.name === location.name);
          selectLocation(locationIndex);
        });
        
        locationsList.appendChild(locationCard);
      });
      
      // If no locations match filters
      if (filteredLocations.length === 0) {
        const noResults = document.createElement('div');
        noResults.classList.add('no-results');
        noResults.textContent = 'No locations match your filters';
        locationsList.appendChild(noResults);
      }
    }
    
    // Create HTML for busyness indicator
    function createBusynessIndicator(level) {
      const dotCount = {
        "Empty": 1,
        "Low": 2,
        "Medium": 3,
        "High": 4
      }[level] || 0;
      
      const color = {
        "Empty": "#00C851",
        "Low": "#6DCC64",
        "Medium": "#FFEB3B",
        "High": "#FF4444"
      }[level] || "#9E9E9E";
      
      let dotsHtml = '';
      for (let i = 0; i < 4; i++) {
        const isActive = i < dotCount;
        dotsHtml += `<div class="dot ${isActive ? 'active' : ''}" style="${isActive ? `background-color: ${color}` : ''}"></div>`;
      }
      
      return `<div class="dots">${dotsHtml}</div>`;
    }
    
    // Create HTML for stars display
    function createStarsHtml(stars) {
      let html = '';
      for (let i = 0; i < 5; i++) {
        html += `<span class="star">${i < stars ? '★' : '☆'}</span>`;
      }
      return html;
    }
    
    // Create HTML for tags display
    function createTagsHtml(tagsString) {
      const tags = tagsString.split(',').map(tag => tag.trim());
      
      // Show first 2 tags and a count for the rest
      let html = '';
      const visibleTags = tags.slice(0, 2);
      
      visibleTags.forEach(tag => {
        html += `<span class="tag">${tag}</span>`;
      });
      
      if (tags.length > 2) {
        html += `<span class="tag">+${tags.length - 2}</span>`;
      }
      
      return html;
    }
    
    // Select a location and show details
    async function selectLocation(index) {
      try {
        console.log(`Selecting location with index: ${index}`);
        selectedLocationIndex = index;
        selectedLocation = locations[index];
        
        console.log(`Selected location:`, selectedLocation);
        
        // Update markers to show selection
        locations.forEach((loc, i) => {
          if (markers[i]) {
            markers[i].setIcon(L.divIcon({
              className: 'custom-marker',
              html: createMarkerHtml(loc.trafficLevel, !loc.isOpen, i === selectedLocationIndex)
            }));
          }
        });
        
        // Center map on selected location
        if (selectedLocation) {
          map.setView([selectedLocation.latitude, selectedLocation.longitude], 18);
        }
        
        // Highlight selected location in list
        renderLocationsList();
        
        // Fetch and show location details
        await showLocationDetails(selectedLocation);
        
        // Show details panel
        detailsPanel.classList.add('visible');
        
        // On mobile, collapse other panels
        if (isMobile) {
          filtersPanel.classList.remove('expanded');
        }
      } catch (error) {
        console.error('Error selecting location:', error);
      }
    }
    
    // Show location details in the details panel
    async function showLocationDetails(location) {
      detailsPanel.innerHTML = `<div class="loading">Loading details...</div>`;
      
      try {
        // Fetch detailed information - handle the new API format
        const detailsResponse = await fetch(`http://localhost:5000/api/location/${location.name}`);
        const detailsData = await detailsResponse.json();
        
        // Handle the API format provided in the sample data
        let details = {
          name: location.name,
          description: "", // Default empty description
          image: detailsData[0]?.image || null
        };
        
        if (detailsData && detailsData.length > 0) {
          details.cameraId = detailsData[0].cameraId;
          details.peopleCount = detailsData[0].peopleCount;
          details.timestamp = detailsData[0].timestamp;
        }
        
        // Fetch hours data according to the API format
        const hoursResponse = await fetch(`http://localhost:5000/api/hours/${location.name}`);
        const hoursData = await hoursResponse.json();
        
        // Process hours data according to the provided format
        const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        const currentDay = new Date().toLocaleString('en-US', { weekday: 'long' });
        let idx = weekDays.indexOf(currentDay);
        if (idx === -1) idx = 0;
        const orderedDays = weekDays.slice(idx).concat(weekDays.slice(0, idx));
        const orderedHours = orderedDays.map(day => ({ 
          day, 
          open: hoursData[day]?.open, 
          close: hoursData[day]?.close 
        }));
        
        // Check if currently closed - match the API format
        const todaysHours = hoursData[currentDay];
        let isClosed = true;
        if (todaysHours && !(todaysHours.open === "00:00" && todaysHours.close === "00:00")) {
          isClosed = !isLocationOpen(hoursData);
        }
        
        // Generate details HTML
        let html = `
          <div class="details-header">
            <h2>${location.name}</h2>
            <button id="close-details" class="close-button">×</button>
          </div>
          
          <div class="details-content">
        `;
        
        // Image - use the provided image format
        if (details.image) {
          try {
            const imageResponse = await fetch(`http://localhost:5000/api/image/${details.image}`);
            // Use blob() to get the binary data of the image
            const imageBlob = await imageResponse.blob();
            // Create an object URL for the image blob
            const imageUrl = URL.createObjectURL(imageBlob);
            html += `
              <div class="image-container">
                <img src="${imageUrl}" alt="${location.name}" />
              </div>
            `;
          } catch (imageError) {
            console.error('Error loading image:', imageError);
          }
        }
        
        
        // Building information if available
        if (location.building) {
          html += `
            <div class="building-info">
              <p><strong>Building:</strong> ${location.building}</p>
            </div>
          `;
        }
        
        // People count if available from API
        if (details.peopleCount !== undefined) {
          html += `
            <div class="people-count">
              <p><strong>Current people count:</strong> ${details.peopleCount}</p>
              <p><small>Last updated: ${new Date(details.timestamp).toLocaleString()}</small></p>
            </div>
          `;
        }
        
        // Status and traffic
        html += `
          <div class="status-row">
            <div class="status-pill ${!isClosed ? 'open' : 'closed'}">
              ${!isClosed ? 'Open Now' : 'Closed'}
            </div>
            
            <div class="traffic-level">
              <span>Current traffic:</span>
              ${createBusynessIndicator(location.trafficLevel)}
              <span>${location.trafficLevel}</span>
            </div>
          </div>
        `;
        
        // Metrics
        html += `
          <div class="metrics">
            <div class="metric">
              <span class="label">Rating:</span>
              <div class="stars">${createStarsHtml(location.stars)}</div>
              <span class="value">(${location.stars.toFixed(1)})</span>
            </div>
            
            <div class="metric">
              <span class="label">Quality:</span>
              <div class="quality-bar">
                <div class="quality-fill" style="width: ${location.quality * 20}%"></div>
              </div>
              <span class="value">${location.quality}/5</span>
            </div>
            
            <div class="metric">
              <span class="label">Avg. Wait:</span>
              <span class="value">${location.turnaround} min</span>
            </div>
        `;
        
        // Price indicator (Money metric) if available
        if (location.money !== undefined) {
          const moneySymbol = '💲'.repeat(location.money || 1);
          html += `
            <div class="metric">
              <span class="label">Price:</span>
              <span class="value">${moneySymbol}</span>
            </div>
          `;
        }
        
        html += `</div>`;
        
        // Tags
        const tags = location.tags.split(',').map(tag => tag.trim());
        html += `
          <div class="tags-section">
            <h3>Tags</h3>
            <div class="tags">
              ${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
          </div>
        `;
        
        // Hours
        html += `
          <div class="hours-section">
            <h3>Hours of Operation</h3>
            <div class="hours-table">
        `;
        
        // Use ordered hours
        orderedHours.forEach(hour => {
          const isToday = hour.day === currentDay;
          let timeDisplay = "Closed";
          
          if (hour.open && hour.close && !(hour.open === "00:00" && hour.close === "00:00")) {
            timeDisplay = `${formatTime(hour.open)} - ${formatTime(hour.close)}`;
          }
          
          html += `
            <div class="hour-row ${isToday ? 'today' : ''}">
              <div class="day">${hour.day}</div>
              <div class="time">${timeDisplay}</div>
            </div>
          `;
        });
        
        html += `
            </div>
          </div>
        `;
        
        // Description
        if (details.description) {
          html += `
            <div class="description">
              <h3>About</h3>
              <p>${details.description}</p>
            </div>
          `;
        }
        
        html += `</div>`;
        
        detailsPanel.innerHTML = html;
        
        // Add event listener to close button
        document.getElementById('close-details').addEventListener('click', () => {
          detailsPanel.classList.remove('visible');
        });
      } catch (error) {
        console.error('Error fetching location details:', error);
        detailsPanel.innerHTML = `
          <div class="details-header">
            <h2>${location.name}</h2>
            <button id="close-details" class="close-button">×</button>
          </div>
          <div class="error">Error loading details</div>
        `;
        
        document.getElementById('close-details').addEventListener('click', () => {
          detailsPanel.classList.remove('visible');
        });
      }
    }
    
    // Helper: Check if a location is currently open (matching your API format)
    function isLocationOpen(hoursData) {
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
    
    // Helper: Format time from 24-hour format to 12-hour format
    function formatTime(timeStr) {
      const [hour, minute] = timeStr.split(':').map(Number);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const h = hour % 12 || 12;
      return `${h}:${minute.toString().padStart(2, '0')} ${ampm}`;
    }
    
    // Set up event listeners
    function setupEventListeners() {
      // Filter form
      document.getElementById('filters-form').addEventListener('change', filterLocations);
      document.getElementById('reset-filters').addEventListener('click', resetFilters);
      document.getElementById('reset-all').addEventListener('click', resetFilters);
      
      // Star rating buttons
      document.querySelectorAll('.star-button').forEach(button => {
        button.addEventListener('click', (e) => {
          const value = parseInt(e.target.dataset.value);
          document.getElementById('min-stars').value = value;
          
          // Update active stars
          document.querySelectorAll('.star-button').forEach(star => {
            star.classList.toggle('active', parseInt(star.dataset.value) <= value);
          });
          
          filterLocations();
        });
      });
      
      // Mobile filter buttons
      const filterSections = {
        'open-filter': 0,
        'busyness-filter': 1,
        'tags-filter': 2,
        'rating-filter': 3,
        'quality-filter': 4,
        'wait-filter': 5
      };
      
      // Add event listeners to mobile filter buttons
      Object.keys(filterSections).forEach(filterId => {
        const button = document.getElementById(filterId);
        if (button) {
          button.addEventListener('click', () => {
            // Toggle active state for this button
            button.classList.toggle('active');
            
            // Get all filter sections
            const sections = document.querySelectorAll('.filter-section');
            
            // If button is active, show its section and hide others
            if (button.classList.contains('active')) {
              filtersPanel.classList.add('expanded');
              
              // Hide all sections first
              sections.forEach(section => {
                section.style.display = 'none';
              });
              
              // Show only the selected section
              const sectionIndex = filterSections[filterId];
              if (sections[sectionIndex]) {
                sections[sectionIndex].style.display = 'block';
              }
            } else {
              // If no buttons are active, hide the filter panel
              const activeButtons = document.querySelectorAll('.mobile-toggle.active');
              if (activeButtons.length === 0) {
                filtersPanel.classList.remove('expanded');
              }
            }
          });
        }
      });
      
      // Quality and wait time sliders
      document.getElementById('min-quality').addEventListener('input', (e) => {
        document.getElementById('min-quality-value').textContent = e.target.value;
      });
      
      document.getElementById('max-turnaround').addEventListener('input', (e) => {
        document.getElementById('max-turnaround-value').textContent = e.target.value;
      });
      
      // Busyness level buttons
      document.querySelectorAll('.busyness-button').forEach(button => {
        button.addEventListener('click', () => {
          const checkbox = document.getElementById(button.getAttribute('for'));
          if (checkbox) {
            button.classList.toggle('excluded', !checkbox.checked);
          }
        });
      });
      
      // Window resize
      window.addEventListener('resize', handleResize);
    }
    
    // Reset all filters to default
    function resetFilters() {
      document.getElementById('open-only').checked = false;
      
      document.getElementById('level-empty').checked = true;
      document.getElementById('level-low').checked = true;
      document.getElementById('level-medium').checked = true;
      document.getElementById('level-high').checked = true;
      
      document.querySelectorAll('.busyness-button').forEach(button => {
        button.classList.remove('excluded');
      });
      
      document.getElementById('min-stars').value = 0;
      document.querySelectorAll('.star-button').forEach(star => {
        star.classList.remove('active');
      });
      
      document.getElementById('min-quality').value = 0;
      document.getElementById('min-quality-value').textContent = 0;
      
      document.getElementById('max-turnaround').value = 60;
      document.getElementById('max-turnaround-value').textContent = 60;
      
      document.querySelectorAll('.tag-checkbox').forEach(checkbox => {
        checkbox.checked = false;
      });
      
      filterLocations();
    }
    
    // Handle window resize
    function handleResize() {
      const newIsMobile = window.innerWidth <= 768;
      
      if (newIsMobile !== isMobile) {
        window.location.reload();
      }
      
      if (map) {
        map.invalidateSize();
      }
    }
    
    // Populate tags filter
    function populateTagsFilter() {
      const tagsContainer = document.getElementById('tags-container');
      if (!tagsContainer) return;
      
      // Get all unique tags from locations
      const allTags = new Set();
      locations.forEach(location => {
        location.tags.split(',').forEach(tag => {
          allTags.add(tag.trim());
        });
      });
      
      // Create checkboxes for each tag
      allTags.forEach(tag => {
        const tagItem = document.createElement('div');
        tagItem.classList.add('tag-item');
        
        tagItem.innerHTML = `
          <label>
            <input type="checkbox" class="tag-checkbox" value="${tag}">
            <span>${tag}</span>
          </label>
        `;
        
        tagsContainer.appendChild(tagItem);
      });
    }
    
    // Initialize the application
    async function initialize() {
      try {
        console.log("Initializing application...");
        initMap();
        console.log("Map initialized");
        
        await fetchLocations();
        console.log(`Loaded ${locations.length} locations, ${filteredLocations.length} after filtering`);
        
        populateTagsFilter();
        console.log("Tags filter populated");
        
        setupEventListeners();
        console.log("Event listeners set up");
        
        // Log some debug info
        console.log("Map:", map);
        console.log("Markers:", markers);
        console.log("Mobile view:", isMobile);
        
        // Force a re-render of the locations list
        setTimeout(() => {
          console.log("Re-rendering locations list...");
          renderLocationsList();
        }, 500);
      } catch (error) {
        console.error("Error during initialization:", error);
      }
    }
    
    // Start the application
    initialize();
  });