import type { IncomingMessage, ServerResponse } from 'node:http';

import {
  geocodeAddress,
  reverseGeocode,
} from './geocoding.service';

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