import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useAlerts } from './hooks/useAlerts';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import Map from './components/Map';
import IncidentDetails from './components/IncidentDetails';
import GuardianLogin from './pages/Guardian/GuardianLogin';
import GuardianDashboard from './pages/Guardian/GuardianDashboard';
import EvidenceVault from './pages/EvidenceVault';
import AnonymousInbox from './pages/AnonymousInbox';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import './App.css';

// Police Dashboard Layout
function PoliceDashboard() {
  const { officer, signOut, session } = useAuth();
  const { alerts, newAlertId, resolveAlert, error, debugLog } = useAlerts();
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);

  const selectedAlert = alerts.find(a => a.id === selectedAlertId) || null;

  if (!session) return <Login />;

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden">
      <Sidebar
        alerts={alerts}
        selectedAlertId={selectedAlertId}
        onSelectAlert={setSelectedAlertId}
        officer={officer}
        onSignOut={signOut}
        newAlertId={newAlertId}
        error={error}
        userId={session?.user.id}
        debugLog={debugLog}
      />

      <Map alerts={alerts} selectedAlert={selectedAlert} />

      {selectedAlert && (
        <IncidentDetails
          alert={selectedAlert}
          onClose={() => setSelectedAlertId(null)}
          onResolve={resolveAlert}
        />
      )}
    </div>
  );
}

function App() {

  return (
    <Routes>
      {/* Police Dashboard Routes */}
      <Route path="/" element={<PoliceDashboard />} />
      <Route path="/login" element={<Login />} />
      <Route path="/evidence" element={<EvidenceVault />} />
      <Route path="/reports" element={<AnonymousInbox />} />
      <Route path="/analytics" element={<AnalyticsDashboard />} />

      {/* Guardian Portal Routes */}
      <Route path="/guardian" element={<Navigate to="/guardian/login" replace />} />
      <Route path="/guardian/login" element={<GuardianLogin />} />
      <Route path="/guardian/dashboard" element={<GuardianDashboard />} />
    </Routes>
  );
}

export default App;
