import logger from '../utils/logger';

export interface DummyData {
  id: string;
  timestamp: string;
  status: string;
  message: string;
  data: Record<string, any>;
  responseTime: number;
}

class DummyService {
  private requestCounter = 0;

  /**
   * Generate dummy response with mock data
   */
  generateDummyResponse(type: string = 'general'): DummyData {
    this.requestCounter++;
    const startTime = Date.now();

    const mockDataTypes: Record<string, Record<string, any>> = {
      driver: {
        driverId: `driver_${Math.floor(Math.random() * 1000)}`,
        name: this.getRandomDriverName(),
        vehicle: this.getRandomVehicle(),
        licensePlate: this.getRandomPlate(),
        latitude: (40.7128 + (Math.random() - 0.5) * 0.1).toFixed(4),
        longitude: (-74.006 + (Math.random() - 0.5) * 0.1).toFixed(4),
        heading: Math.floor(Math.random() * 360),
        rating: (Math.random() * 1.5 + 3.5).toFixed(1),
        status: this.getRandomStatus(),
        eta: Math.floor(Math.random() * 12 + 2),
        completedTrips: Math.floor(Math.random() * 3000 + 100),
        phone: `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
        memberSince: `${Math.floor(Math.random() * 5 + 2019)}`,
      },
      booking: {
        bookingId: `booking_${Math.floor(Math.random() * 10000)}`,
        pickupTime: this.getRandomTime(),
        estimatedArrival: this.getRandomTime(5, 30),
        fare: `$${(Math.random() * 50 + 10).toFixed(2)}`,
        distance: `${(Math.random() * 20 + 1).toFixed(1)} km`,
        duration: `${Math.floor(Math.random() * 40 + 10)} min`,
        status: this.getRandomBookingStatus(),
        pickupAddress: this.getRandomAddress(),
        dropoffAddress: this.getRandomAddress(),
        rideType: this.getRandomRideType(),
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 60000).toISOString(),
      },
      traffic: {
        congestionLevel: this.getRandomCongestion(),
        delayMinutes: Math.floor(Math.random() * 20),
        roadCondition: this.getRandomRoadCondition(),
        averageSpeed: `${Math.floor(Math.random() * 60 + 20)} km/h`,
        incidents: Math.floor(Math.random() * 3),
        alternateRouteAvailable: Math.random() > 0.5,
        lastUpdated: new Date().toISOString(),
      },
      user: {
        userId: `user_${Math.floor(Math.random() * 10000)}`,
        name: this.getRandomUserName(),
        email: `user${Math.floor(Math.random() * 1000)}@example.com`,
        phone: `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
        completedRides: Math.floor(Math.random() * 500),
        rating: (Math.random() * 1.5 + 3.5).toFixed(1),
        memberSince: `${Math.floor(Math.random() * 5 + 2019)}`,
        preferredPayment: this.getRandomPaymentMethod(),
      },
      payment: {
        transactionId: `txn_${Math.random().toString(36).substr(2, 9)}`,
        amount: `$${(Math.random() * 100 + 5).toFixed(2)}`,
        estimatedFare: (Math.random() * 50 + 10).toFixed(2),
        method: this.getRandomPaymentMethod(),
        status: this.getRandomPaymentStatus(),
        currency: 'USD',
        timestamp: new Date().toISOString(),
        breakdown: {
          baseFare: `$${(Math.random() * 5 + 2).toFixed(2)}`,
          distance: `$${(Math.random() * 20 + 5).toFixed(2)}`,
          time: `$${(Math.random() * 10 + 2).toFixed(2)}`,
          serviceFee: `$${(Math.random() * 3 + 1).toFixed(2)}`,
        },
      },
    };

    const mockData = mockDataTypes[type] || mockDataTypes.driver;
    const responseTime = Date.now() - startTime;

    logger.info(`Dummy ${type} data generated`, {
      requestNumber: this.requestCounter,
      responseTime: `${responseTime}ms`,
    });

    return {
      id: `resp_${this.requestCounter}`,
      timestamp: new Date().toISOString(),
      status: 'success',
      message: `Dummy ${type} data fetched successfully`,
      data: mockData,
      responseTime,
    };
  }

  /**
   * Generate streaming dummy data (for real-time updates)
   */
  async *generateStreamingData(type: string = 'driver', intervalMs: number = 1000) {
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      yield this.generateDummyResponse(type);
    }
  }

  private getRandomDriverName(): string {
    const names = [
      'John Smith', 'Maria Garcia', 'Ahmed Hassan', 'Lisa Chen',
      'David Brown', 'Sarah Wilson', 'James Taylor', 'Priya Patel',
      'Michael Lee', 'Emma Rodriguez',
    ];
    return names[Math.floor(Math.random() * names.length)];
  }

  private getRandomUserName(): string {
    const names = [
      'Michael Johnson', 'Jessica Lee', 'Robert Kim', 'Emma Davis',
      'James Martinez', 'Sophia Anderson', 'William Thomas',
    ];
    return names[Math.floor(Math.random() * names.length)];
  }

  private getRandomVehicle(): string {
    const vehicles = [
      'Tesla Model 3 • White', 'Honda Civic • Silver', 'Toyota Prius • Blue',
      'Ford Focus • Black', 'BMW 3 Series • Gray', 'Hyundai Sonata • Red',
      'Chevrolet Malibu • White', 'Mercedes C-Class • Black',
    ];
    return vehicles[Math.floor(Math.random() * vehicles.length)];
  }

  private getRandomPlate(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nums = '0123456789';
    return `${letters[Math.floor(Math.random() * 26)]}${letters[Math.floor(Math.random() * 26)]}${letters[Math.floor(Math.random() * 26)]}-${nums[Math.floor(Math.random() * 10)]}${nums[Math.floor(Math.random() * 10)]}${nums[Math.floor(Math.random() * 10)]}${nums[Math.floor(Math.random() * 10)]}`;
  }

  private getRandomAddress(): string {
    const addresses = [
      '123 Main St, New York', '456 Oak Ave, Brooklyn',
      '789 Park Blvd, Manhattan', '321 Elm St, Queens',
      '654 Pine Rd, Bronx', '987 Cedar Ln, Staten Island',
    ];
    return addresses[Math.floor(Math.random() * addresses.length)];
  }

  private getRandomRideType(): string {
    const types = ['economy', 'comfort', 'premium', 'xl'];
    return types[Math.floor(Math.random() * types.length)];
  }

  private getRandomStatus(): string {
    const statuses = ['available', 'in_transit', 'arriving', 'waiting', 'en_route'];
    return statuses[Math.floor(Math.random() * statuses.length)];
  }

  private getRandomBookingStatus(): string {
    const statuses = ['confirmed', 'in_progress', 'arrived', 'completed'];
    return statuses[Math.floor(Math.random() * statuses.length)];
  }

  private getRandomCongestion(): string {
    const levels = ['light', 'moderate', 'heavy', 'severe'];
    return levels[Math.floor(Math.random() * levels.length)];
  }

  private getRandomRoadCondition(): string {
    const conditions = ['clear', 'wet', 'foggy', 'icy', 'construction'];
    return conditions[Math.floor(Math.random() * conditions.length)];
  }

  private getRandomPaymentMethod(): string {
    const methods = ['credit_card', 'debit_card', 'digital_wallet', 'cash'];
    return methods[Math.floor(Math.random() * methods.length)];
  }

  private getRandomPaymentStatus(): string {
    const statuses = ['pending', 'completed', 'failed', 'refunded'];
    return statuses[Math.floor(Math.random() * statuses.length)];
  }

  private getRandomTime(minMinutes: number = 2, maxMinutes: number = 15): string {
    const now = new Date();
    const minutes = Math.floor(Math.random() * (maxMinutes - minMinutes) + minMinutes);
    now.setMinutes(now.getMinutes() + minutes);
    return now.toLocaleTimeString();
  }
}

export default new DummyService();
