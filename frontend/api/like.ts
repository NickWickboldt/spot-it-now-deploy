import { fetchWithAuth } from './client';

export interface ActivitySighting {
  _id: string;
  caption?: string;
  mediaUrls: string[];
  createdAt: string;
  likes: number;
  comments: number;
  user?: {
    _id: string;
    username: string;
    profilePictureUrl?: string;
  };
  animalId?: {
    _id: string;
    commonName: string;
    scientificName?: string;
  };
  aiIdentification?: string;
}

export interface ActivityItem {
  type: 'like' | 'comment';
  activityDate: string;
  commentText?: string;
  sighting: ActivitySighting;
}

export interface ActivityFeedResponse {
  activities: ActivityItem[];
  total: number;
  hasMore: boolean;
}

export const apiToggleSightingLike = async (token: string, sightingId: string) => {
  return fetchWithAuth(`/likes/toggle/${sightingId}`, token, { method: 'POST' });
};

export const apiGetSightingLikes = async (sightingId: string) => {
  return fetchWithAuth(`/likes/sighting/${sightingId}`, '', { method: 'GET' });
};

export const apiGetLikedSightingsByUser = async (userId: string) => {
  return fetchWithAuth(`/likes/user/${userId}`, '', { method: 'GET' });
};

export const apiGetUserActivityFeed = async (
  userId: string, 
  page = 1, 
  pageSize = 20
): Promise<{ data: ActivityFeedResponse }> => {
  return fetchWithAuth(
    `/likes/user/${userId}/activity?page=${page}&pageSize=${pageSize}`, 
    '', 
    { method: 'GET' }
  );
};

