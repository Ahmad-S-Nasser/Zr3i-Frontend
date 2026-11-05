import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './auth/AuthProvider';
import { LangProvider } from './i18n/LangProvider';
import './styles/tailwind.css';
import './styles/tokens.css';
import '../design/bundle.css';
import './styles/app.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LangProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </LangProvider>
  </StrictMode>,
);
