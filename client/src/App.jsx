import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import MonthlyData from './components/MonthlyData';
import ReportsAnalytics from './components/ReportsAnalytics';
import CsvVoiceAssistantWidget from './components/CsvVoiceAssistantWidget';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="app-container">
      {/* Sidebar */}
      <nav style={{
        width: '260px',
        background: 'rgba(30, 41, 59, 0.8)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid var(--border-light)',
        position: 'fixed',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--primary)', fontSize: '20px', fontWeight: 'bold' }}>
          <i className='bx bx-brain bx-sm'></i> Jarvis.Finance
        </div>
        
        <ul style={{ listStyle: 'none', padding: '16px 0', flex: 1 }}>
          <li 
            onClick={() => setActiveTab('dashboard')}
            style={{ padding: '16px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', background: activeTab === 'dashboard' ? 'rgba(99, 102, 241, 0.15)' : 'transparent', color: activeTab === 'dashboard' ? 'var(--primary)' : 'var(--text-muted)', borderRight: activeTab === 'dashboard' ? '3px solid var(--primary)' : 'none' }}>
            <i className='bx bx-grid-alt bx-sm'></i> Dashboard
          </li>
          <li 
            onClick={() => setActiveTab('monthly')}
            style={{ padding: '16px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', background: activeTab === 'monthly' ? 'rgba(99, 102, 241, 0.15)' : 'transparent', color: activeTab === 'monthly' ? 'var(--primary)' : 'var(--text-muted)', borderRight: activeTab === 'monthly' ? '3px solid var(--primary)' : 'none' }}>
            <i className='bx bx-calendar bx-sm'></i> Monthly Data
          </li>
          <li 
            onClick={() => setActiveTab('reports')}
            style={{ padding: '16px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', background: activeTab === 'reports' ? 'rgba(99, 102, 241, 0.15)' : 'transparent', color: activeTab === 'reports' ? 'var(--primary)' : 'var(--text-muted)', borderRight: activeTab === 'reports' ? '3px solid var(--primary)' : 'none' }}>
            <i className='bx bx-line-chart bx-sm'></i> Reports & Analytics
          </li>
        </ul>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Welcome to AI Financial Sync</h1>
            <p className="text-muted" style={{ marginTop: '4px' }}>Upload your files and ask the AI assistant anything.</p>
          </div>
          {/* <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              AU
            </div>
          </div> */}
        </header>

        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'monthly' && <MonthlyData />}
        {activeTab === 'reports' && <ReportsAnalytics />}

        <CsvVoiceAssistantWidget />
      </main>
    </div>
  );
}

export default App;
