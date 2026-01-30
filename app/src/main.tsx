import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Nodes from './nodes.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Nodes />
  </StrictMode>,
)
