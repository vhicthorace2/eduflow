import backendCover from '../assets/covers/backend.jpg';
import frontendCover from '../assets/covers/frontend.jpg';
import designCover from '../assets/covers/design.jpg';
import unityCover from '../assets/covers/unity.jpg';
import sqlCover from '../assets/covers/sql.jpg';
import faultTolerantCover from '../assets/covers/fault-tolerant.jpg';
import specialTopicsCover from '../assets/covers/special-topics.jpg';
import mobileCover from '../assets/covers/mobile.jpg';
import embeddedCover from '../assets/covers/embedded.jpg';
import javaCover from '../assets/covers/java.jpg';
import defaultCover from '../assets/covers/default.jpg';

const COVERS = [
  { match: 'backend', src: backendCover },
  { match: 'react', src: frontendCover },
  { match: 'ui/ux', src: designCover },
  { match: 'design', src: designCover },
  { match: 'unity', src: unityCover },
  { match: 'sql', src: sqlCover },
  { match: 'fault tolerant', src: faultTolerantCover },
  { match: 'special topics', src: specialTopicsCover },
  { match: 'flutter', src: mobileCover },
  { match: 'embedded', src: embeddedCover },
  { match: 'java', src: javaCover },
];

export function courseCover(title = '') {
  const t = String(title).toLowerCase();
  const hit = COVERS.find((c) => t.includes(c.match));
  return hit ? hit.src : defaultCover;
}