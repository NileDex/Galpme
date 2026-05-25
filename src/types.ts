/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserCategory = 'developer' | 'designer' | 'nomad' | 'student' | 'artist' | 'explorer';

export interface MapUser {
  id: string;
  username: string;
  role: UserCategory;
  bio: string;
  lat: number;
  lng: number;
  timestamp: Date;
  likes: number;
  avatarSeed: string; // Used for a colorful identifier avatar or emoji
  avatarUrl?: string; // Optional custom uploaded profile picture URL
  isSelf?: boolean;
  isOnline: boolean;
}

export interface ActivityFeedItem {
  id: string;
  userId: string;
  username: string;
  type: 'signup' | 'pin' | 'like' | 'wave';
  detail: string;
  timestamp: Date;
}
