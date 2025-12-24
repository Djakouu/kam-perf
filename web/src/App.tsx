import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './components/dashboard/Dashboard';
import { Documentation } from './components/Documentation';
import { Analytics } from './components/Analytics';
import { ExpandedStateProvider } from './context/ExpandedStateContext';

function App() {
  return (
    <ExpandedStateProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/documentation" element={<Documentation />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ExpandedStateProvider>
  );
}

export default App;

