import { fetchWithAuth } from './client';

export async function apiGetSightingsNear(long: number, lat: number, dist?: number, token?: string) {
    const url = `/sightings/near?long=${long}&lat=${lat}` + (dist ? `&dist=${dist}` : '');
    return fetchWithAuth(url, token, {
        method: 'GET',
    });
}