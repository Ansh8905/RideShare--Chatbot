// ============================================================
// RideSharePro — Live Google Map Component
// Shows driver location, pickup/dropoff markers, and route
// ============================================================

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    GoogleMap,
    useJsApiLoader,
    Marker,
    DirectionsRenderer,
    InfoWindow,
} from '@react-google-maps/api';

interface LiveMapProps {
    driverLocation: { lat: number; lng: number };
    pickupLocation: { lat: number; lng: number };
    dropoffLocation: { lat: number; lng: number };
    driverName: string;
    driverVehicle: string;
    driverEta: number;
    rideStatus: string;
}

// Minimal Light theme map style for premium look
const lightMapStyle: google.maps.MapTypeStyle[] = [
    {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [{ color: '#e9e9e9' }, { lightness: 17 }],
    },
    {
        featureType: 'landscape',
        elementType: 'geometry',
        stylers: [{ color: '#f5f5f5' }, { lightness: 20 }],
    },
    {
        featureType: 'road.highway',
        elementType: 'geometry.fill',
        stylers: [{ color: '#ffffff' }, { lightness: 17 }],
    },
    {
        featureType: 'road.highway',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#ffffff' }, { lightness: 29 }, { weight: 0.2 }],
    },
    {
        featureType: 'road.arterial',
        elementType: 'geometry',
        stylers: [{ color: '#ffffff' }, { lightness: 18 }],
    },
    {
        featureType: 'road.local',
        elementType: 'geometry',
        stylers: [{ color: '#ffffff' }, { lightness: 16 }],
    },
    {
        featureType: 'poi',
        elementType: 'geometry',
        stylers: [{ color: '#f5f5f5' }, { lightness: 21 }],
    },
    {
        featureType: 'poi.park',
        elementType: 'geometry',
        stylers: [{ color: '#dedede' }, { lightness: 21 }],
    },
    {
        elementType: 'labels.text.stroke',
        stylers: [{ visibility: 'on' }, { color: '#ffffff' }, { lightness: 16 }],
    },
    {
        elementType: 'labels.text.fill',
        stylers: [{ saturation: 36 }, { color: '#333333' }, { lightness: 40 }],
    },
    {
        elementType: 'labels.icon',
        stylers: [{ visibility: 'off' }],
    },
    {
        featureType: 'transit',
        elementType: 'geometry',
        stylers: [{ color: '#f2f2f2' }, { lightness: 19 }],
    },
    {
        featureType: 'administrative',
        elementType: 'geometry.fill',
        stylers: [{ color: '#fefefe' }, { lightness: 20 }],
    },
    {
        featureType: 'administrative',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#fefefe' }, { lightness: 17 }, { weight: 1.2 }],
    },
];

const containerStyle = {
    width: '100%',
    height: '100%',
    borderRadius: '16px',
};

const LiveMap: React.FC<LiveMapProps> = ({
    driverLocation,
    pickupLocation,
    dropoffLocation,
    driverName,
    driverVehicle,
    driverEta,
    rideStatus,
}) => {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: apiKey,
        libraries: ['places'],
    });

    const mapRef = useRef<google.maps.Map | null>(null);
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
    const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
    const [driverPosition, setDriverPosition] = useState(driverLocation);

    // Animate driver position smoothly
    useEffect(() => {
        setDriverPosition(driverLocation);
    }, [driverLocation]);

    const onMapLoad = useCallback(
        (map: google.maps.Map) => {
            mapRef.current = map;

            // Fit bounds to show all markers
            const bounds = new google.maps.LatLngBounds();
            bounds.extend(driverLocation);
            bounds.extend(pickupLocation);
            bounds.extend(dropoffLocation);
            map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });

            // Fetch directions from pickup to dropoff
            const directionsService = new google.maps.DirectionsService();
            directionsService.route(
                {
                    origin: pickupLocation,
                    destination: dropoffLocation,
                    travelMode: google.maps.TravelMode.DRIVING,
                },
                (result, status) => {
                    if (status === google.maps.DirectionsStatus.OK && result) {
                        setDirections(result);
                    }
                }
            );
        },
        [driverLocation, pickupLocation, dropoffLocation]
    );

    // Fallback UI when API key is missing
    if (!apiKey) {
        return (
            <div className="map-container" id="map-view">
                <div className="map-no-key">
                    <div className="map-no-key-icon">🗺️</div>
                    <div className="map-no-key-title">Google Maps</div>
                    <div className="map-no-key-subtitle">
                        Add your API key to <code>.env</code> to enable live maps
                    </div>
                    <div className="map-no-key-code">
                        REACT_APP_GOOGLE_MAPS_API_KEY=your_key_here
                    </div>
                    <div className="map-coords">
                        <div className="map-coord-item">
                            <span className="coord-icon">🚗</span>
                            <span>Driver: {driverLocation.lat.toFixed(4)}, {driverLocation.lng.toFixed(4)}</span>
                        </div>
                        <div className="map-coord-item">
                            <span className="coord-icon">📍</span>
                            <span>Pickup: {pickupLocation.lat.toFixed(4)}, {pickupLocation.lng.toFixed(4)}</span>
                        </div>
                        <div className="map-coord-item">
                            <span className="coord-icon">🏁</span>
                            <span>Dropoff: {dropoffLocation.lat.toFixed(4)}, {dropoffLocation.lng.toFixed(4)}</span>
                        </div>
                    </div>
                    <div className="map-label">
                        <span className="map-label-icon">⏱️</span>
                        ETA: {driverEta} min • {rideStatus}
                    </div>
                </div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="map-container" id="map-view">
                <div className="map-no-key">
                    <div className="map-no-key-icon">⚠️</div>
                    <div className="map-no-key-title">Map Load Error</div>
                    <div className="map-no-key-subtitle">{loadError.message}</div>
                </div>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className="map-container" id="map-view">
                <div className="map-no-key">
                    <div className="map-loading-spinner"></div>
                    <div className="map-no-key-title">Loading Map...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="map-container map-container-live" id="map-view">
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={driverPosition}
                zoom={14}
                onLoad={onMapLoad}
                options={{
                    styles: lightMapStyle,
                    disableDefaultUI: true,
                    zoomControl: true,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: true,
                    gestureHandling: 'greedy',
                }}
            >
                {/* Driver marker */}
                <Marker
                    position={driverPosition}
                    icon={{
                        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="#F4B400" stroke="#fff" stroke-width="3"/>
                <text x="24" y="30" text-anchor="middle" font-size="20">🚗</text>
              </svg>
            `),
                        scaledSize: new google.maps.Size(48, 48),
                        anchor: new google.maps.Point(24, 24),
                    }}
                    onClick={() => setSelectedMarker('driver')}
                    animation={google.maps.Animation.DROP}
                />

                {/* Driver info window */}
                {selectedMarker === 'driver' && (
                    <InfoWindow
                        position={driverPosition}
                        onCloseClick={() => setSelectedMarker(null)}
                    >
                        <div style={{
                            padding: '8px',
                            color: '#1a1a2e',
                            fontFamily: 'Inter, sans-serif',
                            minWidth: '160px',
                        }}>
                            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>
                                🚗 {driverName}
                            </div>
                            <div style={{ fontSize: '12px', color: '#555', marginBottom: '2px' }}>
                                {driverVehicle}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6c5ce7', fontWeight: 600 }}>
                                ETA: {driverEta} min
                            </div>
                        </div>
                    </InfoWindow>
                )}

                {/* Pickup marker */}
                <Marker
                    position={pickupLocation}
                    icon={{
                        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="16" fill="#55efc4" stroke="#fff" stroke-width="2.5"/>
                <text x="20" y="26" text-anchor="middle" font-size="16">📍</text>
              </svg>
            `),
                        scaledSize: new google.maps.Size(40, 40),
                        anchor: new google.maps.Point(20, 20),
                    }}
                    onClick={() => setSelectedMarker('pickup')}
                />

                {selectedMarker === 'pickup' && (
                    <InfoWindow
                        position={pickupLocation}
                        onCloseClick={() => setSelectedMarker(null)}
                    >
                        <div style={{ padding: '6px', color: '#1a1a2e', fontFamily: 'Inter, sans-serif' }}>
                            <div style={{ fontWeight: 700, fontSize: '13px' }}>📍 Pickup Location</div>
                            <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>
                                {pickupLocation.lat.toFixed(5)}, {pickupLocation.lng.toFixed(5)}
                            </div>
                        </div>
                    </InfoWindow>
                )}

                {/* Dropoff marker */}
                <Marker
                    position={dropoffLocation}
                    icon={{
                        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="16" fill="#e17055" stroke="#fff" stroke-width="2.5"/>
                <text x="20" y="26" text-anchor="middle" font-size="16">🏁</text>
              </svg>
            `),
                        scaledSize: new google.maps.Size(40, 40),
                        anchor: new google.maps.Point(20, 20),
                    }}
                    onClick={() => setSelectedMarker('dropoff')}
                />

                {selectedMarker === 'dropoff' && (
                    <InfoWindow
                        position={dropoffLocation}
                        onCloseClick={() => setSelectedMarker(null)}
                    >
                        <div style={{ padding: '6px', color: '#1a1a2e', fontFamily: 'Inter, sans-serif' }}>
                            <div style={{ fontWeight: 700, fontSize: '13px' }}>🏁 Dropoff Location</div>
                            <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>
                                {dropoffLocation.lat.toFixed(5)}, {dropoffLocation.lng.toFixed(5)}
                            </div>
                        </div>
                    </InfoWindow>
                )}

                {/* Route from pickup to dropoff */}
                {directions && (
                    <DirectionsRenderer
                        directions={directions}
                        options={{
                            suppressMarkers: true,
                            polylineOptions: {
                                strokeColor: '#F4B400',
                                strokeWeight: 6,
                                strokeOpacity: 0.8,
                            },
                        }}
                    />
                )}
            </GoogleMap>

            {/* Overlay info bar */}
            <div className="map-overlay-bar">
                <div className="map-overlay-item">
                    <span className="map-overlay-icon">🚗</span>
                    <span>{driverName}</span>
                </div>
                <div className="map-overlay-divider"></div>
                <div className="map-overlay-item">
                    <span className="map-overlay-icon">⏱️</span>
                    <span>{driverEta} min</span>
                </div>
                <div className="map-overlay-divider"></div>
                <div className="map-overlay-item map-overlay-live">
                    <span className="map-pulse-dot"></span>
                    <span>LIVE</span>
                </div>
            </div>
        </div>
    );
};

export default LiveMap;
