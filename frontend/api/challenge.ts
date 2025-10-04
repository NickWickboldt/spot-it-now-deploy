import { fetchWithAuth } from './client';

export interface ChallengeDTO {
  _id: string;
  title: string;
  description?: string;
  animals: Array<{ _id: string; commonName: string; scientificName?: string; imageUrls?: string[]; category?: string }>;
  tasks?: Array<{ animal: { _id: string; commonName: string; scientificName?: string; imageUrls?: string[]; category?: string }; required: number; completed?: number }>;
  activeFrom: string;
  activeTo: string;
  radiusMeters: number;
  center: { type: 'Point'; coordinates: [number, number] };
  distanceMeters: number;
}

export const apiGetTodayChallenges = async (lat: number, lng: number): Promise<{ data: ChallengeDTO[] }> => {
  return fetchWithAuth(`/challenges/today?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`);
};
