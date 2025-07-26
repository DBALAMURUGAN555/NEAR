import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { VaultManager } from './components/VaultManager';
import { YieldTracker } from './components/YieldTracker';
import { AdminPanel } from './components/AdminPanel';
import { ComplianceCenter } from './components/ComplianceCenter';
import { ProofOfReserves } from './components/ProofOfReserves';

export type Page = 'dashboard' | 'vaults' | 'yield' | 'compliance' | 'proof-reserves' | 'admin';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'vaults':
        return <VaultManager />;
      case 'yield':
        return <YieldTracker />;
      case 'compliance':
        return <ComplianceCenter />;
      case 'proof-reserves':
        return <ProofOfReserves />;
      case 'admin':
        return <AdminPanel />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6">
            {renderPage()}
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;