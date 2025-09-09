import { fetchWithAuth } from './client';

export type CommentUser = {
  _id: string;
  username?: string;
  profilePictureUrl?: string;
};

export type Comment = {
  _id: string;
  sighting: string;
  user: CommentUser | string;
  commentText: string;
  createdAt: string;
};

export const apiGetCommentsForSighting = async (sightingId: string) => {
  return fetchWithAuth(`/comments/sighting/${sightingId}`, '', { method: 'GET' });
};

export const apiCreateComment = async (token: string, sightingId: string, commentText: string) => {
  return fetchWithAuth(`/comments/sighting/${sightingId}`, token, {
    method: 'POST',
    body: JSON.stringify({ commentText }),
  });
};

export const apiUpdateComment = async (token: string, commentId: string, commentText: string) => {
  return fetchWithAuth(`/comments/${commentId}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ commentText }),
  });
};

export const apiDeleteComment = async (token: string, commentId: string) => {
  return fetchWithAuth(`/comments/${commentId}`, token, { method: 'DELETE' });
};

