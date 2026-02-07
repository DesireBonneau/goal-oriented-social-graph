import React, { useRef, useCallback, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import SpriteText from 'three-spritetext';

/**
 * @param {Object} props
 * @param {import('../../utils/schema').GraphData} props.data
 * @param {(node: import('../../utils/schema').Node) => void} props.onNodeClick
 * @param {import('../../utils/schema').Node | null} props.focusNode
 * @param {boolean} props.is3D
 */
export default function GraphViz({ data, onNodeClick, focusNode, is3D = false }) {
    const fgRef = useRef();

    // Camera Focus Effect (2D + 3D)
    useEffect(() => {
        if (focusNode && fgRef.current) {
            if (is3D) {
                // 3D Camera Logic
                const distance = 40;
                const distRatio = 1 + distance / Math.hypot(focusNode.x, focusNode.y, focusNode.z);
                fgRef.current.cameraPosition(
                    { x: focusNode.x * distRatio, y: focusNode.y * distRatio, z: focusNode.z * distRatio },
                    { x: focusNode.x, y: focusNode.y, z: focusNode.z },
                    2000
                );
            } else {
                // 2D Camera Logic
                fgRef.current.centerAt(focusNode.x, focusNode.y, 1000);
                fgRef.current.zoom(4, 2000); // Zoom level 4 might be reasonable
            }
        }
    }, [focusNode, is3D]);

    // --- 3D Rendering Logic ---
    const nodeThreeObject = useCallback((node) => {
        const group = new THREE.Group();

        let color = '#4B5563'; // Gray
        if (node.id === 'user_0') color = '#10B981'; // Emerald
        else if (node.score > 0.6) color = '#60A5FA'; // Blue

        const radius = Math.sqrt(node.val) * 2;
        const geometry = new THREE.SphereGeometry(radius);
        const material = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.9 });
        group.add(new THREE.Mesh(geometry, material));

        if (node.score > 0.6) {
            const aura = new THREE.Mesh(
                new THREE.SphereGeometry(radius * 2.5),
                new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: node.score * 0.15, depthWrite: false })
            );
            group.add(aura);
        }

        if (node.id === 'user_0' || node.score > 0.8) {
            const sprite = new SpriteText(node.name);
            sprite.color = 'white';
            sprite.textHeight = 4;
            sprite.position.y = radius + 2;
            group.add(sprite);
        }
        return group;
    }, []);

    // --- 2D Rendering Logic ---
    const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
        // Aura
        if (node.score > 0.6) {
            const auraRadius = Math.sqrt(node.val) * 4;
            ctx.beginPath();
            ctx.arc(node.x, node.y, auraRadius, 0, 2 * Math.PI, false);
            ctx.fillStyle = `rgba(59, 130, 246, ${node.score * 0.3})`;
            ctx.fill();
        }

        // Node
        const radius = Math.sqrt(node.val);
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);

        if (node.id === 'user_0') ctx.fillStyle = '#10B981';
        else if (node.score > 0.6) ctx.fillStyle = '#60A5FA';
        else ctx.fillStyle = '#4B5563';

        ctx.fill();

        // Label
        if (globalScale > 2 || node.score > 0.8) {
            const fontSize = 12 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillText(node.name, node.x, node.y + radius + fontSize);
        }
    }, []);

    return (
        <div className="w-full h-full bg-slate-900 overflow-hidden relative">
            {is3D ? (
                <ForceGraph3D
                    ref={fgRef}
                    graphData={data}
                    nodeLabel="name"
                    onNodeClick={onNodeClick}
                    nodeThreeObject={nodeThreeObject}
                    linkColor={() => "rgba(255,255,255,0.2)"}
                    linkWidth={link => link.strength * 0.5}
                    linkDirectionalParticles={link => link.strength > 0.8 ? 2 : 0}
                    linkDirectionalParticleSpeed={0.005}
                    backgroundColor="#0f172a"
                    showNavInfo={false}
                />
            ) : (
                <ForceGraph2D
                    ref={fgRef}
                    graphData={data}
                    nodeLabel="name"
                    onNodeClick={onNodeClick}
                    nodeCanvasObject={nodeCanvasObject}
                    nodeCanvasObjectMode={() => "replace"}
                    linkColor={() => "rgba(255,255,255,0.2)"}
                    linkLineDash={link => link.type === 'fuzzy' ? [5, 5] : null}
                    backgroundColor="#0f172a"
                />
            )}
        </div>
    );
}
