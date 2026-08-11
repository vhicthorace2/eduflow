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
  }
];

async function seed() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });

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
          difficulty: data.difficulty,
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
    const demoStudent = await User.findOne({ where: { email: DEMO_STUDENT_EMAIL } });
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
