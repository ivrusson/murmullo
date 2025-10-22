import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { TranscriptionsPage, ModelsPage, PermissionsPage, SettingsPage } from "./components/pages";
import { FloatingRecorder } from "./components/features";
import { Toaster } from "./components/ui";
import { useHotkeyEvents } from "./hooks/useHotkeyEvents";
import { AppConfigProvider } from "./contexts/AppConfigContext";

const App = () => {
  const [activeTab, setActiveTab] = useState("transcriptions");

  // Initialize hotkey event listeners
  useHotkeyEvents();

  const renderContent = () => {
    switch (activeTab) {
      case "transcriptions":
        return <TranscriptionsPage />;
      case "models":
        return <ModelsPage />;
      case "permissions":
        return <PermissionsPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <TranscriptionsPage />;
    }
  };

  return (
    <AppConfigProvider>
      <div className="flex h-screen bg-background p-6 gap-6">
        {/* Sidebar */}
        <div className="w-52 bg-surface-2 border border-border/50 rounded-2xl shadow-sm flex-shrink-0">
          <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 bg-surface-1 border border-border/50 rounded-2xl shadow-sm overflow-y-auto">
          {renderContent()}
        </div>
        
        {/* Floating Recorder */}
        <FloatingRecorder />
        
        {/* Toast notifications */}
        <Toaster />
      </div>
    </AppConfigProvider>
  );
};

export default App;
