import React, { useEffect, useRef } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

const defaultCenter = { lat: 34.37, lng: 73.47 };
const icons = {
  Pending: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
  Assigned: 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
  Done: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
};
const getMarkerIcon = (status) => icons[status] || icons.Pending;

function GoogleMapView({ filteredData, selectedLocation, setSelectedLocation, setSelectedTask }) {
  const mapRef = useRef(null);
  const dataString = JSON.stringify(filteredData || []);

  useEffect(() => {
    const markerData = JSON.parse(dataString);
    if (!mapRef.current || markerData.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();
    markerData.forEach((trash) => {
      bounds.extend({ lat: trash.latitude, lng: trash.longitude });
    });
    mapRef.current.fitBounds(bounds);
  }, [dataString]);

  useEffect(() => {
    if (mapRef.current && selectedLocation) {
      mapRef.current.panTo(selectedLocation);
      mapRef.current.setZoom(18);
    }
  }, [selectedLocation]);

  return (
    <GoogleMap
      mapContainerStyle={{ height: '100%', width: '100%', borderRadius: '15px' }}
      center={selectedLocation || defaultCenter}
      zoom={12}
      options={{ mapTypeId: 'hybrid', fullscreenControl: false }}
      onLoad={(map) => {
        mapRef.current = map;
      }}
      onUnmount={() => {
        mapRef.current = null;
      }}
    >
      {(filteredData || []).map((trash) => (
        <Marker
          key={trash.id}
          position={{ lat: trash.latitude, lng: trash.longitude }}
          icon={{
            url: getMarkerIcon(trash.status),
            scaledSize: new window.google.maps.Size(32, 32)
          }}
          onClick={() => {
            setSelectedTask(trash);
            setSelectedLocation({ lat: trash.latitude, lng: trash.longitude });
          }}
        />
      ))}
    </GoogleMap>
  );
}

function GoogleMapComponent(props) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          color: '#334155',
          fontWeight: 600
        }}
      >
        Google Maps API key not configured
      </div>
    );
  }

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'trash-tracker-google-map',
    googleMapsApiKey: apiKey
  });

  if (loadError) {
    return (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          color: '#334155',
          fontWeight: 600
        }}
      >
        Google Maps API key not configured
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          color: '#334155',
          fontWeight: 600
        }}
      >
        Loading map...
      </div>
    );
  }

  return <GoogleMapView {...props} />;
}

export default GoogleMapComponent;
