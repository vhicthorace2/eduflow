/**
 * Role-Based Access Control (RBAC) middleware
 * Restricts access based on user roles
 */

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions' 
      });
    }

    next();
  };
};

const isInstructorOrAdmin = authorize('instructor', 'lecturer', 'admin');
const isAdmin = authorize('admin');
const isInstructor = authorize('instructor');
const isLecturer = authorize('lecturer');
const isInstructorOrLecturer = authorize('instructor', 'lecturer');
const isLecturerOrAdmin = authorize('lecturer', 'admin');
const isStudent = authorize('student');

module.exports = {
  authorize,
  isInstructorOrAdmin,
  isAdmin,
  isInstructor,
  isLecturer,
  isInstructorOrLecturer,
  isLecturerOrAdmin,
  isStudent
};
