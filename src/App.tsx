import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import FreemiumEditPreview from "./pages/Preview";
import Deployment from "./pages/Deployment";
import IncompleteGeneration from "./pages/IncompleteGeneration";
import VisualEditPage from "./pages/VisualEditPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Step 1: Generate Portfolio */}
          <Route path="/" element={<Index />} />
          
          {/* Step 2: Handle Incomplete Generation */}
          <Route path="/incomplete" element={<IncompleteGeneration />} />
          
          {/* Step 3: Preview & Basic Edit */}
          <Route path="/preview" element={<FreemiumEditPreview />} />
          
          {/* Step 4: Advanced Visual Edit (Optional) */}
          {/* <Route path="/edit" element={<VisualEditPage />} /> */}
            
          {/* Step 5: Deployment Success */}
          <Route path="/deployment" element={<Deployment />} />
          
          {/* Catch-all route for 404s */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;