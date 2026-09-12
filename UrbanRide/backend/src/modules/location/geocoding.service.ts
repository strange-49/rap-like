export interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

export async function geocodeAddress(
  address: string,
): Promise<GeocodingResult> {
  const url = new URL(`${NOMINATIM_BASE_URL}/search`);

  url.searchParams.set('q', address);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'UrbanRide/0.1.0',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Geocoding service failed with status ${response.status}.`,
    );
  }

  const data = (await response.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;

  const result = data[0];

  if (!result) {
    throw new Error('No location was found for the given address.');
  }

  return {
    latitude: Number(result.lat),
    longitude: Number(result.lon),
    displayName: result.display_name,
  };
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<GeocodingResult> {
  const url = new URL(`${NOMINATIM_BASE_URL}/reverse`);

  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('format', 'json');

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'UrbanRide/0.1.0',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Reverse geocoding service failed with status ${response.status}.`,
    );
  }

  const data = (await response.json()) as {
    lat?: string;
    lon?: string;
    display_name?: string;
  };

  if (!data.lat || !data.lon || !data.display_name) {
    throw new Error('No address was found for the given coordinates.');
  }

  return {
    latitude: Number(data.lat),
    longitude: Number(data.lon),
    displayName: data.display_name,
  };
}