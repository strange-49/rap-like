import { RideEventPublisher } from './ride-events';
import { WebSocketManager } from './websocket-manager';

export const websocketManager = new WebSocketManager();

export const rideEvents = new RideEventPublisher(websocketManager);