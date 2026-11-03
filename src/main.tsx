import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { LangProvider } from './i18n/LangProvider';
import './styles/tokens.css';
import '../docs/design-system/bundle.css';
import './styles/app.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LangProvider>
      <App />
    </LangProvider>
  </StrictMode>,
);
