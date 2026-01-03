import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RecordingProvider } from "@/contexts/RecordingContext";

import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import { KeyboardShortcutsProvider } from "@/components/KeyboardShortcutsProvider";
import Home from "./pages/Home";
import Record from "./pages/Record";
import Library from "./pages/Library";
import Settings from "./pages/Settings";
import VideoEditor from "./pages/VideoEditor";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <RecordingProvider>
        <KeyboardShortcutsProvider />
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/editor" element={<VideoEditor />} />
              <Route path="*" element={
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/record" element={<Record />} />
                    <Route path="/library" element={<Library />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </AppLayout>
              } />
            </Routes>
            <PWAInstallPrompt />
          </BrowserRouter>
        </TooltipProvider>
      </RecordingProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
