import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const createIcon = (colorUrl) =>
  new L.Icon({
    iconUrl: colorUrl,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

const redIcon = createIcon(
  'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png'
);
const yellowIcon = createIcon(
  'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png'
);
const greenIcon = createIcon(
  'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png'
);

function FlyToLocation({ target }) {
  const map = useMap();

  useEffect(() => {
    if (!target) {
      return;
    }

    map.flyTo([target.lat, target.lng], 18, { duration: 1.5 });
  }, [target, map]);

  return null;
}

function FitBoundsToData({ data }) {
  const map = useMap();
  const dataString = JSON.stringify(data);

  useEffect(() => {
    if (data && data.length > 0) {
      const bounds = L.latLngBounds(data.map((item) => [item.latitude, item.longitude]));
      map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 15, duration: 1.5 });
    }
  }, [dataString, map]);

  return null;
}

function MapResizer({ isCollapsed }) {
  const map = useMap();

  useEffect(() => {
    const interval = setInterval(() => {
      map.invalidateSize();
    }, 50);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      map.invalidateSize();
    }, 400);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isCollapsed, map]);

  return null;
}

function LeafletMap({
  filteredData,
  selectedLocation,
  setSelectedLocation,
  setSelectedTask,
  isCollapsed
}) {
  return (
    <MapContainer
      center={[34.37, 73.47]}
      zoom={12}
      zoomControl={false}
      style={{ height: '100%', width: '100%', borderRadius: '15px' }}
    >
      <TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" attribution="&copy; Google Maps" />

      <MapResizer isCollapsed={isCollapsed} />
      <FlyToLocation target={selectedLocation} />
      <FitBoundsToData data={filteredData} />

      {filteredData.map((trash) => (
        <Marker
          key={trash.id}
          position={[trash.latitude, trash.longitude]}
          icon={trash.status === 'Pending' ? redIcon : trash.status === 'Assigned' ? yellowIcon : greenIcon}
          eventHandlers={{
            click: () => {
              setSelectedTask(trash);
              setSelectedLocation({ lat: trash.latitude, lng: trash.longitude });
            }
          }}
        />
      ))}
    </MapContainer>
  );
}

export default LeafletMap;
