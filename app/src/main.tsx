import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import NodeGraph from "./NodeGraph";



createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <NodeGraph component="cpu" />
        <NodeGraph component="memory" />
        <NodeGraph component="disk" />
    </StrictMode>,

)
