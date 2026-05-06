import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./App.css";

import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { AuthProvider } from "./context/useBootAuth.jsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
