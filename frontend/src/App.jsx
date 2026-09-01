import { Routes, Route, Navigate } from 'react-router-dom';
import { userStore } from './api/client.js';
import Home from './screens/home.jsx';
import CourseCatalog from './screens/courseCatalog.jsx';
import InstructorDashboard from './screens/instructorDashboad.jsx';
import StudentDashboard from './screens/studentDashboard.jsx';
import NotFound from './screens/notFound.jsx';
import Signup from './screens/signup.jsx';
import Login from './screens/login.jsx';
import Profile from './screens/profile.jsx';
import CourseDetails from './screens/coursesDetails.jsx';
import AdminDashboard from './screens/adminDashboard.jsx';
import ManageUsers from './screens/manageUsers.jsx';
import ManageCourses from './screens/manageCourses.jsx';
import InstructorContent from './screens/instructorContent.jsx';
import CourseConsistency from './screens/courseConsistency.jsx';
import Quiz from './screens/quiz.jsx';
import Settings from './screens/settings.jsx';
import Messages from './screens/messages.jsx';
import Leaderboard from './screens/leaderboard.jsx';

const dashboardFor = (role) => {
  if (role === 'admin') return '/adminDashboard';
  if (role === 'instructor' || role === 'lecturer') return '/instructorDashboard';
  return '/studentDashboard';
};

function RequireRole({ roles, children }) {
  const user = userStore.get();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const effectiveRole = user.role === 'lecturer' ? 'instructor' : user.role;
  if (!roles.includes(effectiveRole)) {
    return <Navigate to={dashboardFor(user.role)} replace />;
  }

  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/courses" element={<CourseCatalog />} />
      <Route path="/courses/:id" element={<CourseDetails />} />
      <Route
        path="/studentDashboard"
        element={
          <RequireRole roles={['student']}>
            <StudentDashboard />
          </RequireRole>
        }
      />
      <Route
        path="/instructorDashboard"
        element={
          <RequireRole roles={['instructor']}>
            <InstructorDashboard />
          </RequireRole>
        }
      />
      <Route
        path="/adminDashboard"
        element={
          <RequireRole roles={['admin']}>
            <AdminDashboard />
          </RequireRole>
        }
      />
      <Route
        path="/adminUsers"
        element={
          <RequireRole roles={['admin']}>
            <ManageUsers />
          </RequireRole>
        }
      />
      <Route
        path="/adminCourses"
        element={
          <RequireRole roles={['admin']}>
            <ManageCourses />
          </RequireRole>
        }
      />
      <Route
        path="/instructorContent"
        element={
          <RequireRole roles={['instructor']}>
            <InstructorContent />
          </RequireRole>
        }
      />
      <Route
        path="/instructorConsistency"
        element={
          <RequireRole roles={['instructor']}>
            <CourseConsistency />
          </RequireRole>
        }
      />
      <Route path="/quiz" element={<Quiz />} />
      <Route path="/settings" element={<Settings />} />
      <Route
        path="/messages"
        element={
          <RequireRole roles={['student', 'instructor', 'admin']}>
            <Messages />
          </RequireRole>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <RequireRole roles={['student', 'instructor', 'admin']}>
            <Leaderboard />
          </RequireRole>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;