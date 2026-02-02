import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Nodes from './Nodes.tsx';
import NodeGraph from "./NodeGraph";



createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <Nodes />
        <NodeGraph nodename="whsrv" component="cpu" />
        <NodeGraph nodename="whsrv" component="memory" />
        <NodeGraph nodename="whsrv" component="disk" />
    </StrictMode>,

)
