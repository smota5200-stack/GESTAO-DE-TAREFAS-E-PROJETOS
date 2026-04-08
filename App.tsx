import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import PasswordGate from './components/PasswordGate';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import Finances from './pages/Finances';
import Clients from './pages/Clients';
import ClientDetails from './pages/ClientDetails';
import PriceTable from './pages/PriceTable';
import ClientPanel from './pages/ClientPanel';
import Notes from './pages/Notes';
import Passwords from './pages/Passwords';
import Settings from './pages/Settings';
import Onboarding from './pages/Onboarding';
import Kanban from './pages/Kanban';
import Reports from './pages/Reports';


const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<PasswordGate><Layout /></PasswordGate>}>
          <Route index element={<Dashboard />} />
          <Route path="kanban" element={<Kanban />} />
          <Route path="projetos" element={<Projects />} />
          <Route path="projetos/:id" element={<ProjectDetails />} />
          <Route path="relatorios" element={<Reports />} />
          <Route path="precos" element={<PriceTable />} />
          <Route path="financas" element={<Finances />} />
          <Route path="clientes" element={<Clients />} />
          <Route path="clientes/:id" element={<ClientDetails />} />
          <Route path="notas" element={<Notes />} />
          <Route path="senhas" element={<Passwords />} />
          <Route path="configuracoes" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
        {/* Rota de Onboarding (sem layout admin) */}
        <Route path="/onboarding" element={<PasswordGate><Onboarding /></PasswordGate>} />
        {/* Rota pública — Painel do Cliente (sem layout admin) */}
        <Route path="/painel/:clientId" element={<ClientPanel />} />
      </Routes>
    </HashRouter>
  );
};

export default App;