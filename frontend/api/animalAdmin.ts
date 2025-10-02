// Admin animal helpers
import { fetchWithAuth } from './client';

export const apiSuggestAnimal = async (token: string, commonName: string) => {
  return fetchWithAuth('/animals/suggest', token, {
    method: 'POST',
    body: JSON.stringify({ commonName }),
  });
};

export const apiCreateAnimal = async (token: string, animal: any) => {
  return fetchWithAuth('/animals/create', token, {
    method: 'POST',
    body: JSON.stringify(animal),
  });
};
