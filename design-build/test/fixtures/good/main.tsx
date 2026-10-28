// expect: no errors — <App /> from ./App is the app's root (inventory.json → ignore.tags), not a UI component
// @ts-nocheck — a lint fixture, not app code: an app's tsconfig that includes **/*.tsx must not type-check it.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '../design-system/design-build/preview/tokens.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
