import { Routes, Route } from 'react-router-dom';
import { PublicLayout } from '@/components/layouts/public-layout';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { Landing } from '@/pages/landing';
import { LoginPage } from '@/pages/login';
import { RegisterPage } from '@/pages/register';
import { Dashboard } from '@/pages/dashboard';
import { Editor } from '@/pages/editor';
import { PublicView } from '@/pages/public-view';

function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/view/:slug" element={<PublicView />} />
      </Route>
      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/editor/:guideId" element={<Editor />} />
      </Route>
    </Routes>
  );
}

export default App;