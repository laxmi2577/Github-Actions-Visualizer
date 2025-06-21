// File: frontend/src/GraphView.jsx

import React, { useCallback, useEffect, memo } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
} from 'reactflow';
import { FiCheckCircle, FiXCircle, FiLoader, FiHelpCircle } from 'react-icons/fi';
import 'reactflow/dist/style.css'; 

const StatusIcon = memo(({ status }) => {
    switch (status) {
        case 'success':
            return <FiCheckCircle className="node-icon" />;
        case 'failure':
        case 'cancelled':
        case 'timed_out':
            return <FiXCircle className="node-icon" />;
        case 'in_progress':
        case 'queued':
        case 'requested':
        case 'waiting':
        case 'pending':
            return <FiLoader className="node-icon spinning" />;
        default:
            return <FiHelpCircle className="node-icon" />;
    }
});

const StatusNode = memo(({ data }) => {
  const statusClass = data.status ? `node-${data.status}` : 'node-default';
  
  return (
    <div className={`status-node ${statusClass}`}>
      <Handle type="target" position={Position.Left} />
      <div className="node-label">
        <StatusIcon status={data.status} />
        {data.label}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

const nodeTypes = { statusNode: StatusNode };

const GraphView = ({ initialNodes, initialEdges, onNodeClick }) => { 
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  useEffect(() => {
    const typedNodes = initialNodes.map(node => ({ ...node, type: 'statusNode' }));
    setNodes(typedNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)),[setEdges]);

  return (
    <div style={{ height: '60vh', width: '100%', backgroundColor: '#1a202c', border: '1px solid #4a5568', borderRadius: '0.5rem' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        onNodeClick={onNodeClick}
      >
        <Background color="#4a5568" variant="dots" gap={16} size={1} />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default GraphView;
