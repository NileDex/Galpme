/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MapUser, ActivityFeedItem, UserCategory } from './types';

export interface PresetCity {
  name: string;
  country: string;
  lat: number;
  lng: number;
}

export const PRESET_CITIES: PresetCity[] = [
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503 },
  { name: 'London', country: 'United Kingdom', lat: 51.5074, lng: -0.1278 },
  { name: 'New York', country: 'United States', lat: 40.7128, lng: -74.0060 },
  { name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522 },
  { name: 'Lagos', country: 'Nigeria', lat: 6.5244, lng: 3.3792 },
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093 },
  { name: 'Rio de Janeiro', country: 'Brazil', lat: -22.9068, lng: -43.1729 },
  { name: 'San Francisco', country: 'United States', lat: 37.7749, lng: -122.4194 },
  { name: 'Mumbai', country: 'India', lat: 19.0760, lng: 72.8777 },
  { name: 'Berlin', country: 'Germany', lat: 52.5200, lng: 13.4050 },
  { name: 'Cairo', country: 'Egypt', lat: 30.0444, lng: 31.2357 },
  { name: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198 },
];

export const AVATAR_EMOJIS: Record<UserCategory, string[]> = {
  developer: ['💻', '🤖', '⚡', '☕', '🕶️', '🚀'],
  designer: ['🎨', '🌟', '📐', '🔮', '✏️', '🌈'],
  nomad: ['🌴', '✈️', '🎒', '🧗', '🚲', '🍕'],
  student: ['🎓', '📚', '📓', '💡', '🧪', '🍿'],
  artist: ['🎭', '🎻', '🎙️', '🧿', '📸', '🛹'],
  explorer: ['🧭', '🏔️', '🗺️', '⛺', '🥾', '🌊'],
};

export const CATEGORY_DETAILS: Record<UserCategory, { label: string; color: string; bg: string; border: string }> = {
  developer: { label: 'Developer', color: 'text-emerald-700 dark:text-emerald-350', bg: 'bg-emerald-500/10 border border-emerald-500/20', border: 'border-emerald-500/30' },
  designer: { label: 'Designer', color: 'text-pink-700 dark:text-pink-350', bg: 'bg-pink-500/10 border border-pink-500/20', border: 'border-pink-500/30' },
  nomad: { label: 'Nomad', color: 'text-amber-700 dark:text-amber-350', bg: 'bg-amber-500/10 border border-amber-500/20', border: 'border-amber-500/30' },
  student: { label: 'Student', color: 'text-cyan-700 dark:text-cyan-350', bg: 'bg-cyan-500/10 border border-cyan-500/20', border: 'border-cyan-500/30' },
  artist: { label: 'Artist', color: 'text-purple-700 dark:text-purple-350', bg: 'bg-purple-500/10 border border-purple-500/20', border: 'border-purple-500/30' },
  explorer: { label: 'Explorer', color: 'text-blue-700 dark:text-blue-350', bg: 'bg-blue-500/10 border border-blue-500/20', border: 'border-blue-500/30' },
};

export const INITIAL_USERS: MapUser[] = [];

export const INITIAL_FEED: ActivityFeedItem[] = [];

// Lists of simulated potential active users to spin up live interactions
export const BOT_NAMES: string[] = [];

export const BOT_BIOS: Record<UserCategory, string[]> = {
  developer: [],
  designer: [],
  nomad: [],
  student: [],
  artist: [],
  explorer: []
};
