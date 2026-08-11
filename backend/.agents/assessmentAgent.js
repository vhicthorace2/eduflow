const client = require('../services/openaiservices.js');

/**
 * Deterministic question banks per seeded course, so every course gets its own
 * assessment even when no OpenAI client is configured. Keys are normalized
 * course titles (lowercase trimmed).
 */
const courseBanks = {
  'backend web application development': [
    { question: 'What does HTTP stand for?', options: ['HyperText Transfer Protocol', 'HyperText Transmission Protocol', 'High-Tech Transfer Process', 'Hyperlink Text Processing Protocol'], correctAnswer: 'HyperText Transfer Protocol' },
    { question: 'Which HTTP method is typically used to create a new resource?', options: ['GET', 'POST', 'PUT', 'DELETE'], correctAnswer: 'POST' },
    { question: 'Which HTTP status code means the resource was not found?', options: ['200', '301', '404', '500'], correctAnswer: '404' },
    { question: 'In Express, which is the correct order for a JSON body parser?', options: ['app.use(express.json()) before routes', 'After the routes', 'Inside a controller', 'It must be imported from a database'], correctAnswer: 'app.use(express.json()) before routes' },
    { question: 'Which Sequelize method returns all matching rows?', options: ['findOne', 'findAll', 'getAll', 'find'], correctAnswer: 'findAll' },
    { question: 'A course that has many modules is which type of relationship?', options: ['one-to-many', 'many-to-many', 'one-to-one', 'no relationship'], correctAnswer: 'one-to-many' },
    { question: 'Which package hashes passwords with bcrypt?', options: ['jsonwebtoken', 'bcrypt', 'sequelize', 'multer'], correctAnswer: 'bcrypt' },
    { question: 'What does JWT stand for?', options: ['JavaScript Web Tool', 'JSON Web Token', 'Java Web Transfer', 'JSON Web Transport'], correctAnswer: 'JSON Web Token' },
    { question: 'Which HTTP header carries a bearer token in an authenticated request?', options: ['Content-Type', 'X-API-Key', 'Authorization', 'Accept'], correctAnswer: 'Authorization' },
    { question: 'Which check restricts an endpoint to administrators only?', options: ['authentication', 'rate limiting', 'role-based access control', 'compression'], correctAnswer: 'role-based access control' }
  ],
  'frontend web development with react': [
    { question: 'What is JSX?', options: ['A database query language', 'A syntax extension for writing markup in JavaScript', 'A CSS framework', 'A build tool'], correctAnswer: 'A syntax extension for writing markup in JavaScript' },
    { question: 'Which hook is used to hold state in a function component?', options: ['useEffect', 'useState', 'useRef', 'useFetch'], correctAnswer: 'useState' },
    { question: 'Which hook runs side effects after the component renders?', options: ['useEffect', 'useState', 'useMemo', 'useReducer'], correctAnswer: 'useEffect' },
    { question: 'How do props flow in React?', options: ['Both directions', 'Top-down only', 'Bottom-up only', 'Between siblings only'], correctAnswer: 'Top-down only' },
    { question: 'Which component declares a route in react-router?', options: ['<RouterLink>', '<Page>', '<Route>', '<View>'], correctAnswer: '<Route>' },
    { question: 'What does a list of items rendered in JSX require on each item?', options: ['A style prop', 'A key prop', 'An id attribute', 'Nothing'], correctAnswer: 'A key prop' },
    { question: 'Which of these is a Vite command to start the dev server?', options: ['npm run dev', 'npm start', 'node app.js', 'vite run'], correctAnswer: 'npm run dev' },
    { question: 'What does the {count} syntax in JSX do?', options: ['Creates a comment', 'Embeds a JavaScript expression', 'Declares a class', 'Imports a file'], correctAnswer: 'Embeds a JavaScript expression' },
    { question: 'Which wrapper component contains all routes for an SPA?', options: ['<Routes>', '<Stack>', '<Layout>', '<Root>'], correctAnswer: '<Routes>' },
    { question: 'What does Tailwind CSS primarily use to style elements?', options: ['Separate stylesheet files', 'Utility classes in the markup', 'Inline style attributes only', 'A CSS preprocessor'], correctAnswer: 'Utility classes in the markup' }
  ],
  'ui/ux design systems': [
    { question: 'Which design principle tells users where to look first?', options: ['Hierarchy', 'Decorative fills', 'Random placement', 'Uniform color'], correctAnswer: 'Hierarchy' },
    { question: 'Named design values for color, spacing, and type are called...', options: ['design tokens', 'inline styles', 'media queries', 'wireframes'], correctAnswer: 'design tokens' },
    { question: 'Which token stands for the brand color in a design system?', options: ['--space-sm', '--accent', '--font-mono', '--radius'], correctAnswer: '--accent' },
    { question: 'What does good contrast in a UI primarily improve?', options: ['Load speed', 'Readability and accessibility', 'Animation', 'SEO'], correctAnswer: 'Readability and accessibility' },
    { question: 'A reusable building block in a UI is called a...', options: ['component', 'canvas', 'layer', 'keyframe'], correctAnswer: 'component' },
    { question: 'What is the purpose of interactive prototypes?', options: ['To encrypt user data', 'To validate flows before building', 'To replace the backend', 'To minify assets'], correctAnswer: 'To validate flows before building' },
    { question: 'When design and code share the same tokens, handoff becomes...', options: ['nearly seamless', 'impossible', 'manual per pixel', 'redundant'], correctAnswer: 'nearly seamless' },
    { question: 'Which is a benefit of a component library?', options: ['Consistent styling across screens', 'Larger CSS files', 'More duplicated code', 'Harder theming'], correctAnswer: 'Consistent styling across screens' },
    { question: 'Consistent spacing and repeated patterns create...', options: ['visual rhythm', 'latency', 'responsiveness', 'caching'], correctAnswer: 'visual rhythm' },
    { question: 'Which tool is commonly used for creating interactive design prototypes?', options: ['Figma', 'Vite', 'Sequelize', 'Nodemailer'], correctAnswer: 'Figma' }
  ],
  'game development with unity': [
    { question: 'What is a GameObject in Unity?', options: ['A container that holds components', 'A special color type', 'A folder in the project', 'A physics material'], correctAnswer: 'A container that holds components' },
    { question: 'Which Unity method runs once per frame?', options: ['Start', 'Awake', 'Update', 'OnEnable'], correctAnswer: 'Update' },
    { question: 'Which component gives a GameObject physics behavior?', options: ['Camera', 'Rigidbody', 'AudioSource', 'MeshFilter'], correctAnswer: 'Rigidbody' },
    { question: 'A template of a GameObject saved for reuse is called a...', options: ['prefab', 'scene', 'collider', 'shader'], correctAnswer: 'prefab' },
    { question: 'Which event fires when an object enters a trigger volume?', options: ['OnTriggerEnter', 'OnCollisionExit', 'OnMouseDown', 'OnDestroy'], correctAnswer: 'OnTriggerEnter' },
    { question: 'C# scripts in Unity inherit from which base class?', options: ['GameObject', 'MonoBehaviour', 'ComponentBase', 'Transform'], correctAnswer: 'MonoBehaviour' },
    { question: 'Which programming language does Unity use?', options: ['C#', 'Python', 'Java', 'Swift'], correctAnswer: 'C#' },
    { question: 'What defines the collision shape of a GameObject?', options: ['A Collider', 'A Rigidbody', 'A Light source', 'A Canvas'], correctAnswer: 'A Collider' },
    { question: 'Which method is better for physics-driven movement?', options: ['Update', 'FixedUpdate', 'LateUpdate', 'OnGUI'], correctAnswer: 'FixedUpdate' },
    { question: 'Which window exports your game for a target platform?', options: ['Build Settings', 'Inspector', 'Projection', 'Console'], correctAnswer: 'Build Settings' }
  ],
  'database systems with sql': [
    { question: 'Which clause filters rows before returning them?', options: ['WHERE', 'ORDER BY', 'GROUP BY', 'JOIN'], correctAnswer: 'WHERE' },
    { question: 'Which key uniquely identifies a row in a table?', options: ['primary key', 'foreign key', 'index', 'view'], correctAnswer: 'primary key' },
    { question: 'Which JOIN returns only matching rows from both tables?', options: ['INNER JOIN', 'LEFT JOIN only', 'FULL OUTER JOIN only', 'CROSS JOIN'], correctAnswer: 'INNER JOIN' },
    { question: 'What does COUNT(*) return?', options: ['The number of rows in the result', 'The sum of a column', 'The first row', 'The maximum value'], correctAnswer: 'The number of rows in the result' },
    { question: 'Which clause collapses rows into groups for aggregation?', options: ['GROUP BY', 'LIMIT', 'ORDER BY', 'DISTINCT ON'], correctAnswer: 'GROUP BY' },
    { question: 'Normalization primarily removes...', options: ['redundancy', 'indexes', 'joins', 'constraints'], correctAnswer: 'redundancy' },
    { question: 'An index is mainly used to speed up...', options: ['reads and queries', 'backups', 'password hashing', 'uploads'], correctAnswer: 'reads and queries' },
    { question: 'Which SQL command retrieves data from a table?', options: ['SELECT', 'UPDATE', 'DELETE', 'INSERT'], correctAnswer: 'SELECT' },
    { question: 'Which ACID property guarantees all-or-nothing execution?', options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'], correctAnswer: 'Atomicity' },
    { question: 'A committed transaction is guaranteed to survive a crash by the...', options: ['Durability property', 'Join clause', 'Index cache', 'Foreign key'], correctAnswer: 'Durability property' }
  ]
};

const genericQuestions = [
  { question: 'What does HTML stand for?', options: ['HyperText Markup Language', 'HighText Machine Language', 'Hyperlink and Text Management Language', 'Home Tool Markup Language'], correctAnswer: 'HyperText Markup Language' },
  { question: 'Which language runs in the browser?', options: ['Python', 'JavaScript', 'Java', 'C++'], correctAnswer: 'JavaScript' },
  { question: 'What does CSS stand for?', options: ['Creative Style Sheets', 'Cascading Style Sheets', 'Computer Style Sheets', 'Colorful Style Sheets'], correctAnswer: 'Cascading Style Sheets' },
  { question: 'Which HTML tag is used for a top-level heading?', options: ['<heading>', '<h6>', '<h1>', '<head>'], correctAnswer: '<h1>' },
  { question: 'Which property changes the background color in CSS?', options: ['color', 'background-color', 'background', 'bgcolor'], correctAnswer: 'background-color' },
  { question: 'How do you create a function in JavaScript?', options: ['function:myFunction()', 'function myFunction()', 'function = myFunction()', 'func myFunction()'], correctAnswer: 'function myFunction()' },
  { question: 'Which is a valid JavaScript variable declaration?', options: ['let x = 5', 'variable x = 5', 'dim x = 5', 'def x = 5'], correctAnswer: 'let x = 5' },
  { question: 'What does the equality operator "===" compare?', options: ['Only values', 'Values and types', 'Only types', 'Nothing'], correctAnswer: 'Values and types' },
  { question: 'Which element is used to link an external stylesheet?', options: ['<style>', '<link>', '<script>', '<meta>'], correctAnswer: '<link>' },
  { question: 'What is the output of 2 + "2" in JavaScript?', options: ['4', '22', 'Error', 'NaN'], correctAnswer: '22' }
];

function findBank(course) {
  const normalized = String(course || '').trim().toLowerCase();
  if (!normalized) return null;
  if (courseBanks[normalized]) return courseBanks[normalized];
  for (const key of Object.keys(courseBanks)) {
    if (normalized.includes(key) || key.includes(normalized)) return courseBanks[key];
  }
  return null;
}

async function generateAssessment(course) {
  if (client) {
    try {
      const response = await client.responses.create({
        model: 'gpt-5.5',
        input: `Generate 10 beginner multiple choice questions for ${course} in JSON format`
      });

      const text = response.output_text || '';
      const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, '').trim());

      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (error) {
      // fall through to the course bank below
    }
  }

  return findBank(course) || genericQuestions;
}

module.exports = { generateAssessment };