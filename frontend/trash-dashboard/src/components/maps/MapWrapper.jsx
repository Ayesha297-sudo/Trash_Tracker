import React from 'react';
import LeafletMap from './LeafletMap';
import GoogleMap from './GoogleMap';

const USE_GOOGLE_MAPS = false;

function MapWrapper(props) {
  if (USE_GOOGLE_MAPS) {
    return <GoogleMap {...props} />;
  }

  return <LeafletMap {...props} />;
}

export default MapWrapper;
