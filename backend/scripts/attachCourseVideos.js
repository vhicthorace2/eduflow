/**
 * Attach a real YouTube video to every module's "Video Lesson" material for
 * every active course, searched by module topic. Run with
 * `npm run attach-videos` from backend/.
 */
require('dotenv').config();

const { sequelize } = require('../config/database');
const { attachAllCourseVideos } = require('../agents/contentResourceAgent.js');

(async () => {
  try {
    await sequelize.authenticate();
    const results = await attachAllCourseVideos();

    const byCourse = {};
    for (const r of results) {
      byCourse[r.courseTitle] = byCourse[r.courseTitle] || { total: 0, attached: 0 };
      byCourse[r.courseTitle].total++;
      if (r.videoUrl && r.updated) byCourse[r.courseTitle].attached++;
    }

    let total = 0;
    let attached = 0;
    const failed = [];
    for (const [title, stats] of Object.entries(byCourse)) {
      total += stats.total;
      attached += stats.attached;
      console.log(`- ${title}: ${stats.attached}/${stats.total} modules got a real YouTube video`);
    }
    for (const r of results) {
      if (r.error || !r.videoUrl) {
        failed.push(`${r.courseTitle} / ${r.moduleTitle}: ${r.error || 'no video resolved'}`);
      }
    }
    if (failed.length) {
      console.log(`Unresolved/failed (${failed.length}):`);
      failed.slice(0, 10).forEach((f) => console.log(`   ${f}`));
    }
    console.log(`Done. ${attached}/${total} video materials updated.`);
  } catch (error) {
    console.error('attach-videos failed:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();