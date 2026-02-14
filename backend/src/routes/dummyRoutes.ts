import { Router, Request, Response } from 'express';
import dummyService from '../services/dummyService';
import logger from '../utils/logger';

const router = Router();

/**
 * GET /api/dummy/driver
 * Get dummy driver data (simulates real driver tracking API)
 */
router.get('/driver', (_req: Request, res: Response) => {
    try {
        const data = dummyService.generateDummyResponse('driver');
        logger.info('Dummy driver data requested', { responseId: data.id });
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to generate driver data' });
    }
});

/**
 * GET /api/dummy/driver/:driverId
 * Get specific driver data by ID
 */
router.get('/driver/:driverId', (req: Request, res: Response) => {
    try {
        const data = dummyService.generateDummyResponse('driver');
        data.data = {
            ...data.data,
            driverId: req.params.driverId,
        };
        logger.info('Dummy driver data requested', { driverId: req.params.driverId });
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to generate driver data' });
    }
});

/**
 * GET /api/dummy/booking
 * Get dummy booking data
 */
router.get('/booking', (_req: Request, res: Response) => {
    try {
        const data = dummyService.generateDummyResponse('booking');
        logger.info('Dummy booking data requested', { responseId: data.id });
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to generate booking data' });
    }
});

/**
 * GET /api/dummy/booking/:bookingId
 * Get specific booking data by ID
 */
router.get('/booking/:bookingId', (req: Request, res: Response) => {
    try {
        const data = dummyService.generateDummyResponse('booking');
        data.data = {
            ...data.data,
            bookingId: req.params.bookingId,
            createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        };
        logger.info('Dummy booking data requested', { bookingId: req.params.bookingId });
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to generate booking data' });
    }
});

/**
 * POST /api/dummy/booking/:bookingId/cancel
 * Cancel a dummy booking
 */
router.post('/booking/:bookingId/cancel', (req: Request, res: Response) => {
    try {
        const { reason } = req.body;
        logger.info('Dummy booking cancelled', {
            bookingId: req.params.bookingId,
            reason: reason || 'No reason given',
        });
        return res.status(200).json({
            status: 'success',
            message: 'Booking cancelled successfully',
            data: {
                bookingId: req.params.bookingId,
                status: 'cancelled',
                reason: reason || 'User initiated',
                cancelledAt: new Date().toISOString(),
                refundAmount: `$${(Math.random() * 10 + 2).toFixed(2)}`,
                refundStatus: 'processing',
            },
        });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to cancel booking' });
    }
});

/**
 * GET /api/dummy/traffic
 * Get dummy traffic data
 */
router.get('/traffic', (_req: Request, res: Response) => {
    try {
        const data = dummyService.generateDummyResponse('traffic');
        logger.info('Dummy traffic data requested', { responseId: data.id });
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to generate traffic data' });
    }
});

/**
 * GET /api/dummy/payment
 * Get dummy payment data
 */
router.get('/payment', (_req: Request, res: Response) => {
    try {
        const data = dummyService.generateDummyResponse('payment');
        logger.info('Dummy payment data requested', { responseId: data.id });
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to generate payment data' });
    }
});

/**
 * GET /api/dummy/payment/booking/:bookingId
 * Get payment details for a booking
 */
router.get('/payment/booking/:bookingId', (req: Request, res: Response) => {
    try {
        const data = dummyService.generateDummyResponse('payment');
        data.data = {
            ...data.data,
            bookingId: req.params.bookingId,
            estimatedFare: (Math.random() * 50 + 10).toFixed(2),
        };
        logger.info('Dummy payment details requested', { bookingId: req.params.bookingId });
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to generate payment data' });
    }
});

/**
 * GET /api/dummy/user
 * Get dummy user data
 */
router.get('/user', (_req: Request, res: Response) => {
    try {
        const data = dummyService.generateDummyResponse('user');
        logger.info('Dummy user data requested', { responseId: data.id });
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to generate user data' });
    }
});

/**
 * POST /api/dummy/notification/send
 * Send a dummy notification
 */
router.post('/notification/send', (req: Request, res: Response) => {
    try {
        const { userId, message } = req.body;
        logger.info('Dummy notification sent', { userId, message });
        return res.status(200).json({
            status: 'success',
            message: 'Notification sent successfully',
            data: {
                notificationId: `notif_${Math.random().toString(36).substr(2, 9)}`,
                userId: userId || 'unknown',
                message: message || 'No message',
                sentAt: new Date().toISOString(),
                delivered: true,
            },
        });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to send notification' });
    }
});

/**
 * GET /api/dummy/realtime/driver-location
 * SSE endpoint for real-time driver location updates
 */
router.get('/realtime/driver-location', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    logger.info('SSE driver location stream started');

    let counter = 0;
    const interval = setInterval(() => {
        counter++;
        const locationData = {
            driverId: 'driver_789',
            latitude: (40.7128 + (Math.random() - 0.5) * 0.01).toFixed(6),
            longitude: (-74.006 + (Math.random() - 0.5) * 0.01).toFixed(6),
            heading: Math.floor(Math.random() * 360),
            speed: Math.floor(Math.random() * 60 + 20),
            eta: Math.max(1, 10 - Math.floor(counter / 3)),
            timestamp: new Date().toISOString(),
        };

        res.write(`data: ${JSON.stringify(locationData)}\n\n`);

        if (counter >= 60) {
            clearInterval(interval);
            res.end();
        }
    }, 2000);

    req.on('close', () => {
        clearInterval(interval);
        logger.info('SSE driver location stream closed');
    });
});

/**
 * GET /api/dummy/realtime/ride-updates
 * SSE endpoint for real-time ride status updates
 */
router.get('/realtime/ride-updates', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    logger.info('SSE ride updates stream started');

    const updates = [
        { type: 'driver_assigned', message: 'Driver has been assigned to your ride' },
        { type: 'driver_en_route', message: 'Driver is on the way to pickup location' },
        { type: 'driver_arriving', message: 'Driver is arriving in 2 minutes' },
        { type: 'driver_arrived', message: 'Driver has arrived at pickup location' },
        { type: 'ride_started', message: 'Your ride has started' },
        { type: 'ride_halfway', message: 'You are halfway to your destination' },
        { type: 'ride_arriving', message: 'Arriving at your destination shortly' },
        { type: 'ride_completed', message: 'You have arrived. Thank you for riding!' },
    ];

    let index = 0;
    const interval = setInterval(() => {
        if (index >= updates.length) {
            clearInterval(interval);
            res.end();
            return;
        }

        const update = {
            ...updates[index],
            timestamp: new Date().toISOString(),
            bookingId: 'booking_123',
        };

        res.write(`data: ${JSON.stringify(update)}\n\n`);
        index++;
    }, 8000);

    req.on('close', () => {
        clearInterval(interval);
        logger.info('SSE ride updates stream closed');
    });
});

/**
 * GET /api/dummy/all
 * Get all dummy data in one call (dashboard support)
 */
router.get('/all', (_req: Request, res: Response) => {
    try {
        const driver = dummyService.generateDummyResponse('driver');
        const booking = dummyService.generateDummyResponse('booking');
        const traffic = dummyService.generateDummyResponse('traffic');
        const payment = dummyService.generateDummyResponse('payment');
        const user = dummyService.generateDummyResponse('user');

        logger.info('All dummy data requested');

        return res.status(200).json({
            status: 'success',
            message: 'All dummy data fetched successfully',
            data: {
                driver: driver.data,
                booking: booking.data,
                traffic: traffic.data,
                payment: payment.data,
                user: user.data,
            },
            responseTime: Math.max(driver.responseTime, booking.responseTime, traffic.responseTime),
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to generate data' });
    }
});

/**
 * GET /api/dummy/health
 * Health check for dummy API
 */
router.get('/health', (_req: Request, res: Response) => {
    return res.status(200).json({
        status: 'healthy',
        service: 'dummy-api',
        endpoints: [
            'GET /api/dummy/driver',
            'GET /api/dummy/driver/:driverId',
            'GET /api/dummy/booking',
            'GET /api/dummy/booking/:bookingId',
            'POST /api/dummy/booking/:bookingId/cancel',
            'GET /api/dummy/traffic',
            'GET /api/dummy/payment',
            'GET /api/dummy/payment/booking/:bookingId',
            'GET /api/dummy/user',
            'POST /api/dummy/notification/send',
            'GET /api/dummy/realtime/driver-location (SSE)',
            'GET /api/dummy/realtime/ride-updates (SSE)',
            'GET /api/dummy/all',
        ],
        timestamp: new Date().toISOString(),
    });
});

export default router;
