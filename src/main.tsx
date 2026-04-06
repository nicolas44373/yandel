import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Limpiar mocks legacy y tokens de Supabase corruptos
const keysToRemove = Object.keys(localStorage).filter(key =>
  key.startsWith('sb-') ||
  key.startsWith('mock_')
)
keysToRemove.forEach(key => localStorage.removeItem(key))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)