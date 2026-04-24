import React, { useEffect, useRef } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

const defaultCenter = { lat: 34.37, lng: 73.47 };

function GoogleMapView({ filteredData, selectedLocation, setSelectedLocation, setSelectedTask }) {
  const mapRef = useRef(null);

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
      {filteredData.map((trash) => (
        <Marker
          key={trash.id}
          position={{ lat: trash.latitude, lng: trash.longitude }}
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
