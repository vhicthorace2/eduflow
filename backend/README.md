<<<<<<< HEAD
# Education Platform Backend

A modern, scalable backend for an educational website built with Node.js, Express, and MySQL. This backend implements all functional and non-functional requirements including user authentication, course management, assignments, quizzes, forums, messaging, and comprehensive reporting.

## Features

### User Management
- User registration with email and role selection (student, instructor, lecturer, admin)
- Email/password authentication with JWT tokens
- Password recovery functionality
- Admin capabilities for user management (CRUD operations, role assignment)

### Course Management
- Instructors can create courses with title, description, and thumbnail
- Course organization into modules and topics
- Learning material uploads (documents, images, video links)
- Student enrollment system

### Discussion Forums
- Course-specific discussion forums
- Thread creation and replies
- Instructor controls (pin, lock threads)

### Assignments
- Assignment creation with deadlines
- File submission system for students
- Grading and feedback by instructors
- Late submission tracking

### Quizzes
- Automated quiz module with multiple-choice questions
- Immediate scoring after submission
- Attempt limits and time constraints
- Auto-grading functionality

### Gradebook
- Comprehensive gradebook per course
- Instructor: full view of all student grades
- Student: view only own grades
- Assignment and quiz grade tracking

### Messaging
- Internal messaging system between users
- Private communication between instructors and students
- Read/unread status tracking

### Reporting
- Enrollment reports for instructors
- Progress tracking and participation metrics
- Student activity reports
- Dashboard summaries for instructors and admins

### Security & Performance
- Password hashing with bcrypt
- Role-based access control (RBAC)
- Rate limiting for API protection
- Helmet.js for security headers
- CORS enabled for cross-origin requests
- Compression middleware for performance
- Error handling middleware

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL with Sequelize ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: bcrypt, Helmet, express-rate-limit
- **File Upload**: Multer
- **Email**: Nodemailer
- **Validation**: express-validator

## Project Structure

```
education-platform-backend/
├── config/
│   └── database.js          # MySQL connection configuration
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── courseController.js  # Course management
│   ├── moduleController.js  # Module management
│   ├── materialController.js # Learning materials
│   ├── forumController.js   # Discussion forums
│   ├── assignmentController.js # Assignments
│   ├── quizController.js    # Quizzes
│   ├── gradebookController.js # Gradebook
│   ├── messageController.js # Messaging
│   ├── reportController.js  # Reports
│   └── adminController.js   # Admin operations
├── middleware/
│   ├── auth.js              # JWT authentication middleware
│   ├── rbac.js              # Role-based access control
│   ├── errorHandler.js      # Global error handling
│   └── upload.js            # File upload configuration
├── models/
│   ├── index.js             # Sequelize model associations
│   ├── User.js              # User model
│   ├── Course.js            # Course model
│   ├── Module.js            # Module model
│   ├── Material.js          # Material model
│   ├── Forum.js             # Forum model
│   ├── Thread.js            # Discussion thread model
│   ├── Reply.js             # Reply model
│   ├── Assignment.js       # Assignment model
│   ├── Submission.js        # Assignment submission model
│   ├── Quiz.js              # Quiz model
│   ├── QuizAttempt.js       # Quiz attempt model
│   ├── Gradebook.js         # Gradebook model
│   └── Message.js           # Message model
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── courses.js           # Course routes
│   ├── modules.js           # Module routes
│   ├── materials.js         # Material routes
│   ├── forums.js            # Forum routes
│   ├── assignments.js       # Assignment routes
│   ├── quizzes.js           # Quiz routes
│   ├── gradebook.js         # Gradebook routes
│   ├── messages.js          # Message routes
│   ├── reports.js           # Report routes
│   └── admin.js             # Admin routes
├── utils/
│   └── email.js             # Email utility functions
├── uploads/                 # File upload directory (auto-created)
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore rules
├── package.json             # Project dependencies
├── server.js                # Main server file
└── README.md                # This file
```

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v5.7 or higher) or MariaDB
- npm or yarn

### Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd education-platform-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file with your configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=education_platform
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   JWT_SECRET=your_jwt_secret_key_change_this_in_production
   JWT_EXPIRE=7d
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASSWORD=your_email_password
   MAX_FILE_SIZE=10485760
   UPLOAD_PATH=./uploads
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

4. **Create MySQL database**
   ```bash
   # Log in to MySQL
   mysql -u root -p

   # Create database
   CREATE DATABASE education_platform;

   # Exit MySQL
   exit
   ```

5. **Run the server**
   ```bash
   # Development mode with auto-reload
   npm run dev

   # Production mode
   npm start
   ```

The server will start on `http://localhost:5000` (or the port specified in `.env`). Sequelize will automatically create the necessary tables on first run.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password/:token` - Reset password
- `PUT /api/auth/update-password` - Update password

### Courses
- `GET /api/courses` - Get all courses
- `GET /api/courses/:id` - Get single course
- `POST /api/courses` - Create course (instructor)
- `PUT /api/courses/:id` - Update course (instructor)
- `DELETE /api/courses/:id` - Delete course (instructor)
- `POST /api/courses/:id/enroll` - Enroll in course (student)
- `GET /api/courses/my-courses` - Get enrolled courses
- `GET /api/courses/instructor-courses` - Get instructor's courses

### Modules
- `GET /api/modules/course/:courseId` - Get course modules
- `GET /api/modules/:id` - Get single module
- `POST /api/modules/course/:courseId` - Create module (instructor)
- `PUT /api/modules/:id` - Update module (instructor)
- `DELETE /api/modules/:id` - Delete module (instructor)

### Materials
- `GET /api/materials/module/:moduleId` - Get module materials
- `GET /api/materials/:id` - Get single material
- `POST /api/materials/module/:moduleId` - Create material (instructor)
- `PUT /api/materials/:id` - Update material (instructor)
- `DELETE /api/materials/:id` - Delete material (instructor)

### Forums
- `GET /api/forums/course/:courseId` - Get course forums
- `POST /api/forums/course/:courseId` - Create forum (instructor)
- `GET /api/forums/:forumId/threads` - Get forum threads
- `POST /api/forums/:forumId/threads` - Create thread
- `GET /api/forums/threads/:id` - Get thread details
- `POST /api/forums/threads/:threadId/replies` - Reply to thread
- `PUT /api/forums/threads/:id/pin` - Pin/unpin thread (instructor)
- `PUT /api/forums/threads/:id/lock` - Lock/unlock thread (instructor)

### Assignments
- `GET /api/assignments/course/:courseId` - Get course assignments
- `GET /api/assignments/:id` - Get single assignment
- `POST /api/assignments/course/:courseId` - Create assignment (instructor)
- `PUT /api/assignments/:id` - Update assignment (instructor)
- `DELETE /api/assignments/:id` - Delete assignment (instructor)
- `POST /api/assignments/:assignmentId/submit` - Submit assignment (student)
- `GET /api/assignments/:assignmentId/submissions` - Get submissions (instructor)
- `PUT /api/assignments/submissions/:submissionId/grade` - Grade submission (instructor)
- `GET /api/assignments/my-submissions` - Get my submissions

### Quizzes
- `GET /api/quizzes/course/:courseId` - Get course quizzes
- `GET /api/quizzes/:id` - Get single quiz
- `POST /api/quizzes/course/:courseId` - Create quiz (instructor)
- `PUT /api/quizzes/:id` - Update quiz (instructor)
- `DELETE /api/quizzes/:id` - Delete quiz (instructor)
- `POST /api/quizzes/:quizId/submit` - Submit quiz (student)
- `GET /api/quizzes/:quizId/attempts` - Get quiz attempts (instructor)
- `GET /api/quizzes/my-attempts` - Get my quiz attempts

### Gradebook
- `GET /api/gradebook/my-grades` - Get my grades
- `GET /api/gradebook/course/:courseId` - Get course gradebook
- `PUT /api/gradebook/:id` - Update gradebook (instructor)
- `POST /api/gradebook/course/:courseId/calculate` - Calculate gradebook (instructor)

### Messages
- `GET /api/messages` - Get messages
- `GET /api/messages/unread-count` - Get unread count
- `GET /api/messages/:id` - Get single message
- `POST /api/messages` - Send message
- `POST /api/messages/:id/reply` - Reply to message
- `PUT /api/messages/:id/read` - Mark as read
- `DELETE /api/messages/:id` - Delete message

### Reports
- `GET /api/reports/courses/:courseId/enrollment` - Enrollment report (instructor)
- `GET /api/reports/courses/:courseId/progress` - Progress report (instructor)
- `GET /api/reports/courses/:courseId/participation` - Participation report (instructor)
- `GET /api/reports/instructor/dashboard` - Instructor dashboard
- `GET /api/reports/admin/dashboard` - Admin dashboard

### Admin
- `GET /api/admin/users` - Get all users (admin)
- `GET /api/admin/users/:id` - Get single user (admin)
- `POST /api/admin/users` - Create user (admin)
- `PUT /api/admin/users/:id` - Update user (admin)
- `DELETE /api/admin/users/:id` - Delete user (admin)
- `PUT /api/admin/users/:id/toggle-status` - Activate/deactivate user (admin)

## Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Role-Based Access Control

The system implements RBAC with four roles:
- **Student**: Can enroll in courses, submit assignments, take quizzes, participate in forums
- **Instructor**: Can create/manage courses, assignments, quizzes, grade submissions
- **Lecturer**: Can create/manage courses, assignments, quizzes, grade submissions (similar to instructor)
- **Admin**: Full system access including user management

## Security Features

- Passwords hashed with bcrypt
- JWT token authentication
- Rate limiting (100 requests per 15 minutes per IP)
- Helmet.js security headers
- CORS configuration
- Input validation
- SQL injection prevention (Sequelize ORM with parameterized queries)

## Performance Features

- Response compression
- Database indexing for efficient queries
- Connection pooling
- Static file serving for uploads

## Error Handling

All errors are handled by a global error handler that returns consistent JSON responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

## Development

### Running tests
```bash
npm test
```

### Code style
The codebase follows the MVC pattern and is adequately commented for maintainability.

## Deployment

### Environment Variables
Ensure all environment variables are set in production:
- `NODE_ENV=production`
- Strong `JWT_SECRET`
- Secure MySQL database credentials
- Email configuration for password recovery

### Database Backups
Implement automated daily backups of MySQL as per reliability requirements. Use mysqldump or your cloud provider's backup solution.

### Scaling
The architecture supports horizontal scaling. Consider:
- Load balancer for multiple server instances
- MySQL replication or read replicas
- Redis for session management (if needed)

## License

ISC

## Support

For issues and questions, please refer to the project documentation or contact the development team.
=======
# eduflow-final-year-project-
>>>>>>> 5e918ddf8217d4823c9d83ff0894f9c9ef43e62e
