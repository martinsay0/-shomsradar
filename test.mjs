import fs from 'fs';
import { calculateNearRepeats } from './src/utils/nearRepeat.js';
import { calculateLISAHotspots } from './src/utils/hotspotAnalysis.js';

const data = JSON.parse(fs.readFileSync('./src/realData.json', 'utf8'));

try {
  const nr = calculateNearRepeats(data, 200);
  console.log('NearRepeats works, zones:', nr.propagationZones.length);
} catch (e) {
  console.error('NearRepeats Error:', e);
}

try {
  const lisa = calculateLISAHotspots(data, 150);
  console.log('LISA works, hexes:', lisa.grid ? lisa.grid.features.length : 0);
} catch (e) {
  console.error('LISA Error:', e);
}
