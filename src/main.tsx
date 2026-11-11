import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@xyflow/react/dist/style.css';
import './styles.css';
import App from './App';
import { I18nProvider } from './i18n';
import { DemoProvider } from './state/demo';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <DemoProvider>
        <App />
      </DemoProvider>
    </I18nProvider>
  </StrictMode>,
);
