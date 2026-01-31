import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Nodes from './Nodes.tsx';
import NodeGraph from "./NodeGraph";



createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <Nodes />
        <NodeGraph nodename="whsrv" />
    </StrictMode>,

)
