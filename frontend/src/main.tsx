import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/gastos-theme.css';
import App from './App';
import { hideSystemBars } from './native/systemBars';

void hideSystemBars();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
