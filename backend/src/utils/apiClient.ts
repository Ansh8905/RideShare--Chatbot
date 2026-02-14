import logger from './logger';
import dummyService from '../services/dummyService';

/**
 * API Client that directly uses the DummyService for instant data access.
 * No HTTP roundtrip — calls the service directly for maximum speed.
 * In production, replace dummyService calls with real HTTP client calls.
 */
class ApiClient {
  async getBooking(bookingId: string) {
    try {
      const result = dummyService.generateDummyResponse('booking');
      logger.info('Booking fetched via dummy service', { bookingId });
      return {
        id: bookingId,
        driverId: 'driver_789',
        status: result.data?.status || 'confirmed',
        estimatedFare: result.data?.fare || '$24.50',
        distance: result.data?.distance || '8.3 km',
        createdAt: result.data?.createdAt || new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        pickupLocation: result.data?.pickupAddress || '123 Main St, New York',
        dropoffLocation: result.data?.dropoffAddress || '456 Oak Ave, Brooklyn',
        rideType: result.data?.rideType || 'comfort',
        duration: result.data?.duration || '15 min',
      };
    } catch (error) {
      logger.error('Failed to fetch booking', { bookingId, error });
      return {
        id: bookingId,
        driverId: 'driver_789',
        status: 'confirmed',
        estimatedFare: '$24.50',
        distance: '8.3 km',
        createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        pickupLocation: '123 Main St, New York',
        dropoffLocation: '456 Oak Ave, Brooklyn',
        rideType: 'comfort',
        duration: '15 min',
      };
    }
  }

  async getDriver(driverId: string) {
    try {
      const result = dummyService.generateDummyResponse('driver');
      logger.info('Driver fetched via dummy service', { driverId });
      return {
        id: driverId,
        name: result.data?.name || 'John Smith',
        rating: parseFloat(result.data?.rating) || 4.8,
        vehicleInfo: result.data?.vehicle || 'Tesla Model 3 • White',
        licensePlate: result.data?.licensePlate || 'ABC-1234',
        currentLocation: {
          lat: parseFloat(result.data?.latitude) || 40.7128,
          lng: parseFloat(result.data?.longitude) || -74.006,
        },
        eta: result.data?.eta || Math.floor(Math.random() * 8 + 3),
        phone: result.data?.phone || '+1234567890',
        status: result.data?.status || 'en_route',
        completedTrips: result.data?.completedTrips || 1247,
      };
    } catch (error) {
      logger.error('Failed to fetch driver', { driverId, error });
      return {
        id: driverId,
        name: 'John Smith',
        rating: 4.8,
        vehicleInfo: 'Tesla Model 3 • White',
        licensePlate: 'ABC-1234',
        currentLocation: { lat: 40.7128, lng: -74.006 },
        eta: 5,
        phone: '+1234567890',
        status: 'en_route',
        completedTrips: 1247,
      };
    }
  }

  async getPaymentDetails(bookingId: string) {
    try {
      const result = dummyService.generateDummyResponse('payment');
      logger.info('Payment fetched via dummy service', { bookingId });
      return {
        bookingId,
        estimatedFare: result.data?.estimatedFare || '24.50',
        amount: result.data?.amount || '$24.50',
        method: result.data?.method || 'credit_card',
        status: result.data?.status || 'pending',
        transactionId: result.data?.transactionId || 'txn_demo',
        breakdown: result.data?.breakdown || {
          baseFare: '$3.50',
          distance: '$12.00',
          time: '$6.00',
          serviceFee: '$3.00',
        },
      };
    } catch (error) {
      logger.error('Failed to fetch payment details', { bookingId, error });
      return {
        bookingId,
        estimatedFare: '24.50',
        amount: '$24.50',
        method: 'credit_card',
        status: 'pending',
        transactionId: 'txn_demo',
        breakdown: { baseFare: '$3.50', distance: '$12.00', time: '$6.00', serviceFee: '$3.00' },
      };
    }
  }

  async sendNotification(userId: string, message: string, _data?: any) {
    logger.info('Notification sent via dummy service', { userId, message });
    return {
      success: true,
      notificationId: `notif_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      message,
      sentAt: new Date().toISOString(),
      delivered: true,
    };
  }

  async cancelBooking(bookingId: string, reason: string) {
    logger.info('Booking cancelled via dummy service', { bookingId, reason });
    return {
      status: 'success',
      message: 'Booking cancelled successfully',
      bookingId,
      cancelledAt: new Date().toISOString(),
      refundAmount: `$${(Math.random() * 10 + 2).toFixed(2)}`,
      refundStatus: 'processing',
    };
  }

  async getTrafficInfo() {
    try {
      const result = dummyService.generateDummyResponse('traffic');
      return {
        congestionLevel: result.data?.congestionLevel || 'moderate',
        delayMinutes: result.data?.delayMinutes || 5,
        roadCondition: result.data?.roadCondition || 'clear',
        averageSpeed: result.data?.averageSpeed || '45 km/h',
      };
    } catch (error) {
      logger.error('Failed to fetch traffic info', { error });
      return {
        congestionLevel: 'moderate',
        delayMinutes: 5,
        roadCondition: 'clear',
        averageSpeed: '45 km/h',
      };
    }
  }

  async getUserProfile(userId: string) {
    try {
      const result = dummyService.generateDummyResponse('user');
      return {
        id: userId,
        name: result.data?.name || 'Guest User',
        email: result.data?.email || 'user@example.com',
        phone: result.data?.phone || '+1234567890',
        completedRides: result.data?.completedRides || 42,
        rating: result.data?.rating || '4.7',
      };
    } catch (error) {
      logger.error('Failed to fetch user profile', { userId, error });
      return {
        id: userId,
        name: 'Guest User',
        email: 'user@example.com',
        phone: '+1234567890',
        completedRides: 42,
        rating: '4.7',
      };
    }
  }
}

export default new ApiClient();
