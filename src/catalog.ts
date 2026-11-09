export interface CatalogEntry { id: string; file: string; number: string; name: string }

// Models from the LDraw Official Model Repository (packed by the three.js project). CC BY 2.0, authors credited in each file.
export const CATALOG: CatalogEntry[] = [
  { id: '4915', file: '/models/4915-mini-construction.mpd', number: '4915', name: 'Mini Construction' },
  { id: '30023', file: '/models/30023-lighthouse.mpd', number: '30023', name: 'Lighthouse' },
  { id: '7140', file: '/models/7140-x-wing.mpd', number: '7140', name: 'X-wing Fighter' },
  { id: '10174', file: '/models/10174-at-st-ucs.mpd', number: '10174', name: 'Imperial AT-ST' },
];
