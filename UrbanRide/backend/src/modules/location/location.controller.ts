import type { IncomingMessage, ServerResponse } from 'node:http';

import {
  geocodeAddress,
  reverseGeocode,
  searchLocations,
} from './geocoding.service';
import { getDrivingRoute } from './map.service';
import {
  calculateEstimatedFare,
  type RideVehicleType,
} from '../rides/ride/ride.fare';

export async function handleFareEstimate(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<boolean> {
  const url = new URL(
    request.url ?? '/',
    `http://${request.headers.host ?? 'localhost'}`,
  );

  if (request.method !== 'GET' || url.pathname !== '/locations/fare-estimate') {
    return false;
  }

  const pickupLatitude = Number(url.searchParams.get('pickupLatitude'));
  const pickupLongitude = Number(url.searchParams.get('pickupLongitude'));
  const dropLatitude = Number(url.searchParams.get('dropLatitude'));
  const dropLongitude = Number(url.searchParams.get('dropLongitude'));
  const vehicleType = url.searchParams.get('vehicleType');

  if (
    !Number.isFinite(pickupLatitude) ||
    !Number.isFinite(pickupLongitude) ||
    !Number.isFinite(dropLatitude) ||
    !Number.isFinite(dropLongitude)
  ) {
    response.writeHead(400, {
      'content-type': 'application/json; charset=utf-8',
    });

    response.end(
      JSON.stringify({
        error: {
          code: 'INVALID_COORDINATES',
          message: 'Valid pickup and drop coordinates are required.',
        },
      }),
    );

    return true;
  }

  if (
    vehicleType !== 'bike' &&
    vehicleType !== 'auto' &&
    vehicleType !== 'cab'
  ) {
    response.writeHead(400, {
      'content-type': 'application/json; charset=utf-8',
    });

    response.end(
      JSON.stringify({
        error: {
          code: 'INVALID_VEHICLE_TYPE',
          message: 'vehicleType must be bike, auto, or cab.',
        },
      }),
    );

    return true;
  }

  try {
    const route = await getDrivingRoute(
      {
        latitude: pickupLatitude,
        longitude: pickupLongitude,
      },
      {
        latitude: dropLatitude,
        longitude: dropLongitude,
      },
    );

    const estimatedFare = calculateEstimatedFare(
      route.distanceInKilometers,
      vehicleType as RideVehicleType,
    );

    response.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
    });

    response.end(
      JSON.stringify({
        distanceInKilometers: route.distanceInKilometers,
        durationInMinutes: route.durationInMinutes,
        estimatedFare,
        vehicleType,
      }),
    );
  } catch (error) {
    console.error(error);

    response.writeHead(502, {
      'content-type': 'application/json; charset=utf-8',
    });

    response.end(
      JSON.stringify({
        error: {
          code: 'FARE_ESTIMATE_FAILED',
          message: 'Unable to calculate the fare estimate.',
        },
      }),
    );
  }

  return true;
}

export async function handleLocationSearch(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<boolean> {
  const url = new URL(
    request.url ?? '/',
    `http://${request.headers.host ?? 'localhost'}`,
  );

  if (request.method !== 'GET' || url.pathname !== '/locations/search') {
    return false;
  }

  const query = url.searchParams.get('q');

  if (!query?.trim()) {
    response.writeHead(400, {
      'content-type': 'application/json; charset=utf-8',
    });

    response.end(
      JSON.stringify({
        error: {
          code: 'QUERY_REQUIRED',
          message: 'Search query is required.',
        },
      }),
    );

    return true;
  }

  try {
    const results = await searchLocations(query.trim());

    response.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
    });

    response.end(JSON.stringify(results));
  } catch (error) {
    console.error(error);

    response.writeHead(502, {
      'content-type': 'application/json; charset=utf-8',
    });

    response.end(
      JSON.stringify({
        error: {
          code: 'LOCATION_SEARCH_FAILED',
          message: 'Unable to search locations.',
        },
      }),
    );
  }

  return true;
}

export async function handleGeocode(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<boolean> {
  const url = new URL(
    request.url ?? '/',
    `http://${request.headers.host ?? 'localhost'}`,
  );

  if (request.method !== 'GET' || url.pathname !== '/location/geocode') {
    return false;
  }

  const address = url.searchParams.get('address');

  if (!address?.trim()) {
    response.writeHead(400, {
      'content-type': 'application/json; charset=utf-8',
    });

    response.end(
      JSON.stringify({
        error: {
          code: 'ADDRESS_REQUIRED',
          message: 'Address is required.',
        },
      }),
    );

    return true;
  }

  try {
    const result = await geocodeAddress(address);

    response.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
    });

    response.end(JSON.stringify(result));
  } catch (error) {
    console.error(error);

    response.writeHead(502, {
      'content-type': 'application/json; charset=utf-8',
    });

    response.end(
      JSON.stringify({
        error: {
          code: 'GEOCODING_FAILED',
          message: 'Unable to geocode the address.',
        },
      }),
    );
  }

  return true;
}

export async function handleReverseGeocode(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<boolean> {
  const url = new URL(
    request.url ?? '/',
    `http://${request.headers.host ?? 'localhost'}`,
  );

  if (
    request.method !== 'GET' ||
    url.pathname !== '/location/reverse-geocode'
  ) {
    return false;
  }

  const latitude = Number(url.searchParams.get('latitude'));
  const longitude = Number(url.searchParams.get('longitude'));

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    response.writeHead(400, {
      'content-type': 'application/json; charset=utf-8',
    });

    response.end(
      JSON.stringify({
        error: {
          code: 'INVALID_COORDINATES',
          message: 'Valid latitude and longitude are required.',
        },
      }),
    );

    return true;
  }

  try {
    const result = await reverseGeocode(latitude, longitude);

    response.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
    });

    response.end(JSON.stringify(result));
  } catch (error) {
    console.error(error);

    response.writeHead(502, {
      'content-type': 'application/json; charset=utf-8',
    });

    response.end(
      JSON.stringify({
        error: {
          code: 'REVERSE_GEOCODING_FAILED',
          message: 'Unable to reverse geocode the coordinates.',
        },
      }),
    );
  }

  return true;
}
