import React, { useState, useEffect, useCallback } from 'react';
import Chatbot from './components/Chatbot';
import LiveMap from './components/LiveMap';
import './App.css';

interface RideData {
  driver: {
    name: string;
    vehicle: string;
    rating: string;
    eta: number;
    status: string;
    trips: number;
    lat: string;
    lng: string;
  };
  booking: {
    id: string;
    fare: string;
    distance: string;
    status: string;
    pickup: string;
    dropoff: string;
  };
  traffic: {
    congestion: string;
    delay: number;
    speed: string;
  };
}


const App: React.FC = () => {
  const [isChatbotOpen, setIsChatbotOpen] = useState(true);
  const [rideData, setRideData] = useState<RideData | null>(null);

  const [currentTime, setCurrentTime] = useState(new Date());

  const bookingId = 'booking_123';
  const userId = 'user_456';
  const driverId = 'driver_789';
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch dummy data from API
  const fetchRideData = useCallback(async () => {
    try {
      const [driverRes, bookingRes, trafficRes] = await Promise.all([
        fetch(`${apiUrl}/api/dummy/driver`),
        fetch(`${apiUrl}/api/dummy/booking`),
        fetch(`${apiUrl}/api/dummy/traffic`),
      ]);

      const driverData = await driverRes.json();
      const bookingData = await bookingRes.json();
      const trafficData = await trafficRes.json();

      setRideData({
        driver: {
          name: driverData.data?.name || 'John Smith',
          vehicle: driverData.data?.vehicle || 'Tesla Model 3',
          rating: driverData.data?.rating || '4.8',
          eta: driverData.data?.eta || Math.floor(Math.random() * 10 + 3),
          status: driverData.data?.status || 'in_transit',
          trips: driverData.data?.completedTrips || 1247,
          lat: driverData.data?.latitude || '40.7128',
          lng: driverData.data?.longitude || '-74.0060',
        },
        booking: {
          id: bookingData.data?.bookingId || bookingId,
          fare: bookingData.data?.fare || '$24.50',
          distance: bookingData.data?.distance || '8.3 km',
          status: bookingData.data?.status || 'confirmed',
          pickup: '123 Main St',
          dropoff: '456 Oak Ave',
        },
        traffic: {
          congestion: trafficData.data?.congestionLevel || 'moderate',
          delay: trafficData.data?.delayMinutes || 5,
          speed: trafficData.data?.averageSpeed || '45 km/h',
        },
      });


    } catch (err) {
      console.error('Failed to fetch ride data:', err);

      // Set fallback data
      setRideData({
        driver: {
          name: 'John Smith',
          vehicle: 'Tesla Model 3',
          rating: '4.8',
          eta: 5,
          status: 'in_transit',
          trips: 1247,
          lat: '40.7128',
          lng: '-74.0060',
        },
        booking: {
          id: bookingId,
          fare: '$24.50',
          distance: '8.3 km',
          status: 'confirmed',
          pickup: '123 Main St',
          dropoff: '456 Oak Ave',
        },
        traffic: {
          congestion: 'moderate',
          delay: 5,
          speed: '45 km/h',
        },
      });
    }
  }, [apiUrl, bookingId]);

  // Initial fetch + polling
  useEffect(() => {
    fetchRideData();
    const interval = setInterval(fetchRideData, 15000); // Refresh every 15 seconds
    return () => clearInterval(interval);
  }, [fetchRideData]);



  const handleEscalation = (escType: string) => {
    console.log(`Escalation triggered: ${escType}`);
  };

  const handleCloseChatbot = () => {
    setIsChatbotOpen(false);
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      confirmed: 'Confirmed',
      in_progress: 'In Progress',
      arrived: 'Arrived',
      completed: 'Completed',
      in_transit: 'En Route',
    };
    return statusMap[status] || status;
  };

  const getCongestionColor = (level: string) => {
    const colors: Record<string, string> = {
      light: '#55efc4',
      moderate: '#fdcb6e',
      heavy: '#e17055',
      severe: '#ff4757',
    };
    return colors[level] || '#a29bfe';
  };

  return (
    <div className="app">
      {/* Top Navbar */}
      <nav className="app-navbar">
        <div className="app-navbar-brand">
          <div className="app-navbar-logo">🚗</div>
          <div>
            <div className="app-navbar-title">RideShare Pro</div>
            <div className="app-navbar-subtitle">Smart Ride Assistant</div>
          </div>
        </div>
        <div className="app-navbar-status">
          <div className="status-badge">
            <span className="status-dot active"></span>
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="status-badge">
            <span className="status-dot active"></span>
            API Connected
          </div>
        </div>
      </nav>

      {/* Dashboard */}
      <div className="app-dashboard">
        {/* Left — Main Content */}
        <div className="dashboard-main">
          {/* Ride Status Hero */}
          <div className="ride-status-hero" id="ride-status">
            <div className="ride-status-label">
              <span className="pulse-dot"></span>
              {rideData ? getStatusLabel(rideData.booking.status) : 'Loading...'}
            </div>
            <h1 className="ride-status-title">
              {rideData ? `Your driver arrives in ${rideData.driver.eta} min` : 'Connecting to ride...'}
            </h1>
            <p className="ride-status-subtitle">
              {rideData
                ? `${rideData.booking.pickup} → ${rideData.booking.dropoff} • ${rideData.booking.distance}`
                : 'Fetching ride details from API...'}
            </p>
          </div>

          {/* Info Cards */}
          <div className="info-cards-grid">
            <div className="info-card" id="card-eta">
              <div className="info-card-icon purple">⏱</div>
              <div className="info-card-label">ETA</div>
              <div className="info-card-value">{rideData?.driver.eta || '--'} min</div>
              <div className="info-card-detail">Updated live via API</div>
            </div>
            <div className="info-card" id="card-fare">
              <div className="info-card-icon green">💰</div>
              <div className="info-card-label">Est. Fare</div>
              <div className="info-card-value">{rideData?.booking.fare || '--'}</div>
              <div className="info-card-detail">{rideData?.booking.distance || '--'} distance</div>
            </div>
            <div className="info-card" id="card-traffic">
              <div className="info-card-icon orange">🚦</div>
              <div className="info-card-label">Traffic</div>
              <div className="info-card-value" style={{ color: getCongestionColor(rideData?.traffic.congestion || '') }}>
                {rideData?.traffic.congestion || '--'}
              </div>
              <div className="info-card-detail">+{rideData?.traffic.delay || 0} min delay</div>
            </div>
            <div className="info-card" id="card-speed">
              <div className="info-card-icon blue">🏎</div>
              <div className="info-card-label">Avg Speed</div>
              <div className="info-card-value">{rideData?.traffic.speed || '--'}</div>
              <div className="info-card-detail">Current conditions</div>
            </div>
          </div>

          {/* Driver Card */}
          <div className="driver-card" id="driver-info">
            <div className="driver-avatar">
              🧑‍✈️
              <div className="driver-avatar-online"></div>
            </div>
            <div className="driver-info">
              <div className="driver-name">{rideData?.driver.name || 'Loading...'}</div>
              <div className="driver-vehicle">{rideData?.driver.vehicle || '---'}</div>
              <div className="driver-meta">
                <span className="driver-rating">⭐ {rideData?.driver.rating || '--'}</span>
                <span className="driver-trips">{rideData?.driver.trips || '--'} trips</span>
              </div>
            </div>
            <div className="driver-actions">
              <button className="driver-action-btn" title="Call driver" id="btn-call-driver">📞</button>
              <button className="driver-action-btn" title="Message driver" id="btn-msg-driver">💬</button>
            </div>
          </div>

          {/* Live Google Map */}
          <LiveMap
            driverLocation={{
              lat: parseFloat(rideData?.driver.lat || '40.7128'),
              lng: parseFloat(rideData?.driver.lng || '-74.0060'),
            }}
            pickupLocation={{ lat: 40.7128, lng: -74.0060 }}
            dropoffLocation={{ lat: 40.6892, lng: -74.0445 }}
            driverName={rideData?.driver.name || 'Driver'}
            driverVehicle={rideData?.driver.vehicle || 'Vehicle'}
            driverEta={rideData?.driver.eta || 5}
            rideStatus={rideData?.booking.status || 'confirmed'}
          />

          {/* Activity Feed */}

        </div>

        {/* Right — Chat Panel */}
        {isChatbotOpen && (
          <div className="chat-panel" id="chat-panel">
            <Chatbot
              bookingId={bookingId}
              userId={userId}
              driverId={driverId}
              apiUrl={apiUrl}
              onEscalation={handleEscalation}
              onClose={handleCloseChatbot}
            />
          </div>
        )}
      </div>

      {/* Open Chat Button when closed */}
      {!isChatbotOpen && (
        <button
          className="open-chat-btn"
          onClick={() => setIsChatbotOpen(true)}
          id="btn-open-chat"
        >
          💬
          <span className="notification-dot"></span>
        </button>
      )}
    </div>
  );
};

export default App;
