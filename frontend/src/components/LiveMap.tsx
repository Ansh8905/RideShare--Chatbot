// ============================================================
// RideSharePro — Live Google Map Component
// Shows driver location, pickup/dropoff markers, and route
// Works with OR without a Google Maps API key
// ============================================================

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
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

// Libraries array MUST be defined outside the component to prevent
// useJsApiLoader from re-initializing on every render
const LIBRARIES: ('places')[] = ['places'];

const containerStyle = {
    width: '100%',
    height: '100%',
    borderRadius: '16px',
};

// Minimal Light theme map style for premium look
// Typed as any[] to avoid referencing google.maps before API loads
const lightMapStyle: any[] = [
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

// ── Interactive CSS-based map fallback ──
const FallbackMap: React.FC<LiveMapProps> = ({
    driverLocation,
    pickupLocation,
    dropoffLocation,
    driverName,
    driverVehicle,
    driverEta,
    rideStatus,
}) => {
    const [animPercent, setAnimPercent] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setAnimPercent((prev) => (prev >= 100 ? 0 : prev + 0.5));
        }, 50);
        return () => clearInterval(interval);
    }, []);

    // Calculate relative positions for the markers based on lat/lng
    const allLats = [driverLocation.lat, pickupLocation.lat, dropoffLocation.lat];
    const allLngs = [driverLocation.lng, pickupLocation.lng, dropoffLocation.lng];
    const minLat = Math.min(...allLats);
    const maxLat = Math.max(...allLats);
    const minLng = Math.min(...allLngs);
    const maxLng = Math.max(...allLngs);
    const latRange = maxLat - minLat || 0.01;
    const lngRange = maxLng - minLng || 0.01;

    const toPercent = (loc: { lat: number; lng: number }) => ({
        // Invert lat since CSS top goes downward
        top: 15 + (1 - (loc.lat - minLat) / latRange) * 70,
        left: 15 + ((loc.lng - minLng) / lngRange) * 70,
    });

    const pickupPos = toPercent(pickupLocation);
    const dropoffPos = toPercent(dropoffLocation);

    // Animate driver along the line from pickup toward dropoff
    const animDriverTop = pickupPos.top + (dropoffPos.top - pickupPos.top) * (animPercent / 100);
    const animDriverLeft = pickupPos.left + (dropoffPos.left - pickupPos.left) * (animPercent / 100);

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            confirmed: '#55efc4',
            in_progress: '#74b9ff',
            in_transit: '#F4B400',
            arrived: '#00b894',
            completed: '#6c5ce7',
        };
        return colors[status] || '#a29bfe';
    };

    return (
        <div className="map-container map-fallback-interactive" id="map-view">
            {/* Animated grid background */}
            <div className="map-fallback-grid" />

            {/* Route line from pickup to dropoff */}
            <svg
                className="map-fallback-svg"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
            >
                <defs>
                    <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#55efc4" />
                        <stop offset="50%" stopColor="#F4B400" />
                        <stop offset="100%" stopColor="#e17055" />
                    </linearGradient>
                </defs>
                {/* Route path */}
                <line
                    x1={pickupPos.left}
                    y1={pickupPos.top}
                    x2={dropoffPos.left}
                    y2={dropoffPos.top}
                    stroke="url(#routeGrad)"
                    strokeWidth="0.8"
                    strokeDasharray="2,1"
                    strokeLinecap="round"
                    opacity="0.7"
                />
                {/* Driver trail */}
                <line
                    x1={pickupPos.left}
                    y1={pickupPos.top}
                    x2={animDriverLeft}
                    y2={animDriverTop}
                    stroke="#F4B400"
                    strokeWidth="1"
                    strokeLinecap="round"
                    opacity="0.5"
                />
            </svg>

            {/* Pickup marker */}
            <div
                className="map-fallback-marker marker-pickup"
                style={{ top: `${pickupPos.top}%`, left: `${pickupPos.left}%` }}
                title="Pickup Location"
            >
                <span className="marker-emoji">📍</span>
                <div className="marker-label">Pickup</div>
                <div className="marker-pulse pickup-pulse" />
            </div>

            {/* Dropoff marker */}
            <div
                className="map-fallback-marker marker-dropoff"
                style={{ top: `${dropoffPos.top}%`, left: `${dropoffPos.left}%` }}
                title="Dropoff Location"
            >
                <span className="marker-emoji">🏁</span>
                <div className="marker-label">Dropoff</div>
            </div>

            {/* Animated driver marker */}
            <div
                className="map-fallback-marker marker-driver"
                style={{ top: `${animDriverTop}%`, left: `${animDriverLeft}%` }}
                title={`${driverName} - ${driverVehicle}`}
            >
                <span className="marker-emoji">🚗</span>
                <div className="marker-driver-ring" />
            </div>

            {/* Info overlay at bottom */}
            <div className="map-overlay-bar">
                <div className="map-overlay-item">
                    <span className="map-overlay-icon">🚗</span>
                    <span>{driverName}</span>
                </div>
                <div className="map-overlay-divider" />
                <div className="map-overlay-item">
                    <span className="map-overlay-icon">🚘</span>
                    <span>{driverVehicle}</span>
                </div>
                <div className="map-overlay-divider" />
                <div className="map-overlay-item">
                    <span className="map-overlay-icon">⏱️</span>
                    <span>{driverEta} min</span>
                </div>
                <div className="map-overlay-divider" />
                <div
                    className="map-overlay-item"
                    style={{ color: getStatusColor(rideStatus) }}
                >
                    <span className="map-pulse-dot" style={{ background: getStatusColor(rideStatus) }} />
                    <span style={{ fontWeight: 700, fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                        {rideStatus.replace(/_/g, ' ')}
                    </span>
                </div>
            </div>

            {/* Coordinate info chips */}
            <div className="map-fallback-coords">
                <div className="map-coord-chip">
                    <span>📍</span>
                    <span>{pickupLocation.lat.toFixed(4)}, {pickupLocation.lng.toFixed(4)}</span>
                </div>
                <div className="map-coord-chip">
                    <span>🏁</span>
                    <span>{dropoffLocation.lat.toFixed(4)}, {dropoffLocation.lng.toFixed(4)}</span>
                </div>
            </div>
        </div>
    );
};

// ── Google Maps live component ──
const GoogleMapView: React.FC<LiveMapProps & { isLoaded: boolean }> = ({
    driverLocation,
    pickupLocation,
    dropoffLocation,
    driverName,
    driverVehicle,
    driverEta,
    rideStatus,
}) => {
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

    const mapOptions = useMemo(
        () => ({
            styles: lightMapStyle,
            disableDefaultUI: true,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            gestureHandling: 'greedy' as const,
        }),
        []
    );

    return (
        <div className="map-container map-container-live" id="map-view">
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={driverPosition}
                zoom={14}
                onLoad={onMapLoad}
                options={mapOptions}
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
                <div className="map-overlay-divider" />
                <div className="map-overlay-item">
                    <span className="map-overlay-icon">⏱️</span>
                    <span>{driverEta} min</span>
                </div>
                <div className="map-overlay-divider" />
                <div className="map-overlay-item map-overlay-live">
                    <span className="map-pulse-dot" />
                    <span>LIVE</span>
                </div>
            </div>
        </div>
    );
};

// ── Main LiveMap wrapper ──
const LiveMap: React.FC<LiveMapProps> = (props) => {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';

    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: apiKey,
        libraries: LIBRARIES,
    });

    // No API key → show the premium fallback map
    if (!apiKey) {
        return <FallbackMap {...props} />;
    }

    // API key present but loading failed → show fallback with error note
    if (loadError) {
        return <FallbackMap {...props} />;
    }

    // Still loading
    if (!isLoaded) {
        return (
            <div className="map-container" id="map-view">
                <div className="map-no-key">
                    <div className="map-loading-spinner" />
                    <div className="map-no-key-title">Loading Map...</div>
                </div>
            </div>
        );
    }

    // Fully loaded → real Google Map
    return <GoogleMapView {...props} isLoaded={isLoaded} />;
};

export default LiveMap;
