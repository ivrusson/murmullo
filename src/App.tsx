import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { AppHeader } from './components/layout';
import {
  DashboardPage,
  TranscriptionsPage,
  RuntimePage,
  DictionaryPage,
  PermissionsPage,
  SettingsPage,
} from './components/pages';
import { Toaster } from './components/ui';
import { useHotkeyEvents } from './hooks/useHotkeyEvents';
import { AppConfigProvider } from './contexts/AppConfigContext';
import { AppThemeProvider } from './contexts/ThemeProvider';

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  useHotkeyEvents();

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'transcriptions':
        return <TranscriptionsPage />;
      case 'runtimes':
        return <RuntimePage />;
      case 'dictionary':
        return <DictionaryPage />;
      case 'permissions':
        return <PermissionsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <AppThemeProvider>
      <AppConfigProvider>
        <div className="flex h-screen overflow-hidden bg-background">
          <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="flex-1 flex flex-col min-w-0">
            <AppHeader activeTab={activeTab} />
            <main className="flex-1 overflow-y-auto">{renderContent()}</main>
          </div>
          <Toaster />
        </div>
      </AppConfigProvider>
    </AppThemeProvider>
  );
};

export default App;
