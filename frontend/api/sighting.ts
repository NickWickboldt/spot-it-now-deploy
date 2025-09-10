import { fetchWithAuth } from './client';

export async function apiGetSightingsNear(long: number, lat: number, dist?: number, token?: string) {
    const url = `/sightings/near?long=${long}&lat=${lat}` + (dist ? `&dist=${dist}` : '');
    return fetchWithAuth(url, token, {
        method: 'GET',
    });
}

// Public getters
export async function apiGetSightingById(sightingId: string) {
    return fetchWithAuth(`/sightings/${sightingId}`, '');
}

export async function apiGetSightingsByUser(userId: string) {
    return fetchWithAuth(`/sightings/by-user/${userId}`, '');
}

export async function apiGetSightingsByAnimal(animalId: string) {
    return fetchWithAuth(`/sightings/by-animal/${animalId}`, '');
}

export async function apiGetRecentSightings(page = 1, pageSize = 10) {
    const qs = `?page=${page}&pageSize=${pageSize}`;
    return fetchWithAuth(`/sightings/recent${qs}`, '', { method: 'GET' });
}

export async function apiGetFollowingRecentSightings(token: string, page = 1, pageSize = 10) {
    const qs = `?page=${page}&pageSize=${pageSize}`;
    return fetchWithAuth(`/sightings/following/recent${qs}`, token, { method: 'GET' });
}

// Authenticated/admin actions
export async function apiCreateSighting(token: string, sightingData: any) {
    return fetchWithAuth('/sightings/create', token, {
        method: 'POST',
        body: JSON.stringify(sightingData),
    });
}

export async function apiAdminUpdateSighting(token: string, sightingId: string, updateData: any) {
    return fetchWithAuth(`/sightings/${sightingId}/update`, token, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
    });
}

export async function apiAdminDeleteSighting(token: string, sightingId: string) {
    return fetchWithAuth(`/sightings/${sightingId}/delete`, token, {
        method: 'DELETE',
    });
}

export async function apiAdminGetAllSightings(token: string, page = 1, pageSize = 20, q = '') {
    const qs = `?page=${page}&pageSize=${pageSize}` + (q ? `&q=${encodeURIComponent(q)}` : '');
    return fetchWithAuth(`/sightings${qs}`, token, { method: 'GET' });
}

export async function apiGetMySightings(token: string) {
    return fetchWithAuth(`/sightings/my`, token, { method: 'GET' });
}

export async function apiAddMediaToSighting(token: string, sightingId: string, mediaUrl: string) {
    return fetchWithAuth(`/sightings/${sightingId}/media/add`, token, {
        method: 'POST',
        body: JSON.stringify({ mediaUrl }),
    });
}

export async function apiRemoveMediaFromSighting(token: string, sightingId: string, mediaUrl: string) {
    return fetchWithAuth(`/sightings/${sightingId}/media/remove`, token, {
        method: 'POST',
        body: JSON.stringify({ mediaUrl }),
    });
}
