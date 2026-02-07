import React, { useRef, useMemo, useCallback, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

/**
 * @param {Object} props
 * @param {import('../../utils/schema').GraphData} props.data
 * @param {(node: import('../../utils/schema').Node) => void} props.onNodeClick
 * @param {import('../../utils/schema').Node | null} props.focusNode
 */
export default function GraphViz({ data, onNodeClick, focusNode }) {
    const fgRef = useRef();

    // Camera Focus Effect
    useEffect(() => {
        if (focusNode && fgRef.current) {
            fgRef.current.centerAt(focusNode.x, focusNode.y, 1000);
            fgRef.current.zoom(6, 2000);
        }
    }, [focusNode]);

    // Custom Node Rendering
    const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
        // 1. Draw "Aura" for high-score nodes
        if (node.score > 0.6) {
            const auraRadius = Math.sqrt(node.val) * 4; // Larger than node
            ctx.beginPath();
            ctx.arc(node.x, node.y, auraRadius, 0, 2 * Math.PI, false);
            ctx.fillStyle = `rgba(59, 130, 246, ${node.score * 0.3})`; // Blue glow, opacity based on score
            ctx.fill();
        }

        // 2. Draw Main Node
        const radius = Math.sqrt(node.val);
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
        // Color: "Me" = distinctive, High Score = Blue/White, Low Score = Gray
        if (node.id === 'user_0') {
            ctx.fillStyle = '#10B981'; // Emerald 500
        } else if (node.score > 0.6) {
            ctx.fillStyle = '#60A5FA'; // Blue 400
        } else {
            ctx.fillStyle = '#4B5563'; // Gray 600
        }
        ctx.fill();

        // 3. Label (only if zoomed in or high score)
        if (globalScale > 2 || node.score > 0.8) {
            const label = node.name;
            const fontSize = 12 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillText(label, node.x, node.y + radius + fontSize);
        }
    }, []);

    return (
        <div className="w-full h-full bg-slate-900 overflow-hidden relative">
            <ForceGraph2D
                ref={fgRef}
                graphData={data}
                nodeLabel="name"
                onNodeClick={onNodeClick}
                nodeCanvasObject={nodeCanvasObject}
                nodeCanvasObjectMode={() => "replace"} // We handle all drawing
                linkColor={() => "rgba(255,255,255,0.2)"}
                linkLineDash={link => link.type === 'fuzzy' ? [5, 5] : null}
                backgroundColor="#0f172a" // Slate 900
            />
        </div>
    );
}
