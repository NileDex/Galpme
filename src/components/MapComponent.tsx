/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapUser, UserCategory } from '../types';
import { CATEGORY_DETAILS } from '../mockData';
import { Crosshair, Navigation, Sun, Moon, Info } from 'lucide-react';

interface MapComponentProps {
  users: MapUser[];
  selectedUser: MapUser | null;
  onSelectUser: (user: MapUser | null) => void;
  pinPosition: [number, number] | null;
  onChangePinPosition: (pos: [number, number]) => void;
  isSelectMode: boolean;
  mapCenter: [number, number];
  onUserWave?: (userId: string) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function MapComponent({
  users,
  selectedUser,
  onSelectUser,
  pinPosition,
  onChangePinPosition,
  isSelectMode,
  mapCenter,
  onUserWave,
  theme,
  onToggleTheme,
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const tempMarkerRef = useRef<L.Marker | null>(null);
  const [baseTileLayer, setBaseTileLayer] = useState<L.TileLayer | null>(null);
  const [refTileLayer, setRefTileLayer] = useState<L.TileLayer | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // 1. Initialize map instance (once on mount)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Define world bounds to prevent map wrapping
    const maxBounds = L.latLngBounds([-85.0511287798066, -180], [85.0511287798066, 180]);

    const map = L.map(mapContainerRef.current, {
      center: [0, 0],
      zoom: 3,
      zoomControl: false,
      maxZoom: 18,
      minZoom: 3,
      maxBounds: maxBounds,
      maxBoundsViscosity: 0.5,
      dragging: true,
      scrollWheelZoom: true,
      doubleClickZoom: false,
      boxZoom: false,
      touchZoom: true,
      keyboard: false,
      worldCopyJump: false,
    });
    // Ensure dragging is always enabled for user interaction
    map.dragging.enable();
    // Ensure strict bounds enforcement
    map.setMaxBounds(maxBounds);

    // Mobile minZoom enforcement removed – using global minZoom of 3


    mapRef.current = map;


    // Fixed minZoom at 3 – no dynamic adjustment needed
// (Ensured by map initialization)


    // Force size recalculation to prevent render cutouts
    map.invalidateSize();
    const tInit = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 150);

    // Add zoom control on bottom-right to keep sidebar clean
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Initial tile layers setting (CartoDB Positron/Dark Matter for high reliability)
    const baseLayerUrl = theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png';

    const refLayerUrl = theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png';

    // Enforce world bounds strictly (prevents panning beyond edges)
    map.setMaxBounds(maxBounds);

    const baseLayer = L.tileLayer(baseLayerUrl, {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      maxZoom: 20,
      maxNativeZoom: 20,
      // noWrap removed to allow seamless edges
    noWrap: true, // prevent map repetition
      bounds: maxBounds
    }).addTo(map);

    const refLayer = L.tileLayer(refLayerUrl, {
      attribution: '',
      maxZoom: 20,
      maxNativeZoom: 20,
      noWrap: true, // prevent map repetition
    }).addTo(map);

    setBaseTileLayer(baseLayer);
    setRefTileLayer(refLayer);

    // Disabled automatic fit to bounds to keep map zoomed out covering the page
    // if (users.length > 0) {
    //   const group = new L.FeatureGroup(users.map(u => L.marker([u.lat, u.lng])));
    //   map.fitBounds(group.getBounds().pad(0.25), { maxZoom: 3 });
    // }

    return () => {
      clearTimeout(tInit);
      if (mapRef.current) {
        // Resize listener removed – no dynamic minZoom needed
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 2. Core theme toggle implementation
  useEffect(() => {
    if (!mapRef.current || !baseTileLayer || !refTileLayer) return;

    const baseLayerUrl = theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png';

    const refLayerUrl = theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png';

    baseTileLayer.setUrl(baseLayerUrl);
    refTileLayer.setUrl(refLayerUrl);
  }, [theme, baseTileLayer, refTileLayer]);

  // 3. User markers synchronization
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers that are missing in parent list
    Object.keys(markersRef.current).forEach((key) => {
      const exists = users.find(u => u.id === key);
      if (!exists) {
        markersRef.current[key].remove();
        delete markersRef.current[key];
      }
    });

    // Create custom marker icons
    const createMarkerIcon = (user: MapUser) => {
      const details = CATEGORY_DETAILS[user.role];
      const isFocused = selectedUser?.id === user.id;

      // Base category colors
      const colorMap: Record<UserCategory, string> = {
        developer: '#10b981', // emerald-500
        designer: '#f43f5e', // pink-500
        nomad: '#f59e0b', // amber-500
        student: '#06b6d4', // cyan-500
        artist: '#a855f7', // purple-500
        explorer: '#3b82f6', // blue-500
      };

      const color = colorMap[user.role] || '#64748b';
      const borderCSS = user.isSelf
        ? 'border-yellow-400 bg-amber-50 dark:bg-slate-900 shadow-yellow-500/50'
        : 'border-[2.5px] bg-white dark:bg-slate-950 shadow-md';

      return L.divIcon({
        className: 'custom-user-marker',
        html: `
          <div class="relative flex items-center justify-center w-11 h-11 group cursor-pointer">
            <!-- No focus glow -->

            <!-- Actual Circle containing Avatar -->
            <div class="w-10 h-10 rounded-full flex items-center justify-center border shadow-lg overflow-hidden ${borderCSS}" 
                 style="${!user.isSelf ? `border-color: ${color};` : ''}">
              ${user.avatarUrl ? `
                <img src="${user.avatarUrl}" alt="${user.username}" class="w-full h-full object-cover" />
              ` : `
                <svg class="w-5 h-5 text-slate-400" fill="none" stroke="#94a3b8" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              `}
            </div>

            <!-- Tiny Online Badge -->
            <div class="absolute top-1 right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-950 ${user.isOnline ? 'bg-emerald-450' : 'bg-slate-400'}" style="background-color: ${user.isOnline ? '#10b981' : '#94a3b8'};"></div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -18],
      });
    };

    // Update or add markers
    users.forEach((user) => {
      const latLng: [number, number] = [user.lat, user.lng];
      const customIcon = createMarkerIcon(user);

      if (markersRef.current[user.id]) {
        // Update existing marker attributes
        const marker = markersRef.current[user.id];
        marker.setLatLng(latLng);
        marker.setIcon(customIcon);
      } else {
        // Create new marker
        const marker = L.marker(latLng, { icon: customIcon }).addTo(map);

        // Listen to marker click
        marker.on('click', () => {
          onSelectUser(user);
        });

        markersRef.current[user.id] = marker;
      }

      // Bind elegant custom Leaflet popup
      const details = CATEGORY_DETAILS[user.role];
      const popupContent = `
        <div class="p-2.5 font-sans">
          <div class="flex items-center gap-2 mb-1.5">
            ${user.avatarUrl ? `
              <div class="w-8 h-8 rounded-full overflow-hidden border border-slate-200/60 flex-shrink-0">
                <img src="${user.avatarUrl}" alt="${user.username}" class="w-full h-full object-cover" />
              </div>
            ` : `
              <div class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/60 flex items-center justify-center flex-shrink-0">
                <svg class="w-4 h-4 text-slate-400" fill="none" stroke="#94a3b8" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
            `}
            <div>
              <p class="font-extrabold text-xs text-slate-800 dark:text-white leading-tight">@${user.username}</p>
              <span class="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 font-bold inline-block">
                ${details.label}
              </span>
            </div>
          </div>
          <p class="text-[10px] text-slate-600 dark:text-slate-350 line-clamp-2 italic leading-relaxed">"${user.bio}"</p>
        </div>
      `;
      markersRef.current[user.id].bindPopup(popupContent, {
        closeButton: false,
        offset: [0, -10],
      });
    });
  }, [users, selectedUser, onSelectUser]);

  // 4. Temporary pin coordinate selector setup
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tempMarkerRef.current) {
      tempMarkerRef.current.remove();
      tempMarkerRef.current = null;
    }

    if (pinPosition) {
      const pinIcon = L.divIcon({
        className: 'temp-coordinate-marker',
        html: `
          <div class="relative flex items-center justify-center w-12 h-12">
            <div class="absolute inset-0 rounded-full bg-yellow-400/25 border-2 border-dashed border-yellow-400"></div>
            <div class="w-8 h-8 rounded-full bg-slate-900 border-2 border-yellow-400 shadow-xl flex items-center justify-center">
              <span class="text-lg font-bold text-yellow-400">📍</span>
            </div>
          </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      });

      tempMarkerRef.current = L.marker(pinPosition, { icon: pinIcon }).addTo(map);

      const popupHTML = `
        <div class="p-1 bg-slate-950 text-slate-100 font-sans text-xs flex flex-col gap-1 rounded">
          <span class="font-semibold text-yellow-400">Position Selected!</span>
          <span class="text-[10px] text-slate-400 font-mono">Lat: ${pinPosition[0].toFixed(5)}, Lng: ${pinPosition[1].toFixed(5)}</span>
          <span class="text-[9px] text-zinc-500">Fill in your profile on the left to finish pinning!</span>
        </div>
      `;
      tempMarkerRef.current.bindPopup(popupHTML, { closeButton: false }).openPopup();
    }
  }, [pinPosition]);

  // 5. Handle map clicks for selecting new pins
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (isSelectMode) {
        onChangePinPosition([e.latlng.lat, e.latlng.lng]);
      }
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [isSelectMode, onChangePinPosition]);

  // 5.1 Force map recalculation when selection mode changes to ensure container layout renders fully
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Run immediately
    map.invalidateSize();

    // Run again after the modal's CSS close animation (duration-200 = 200ms) finishes
    const t1 = setTimeout(() => map.invalidateSize(), 250);
    // Final pass to catch any lingering layout shifts
    const t2 = setTimeout(() => map.invalidateSize(), 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isSelectMode]);

  // 6. Smooth scroll/zoom to centered user
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedUser) return;

    map.setView([selectedUser.lat, selectedUser.lng], 7, {
      animate: true,
      duration: 1.2,
    });

    // Automatically open parent marker's popup
    const marker = markersRef.current[selectedUser.id];
    if (marker) {
      setTimeout(() => {
        marker.openPopup();
      }, 800);
    }
  }, [selectedUser]);

  // Handle auto browser geolocation
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setIsLocating(false);
        if (mapRef.current) {
          mapRef.current.setView([latitude, longitude], 9, {
            animate: true,
            duration: 1.5,
          });
          if (isSelectMode) {
            onChangePinPosition([latitude, longitude]);
          }
        }
      },
      (error) => {
        setIsLocating(false);
        console.error('Error locating user: ', error);
        // Fallback to random city close by or prompt
        alert('Could not determine physical location. Please click on the map to place your pin manually.');
      },
      { enableHighAccuracy: true, timeout: 7000 }
    );
  };

  return (
    <div className="relative w-full h-full min-h-[400px] flex-1 overflow-hidden block">
      {/* Map Container Ref */}
      <div
        ref={mapContainerRef}
        id="leaflet-canvas"
        className={`absolute inset-0 select-none ${isSelectMode ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
      />

      {/* Floating Interactive Elements Overlay */}
      <div className="absolute top-4 right-4 z-[999] flex flex-col gap-2">
        {/* Skin Selector */}
        <button
          onClick={onToggleTheme}
          className="p-3 bg-white/75 dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 backdrop-blur-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 hover:text-black dark:hover:text-white rounded-xl shadow-xl transition-all cursor-pointer flex items-center justify-center"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Map`}
          id="btn-map-theme"
          type="button"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-500 animate-pulse" />
          ) : (
            <Moon className="w-5 h-5 text-indigo-600" />
          )}
        </button>

        {/* Locate Me Trigger */}
        <button
          onClick={handleLocateMe}
          disabled={isLocating}
          className={`p-3 bg-white/75 dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 backdrop-blur-md hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl shadow-xl transition-all cursor-pointer flex items-center justify-center ${isLocating ? 'animate-pulse text-zinc-500' : 'text-slate-800 dark:text-slate-100 hover:text-black dark:hover:text-white'}`}
          title="Zoom to My Geolocation"
          id="btn-locate-me"
          type="button"
        >
          <Navigation className={`w-5 h-5 ${isLocating ? 'rotate-45 text-emerald-500 animate-bounce' : ''}`} />
        </button>
      </div>

      {/* Mode Instruction HUD Banner */}
      {isSelectMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[999] max-w-xs md:max-w-md w-full bg-amber-500 border border-amber-600/50 text-slate-950 font-medium rounded-xl p-3 shadow-2xl flex items-center gap-3 backdrop-blur-md animate-fade-in">
          <Crosshair className="w-5 h-5 flex-shrink-0 text-slate-950 animate-pulse" />
          <div className="text-xs">
            <p className="font-bold">Map Selection Mode Active</p>
            <p className="opacity-90">Click anywhere on the map to pin your location, or click <button onClick={handleLocateMe} className="underline font-bold hover:text-white">Locate Me</button></p>
          </div>
        </div>
      )}

      {/* Tiny Map Attribution Overwrite styling container */}
      <div className="absolute bottom-1 left-2 z-[999] pointer-events-none opacity-50 text-[10px] text-slate-300 font-sans hidden sm:block">
        <span className="flex items-center gap-1">
          <Info className="w-3 h-3" /> Double-click map to adjust, or navigate list.
        </span>
      </div>
    </div>
  );
}
