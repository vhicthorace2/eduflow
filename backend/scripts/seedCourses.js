/**
 * Seed script: creates Software Engineering courses and their learning modules.
 * Idempotent — run with `npm run db:seed` from backend/.
 * Uses an existing instructor user (first instructor found) as the course owner.
 * Re-runs refresh module descriptions + lesson content so new columns backfill.
 */
require('dotenv').config();

const { sequelize } = require('../config/database');
const { User, Course, Module, Gradebook } = require('../models');

const DEMO_STUDENT_EMAIL = 'assess.test@eduflow.com';
const DEMO_INSTRUCTOR_EMAIL = 'instructor@eduflow.com';
const DEMO_PASSWORD = 'eduflow123';

const courseData = [
  {
    title: 'Backend Web Application Development',
    description:
      'Build production-ready REST APIs and backend services. Covers Express.js, database modeling with Sequelize, authentication, and secure API design.',
    category: 'Software Engineering',
    difficulty: 'intermediate',
    credits: 3,
    modules: [
      {
        title: 'Intro to Backend & HTTP',
        description: 'HTTP verbs, status codes, request/response lifecycle, and REST fundamentals.',
        content:
          `Backend development is the discipline of building the code that runs on a server and powers everything your frontend displays. Whenever you open a website, your browser (the client) sends a message across the internet to a server, which answers with the data needed to paint the page. That conversation follows a strict, well-understood protocol called HTTP.\n\n## The HTTP request / response cycle\n\nEvery interaction on the web is a request followed by a response. A request contains a method (the verb), a URL (where to send it), headers (metadata like content type and auth tokens), and sometimes a body (the payload). The server inspects the request, does the required work, and returns a response with a status code, headers, and usually a body.\n\n- GET retrieves a resource and never changes anything.\n- POST creates a new resource on the server.\n- PUT replaces an existing resource entirely.\n- PATCH applies a partial update to a resource.\n- DELETE removes a resource.\n\n## Status codes tell you the outcome\n\nEvery response carries a three-digit status code. The first digit groups the outcome:\n\n- 2xx — success: 200 OK, 201 Created, 204 No Content.\n- 3xx — redirection: 301 Moved Permanently, 304 Not Modified.\n- 4xx — client errors: 400 Bad Request, 401 Unauthenticated, 403 Forbidden, 404 Not Found, 422 Validation Failed.\n- 5xx — server errors: 500 Internal Server Error, 502 Bad Gateway.\n\n## REST in a nutshell\n\nREST is an architectural style that maps HTTP verbs onto resources. A resource is a thing your app manages — a course, a student, a grade — identified by a URL such as /api/courses. The same URL answers many kinds of requests: GET /api/courses lists them, POST /api/courses creates one, and PATCH /api/courses/:id updates a single course.\n\nBy the end of this module you should be able to trace a full request/response lifecycle from browser, through the server, to the database and back, and explain what each verb and status code family means.`
      },
      {
        title: 'Express.js Fundamentals',
        description: 'Routing, middleware, controllers, and error handling in Express.',
        content:
          `Express is the most widely used web framework for Node.js. It gives your backend a thin, predictable structure: routes define what URLs exist, middleware runs code in a chain around your handlers, and controllers hold the business logic. Understanding these three layers is the core of every Express application.\n\n## Routes pair a path with a handler\n\nA route combines an HTTP verb and a path with a handler function. When a request matches, Express calls that handler with the request and response objects.\n\n- Route definitions live in route files that only map method + path to a controller.\n- The handler reads input from req.params, req.query, and req.body.\n- The handler finishes by sending a JSON response with res.status(...).json(...).\n- Parameterized paths like /courses/:id capture dynamic values into req.params.\n\n## Middleware runs in sequence\n\nMiddleware are functions that run in order before your route handler. Each one receives the request, response, and a next function; calling next() passes control to the following middleware, and sending a response stops the chain.\n\n- express.json() parses incoming JSON bodies.\n- An auth middleware verifies the token and attaches the user to the request.\n- A logger middleware records each request before the handler runs.\n- This is why route ordering matters: Express executes middleware and routes in the exact order they are registered.\n\n## Keep controllers focused\n\nA clean pattern is to keep route files thin and move real logic into controllers. Controllers should do one job each: fetch the right records, apply business rules, and return a consistent response shape.\n\n- Wrap every handler's work in try/catch.\n- Forward errors to a shared next(error) so a global error handler formats them.\n- Pick fields explicitly from the request; never trust raw input.\n- Return a stable shape — success, message, and data — so the frontend can rely on it.`
      },
      {
        title: 'Databases with Sequelize',
        description: 'Models, associations, migrations, and querying with the Sequelize ORM.',
        content:
          `A database stores the durable data of your application. Sequelize is an Object-Relational Mapper (ORM) that lets you work with tables as JavaScript models, so you can read and write data with plain function calls instead of hand-written SQL.\n\n## Models describe your tables\n\nYou define a model with the fields you want to store and their types. A Course, for example, has a title (string), a description (text), and a difficulty (enum). The ORM turns that definition into a real table with the right column types.\n\n- DataTypes.STRING for short text, DataTypes.TEXT for long paragraphs.\n- DataTypes.INTEGER, DECIMAL, BOOLEAN, DATE, and JSON for other data.\n- validate rules, such as notEmpty or isEmail, run before a row is saved.\n- allowNull: false enforces that a column must always have a value.\n\n## Associations connect models\n\nReal apps store related data across several tables, and associations express how they connect.\n\n- A Course has many Modules: Course.hasMany(Module, { foreignKey: 'courseId' }).\n- A Module belongs to a Course: Module.belongsTo(Course, { foreignKey: 'courseId' }).\n- Each module row stores the id of its course in a foreign key column.\n- The as option gives the association a readable name you can eager-load with include.\n\n## Querying is expressive\n\nSequelize translates your JavaScript calls into SQL queries. The most useful queries cover almost every real need:\n\n- findAll({ where }) selects rows matching conditions.\n- order sorts results; limit caps how many come back.\n- include eager-loads related records in the same query.\n- findOrCreate returns an existing row or creates it — perfect for idempotent seeding.\n- Using an ORM keeps your code portable across MySQL and SQLite with only a configuration change.`
      },
      {
        title: 'Authentication & Authorization',
        description: 'JWT tokens, password hashing with bcrypt, and role-based access control.',
        content:
          `Authentication verifies who a user is; authorization decides what they are allowed to do. Both are essential to a secure backend, and confusing the two is one of the most common security mistakes.\n\n## Never store plain-text passwords\n\nPasswords are hashed with bcrypt before they are stored. A salt is added to each hash so two users with the same password still get different hashes, and even if the database leaks, the original passwords stay protected.\n\n- bcrypt.genSalt(10) creates a per-user salt.\n- bcrypt.hash(password, salt) produces the stored hash.\n- On login, bcrypt.compare checks a candidate password against the stored hash.\n- The plain password is never written to the database or sent back to the client.\n\n## Tokens prove identity on every request\n\nA common pattern is JSON Web Tokens (JWT). On successful login the server signs a token with a secret, and the client sends it in the Authorization header on later requests.\n\n- The token carries the user id and an expiry.\n- An auth middleware verifies the token signature and loads the user.\n- It attaches the user to the request object for handlers and other middleware.\n- Never trust a client-supplied id; always derive identity from the verified token.\n\n## Authorization restricts actions by role\n\nRole-based access control (RBAC) checks that the user has the right role before allowing sensitive operations.\n\n- Roles like student, instructor, lecturer, and admin gate different routes.\n- A route that creates courses requires an instructor or admin role.\n- A student route only returns data owned by the requesting user.\n- Checks happen server-side on every request — the frontend hiding a button is not security.`
      }
    ]
  },
  {
    title: 'Frontend Web Development with React',
    description:
      'Master modern React development: components, hooks, state management, routing, and building fast single-page applications.',
    category: 'Software Engineering',
    difficulty: 'beginner',
    credits: 3,
    modules: [
      {
        title: 'React Fundamentals',
        description: 'JSX, components, props, and the component lifecycle.',
        content:
          `React builds user interfaces from components — small, reusable pieces of UI. Each component returns markup that describes how the screen should look, and React keeps that markup in sync with your data.\n\n## Components are the building blocks\n\nA component is a function that returns JSX — the syntax React uses to write markup inside JavaScript. It looks like HTML but can embed JavaScript expressions in curly braces. Components receive data from their parents through props, which flow one way: down the tree.\n\n- A component name starts with a capital letter.\n- Props are read-only; a component never modifies its own props.\n- Small components compose into larger ones, keeping each piece focused.\n- The same component can be reused in many places with different props.\n\n## How React keeps the UI in sync\n\nReact re-renders a component whenever its props or state change, then compares the old and new output and updates only what changed in the DOM. This declarative model means you describe the desired UI and React handles the updates.\n\n- Render output is computed from current props and state.\n- React diffs the new tree against the old one (reconciliation).\n- Only changed parts of the DOM are touched, which keeps updates fast.\n- You never manually append or remove DOM nodes.\n\n## Keys make lists stable\n\nWhen you render a list, each item needs a stable key so React can track which items changed, were added, or were removed.\n\n- Use the item's unique id, not its array index.\n- A stable key preserves input state and avoids re-created elements.\n- Keys only matter within the same parent list.\n\nBy the end of this module, build a small component tree — for example a profile card — and pass props from a parent to a child.`
      },
      {
        title: 'Hooks & State',
        description: 'useState, useEffect, and building interactive interfaces.',
        content:
          `Hooks give function components superpowers. The most important are useState and useEffect, and almost every interactive interface is built on them.\n\n## useState manages changing data\n\nuseState declares a piece of state and a setter function. When the setter is called with a new value, React re-renders the component with the updated state. This is how interactive elements like forms, counters, and dropdowns stay in sync with the UI.\n\n- const [count, setCount] = useState(0) reads and updates a counter.\n- Always use the setter; mutating state directly does not trigger a render.\n- When the next value depends on the previous one, use the updater form: setCount(prev => prev + 1).\n- State declared in a component is local to that component.\n\n## useEffect runs side effects after render\n\nuseEffect lets you run code after the component renders — fetching data, subscribing to events, or updating the document title.\n\n- The effect runs after the first render and whenever its dependencies change.\n- Dependencies are listed in an array: useEffect(fn, [dep1, dep2]).\n- An empty array runs the effect only once after mount.\n- A cleanup function returned from the effect prevents memory leaks — for example cancelling an in-flight request when the component unmounts.\n\n## Lifting state up\n\nWhen two sibling components need to share state, move that state up to their closest common parent and pass it down through props.\n\n- The parent owns the state; children receive values and callbacks.\n- One source of truth avoids two components drifting out of sync.\n- Callbacks let children tell the parent how to update shared state.\n\nPractice by building a small todo list: useState for the items, controlled inputs, and an effect that saves the list to localStorage.`
      },
      {
        title: 'Routing & Navigation',
        description: 'Multi-page experiences with react-router, guards, and layouts.',
        content:
          `A single-page application still needs multiple views. React Router maps URLs to components so users can navigate without a full page reload.\n\n## Declaring routes\n\nRoutes are declared with the Routes and Route components, each pairing a path with the screen to render. The catch-all route handles unknown paths, typically showing a 404 page.\n\n- <Route path=\"/\" element={<Home />} /> renders Home at the root.\n- Dynamic segments use a colon: path=\"/courses/:id\".\n- useParams() reads those dynamic values in the matched screen.\n- A path=\"*\" route catches everything else for a 404 page.\n\n## Navigating between views\n\nThe Link component and the useNavigate hook move users between routes without a reload.\n\n- <Link to=\"/courses\"> replaces plain <a> tags for internal navigation.\n- useNavigate() returns a function you can call in event handlers.\n- navigate(-1) goes back to the previous page in history.\n- Query strings and state can be passed along for extra context.\n\n## Layouts and guards\n\nYou can compose routes into layouts — shared chrome like a navbar or sidebar that wraps several pages — and protect routes with guards.\n\n- A layout route renders shared chrome and an <Outlet /> for nested pages.\n- A guard component checks authentication before rendering the protected screen.\n- Unauthenticated visitors are redirected to the login page.\n- Role-based guards can split student and instructor areas of an app.\n\nBuild a three-page demo (Home, Course list, Course detail) with links, dynamic params, and a catch-all 404.`
      },
      {
        title: 'Styling with Tailwind',
        description: 'Utility-first styling, design tokens, and responsive layouts.',
        content:
          `Tailwind CSS is a utility-first framework. Instead of writing separate stylesheets, you compose small single-purpose classes directly in your markup.\n\n## Utility classes in practice\n\nEvery utility does one thing — padding, color, spacing, alignment — and you combine them on an element. The result is faster iteration and far fewer named CSS classes to invent.\n\n- px-4 py-3 sets horizontal and vertical padding.\n- flex items-center justify-between lays out a row with space between items.\n- text-sm font-semibold controls size and weight.\n- rounded-2xl border border-line defines shape and borders.\n\n## Design tokens make theming possible\n\nDesign tokens centralize visual decisions like colors, spacing, and typography. This project defines semantic tokens such as page, card, line, content, muted, and accent that map to CSS variables.\n\n- Tokens are named once (--card, --line, --muted) and referenced everywhere.\n- Swapping the token values at the root switches the whole theme.\n- Adding a class like light on the root element flips every semantic class.\n- Components never hardcode hex colors, so a rebrand is one change, not a site-wide search.\n\n## Responsive design\n\nResponsive design in Tailwind uses breakpoint prefixes like sm:, md:, and lg: so the same markup adapts between mobile and desktop layouts without leaving the component.\n\n- Classes without a prefix apply at every screen size.\n- sm: overrides from the small breakpoint up; lg: from the large breakpoint up.\n- grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stacks on mobile and becomes columns on wider screens.\n- Test at real widths — resizing the browser is not the same as a phone.`
      }
    ]
  },
  {
    title: 'UI/UX Design Systems',
    description:
      'Design consistent, scalable interfaces: tokens, typography, spacing, component libraries, and design-to-development handoff.',
    category: 'Design',
    difficulty: 'intermediate',
    credits: 2,
    modules: [
      {
        title: 'Design Principles',
        description: 'Hierarchy, contrast, alignment, and visual rhythm.',
        content:
          `Good interface design starts with principles, not tools. Hierarchy, contrast, alignment, and rhythm are the four ideas that make an interface understandable at a glance.\n\n## Hierarchy directs attention\n\nHierarchy tells users where to look first. The most important content should be the most visually dominant — bigger, bolder, or placed higher on the page.\n\n- One primary action per screen; make it the most prominent element.\n- Use type size and weight to separate titles, subtitles, and body text.\n- Group related information so scanning feels natural.\n- If everything is emphasized, nothing is emphasized.\n\n## Contrast keeps text readable\n\nContrast makes important elements stand out and keeps text legible for everyone, including users with low vision.\n\n- Body text needs a strong contrast ratio against its background.\n- Don't rely on color alone to convey meaning — pair it with icons or labels.\n- Subtle borders and shadows separate cards without shouting.\n- Test text contrast on the worst background it will appear on.\n\n## Alignment and rhythm create order\n\nAlignment creates order: when elements share edges and consistent spacing, the layout feels deliberate rather than random. Visual rhythm — the repeated use of spacing, type sizes, and color — gives the interface a predictable beat users can learn.\n\n- Stick to a small set of spacing steps (4, 8, 12, 16, 24, 32px).\n- Align elements to a consistent baseline and grid.\n- Repeat patterns: the same button should always look the same.\n- Break the grid deliberately and rarely, to signal something special.\n\nThese principles apply at every scale, from a single button to a whole dashboard, and they are the foundation every design system builds on.`
      },
      {
        title: 'Design Tokens',
        description: 'Color, spacing, and typography tokens that bridge design and code.',
        content:
          `Design tokens are the smallest pieces of a design system: named values for color, spacing, typography, and more. They are the single source of truth for how your product looks.\n\n## Why tokens instead of raw values\n\nInstead of hardcoding hex codes everywhere, you define tokens once — like --accent for your brand color and --muted for secondary text. Components then reference the token by name, so a rebrand is a single change instead of a site-wide search and replace.\n\n- Color tokens: --accent, --card, --line, --muted, --danger.\n- Spacing tokens: 4, 8, 12, 16, 24, 32px steps.\n- Typography tokens: font family, sizes, and line heights.\n- Radius and shadow tokens keep surfaces consistent.\n\n## Naming tokens semantically\n\nName tokens by their role, not their value. --color-primary-green forces you to rename when the brand changes; --color-accent keeps working forever.\n\n- Semantic names describe purpose: text-muted, bg-card, border-line.\n- Avoid names that describe a specific value, like blue-500.\n- Group tokens by category so designers and developers find them fast.\n- Keep the same token vocabulary in design files and code.\n\n## Tokens make theming possible\n\nTokens also make theming possible. By swapping token values at the root — for example from dark to light — every component that uses them updates automatically. This is exactly how this platform implements dark and light mode: one class on the root element changes every semantic token.\n\n- Dark and light are just two sets of token values.\n- Components never know which theme is active; they only read tokens.\n- New themes (high contrast, brand variants) are additive, not rewrites.\n- Validate every theme for accessibility before shipping it.`
      },
      {
        title: 'Component Libraries',
        description: 'Building reusable, accessible UI components.',
        content:
          `A component library is a collection of reusable building blocks — buttons, cards, inputs, badges — with consistent styling and behavior. It is how design systems become real, working code.\n\n## Design components around reuse\n\nA component earns its place in a library by being used more than once. Start with the patterns that appear across many screens, not one-off layouts.\n\n- Buttons, inputs, badges, and cards are the obvious first candidates.\n- Define clear props for every visual variant — size, tone, disabled state.\n- Document how each component should and should not be used.\n- Add components when a pattern repeats a third time, not the first.\n\n## Accessibility is a default, not an option\n\nWell-built components are accessible by default: proper labels, keyboard support, focus states, and semantic HTML. If every component is accessible, every screen built from them is too.\n\n- Use native elements (<button>, <input>) and their built-in behavior.\n- Every interactive element must be reachable and operable by keyboard.\n- Provide visible focus states — never remove them.\n- Pair icons with text or aria-labels so meaning survives without sight.\n\n## Enforce consistency\n\nComponents also enforce consistency because every instance inherits the same tokens and patterns.\n\n- One button component means every button looks and behaves identically.\n- Variants are constrained to the approved set, preventing drift.\n- Design tokens (colors, spacing, type) flow through the components.\n- When the library changes, every screen updates — consistency scales with the team.\n\nDesigning components in isolation, with clear props and documented variants, makes them easier to reuse across many screens and keeps the interface cohesive as the product grows.`
      },
      {
        title: 'Prototyping & Handoff',
        description: 'Interactive prototypes and Figma-to-code collaboration.',
        content:
          `Prototyping turns static designs into clickable experiences so teams can test flows before building them. It is the fastest way to learn whether a design actually works.\n\n## Why prototype before building\n\nInteractive prototypes validate assumptions early — users can click through a flow and reveal confusing steps while changes are still cheap.\n\n- A prototype is a conversation, not a delivery.\n- Test real tasks, not opinions: \"sign up and reach the dashboard\".\n- Fidelity should match the question you are answering.\n- Low-fidelity wireframes test structure; high-fidelity prototypes test polish.\n\n## Tools of the trade\n\nMost teams prototype in Figma, which combines vector editing, reusable components, and interactive flows in one file. Figma lets you wire buttons to other frames and share a playable link.\n\n- Frames become screens; interactive hotspots connect them.\n- Components keep the prototype and the final design in sync.\n- Variants make it easy to preview button states and toggles.\n- Share a link and record where users click, pause, or get lost.\n\n## Handoff: where design meets code\n\nHandoff is where design meets code. Designers annotate specs for spacing, type, and color, and developers translate them using the same design tokens.\n\n- Export the same token names the code already uses.\n- Specify sizes, spacing, and states explicitly; do not make developers guess.\n- Keep design files and codebases in sync as the product evolves.\n- When design and code share a token vocabulary, handoff becomes nearly seamless.\n\nClose this module by prototyping a small app flow — for example logging in and reaching a profile — and annotating the handoff notes a developer would need.`
      }
    ]
  },
  {
    title: 'Game Development with Unity',
    description:
      'Create 2D and 3D games from scratch. Learn C#, Unity physics, scene building, and publishing your first game.',
    category: 'Gaming',
    difficulty: 'beginner',
    credits: 3,
    modules: [
      {
        title: 'Unity Editor Basics',
        description: 'Scenes, GameObjects, prefabs, and the Inspector workflow.',
        content:
          `Unity organizes a game into scenes — the files that make up each level or screen. Inside a scene, everything is a GameObject, and understanding how GameObjects work is the foundation of all Unity development.\n\n## GameObjects and components\n\nGameObjects are containers with components attached. A component is what actually makes an object do something: a Camera component makes it see, an AudioSource makes it hear, a Rigidbody gives it physics, and a script makes it behave.\n\n- A GameObject with no components is just an empty container.\n- Add components in the Inspector by clicking Add Component.\n- Most behavior comes from combining components, not writing code.\n- The Inspector shows the components of the currently selected object.\n\n## The scene hierarchy\n\nEvery scene has a hierarchy — the list of GameObjects it contains. Parent-child relationships let you group objects and move them together.\n\n- Drag one object onto another to make it a child.\n- Moving the parent moves all children with it.\n- The transform component stores position, rotation, and scale.\n- Objects can be hidden in the hierarchy with the eye toggle without deleting them.\n\n## Prefabs are reusable templates\n\nPrefabs are templates of GameObjects. Make an enemy once, save it as a prefab, and instantiate copies anywhere — any change to the prefab updates every copy, keeping your game maintainable.\n\n- Drag a GameObject from the hierarchy into the Project window to create a prefab.\n- Changes to the prefab asset propagate to every instance.\n- Override individual instances when one copy needs to differ.\n- Use prefabs for enemies, bullets, pickups, and props.\n\nOpen Unity and recreate the classic setup: an empty scene, a floor cube, a player capsule, a camera, and a directional light.`
      },
      {
        title: 'C# Scripting',
        description: 'MonoBehaviour, input handling, and core game logic in C#.',
        content:
          `Game behavior in Unity is written in C# using the MonoBehaviour class. Unity calls a fixed set of lifecycle methods on your scripts, and knowing when each one runs is the key to predictable game logic.\n\n## The MonoBehaviour lifecycle\n\nUnity calls lifecycle methods automatically at specific moments, so you write the right logic in the right place.\n\n- Awake runs once when the object is created, before anything else.\n- Start runs once, on the first frame before any Update — good for setup.\n- Update runs once per frame — the right place for reading input and moving objects.\n- FixedUpdate runs at a steady rate for physics-driven movement.\n- OnDestroy runs when the object is removed.\n\n## Reading input\n\nInput is handled through the Input class or the newer Input System, mapping keys, mouse, and gamepad to actions in your game.\n\n- Input.GetKeyDown(KeyCode.Space) detects a single key press.\n- Input.GetAxis(\"Horizontal\") returns a smooth value for movement.\n- The Input System package works with player actions and rebinding.\n- Cache references in Start instead of calling FindObjectOfType every frame.\n\n## Scripting patterns that scale\n\nSmall habits keep game code clean as your project grows.\n\n- One responsibility per script: movement, health, and shooting are separate scripts.\n- Expose tuning values as public fields so designers can tweak them in the Inspector.\n- Use Time.deltaTime when multiplying by speed so movement is frame-rate independent.\n- Use tags, layers, and GetComponent to communicate between objects.\n\nThe same patterns power player movement, shooting, and menu navigation. Try writing a script that makes a cube move with the arrow keys before moving on.`
      },
      {
        title: 'Physics & Collisions',
        description: 'Rigidbodies, colliders, triggers, and player movement.',
        content:
          `Unity ships a physics engine that handles motion and collisions so you do not have to write the math yourself. Two components — Rigidbody and Collider — are at the heart of it.\n\n## Rigidbodies give objects physics\n\nA Rigidbody gives a GameObject physical properties like mass, gravity, and velocity. Without one, an object will not react to the physics engine.\n\n- Add a Rigidbody to anything that should fall, bounce, or be pushed.\n- Use Constraints to freeze axes you do not want moving.\n- Set Is Kinematic for objects the physics engine should not move directly.\n- Adjust drag and angular drag to control how objects slow down.\n\n## Colliders define the shape\n\nColliders define the shape used for collision detection. When two colliders touch, Unity can either physically push them apart or, for triggers, simply fire an event.\n\n- Box, Sphere, Capsule, and Mesh colliders match different shapes.\n- Match the collider to the visual shape for fair, believable collisions.\n- Multiple colliders on one object are fine for complex shapes.\n- Compound colliders use child objects to approximate unusual geometry.\n\n## Movement and triggers\n\nMovement is applied through the Rigidbody — using AddForce for realistic momentum or velocity for tighter, arcade-style control.\n\n- AddForce applies a push; velocity sets a direct speed and direction.\n- MovePosition and MoveRotation are smoother for kinematic objects.\n- Mark a collider as a Trigger to detect overlap without physical pushing.\n- OnTriggerEnter, OnTriggerStay, and OnTriggerExit fire the event hooks.\n- Triggers are ideal for pickups, checkpoints, and zones that react to the player passing through.\n\nBuild a simple first-person or top-down player that walks around a level and collects trigger-based coins to solidify these ideas.`
      },
      {
        title: 'Building & Publishing',
        description: 'Optimizing and exporting your game to desktop and mobile.',
        content:
          `Once your game plays well in the editor, it is time to build it for real platforms. Publishing is where performance, testing, and polish come together.\n\n## The Build Settings window\n\nThe Build Settings window lists target platforms — Windows, macOS, WebGL, Android, iOS, and more. Each build compiles your scenes and scripts into a distributable package.\n\n- Choose the target platform and click Switch Platform before building.\n- Add every scene your game needs; the list order defines build order.\n- Configure player settings: app name, icon, bundle id, and platform-specific options.\n- Different platforms need different builds; you cannot distribute one binary everywhere.\n\n## Optimize before shipping\n\nPerformance in the editor rarely matches a real device, so optimize deliberately and measure with the Profiler.\n\n- Reduce draw calls by batching materials and keeping textures efficient.\n- Compress textures and audio to cut build size and load times.\n- Watch frame rates with the Profiler and target a steady 60 FPS where you can.\n- Use object pooling for frequently spawned items like bullets and enemies.\n- Level of detail (LOD) swaps distant meshes for cheaper versions.\n\n## Test on real hardware\n\nTest on the actual target hardware, because touch input, memory, and GPU behavior differ from the desktop editor.\n\n- Play on the phone or console you intend to ship to.\n- Watch for dropped frames, load times, and battery drain.\n- Test on low-end devices, not just your flagship.\n- Keep the Profiler connected to catch problems in real sessions.\n\nA polished, playable build is the final reward of the whole course. Build your game for one platform, test it on real hardware, and fix the biggest performance issues you find.`
      }
    ]
  },
  {
    title: 'Database Systems with SQL',
    description:
      'Design relational schemas, write efficient SQL, and manage data integrity from modeling to advanced queries.',
    category: 'Software Engineering',
    difficulty: 'advanced',
    credits: 4,
    modules: [
      {
        title: 'Relational Modeling',
        description: 'Tables, keys, relationships, and normalization.',
        content:
          `A relational database stores data in tables, where each row is a record and each column is an attribute. Designing those tables well is the difference between a schema that grows gracefully and one that falls apart under load.\n\n## Tables, keys, and relationships\n\nA primary key uniquely identifies every row — in this platform, an auto-incrementing id. Foreign keys link rows across tables: a Module row stores the courseId of the Course it belongs to, expressing a one-to-many relationship.\n\n- Primary keys are unique and never change once assigned.\n- A foreign key column references a primary key in another table.\n- One-to-many: a Course has many Modules; each Module belongs to one Course.\n- Many-to-many needs a junction table with two foreign keys.\n\n## Normalization removes redundancy\n\nNormalization splits data into focused tables and connects them with keys, so each fact is stored in exactly one place.\n\n- First normal form: every column holds a single atomic value.\n- Second normal form: no column depends on only part of a composite key.\n- Third normal form: no column depends on another non-key column.\n- Normalizing reduces duplicate data and update anomalies.\n- Denormalization is sometimes justified for read-heavy reporting — do it deliberately.\n\n## Modeling a small domain\n\nPractice by modeling something familiar. For a learning platform:\n\n- Users hold one row per person with email unique and an id primary key.\n- Courses reference an instructor via instructorId.\n- Modules carry a courseId foreign key plus an order column.\n- Gradebook rows are unique per (courseId, studentId) pair.\n- Indexes on foreign keys keep lookups like "modules of a course" fast.\n\nDesign your own two-table schema for a hobby domain, name the keys, and explain the relationship before moving to SQL.`
      },
      {
        title: 'SQL Essentials',
        description: 'SELECT, JOIN, GROUP BY, and aggregate functions.',
        content:
          `SQL is the language of relational databases. The SELECT statement does the heavy lifting, and every other feature you will learn is a variation on reading and transforming data with it.\n\n## The anatomy of a query\n\nSELECT retrieves data, optionally filtered with WHERE, sorted with ORDER BY, and limited with LIMIT.\n\n- SELECT columns FROM table lists the fields you want.\n- WHERE filters rows before they are returned.\n- ORDER BY sorts; add DESC for descending order.\n- LIMIT caps the number of rows — essential for pagination.\n- DISTINCT removes duplicate rows from the result.\n\n## Joins combine tables\n\nJOINs combine rows from multiple tables. A JOIN between Courses and Modules lets you list every module of a course in a single query, using the foreign key as the matching condition.\n\n- INNER JOIN returns only rows with a match on both sides.\n- LEFT JOIN keeps all left-side rows even when there is no match.\n- Join on the foreign key: ON modules.course_id = courses.id.\n- Always qualify column names with their table to avoid ambiguity.\n- Alias tables (FROM courses c) to keep long queries readable.\n\n## Aggregates and grouping\n\nAggregate functions like COUNT, SUM, AVG, MIN, and MAX summarize groups of rows. GROUP BY collapses rows with the same value — for example, counting enrolled students per course — and HAVING filters the grouped results.\n\n- COUNT(*) counts rows; COUNT(column) counts non-null values.\n- GROUP BY course_id groups rows per course.\n- HAVING filters after grouping; WHERE filters before grouping.\n- AVG(overall_grade) gives the class average in one line.\n\nWrite a query that lists each course with its module count, filtered to courses that have more than two modules.`
      },
      {
        title: 'Indexes & Performance',
        description: 'Indexing strategies and query optimization.',
        content:
          `As data grows, slow queries hurt. Indexes are the primary tool for keeping reads fast, and knowing when to add one — and when not to — is a core database skill.\n\n## How indexes work\n\nAn index is a data structure that lets the database locate rows without scanning the whole table. Instead of reading every row, it looks up the value in a sorted structure and jumps straight to the matches.\n\n- A table scan reads every row; an index lookup is near-instant.\n- Index the columns you filter on, join on, or sort by.\n- Indexing courseId in the Modules table turns a module listing into a fast lookup.\n- Composite indexes like (courseId, order) serve queries that use both columns.\n- This platform even declares composite indexes for common access patterns.\n\n## The hidden costs\n\nIndexes have costs too: they consume storage and slow down writes, because every INSERT and UPDATE must also maintain the index.\n\n- Each index adds write overhead, not just disk space.\n- Too many indexes make writes slower than necessary.\n- Indexes help mostly on large tables; small ones are scanned fine.\n- Redundant indexes (same leading column) waste space.\n\n## Choosing indexes that matter\n\nThe skill is choosing indexes for the queries that actually matter, then confirming the improvement with real measurements.\n\n- Profile first: find the slow queries with EXPLAIN and timings.\n- Cover the hot paths — login by email, list by foreign key.\n- Use EXPLAIN to check that a query uses the index, not a scan.\n- Verify the fix with real timings, not intuition.\n- Drop indexes that never help; prune as data access changes.\n\nIndex the WHERE and JOIN columns of your slowest query, run EXPLAIN before and after, and compare the plan.`
      },
      {
      title: 'Transactions & Integrity',
    description: 'ACID, transactions, and concurrency control.',
        content:
          `Databases promise reliability through transactions. A transaction groups several operations so that either all of them succeed or none of them do — no partial writes.\n\n## The ACID promise\n\nThe ACID properties define what a transaction guarantees.\n\n- Atomicity: all-or-nothing execution; a failure rolls the whole group back.\n- Consistency: the data stays valid — constraints still hold after the commit.\n- Isolation: concurrent transactions do not interfere with each other.\n- Durability: committed work survives a crash and a restart.\n\n## Using transactions in practice\n\nMoney transfers are the classic example: deducting one account and crediting another must happen together. If the second step fails, the first must be rolled back.\n\n- BEGIN starts a transaction; COMMIT makes it permanent.\n- ROLLBACK undoes everything done since the transaction began.\n- ORMs expose this too — sequelize.transaction() wraps several operations.\n- Anything that must stay consistent together belongs in one transaction.\n\n## Concurrency control\n\nConcurrency control manages multiple users writing at once. Isolation levels trade strictness for performance, and locks prevent two transactions from corrupting the same row.\n\n- Locks can be shared (read) or exclusive (write).\n- Higher isolation is safer but slower and can cause more waiting.\n- Deadlocks happen when two transactions wait on each other — resolve by retrying.\n- Read-only transactions rarely need the strictest isolation.\n- Choosing the right level is a balance between correctness and throughput.\n\nUnderstanding transactions keeps a platform like EduFlow reliable under real load. Identify one multi-step operation in an app you use — checkout, transfer, order placement — and describe where a transaction protects it.`
      }
    ]
  },
{
    title: 'SOE 504 (Fault Tolerant Computing)',
    description:
      'Design systems that keep working when components fail. Covers redundancy, fault detection, replication, consensus, and reliable system design.',
    category: 'Software Engineering',
    difficulty: 'advanced',
    credits: 4,
    modules: [
      {
        title: 'Introduction to Fault Tolerance',
        description: 'Faults, errors, failures, and the fundamental principles of dependable computing.',
        content:
          `Fault tolerance is the ability of a system to continue operating correctly even when some of its components fail. It is the backbone of critical infrastructure, cloud platforms, and every service that promises "five nines" of availability.\n\n## Faults, errors, and failures\n\nDependability distinguishes three related concepts that are easy to confuse.\n\n- A fault is the underlying defect — a bug in the code, a failing disk, a power surge.\n- An error is the observable deviation caused by the fault, such as a wrong value in memory.\n- A failure is the system delivering incorrect service to the user.\n\nA fault-tolerant system stops faults from escalating into errors, and errors from escalating into failures.\n\n## The four pillars of dependability\n\nReliable systems are built on a small set of properties engineers measure and design for.\n\n- Availability: the fraction of time the service is usable.\n- Reliability: the probability the system performs without failure over time.\n- Safety: the absence of catastrophic consequences on failure.\n- Maintainability: how easily the system can be repaired and updated.\n\n## How systems achieve fault tolerance\n\nTwo broad strategies underpin almost every technique you will study in this course.\n\n- Redundancy: keep extra copies of critical resources so a failure in one is invisible.\n- Graceful degradation: when something does fail, lose functionality instead of losing everything.\n\nBy the end of this module you should be able to classify any incident as a fault, an error, or a failure, and state which dependability property a given technique improves.`
      },
      {
        title: 'Redundancy Techniques',
        description: 'Hardware, software, and information redundancy: how to duplicate without doubling cost.',
        content:
          `Redundancy is the deliberate duplication of critical components so that a single failure does not bring the system down. The hard part is getting the benefit of duplication without paying twice the price.\n\n## The three kinds of redundancy\n\n- Hardware redundancy: dual power supplies, mirrored disks, hot-swappable parts.\n- Software redundancy: multiple versions of the same program, or a standby process that takes over.\n- Information redundancy: error-detecting codes that reveal corruption without a second copy.\n\n## Static vs dynamic redundancy\n\nRedundancy is either always-on or switched in when needed.\n\n- Static redundancy: all replicas work at once and a voter decides the majority answer.\n- Dynamic redundancy: one unit is active and a spare stands by, taking over on failure.\n- Hybrid: a mix of the two, such as several active replicas plus a cold standby.\n\n## Double modular redundancy\n\nWith exactly two replicas and no voter, a disagreement cannot be resolved without more information.\n\n- Two units agree: proceed.\n- Two units disagree: stop and raise an alarm, or fall back to a checksum.\n- DMR detects faults; it cannot always mask them.\n\n## Triple modular redundancy (TMR)\n\nTMR runs three identical units through a majority voter.\n\n- If one unit disagrees with the other two, the voter silently uses the majority.\n- Any single failure is masked: the system behaves as if nothing happened.\n- The cost: three times the hardware plus voter logic.\n\nRedundancy transforms single points of failure into continuous operation, but only where the duplicated resource is worth duplicating.`
      },
      {
        title: 'Fault Detection & Error Handling',
        description: 'Checksums, watchdogs, heartbeat protocols, and recovery strategies.',
        content:
          `Before a system can recover from a fault, it must notice the fault exists. Detection is the early-warning layer of fault tolerance, and good detection makes recovery fast and cheap.\n\n## Detecting corrupted data\n\nData corruption is found with redundancy added to the data itself.\n\n- A checksum is a small summary computed from a block of data; a mismatch means corruption.\n- Parity bits detect single-bit errors in a byte.\n- CRC (cyclic redundancy check) detects bursts of errors in storage and network frames.\n- Error-correcting codes (ECC) go further and repair small corruptions automatically.\n\n## Detecting a hung process\n\nSilent failures — a process that stops responding but reports nothing — are caught by liveness checks.\n\n- A watchdog timer must be reset by the software at a fixed interval; if it fires, the system resets.\n- Heartbeats are periodic "I am alive" messages exchanged between components.\n- A process that misses its heartbeat is declared dead and replaced.\n\n## Recovery strategies\n\nOnce a fault is detected, the system must get back to a correct state.\n\n- Retry: a transient failure may simply be retried after a short delay.\n- Rollback: restore the last known-good state and replay the failed operation.\n- Roll-forward: use the error information to skip the broken step safely.\n- State checkpointing: periodically save the full state so restart is quick.\n\nEffective detection bounds the blast radius of every failure: the earlier you catch a fault, the cheaper it is to recover from.`
      },
      {
        title: 'Replication & Consensus',
        description: 'Keeping copies synchronized, leader election, and Raft/Paxos-style agreement.',
        content:
          `When you keep several copies of data or services, you create a new problem: keeping them consistent. Replication gives availability, but consensus decides which copy is the source of truth when they disagree.\n\n## Why replicate and how\n\nReplication copies a service or database to multiple machines so a single loss never hurts.\n\n- Primary-replica: one leader accepts writes and streams them to followers.\n- Multi-primary: any node accepts writes and replicas reconcile differences.\n- Read replicas: scale reads without slowing down the writer.\n- Replication provides switchover: promote a replica when the leader fails.\n\n## The hard question: who decides?\n\nWhen nodes disagree — during a network partition, for example — the system needs a way to reach agreement.\n\n- Consensus algorithms let a group of nodes agree on a single value despite failures.\n- A leader is elected, and the leader's decisions are replicated with majority votes.\n- Minority partitions stop serving writes (data safety over availability).\n- Majority cleverness: a majority of votes is enough because two majorities always overlap.\n\n## Raft, made concrete\n\nRaft is the simplest consensus algorithm to reason about, and it powers many databases.\n\n- Nodes are leaders, followers, or candidates.\n- Followers vote for a candidate when the current leader's heartbeat times out.\n- A leader wins with a majority of votes in a term.\n- Log entries are committed once a majority of nodes have stored them.\n\nReplication gives you copies; consensus tells you which copy is authoritative. Together they make distributed systems tolerate machine failure while staying correct.`
      },
      {
        title: 'Fault Tolerant System Design',
        description: 'Designing architecture for graceful degradation, from monoliths to microservices.',
        content:
          `Fault tolerance is not a feature you add at the end — it is an architectural property you design in from the first sketch. This module ties the whole course together around real design practice.\n\n## Fail fast, fail small, fail safe\n\nThree principles guide every resilience decision.\n\n- Fail fast: surface errors quickly instead of silently degrading data integrity.\n- Fail small: isolate failures to the smallest possible component.\n- Fail safe: on failure, move to the least dangerous state, not the most dangerous.\n\n## Contain the blast radius\n\nModern systems isolate failure behind explicit boundaries.\n\n- Bulkheads pool resources per component so one busy service cannot starve the others.\n- Circuit breakers trip after repeated failures and fail open only when the downstream heals.\n- Timeouts bound how long a slow component can stall a request.\n- Queues and retries with exponential backoff smooth out bursts.\n\n## Design patterns to remember\n\nThese patterns recur in almost every fault-tolerant architecture.\n\n- Retry with jitter: retry failing calls with randomized backoff to avoid thundering herds.\n- Compensating actions: undo a partially-completed transaction rather than roll everything back.\n- Graceful degradation: a degraded but available service beats no service at all.\n- Chaos testing: deliberately inject failures to prove the system recovers.\n\n## From requirement to design\n\nDesign a fault-tolerant system by answering four questions in order.\n\n- What can fail in this component, and how bad is the blast radius?\n- Which redundancy is worth its cost here — hardware, software, or information?\n- How will the system detect that failure, and how fast?\n- What does the user experience when the component degrades?\n\nA fault-tolerant system is not one that never fails; it is one whose failures are boring, contained, and survivable.`
      }
    ]
  },
  {
    title: 'SOE 506 (Game Design and Development Unity)',
    description:
      'Build complete games with Unity: C# scripting, scene and level design, physics, game feel, and shipping on real platforms.',
    category: 'Gaming',
    difficulty: 'beginner',
    credits: 3,
    modules: [
      {
        title: 'Unity Fundamentals & C#',
        description: 'The editor, scenes, GameObjects, and the C# scripting model behind every Unity game.',
        content:
          `Unity is a game engine: a collection of tools that handle rendering, physics, input, and audio so you can focus on making the game. Every game in Unity is a set of scenes made of GameObjects with components attached.\n\n## The editor in ten minutes\n\n- The Scene view is where you build and move objects around.\n- The Game view is what the player actually sees.\n- The Hierarchy lists every GameObject in the current scene.\n- The Inspector shows and edits the components of the selected object.\n- The Project window holds every asset: sprites, models, scripts, audio.\n\n## GameObjects and components\n\nAn empty GameObject does nothing. Components give it behavior.\n\n- Transform holds position, rotation, and scale — every object has one.\n- Camera makes it render, Light makes it visible, AudioSource makes it audible.\n- Rigidbody gives it physics; Collider gives it a solid shape.\n- A C# script is a component that runs your own logic.\n\n## The MonoBehaviour lifecycle\n\nThe heart of Unity scripting is a set of methods Unity calls automatically.\n\n- Awake runs once when the object is created.\n- Start runs once before the first Update, ideal for setup.\n- Update runs once per frame — the default place for game logic.\n- FixedUpdate runs at a fixed timestep for physics.\n- OnDestroy runs when the object is removed.\n\n## Your first script\n\nA minimal player mover introduces the pattern you will use everywhere.\n\n- Attach a Rigidbody and a script to a cube.\n- Read Input.GetAxis(\"Horizontal\") and Input.GetAxis(\"Vertical\").\n- Apply velocity in FixedUpdate times Time.deltaTime for frame-rate independence.\n- Press Play and the cube moves with the arrow keys.\n\nUnity rewards a simple mental model: scenes contain objects, objects have components, and components — including your scripts — make them act.`
      },
      {
        title: 'Game Objects, Prefabs & Physics',
        description: 'Prefabs, Rigidbodies, Colliders, triggers, and building a playable level.',
        content:
          `The middle of any Unity course is where games start to feel like games: reuse through prefabs and believable motion through physics.\n\n## Prefabs are reusable game objects\n\nA prefab is a template of a GameObject you can instantiate over and over.\n\n- Build an object once, drag it into the Project window to make a prefab.\n- Edit the prefab once and every instance updates.\n- Override a single instance when one copy needs different values.\n- Use prefabs for enemies, coins, bullets, and props.\n\n## The physics pair: Rigidbody + Collider\n\nPhysics behavior comes from two cooperating components.\n\n- Rigidbody owns mass, velocity, gravity, and drag.\n- Collider defines the shape used for collision detection.\n- Moving objects need a Rigidbody; static ones only need a Collider.\n- Match the collider to the visible shape for fair collisions.\n\n## Movement that feels right\n\nHow you apply movement changes how the game feels.\n\n- AddForce applies momentum for weighty, realistic physics.\n- velocity assignment gives tight, arcade-style control.\n- MoveRigidbody with interpolation smooths network and physics updates.\n- Freeze rotation on the Rigidbody so the player does not tip over.\n\n## Triggers for game events\n\nTriggers detect overlap without physically pushing objects apart.\n\n- Tick "Is Trigger" on a Collider to turn it into a volume.\n- OnTriggerEnter fires when an object enters the volume.\n- OnTriggerStay and OnTriggerExit cover the rest of the lifecycle.\n- Use triggers for coins, checkpoints, doors, and zones of interest.\n\nPut the pieces together: a prefab coin and a trigger on the player that collects it are the skeleton of every pickup-based game.`
      },
      {
        title: '2D/3D Game Mechanics',
        description: 'Player controllers, cameras, spawning, scoring, and level design fundamentals.',
        content:
          `Mechanics are the rules of your game — how the player moves, what happens when they collide, and how the world reacts. This module turns components into playable loops.\n\n## The player controller\n\nA good controller feels immediate and forgiving.\n\n- Separate movement, jumping, and animation into their own scripts.\n- Ground-check with a small boxcast so jumps are reliable.\n- Clamp velocity so the player does not accelerate forever.\n- Give input a small acceleration curve for a softer feel.\n\n## Camera work\n\nCamera placement changes how a game reads.\n\n- A follow camera tracks the player with smooth damping.\n- Slight forward look-ahead shows more of where you are going.\n- Side-scrollers lock one axis; top-down games keep the camera above.\n- Keep the player visible and the action legible.\n\n## Spawning and scoring\n\nPatterns that appear in almost every game:\n\n- Instantiate prefabs through code instead of hand-placing copies.\n- Object pooling reuses spawned objects to avoid garbage-collection hitches.\n- Events announce when things happen; other scripts subscribe.\n- Score, lives, and state live in a single manager object.\n\n## Level design fundamentals\n\nWhat makes a level fun is space, pacing, and feedback.\n\n- Teach one new idea at a time; introduce it in a safe spot.\n- Repeat the pattern with variation to build mastery.\n- Place rewards (coins, checkpoints) where you want players to look.\n- Fail states should be fair and read clearly to the player.\n\nDesign one complete loop — move, collide, collect, score, respawn — and you officially have a game.`
      },
      {
        title: 'UI, Audio & Game Feel',
        description: 'Canvas UI, sound, juice, and feedback that makes games satisfying.',
        content:
          `Players forgive simple graphics but not dull feedback. UI, audio, and "juice" are what make a game feel alive and responsive.\n\n## Building UI with the Canvas\n\nUnity UI lives on a Canvas in screen space.\n\n- A Canvas renders UI on top of the world; it needs a raycaster to feel clicks.\n- Panels group elements; Text and Buttons give the interface meaning.\n- Anchors pin UI to corners, centers, and edges so layouts survive resizing.\n- Buttons fire onClick events wired in the Inspector or code.\n\n## Audio: the half of the game people forget\n\nSound tells the player everything feels.\n\n- An AudioSource plays a clip; an AudioListener hears it (one per scene).\n- TwoBoneAudio, mixing, and spatial blend shape where sound comes from.\n- Score when the player gains points; mute when they die.\n- Keep background music low so gameplay sounds stay readable.\n\n## Game feel and juice\n\nThe polish layer that separates prototypes from products.\n\n- Juice: amplified feedback — particles, shake, flash, bounce — on every meaningful event.\n- Hit-stop freezes a frame on impact to add weight.\n- Easing and screenshake make motion feel less robotic.\n- Fade transitions smooth over loading and respawns.\n\n## Putting it on screen\n\n- Show and hide the UI that matters; do not fill the screen with numbers.\n- Update UI only when values change, not every frame.\n- Menu, HUD, and Game Over screens share the same Canvas helpers.\n\nGreat game feel is invisible: players do not notice the squash-and-stretch, they only notice the game is fun.`
      },
      {
        title: 'Building & Publishing',
        description: 'Optimization, build settings, and releasing your game on desktop and mobile.',
        content:
          `The last frontier of game development is getting your game out to players. Building for a real platform exposes performance problems the editor never shows you.\n\n## Preparing your project\n\nBefore the first build, clean your project of drag.\n\n- Remove unused assets; they bloat build size.\n- Use the Profiler to find frame-time spikes: draw calls, physics, garbage collection.\n- Compress textures and audio for size and load speed.\n- Mobile builds favor fewer, larger textures over many small ones.\n\n## Build settings\n\nThe Build Settings window is your export center.\n\n- Every scene in the build list is included in that exact order.\n- Choose the target platform before building — switching costs time.\n- Configure player settings: name, icon, resolution, and target devices.\n- Set the first scene in the list to your menu or boot scene.\n\n## Optimizing for real devices\n\nThe editor GPU is not the player's phone.\n\n- Reduce draw calls by batching objects with shared materials.\n- Level of detail (LOD) swaps heavy meshes for cheaper ones at a distance.\n- Object pooling prevents spikey allocation during gameplay.\n- Aim for a stable 60 FPS, not a perfect frame rate graph.\n\n## Shipping\n\n- Build to desktop (Windows/macOS) for local testing archives.\n- Build WebGL for instant browser demos.\n- Mobile builds need an export step and, on iOS, Xcode.\n- Test the actual build on the target hardware before publishing.\n\nA game is finished when it is playable on the hardware you promised — that is the real definition of "it works."`
      }
    ]
  },
  {
    title: 'SOE 508 (Special Topics in Software Engineering)',
    description:
      'A rotating survey of modern software engineering: microservices, DevOps, cloud-native patterns, security, and high-impact special topics.',
    category: 'Software Engineering',
    difficulty: 'intermediate',
    credits: 3,
    modules: [
      {
        title: 'Microservices Architecture',
        description: 'Splitting systems into independently deployable services and their trade-offs.',
        content:
          `Microservices is an architectural style that structures an application as a collection of small, independently deployable services. Each service owns its own database, its own lifecycle, and one clear responsibility.\n\n## The shape of microservices\n\n- Each service is small, focused (one business capability), and owned by one team.\n- Services communicate over a network through well-defined APIs.\n- Each service has its own data store — you do not share a database across services.\n- Services deploy independently; one deploys while others keep running.\n\n## Why teams adopt it\n\n- Independent scaling: only the busy service scales, not the whole app.\n- Independent deploys: teams ship on their own cadence.\n- Blast-radius control: a failure in one service does not take down others.\n- Technology freedom: each service can pick the right language and database.\n\n## The costs you must not ignore\n\nDistributed systems pay for every gain.\n\n- Network latency and partial failure are now everyday problems.\n- Distributed transactions are hard — instead use sagas and compensation.\n- Observability across many services is more complex than one big log.\n- More moving parts means more operational skill required.\n\n## When microservices are not the answer\n\n- A small team and a small product: a modular monolith is faster to ship.\n- Unknown domain boundaries: extract services only after boundaries are clear.\n- Rule of thumb: start with a well-structured monolith, then split services when they earn their complexity.\n\nMicroservices is a surgery you perform on an architecture because you understand it — not a fashion you adopt because it is popular.`
      },
      {
        title: 'DevOps & CI/CD',
        description: 'Continuous integration, delivery pipelines, infrastructure as code, and deployment.',
        content:
          `DevOps is the practice of using automation and culture to ship software quickly, safely, and repeatedly. The pipeline — build, test, release, deploy — is its beating heart.\n\n## The pipeline\n\n- Commit triggers the pipeline automatically.\n- Build compiles the code and produces artifacts.\n- Automated tests run: unit, integration, and end-to-end.\n- Quality gates fail the pipeline on coverage or lint regressions.\n- Deploy promotes the artifact through environments to production.\n\n## Continuous integration\n\n- Merge small changes frequently, not large branches rarely.\n- Every merge runs the full test suite; red builds block the branch.\n- Fast feedback means bugs are found minutes after they are introduced.\n- CI is only as good as your tests — cover the behavior that matters.\n\n## Continuous delivery and deployment\n\n- Continuous delivery: every push is release-ready; a human pushes the button.\n- Continuous deployment: every green push goes to production automatically.\n- Feature flags let you ship dark: code exists in production but is switched off.\n- Rollbacks become a normal, boring, quick operation.\n\n## Infrastructure as code\n\n- Define servers, networks, and databases in code (Terraform, CloudFormation).\n- Environments are reproducible — delete one and recreate it identically.\n- Changes are reviewed and tested just like application code.\n- Drift detection alerts when reality differs from the declared state.\n\nYou are not doing DevOps when you have a CI badge; you are doing DevOps when a change can go from commit to production automatically, safely, and reversibly.`
      },
      {
        title: 'Cloud-Native Patterns',
        description: 'Containers, orchestration, serverless, and the twelve-factor mindset.',
        content:
          `Cloud-native software is built to live in the cloud: horizontally scalable, resilient, and riding on managed infrastructure. Containers and orchestration are the standard delivery vehicle.\n\n## The twelve-factor mindset\n\nTwelve-factor principles shape cloud-native apps.\n\n- Configuration from environment variables, never hardcoded.\n- Stateless processes that scale horizontally by adding copies.\n- Logs as event streams to stdout; the platform collects them.\n- Disposability: processes start and stop fast and cleanly.\n\n## Containers\n\n- A container packages code plus its full runtime into one image.\n- Images are immutable artifacts built once and run everywhere.\n- Containers share the host kernel, so they are lighter than VMs.\n- A healthy image is small, layered, and reproducible.\n\n## Orchestration with Kubernetes\n\n- Kubernetes schedules containers across a cluster of machines.\n- Desired state drives reality: you declare the wanted state, it converges.\n- Pods group containers; deployments manage replicas; services expose them.\n- Health probes let the platform restart failing instances automatically.\n\n## Serverless and FaaS\n\n- Run functions without managing servers; pay only for execution.\n- Scales from zero instantly; idle costs nothing.\n- Stateless by design; sessions live in external stores.\n- Best for event-driven work (upload, webhook, batch) — not long-running workloads.\n\nCloud-native is a set of operating assumptions: if the cloud is your computer, make sure your software treats it that way — disposable, declarative, and designed to be replaced, not repaired.`
      },
      {
        title: 'Software Security & Ethics',
        description: 'Threat modeling, secure defaults, and the ethical duties of engineers.',
        content:
          `Security and ethics are special topics every software engineer must study, because software now sits in the middle of money, health, and identity. This module covers the minimum a professional cannot skip.\n\n## Threat modeling\n\nBefore you defend, know what you are defending against.\n\n- Identify assets: data, secrets, money, availability.\n- List threat actors: script kiddies, insiders, nation states, accidents.\n- Enumerate attack surfaces: every input, API, and network edge.\n- Rank risks by likelihood and impact, then mitigate in that order.\n\n## Secure defaults\n\n- Authenticate everything sensitive and authorize every action.\n- Never trust client input: validate, sanitize, and parameterize.\n- Hash secrets with slow, salted hashes (bcrypt/argon2); never log them.\n- Keep dependencies updated; most breaches reuse known vulnerabilities.\n\n## Ethical responsibilities\n\n- Privacy is a right users grant: collect the minimum, protect it, delete it.\n- Accessibility is a fairness obligation, not a nice-to-have.\n- Bias in models and decisions is a defect engineers are responsible for.\n- Being told to build something harmful is not a requirement to build it.\n\n## The professional stance\n\n- Report vulnerabilities responsibly even when they are not yours.\n- Document assumptions; future engineers inherit your decisions.\n- Security is a property of the whole system, including its humans.\n\nGood engineers do not just write code that works — they write code they are willing to be accountable for.`
      },
      {
        title: 'Applied Special Topic Project',
        description: 'Design, build, and defend a small system applying the module content.',
        content:
          `A special topics course is only as good as the topics you apply. This capstone module asks you to choose one thread of the course and prove you can use it on a real problem.\n\n## Choose your project\n\nPick a scope that fits while still touching the material.\n\n- A microservice pair with an API gateway: two services, one gateway, one story.\n- A CI pipeline that builds, tests, and deploys a small app.\n- A cloud-native deployment: containerize a service and deploy it with a manifest.\n- A threat model plus a hardened demo service that mitigates the top risks.\n\n## Build it the professional way\n\n- Write the requirement in one sentence; scope everything to that sentence.\n- Use version control from the first commit.\n- Add automated tests that would actually fail on a regression.\n- Keep configuration in environment variables, never in code.\n\n## Defend it\n\nYour final write-up answers three questions.\n\n- What was the problem, and why did this topic fit it?\n- What did you build, and how do I run it and prove it works?\n- What would you do differently at twice the scale?\n\nA completed, working, explained project beats a sprawling half-finished one. Show what you learned, not just what you built.`
      }
    ]
  },
  {
    title: 'SOE 510 (Mobile App Development using Flutter)',
    description:
      'Build native-quality mobile apps with Flutter and Dart: widgets, state, navigation, persistence, and publishing to stores.',
    category: 'Mobile Development',
    difficulty: 'intermediate',
    credits: 3,
    modules: [
      {
        title: 'Dart & Flutter Basics',
        description: 'The Dart language, the widget tree, and the Flutter rendering model.',
        content:
          `Flutter builds Android and iOS apps from a single codebase written in Dart. Everything on screen is a widget, and widgets compose into a widget tree that Flutter renders at native speed.\n\n## Dart in ten bullets\n\n- Dart is an object-oriented, statically typed language.\n- var lets types be inferred; final means assign-once.\n- Functions are objects and can be passed around.\n- async and await handle futures for non-blocking I/O.\n- Everything inherits from Object; every value is an object.\n\n## What is a widget?\n\n- A widget is a description of part of the UI.\n- StatelessWidget renders fixed content with no internal state.\n- StatefulWidget owns mutable state that re-renders on change.\n- Widgets are cheap; Flutter rebuilds them constantly and only redraws what changed.\n\n## MaterialApp and Scaffold\n\n- MaterialApp sets the theme, routes, and home scope.\n- Scaffold gives you the app bar, body, and floating action button.\n- The body holds the rest of your layout.\n- Start every app the same way: runApp(MaterialApp(home: Scaffold(...))).\n\n## Your first app\n\nThe classic counter app teaches the whole model.\n\n- main() calls runApp with a MaterialApp.\n- A StatefulWidget holds an int count.\n- An ElevatedButton increments it via setState.\n- Text displays the updated value because setState rebuilds the subtree.\n\nFlutter rewards composition: learn a few widgets deeply and everything else is assembling them in new ways.`
      },
      {
        title: 'Widgets & Layouts',
        description: 'Rows, columns, containers, cards, and building responsive screens.',
        content:
          `Layout is where widget composition becomes UI design. Flutter's layout widgets decide position and size, and a small set of them covers almost every screen.\n\n## The layout workhorses\n\n- Container adds padding, margin, decoration, and alignment.\n- Row arranges children horizontally; Column vertically.\n- Stack overlays children on top of each other.\n- Expanded and Flexible share available space among siblings.\n\n## Building a card row\n\n- A ListView of Container-wrapped Cards makes a feed.\n- Padding and margins come from the widget, not CSS.\n- CrossAxisAlignment and MainAxisAlignment control placement.\n- Spacer pushes content apart; SizedBox gives fixed gaps.\n\n## Responsive layouts\n\n- MediaQuery reads the device width and height.\n- LayoutBuilder rebuilds the layout given the available constraints.\n- Breakpoint checks (width < 600 ? compact : wide) pick between layouts.\n- GridView gives you free responsive grids.\n\n## Theme and typography\n\n- ThemeData centralizes colors, brightness, and font styles.\n- TextTheme keeps text consistent: headline, title, body, caption.\n- Hardcode nothing: read colors from the theme so dark mode works.\n- Icons come from the Icons class, no assets required.\n\nLayout puzzles teach the mental model faster than anything: build a profile screen from scratch — avatar, name, stats row, and a scrolling list — using only the layout widgets above.`
      },
      {
        title: 'State Management',
        description: 'setState, inherited widgets, Provider, and when to use each.',
        content:
          `State is data that changes over time and drives the UI. Managing state is the main engineering challenge in Flutter, and the framework offers a ladder of solutions.\n\n## setState first\n\n- For state local to one widget, setState is enough.\n- Call setState only to change values the UI reads.\n- Keep build() pure: no network, no side effects, just UI from state.\n- Lift shared state to the common parent when two widgets need it.\n\n## Lifting state and callbacks\n\n- Move state up; pass values down as constructor parameters.\n- Pass callbacks down so children can request changes.\n- This keeps one source of truth and predictable data flow.\n- Prop drilling gets noisy — that is the signal to reach for a provider.\n\n## Provider: the standard solution\n\n- A ChangeNotifier holds state and notifies listeners.\n- ChangeNotifierProvider exposes it to the widget tree.\n- Consumer or context.watch rebuild only the widgets that depend on it.\n- Instead of passing state through ten widgets, any child reads it directly.\n\n## Choosing your tool\n\n- Local UI: setState.\n- Shared small state: lifted state / ChangeNotifier.\n- App-wide state: Provider (or Riverpod/Bloc for larger apps).\n- Async fetch-and-display: FutureBuilder or a repository + provider.\n\nStart with setState and lift when it hurts. Only reach for a package when lifting becomes the pain point — your app will be simpler for it.`
      },
      {
        title: 'Navigation & Persistence',
        description: 'Navigator routes, named routes, and storing data with SharedPreferences and SQLite.',
        content:
          `Real apps have more than one screen and data that must survive restarts. Navigation moves between screens; persistence keeps state when the app closes.\n\n## Navigation\n\n- Navigator.push adds a screen; Navigator.pop removes it.\n- Navigator.pushNamed uses a named route registered in MaterialApp.\n- Pass values to the next screen in the route arguments.\n- MaterialPageRoute gives you platform animations for free.\n\n## SharedPreferences for settings\n\n- Key-value storage for small data: tokens, themes, session choices.\n- Reads are synchronous in-memory with async writes behind the scenes.\n- Write only tiny data; never use it for lists or objects.\n- Load preferences at app start into your provider.\n\n## SQLite for structured data\n\n- sqflite gives you a real relational database on the device.\n- Define a schema, open a database, and run query operations.\n- Keep the database path and open/close lifecycle in one helper.\n- Use joins and indexes just like any SQL database.\n\n## The persist-and-restore pattern\n\n- Load persisted state before first build; show a loading state meanwhile.\n- Save on meaningful events (logout, item added), not every keystroke.\n- Version your schema so app upgrades can migrate data.\n- Never trust persisted data: validate it when you read it back.\n\nBuild a small app that remembers something — a list, a theme choice, a session token — and verify it survives a full restart.`
      },
      {
        title: 'Publishing a Flutter App',
        description: 'Release builds, app icons, store preparation, and publishing to stores.',
        content:
          `A finished app is one users can install. Publishing is configuration, signing, and store drills — unglamorous, but it is how your work reaches anyone.\n\n## Release builds\n\n- flutter build apk and flutter build appbundle for Android.\n- iOS builds flow through Xcode; a developer account is required.\n- Release mode is optimized (tree-shaken, AOT compiled); debug is not.\n- Test the release build, not just debug, before shipping.\n\n## Icons and branding\n\n- Generate an app icon and splash screen for every size bucket.\n- Use flutter_launcher_icons to generate all densities from one image.\n- Set the display name — what users actually see under the icon.\n- Keep the icon simple; it also appears in listings and notifications.\n\n## Signing and store prep\n\n- Android: configure a signing key and the release signingConfig.\n- App bundles let Google generate per-device APKs.\n- Write store metadata: description, screenshots, version, privacy policy.\n- Every store asks about data collected — answer honestly.\n\n## Shipping\n\n- Update the version number before each release; users compare it.\n- Publish to a closed/alpha track first, then roll out widely.\n- Monitor crash reports and user reviews after release.\n- A release is a starting point — plan for the next one.\n\nEverything before this module is building the app; everything in this module is the discipline that gets it into hands.`
      }
    ]
  },
  {
    title: 'SOE 512 (Embedded Systems)',
    description:
      'Program real hardware: microcontrollers, C for embedded, sensor interfacing, real-time scheduling, and complete embedded projects.',
    category: 'Hardware',
    difficulty: 'advanced',
    credits: 4,
    modules: [
      {
        title: 'Microcontrollers & Embedded Basics',
        description: 'Microcontrollers versus processors, the GPIO model, and the embedded mindset.',
        content:
          `An embedded system is a computer built into something else — a fridge, a car, a pacemaker — to control it. Its heart is typically a microcontroller, a complete computer on a single chip.\n\n## Microcontroller vs microprocessor\n\n- A microprocessor (CPU) runs a full OS on external RAM/disk.\n- A microcontroller (MCU) integrates CPU, RAM, flash, and I/O on one chip.\n- MCUs trade raw speed for integration, cost, and power efficiency.\n- Embedded is a spectrum: tiny 8-bit chips to powerful SoCs running Linux.\n\n## Key components of an MCU\n\n- GPIO pins read or drive voltage on and off.\n- Timers/counters measure time and events.\n- ADCs convert analog voltages to numbers.\n- UART, SPI, and I2C are the standard serial buses.\n- Flash stores the program; RAM holds runtime data.\n\n## The embedded mindset\n\n- Resources are small: plan memory and clock carefully.\n- Determinism matters: a control loop must never be late.\n- Hardware is unforgiving: a mistake may not crash cleanly.\n- Debugging mixes logic analyzers, LEDs, and serial logs.\n\n## Hello, World of hardware\n\nBlink is the embedded equivalent of printing.\n\n- Configure a GPIO pin as output.\n- Toggle it high, wait, toggle low, wait.\n- A timer (not a busy delay) is the disciplined way.\n- See the LED blink and your toolchain works.\n\nEmbedded programming is programming with your hands on the actual machine — there is no operating system between you and the pin.`
      },
      {
        title: 'C for Embedded Systems',
        description: 'Pointers, memory maps, volatile registers, and bare-metal programming patterns.',
        content:
          `C dominates embedded software because it gives direct access to memory and hardware with no runtime overhead. Understanding memory is the whole game.\n\n## Memory essentials\n\n- Variables live on the stack; globals in static memory; malloc uses the heap (often avoided).\n- A pointer holds an address — the way C talks to hardware.\n- Volatile tells the compiler a variable changes outside the program (hardware does).\n- Bit operations manipulate registers: set, clear, toggle, test.\n\n## Registers are memory\n\nMicrocontrollers expose hardware as memory-mapped registers.\n\n- A register is a fixed address you read or write to control hardware.\n- Set a bit mask to turn on a peripheral or pin.\n- Mark registers volatile so the compiler never optimizes the reads away.\n- Use macros or structs to give registers readable names.\n\n## Bare-metal patterns\n\n- Super loop: initialize once, then loop forever handling tasks.\n- Non-blocking: poll with timers instead of busy-wait delays.\n- ISRs do little and fast; the main loop does the heavy work.\n- A state machine replaces messy nested conditionals.\n\n## Debugging techniques\n\n- LED/serial printf-style logging is the classic first tool.\n- Step through code with a debugger and inspect register values.\n- Assertions catch impossible states early.\n- Measure timing with a scope or the timer counter.\n\nIn embedded C, discipline replaces the safety nets an OS provides: you manage your own stack, your own memory, and your own timing.`
      },
      {
        title: 'Interfacing Sensors & Actuators',
        description: 'Analog sensors, ADC reads, PWM, serial buses (UART/SPI/I2C), and driving outputs.',
        content:
          `An embedded system lives through its sensors and actuators: reading the world and acting on it. This module is the practical bridge between the chip and everything it controls.\n\n## Reading analog signals\n\n- Resistors and potentiometers produce variable voltages.\n- The ADC samples a voltage into a number: at 10 bits, 0..1023.\n- Scale the raw count to real units with the reference voltage.\n- Average several reads to reduce sensor noise; drop outliers.\n\n## Writing outputs: PWM\n\nPulse-width modulation controls the average output without a DAC.\n\n- Vary duty cycle to dim LEDs or set motor speed.\n- Controlled outside the main loop by a timer — no busy-wait.\n- Set frequency and duty via timer-compare registers.\n- Smooth the output with an RC filter when you need a DC level.\n\n## The serial buses\n\n\n- UART: point-to-point, simple — great for debug consoles and GPS modules.\n- SPI: fast, master-slave, four wires — sensors and displays.\n- I2C: two wires, many devices with addresses — the workhorse.\n- Read datasheets for registers and address maps; that is the manual.\n\n## Driving actuators\n\n\n- Read a transistor or motor driver's enable/speed pins via GPIO/PWM.\n- Add flyback diodes across inductive loads to protect the pin.\n- Always know the current your pin can sink or source before wiring.\n- Test with a multimeter before trusting a sensor reading.\n\nThe gap between an LED blink and a real product is exactly these topics: sensing correctly, driving safely, and talking to parts over the right bus.`
      },
      {
        title: 'Real-Time Systems & RTOS',
        description: 'Deadlines, scheduling, priorities, and tasks with a Real-Time Operating System.',
        content:
          `Some embedded systems must respond within strict time limits — a brake controller cannot be "a little late." Real-time systems are built around guaranteeing those deadlines.\n\n## Hard vs soft real-time\n\n- Hard real-time: missing a deadline is a system failure.\n- Soft real-time: missing a deadline degrades quality but does not fail.\n- Safety-critical systems are hard real-time almost by definition.\n- Deadlines come from the physics of the problem, not preference.\n\n## Scheduling and priorities\n\n- Tasks share a CPU, so the scheduler decides who runs when.\n- Rate-monotonic scheduling: shorter periods get higher priority.\n- Priority inversion: a low-priority task blocking a high-priority one.\n- Prevent inversion with priority inheritance or ceilings.\n\n## Interrupt latency\n\n- Latency is the delay between an event and your handler running.\n- Keep critical sections short to reduce worst-case latency.\n- Nested and prioritized interrupts let urgent work preempt.\n- Never do heavy work inside an ISR — defer it to a task.\n\n## Using an RTOS\n\n\n- An RTOS provides tasks with scheduling, queues, mutexes, and timers.\n- Split work into real-time tasks (events, sensors) and lower-priority work.\n- Communicate with queues and mailboxes, not shared variables.\n- Verify timing on hardware — analyze worst case, not just average.\n\nReal-time is a guarantee, not a hope: you design schedules and bound latencies so deadlines hold even in the worst case.`
      },
      {
        title: 'Embedded Design Project',
        description: 'Bring it together: specify, build, and verify a complete embedded system.',
        content:
          `Everything in this course sharpens one skill: turning a hardware idea into a working, verifiable system. This capstone project challenges you to do it end to end.\n\n## Choose a scope\n\n- A sensor logger: read a temperature/light sensor and log to serial storage.\n- A control loop: regulate temperature, speed, or position with a sensor + actuator.\n- A communication node: two boards exchanging data over UART/SPI/I2C.\n- Keep the scope settable in a week of focused work.\n\n## Build like an engineer\n\n- Write a brief: one goal, three input/output requirements, your constraints.\n- Prototype the circuit on a breadboard; verify voltages before powering the chip.\n- Start with a minimal program — blink — then grow one feature at a time.\n- Commit to version control even for embedded projects.\n\n## Verify, don't assume\n\n- Prove each input and output with a multimeter or scope.\n- Log measured data and compare it to expected ranges.\n- Test edge cases: sensor disconnected, power dip, rapid toggles.\n- Measure and document your timing margins.\n\n## Document and present\n\n- Draw the final block diagram: MCU, power, sensors, actuators.\n- Show your code structure and the state machine you used.\n- Present measured results, not just intentions.\n- State plainly what you would change with more hardware.\n\nA working, measured, well-documented embedded project is a complete demonstration of everything this course teaches.`
      }
    ]
  },
  {
    title: 'SOE 514 (Website App Development using Java)',
    description:
      'Build web applications with the JVM: servlets and JSP, Spring Boot, JPA persistence, authentication, and deployment.',
    category: 'Software Engineering',
    difficulty: 'intermediate',
    credits: 3,
    modules: [
      {
        title: 'Java Web Fundamentals',
        description: 'HTTP on the JVM, web servers, and the build tooling Java web work depends on.',
        content:
          `Java has survived in the enterprise because it is stable, fast, and deeply tooled for server work. This module maps the fundamentals of web development onto the JVM.\n\n## HTTP on the server\n\n- A Java web application runs inside a servlet container like Tomcat.\n- The container listens on a port and calls your code per request.\n- Your code reads headers, params, and bodies; it writes a status and a body.\n- Container + your classes = a running website.\n\n## The request/response model\n\n- HttpServletRequest holds method, path, headers, and parameters.\n- HttpServletResponse carries the status, headers, and output.\n- Servlets map a URL path to a class that handles GET/POST.\n- The container manages threads, so think concurrency by default.\n\n## Build tooling\n\n- Maven and Gradle are the two standard build tools.\n- POM/Gradle files declare dependencies that resolve from repositories.\n- A fat JAR bundles the app and its server so java -jar runs it.\n- Profile/scope plugins handle packaging for containers.\n\n## The web.xml and configuration era\n\n- Older apps configure servlet mappings in web.xml.\n- Modern apps are convention-over-configuration via annotations.\n- ../WEB-INF holds classes and libraries, outside the public root.\n- Keep the public root to static assets; logic lives in classes.\n\nUnderstand how the container drives your classes, and every Java web framework becomes familiar — they are all refinements of the same container.`
      },
      {
        title: 'Servlets, JSP & MVC',
        description: 'Writing servlets, rendering with JSP, and separating concerns with MVC.',
        content:
          `Before Spring, web apps were built directly on servlets and JSP. Learning this layer reveals what the frameworks automate — and why they were invented.\n\n## Servlets in practice\n\n- Extend HttpServlet and override doGet/doPost.\n- Annotate @WebServlet(\"/path\") to register the mapping.\n- Read request parameters and write a response.\n- Redirect (302) vs forward (dispatch within the app) is a real decision.\n\n## JSP templates\n\n\n- JSP mixes HTML with Java scriptlets and EL expressions.\n- JSTL tags (c:forEach, c:if) keep templates cleaner than scriptlets.\n- JSP is compiled to a servlet at first request.\n- Model data via request/session attributes in MVC style.\n\n## MVC, done simply\n\n- The servlet is the controller: parse input, call logic, pick a view.\n- Java beans/services are the model: the actual computation.\n- JSP is the view: display what the model produced.\n- Forward to the JSP with the model attached; never mix SQL and HTML.\n\n## The path from servlet to framework\n\n- Retry connection/failure management and input validation got painful.\n- Deploy-time mapping and view resolution were repetitive.\n- Spring MVC keeps MVC but automates mapping, binding, and validation.\n- Understand plain servlets once so frameworks never feel like magic.\n\nServlets + JSP + MVC is the original clean web stack: knowing it makes every modern Java framework legible.`
      },
      {
        title: 'Spring Boot Basics',
        description: 'Auto-configuration, REST controllers, dependency injection, and Spring Boot structure.',
        content:
          `Spring Boot is the de facto standard for new Java web apps. It takes Spring's machinery and hides the setup, so you start shipping API endpoints quickly.\n\n## Why Spring Boot\n\n- Auto-configuration wires sensible defaults from the classpath.\n- Embedded server means java -jar runs the whole app.\n- An opinionated starter system pulls in just the tools you need.\n- It is Spring underneath: be container and DI aware.\n\n## REST controllers\n\n- @RestController turns a class into REST endpoints.\n- @GetMapping, @PostMapping, @PutMapping map HTTP verbs to methods.\n- @PathVariable and @RequestBody bind path and body to parameters.\n- Return objects; Jackson serializes them to JSON.\n\n## Dependency injection\n\n- @Component, @Service, @Repository mark classes for management.\n- @Autowired (or constructor injection) supplies dependencies.\n- Layers talk interfaces; the container builds the wiring.\n- Constructor injection is the modern, testable default.\n\n## Structure\n\n- A main class with @SpringBootApplication starts the app.\n- Controllers, services, repositories, models: one folder each.\n- application.properties holds config: port, DB, logging.\n- Tests use @SpringBootTest and boot a real context.\n\nThe fastest path from zero to API: Spring Initializr, a starter, one controller, and java -jar. Everything else builds on that.`
      },
      {
        title: 'Database Integration with JPA',
        description: 'Entities, repositories, relationships, and transactions in Spring Data JPA.',
        content:
          `Web apps are CRUD at heart: create, read, update, delete data. Spring Data JPA lets you persist Java objects to SQL and query them through interfaces.\n\n## Entities map to tables\n\n- @Entity marks a class as a table; @Id marks the primary key.\n- Columns map fields automatically — a Java field becomes a column.\n- @OneToMany and @ManyToOne express relationships.\n- JPA handles create, read, update, delete — you write almost no SQL.\n\n## Repositories\n\n- Extend JpaRepository<Entity, Id> and get CRUD for free.\n- Declare a method like findByEmail(String) and Spring implements it.\n- Derived queries handle the common cases: find, count, exists.\n- Return Optional to be explicit about missing rows.\n\n## Transactions and integrity\n\n- @Transactional wraps a method so all changes commit or roll back together.\n- Lazy loading fetches relationships on access (beware the view layer).\n- Constraints and validated beans keep bad data out.\n- Index columns you filter on (email, username) for fast lookups.\n\n## Common patterns\n\n- DTOs separate the API shape from the entity shape.\n- Do not return raw entities for responses you control.\n- Fetch join or query the fields you need to avoid N+1 selects.\n- Use the same entity mapping across dev and production via schema updates.\n\nWrite a repository for a one-entity app (users, courses, products), exercise the derived queries, and watch Spring generate correct SQL for you.`
      },
      {
        title: 'Security & Deployment',
        description: 'Spring Security, JWT authentication, and shipping a jar to a server.',
        content:
          `A web app is finished when it is secure and deployed. This module covers protecting endpoints and getting your Java app running where users can reach it.\n\n## Securing with Spring Security\n\n- Spring Security filters every request before it reaches your controller.\n- Configure which paths require authentication and which are public.\n- BCrypt hashes passwords; never store plain text.\n- Role checks (@PreAuthorize) gate admin-only endpoints.\n\n## JWT authentication flow\n\n- Login verifies credentials and returns a signed JWT.\n- Stateless: the token carries identity; the server keeps no session.\n- A filter parses the Authorization header on every protected request.\n- The token expires; clients refresh or re-login.\n\n## Deployment options\n\n- Build a runnable JAR: mvn package results in a fat jar.\n- Run it with a process manager or run it inside a Docker container.\n- Put it behind a reverse proxy (Nginx) for TLS and domain names.\n- A reverse proxy also handles TLS, compression, and connection limits.\n\n## Environment hygiene\n\n- Read secrets (password, JWT key) from environment variables, never source.\n- Set JVM memory flags for your heap size.\n- Log to a standard channel the platform collects.\n- Roll back by deploying the previous image, not by surprise.\n\nJava ships as a jar; shipping that jar well — secured, configured, monitored — is how websites built in Java actually run in production.`
      }
    ]
  },
    ];

async function seed() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();

    // Ensure a demo instructor exists so courses always have an owner.
    await User.findOrCreate({
      where: { email: DEMO_INSTRUCTOR_EMAIL },
      defaults: { name: 'Demo Instructor', password: DEMO_PASSWORD, role: 'instructor', isActive: true }
    });

    const instructor = await User.findOne({
      where: { role: 'instructor' },
      order: [['id', 'ASC']]
    });

    if (!instructor) {
      console.error('No instructor user found. Create an instructor account first.');
      process.exit(1);
    }

    let createdCourses = 0;
    let createdModules = 0;
    let updatedModules = 0;

    for (const data of courseData) {
      const [course, courseCreated] = await Course.findOrCreate({
        where: { title: data.title },
        defaults: {
          description: data.description,
          instructorId: instructor.id,
          category: data.category,
          credits: data.credits,
          isActive: true
        }
      });

      if (courseCreated) createdCourses += 1;

      if (!courseCreated && course.credits !== data.credits) {
        await course.update({ credits: data.credits });
      }

      for (let i = 0; i < data.modules.length; i += 1) {
        const moduleData = data.modules[i];
        const [module, moduleCreated] = await Module.findOrCreate({
          where: { courseId: course.id, title: moduleData.title },
          defaults: {
            description: moduleData.description,
            content: moduleData.content,
            order: i + 1,
            isActive: true
          }
        });

        if (moduleCreated) createdModules += 1;

        if (!moduleCreated && (module.description !== moduleData.description || module.content !== moduleData.content)) {
          await module.update({
            description: moduleData.description,
            content: moduleData.content,
            order: i + 1
          });
          updatedModules += 1;
        }
      }
    }

    let gradebookRows = 0;
    const [demoStudent] = await User.findOrCreate({
      where: { email: DEMO_STUDENT_EMAIL },
      defaults: { name: 'Demo Student', password: DEMO_PASSWORD, role: 'student', isActive: true }
    });
    if (demoStudent) {
      const demoScores = {
        'Backend Web Application Development': 84,
        'Frontend Web Development with React': 76,
        'UI/UX Design Systems': 71,
        'Game Development with Unity': 58,
        'Database Systems with SQL': 66
      };

      for (const [title, overallGrade] of Object.entries(demoScores)) {
        const course = await Course.findOne({ where: { title } });
        if (!course) continue;

        const [gradebook, created] = await Gradebook.findOrCreate({
          where: { courseId: course.id, studentId: demoStudent.id },
          defaults: { overallGrade, participationScore: overallGrade }
        });

        if (!created && Number(gradebook.overallGrade) !== overallGrade) {
          await gradebook.update({ overallGrade, participationScore: overallGrade });
        }

        gradebookRows += 1;
      }
    }

    const courseCount = await Course.count();
    const moduleCount = await Module.count();

    console.log(`Seed complete: ${courseCount} courses (${createdCourses} created), ${moduleCount} modules (${createdModules} created, ${updatedModules} updated), ${gradebookRows} gradebook rows for demo student.`);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seed();
