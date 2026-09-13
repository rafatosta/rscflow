import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { App } from './App';
import './globals.css';
import {
  applyVisualPreferences,
  readVisualPreferences,
} from '@/features/visual-preferences/preferences';

applyVisualPreferences(
  readVisualPreferences(window.localStorage),
  document.documentElement,
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
);

const router = createBrowserRouter([{ path: '*', element: <App /> }]);
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
