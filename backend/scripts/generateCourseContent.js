/**
 * Generate course content: for every active course and module, create (or
 * refresh) three learning materials — a text study guide (document), an audio
 * lesson, and a video lesson — so each course ships with text, audio, and
 * video. Idempotent: run with `npm run generate-content` from backend/.
 * Deterministic; no external model calls (OpenAI has no credits).
 */
require('dotenv').config();

const { sequelize } = require('../config/database');
const { Course, Module, Material } = require('../models');

const MATERIAL_ORDER = {
  document: 1,
  audio: 2,
  video: 3
};

// Stable, publicly playable CC0 MP4s so the <video> element can stream them.
// The topic search URL is kept as linkUrl for deeper exploration.
const PLAYABLE_VIDEOS = [
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
  'https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4'
];

function studyGuide(courseTitle, moduleTitle) {
  return [
    `## ${moduleTitle} - Study Notes`,
    '',
    `A review guide for the "${moduleTitle}" module in ${courseTitle}.`,
    '',
    '## Key ideas',
    `- Be able to explain what "${moduleTitle}" covers in your own words.`,
    '- Identify the main tools and concepts used in this topic.',
    '- Connect this module to the overall goals of the course.',
    '',
    '## How to use this guide',
    '1. Read the module lesson above first.',
    '2. Summarize each section in your own words.',
    '3. Practise the closing exercise until you can complete it without notes.',
    '',
    '## Self-check',
    `- Can you explain the central idea of "${moduleTitle}"?`,
    `- Can you relate "${moduleTitle}" to the rest of "${courseTitle}"?`,
    '- Are you ready to move on to the next module?'
  ].join('\n');
}

function searchUrl(query) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

async function generateContentForCourse(course) {
  const modules = await Module.findAll({
    where: { courseId: course.id, isActive: true },
    order: [['order', 'ASC']]
  });

  let created = 0;
  let updated = 0;

  for (const module of modules) {
    const audioUrl = searchUrl(`${course.title} ${module.title} audio lesson`);
    const topicSearchUrl = searchUrl(`${course.title} ${module.title} video lesson`);
    const playableVideo = PLAYABLE_VIDEOS[((module.order || 1) - 1) % PLAYABLE_VIDEOS.length];

    const templates = [
      {
        type: 'document',
        title: `${module.title} - Text Study Notes`,
        description: studyGuide(course.title, module.title),
        fileUrl: null,
        videoUrl: null,
        linkUrl: null
      },
      {
        type: 'audio',
        title: `${module.title} - Audio Lesson`,
        description: `Listen to an audio explanation of "${module.title}". Opens a curated set of audio and video results for this topic.`,
        fileUrl: null,
        videoUrl: null,
        linkUrl: audioUrl
      },
      {
        type: 'video',
        title: `${module.title} - Video Lesson`,
        description: `Watch a video walkthrough of "${module.title}", then open the linked lesson search for more on this topic.`,
        fileUrl: null,
        videoUrl: playableVideo,
        linkUrl: topicSearchUrl
      }
    ];

    for (const template of templates) {
      const [material, wasCreated] = await Material.findOrCreate({
        where: { moduleId: module.id, type: template.type, title: template.title },
        defaults: {
          courseId: course.id,
          order: MATERIAL_ORDER[template.type],
          fileSize: 0,
          isActive: true,
          description: template.description,
          fileUrl: template.fileUrl,
          videoUrl: template.videoUrl,
          linkUrl: template.linkUrl
        }
      });

      if (wasCreated) {
        created++;
      } else {
        const hasRealVideo =
          material.type === 'video' &&
          /(youtube\.com\/watch\?|youtu\.be\/)/.test(material.videoUrl || '');
        const stale =
          material.description !== template.description ||
          (!hasRealVideo && (material.videoUrl || null) !== template.videoUrl) ||
          (!hasRealVideo && (material.linkUrl || null) !== template.linkUrl);
        if (stale) {
          await material.update({
            description: template.description,
            videoUrl: hasRealVideo ? material.videoUrl : template.videoUrl,
            linkUrl: hasRealVideo ? material.linkUrl : template.linkUrl,
            isActive: true
          });
          updated++;
        }
      }
    }
  }

  return { courseId: course.id, courseTitle: course.title, modules: modules.length, created, updated };
}

async function generate() {
  try {
    await sequelize.authenticate();
    const courses = await Course.findAll({ where: { isActive: true }, order: [['title', 'ASC']] });

    const report = [];
    let totalCreated = 0;
    let totalUpdated = 0;

    for (const course of courses) {
      const result = await generateContentForCourse(course);
      totalCreated += result.created;
      totalUpdated += result.updated;
      report.push(result);
      console.log(
        `- ${result.courseTitle}: ${result.modules} module(s), +${result.created} created, ${result.updated} updated`
      );
    }

    const byType = await Material.findAll({
      attributes: ['type', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['type']
    });
    const summary = byType.map((row) => `${row.type}=${row.get('count')}`).join(', ');

    console.log('');
    console.log(`Total: ${courses.length} courses, ${totalCreated} materials created, ${totalUpdated} updated.`);
    console.log(`Materials in DB by type: ${summary}`);
  } catch (error) {
    console.error('generate-course-content failed:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

generate();