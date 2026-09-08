import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ThemeProvider } from './context/ThemeContext';
import { AppDataProvider } from './context/AppDataContext';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/responsive.css';
import './styles/print.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AppDataProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AppDataProvider>
    </ThemeProvider>
  </StrictMode>
);
