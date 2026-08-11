import { Routes, Route } from 'react-router-dom';
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
import Quiz from './screens/quiz.jsx';
import Settings from './screens/settings.jsx';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/courses" element={<CourseCatalog />} />
      <Route path="/courses/:id" element={<CourseDetails />} />
      <Route path="/studentDashboard" element={<StudentDashboard />} />
      <Route path="/instructorDashboard" element={<InstructorDashboard />} />
      <Route path="/adminDashboard" element={<AdminDashboard />} />
      <Route path="/quiz" element={<Quiz />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;