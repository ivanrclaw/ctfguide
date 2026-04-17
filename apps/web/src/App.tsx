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
import { JoinLiveSession } from '@/pages/join-live-session';
import { HostLiveSession } from '@/pages/host-live-session';
import { StudentLiveSession } from '@/pages/student-live-session';
import { ProjectorView } from '@/pages/projector-view';
import { WebSocketProvider } from '@/contexts/websocket-context';

function App() {
  return (
    <WebSocketProvider>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/view/:slug" element={<PublicView />} />
          <Route path="/live/join" element={<JoinLiveSession />} />
          <Route path="/live/:code/:name" element={<StudentLiveSession />} />
        </Route>
        <Route path="/live/projector/:code" element={<ProjectorView />} />
        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/editor/:guideId" element={<Editor />} />
          <Route path="/live/host/:sessionId" element={<HostLiveSession />} />
        </Route>
      </Routes>
    </WebSocketProvider>
  );
}

export default App;