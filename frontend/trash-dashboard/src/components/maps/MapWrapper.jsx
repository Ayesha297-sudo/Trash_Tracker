import React from 'react';
import LeafletMap from './LeafletMap';
import GoogleMap from './GoogleMap';

const USE_GOOGLE_MAPS = import.meta.env.VITE_USE_GOOGLE_MAPS === 'true';

function MapWrapper(props) {
  return USE_GOOGLE_MAPS ? <GoogleMap {...props} /> : <LeafletMap {...props} />;
}

export default MapWrapper;
