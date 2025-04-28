// Configuration and utility functions for Leaflet maps

// Default map center (ASU Tempe Campus area)
const DEFAULT_MAP_CENTER = [33.512950, -112.127405];
const DEFAULT_ZOOM = 17;

// Traffic level colors
const TRAFFIC_COLORS = {
  Empty: "#4CAF50",
  Low: "#4CAF50",
  Medium: "#FFEB3B",
  High: "#FF5252",
  Closed: "#9E9E9E"
};

// Create a custom icon for map markers
function createCustomMarker(level, isClosed = false, isSelected = false) {
  let color = isClosed ? TRAFFIC_COLORS.Closed : TRAFFIC_COLORS[level];
  
  const markerHtml = `
    <div style="
      background-color: ${color};
      width: 18px;
      height: 18px;
      border-radius: ${isSelected ? '0' : '50%'};
      border: 2px solid #000;
      transform: ${isSelected ? 'rotate(45deg)' : ''};
      box-shadow: 0 0 5px rgba(0,0,0,0.3);
    "></div>
  `;
  
  return L.divIcon({
    html: markerHtml,
    className: 'custom-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
}

// Initialize a Leaflet map
function initializeMap(elementId, center = DEFAULT_MAP_CENTER, zoom = DEFAULT_ZOOM) {
  const map = L.map(elementId).setView(center, zoom);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  
  return map;
}

// Format time from 24h format to 12h format
function formatTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Format hours display (e.g., "9:00 AM - 5:00 PM")
function formatHoursDisplay(openTime, closeTime) {
  if (openTime === "00:00" && closeTime === "00:00") {
    return "Closed";
  }
  return `${formatTime(openTime)} - ${formatTime(closeTime)}`;
}

// Determine if a location is currently open
function isLocationOpen(hoursData) {
  const now = new Date();
  const currentDay = now.toLocaleString('en-US', { weekday: 'long' });
  
  if (!hoursData || !hoursData[currentDay]) {
    return false;
  }
  
  const { open, close } = hoursData[currentDay];
  
  if (open === "00:00" && close === "00:00") {
    return false;
  }
  
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const [openHours, openMinutes] = open.split(':').map(Number);
  const [closeHours, closeMinutes] = close.split(':').map(Number);
  
  const openTotalMinutes = openHours * 60 + openMinutes;
  const closeTotalMinutes = closeHours * 60 + closeMinutes;
  
  return currentMinutes >= openTotalMinutes && currentMinutes < closeTotalMinutes;
}

// Export the utilities (in a real app, this would be handled by ES modules)
window.mapUtils = {
  DEFAULT_MAP_CENTER,
  DEFAULT_ZOOM,
  TRAFFIC_COLORS,
  createCustomMarker,
  initializeMap,
  formatTime,
  formatHoursDisplay,
  isLocationOpen
};
