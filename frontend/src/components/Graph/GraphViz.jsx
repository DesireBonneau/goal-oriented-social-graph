import React, { useRef, useCallback, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import SpriteText from 'three-spritetext';
import { graphConfig, getNodeColor, shouldShowLabel, shouldShowAura } from '../../config/graphConfig';

/**
 * @param {Object} props
 * @param {import('../../utils/schema').GraphData} props.data
 * @param {(node: import('../../utils/schema').Node) => void} props.onNodeClick
 * @param {import('../../utils/schema').Node | null} props.focusNode
 * @param {boolean} props.is3D
 */
export default function GraphViz({ data, onNodeClick, focusNode, is3D = false }) {
    const fgRef = useRef();
    const positionsRef = useRef({}); // Store node positions across view switches
    const [isTransitioning, setIsTransitioning] = useState(false);
    const prevIs3D = useRef(is3D);

    // Save positions before view switch and restore after
    useEffect(() => {
        if (prevIs3D.current !== is3D) {
            // View is switching - positions were already saved (see below)
            setIsTransitioning(true);

            // Apply saved positions to nodes
            if (data.nodes && Object.keys(positionsRef.current).length > 0) {
                data.nodes.forEach(node => {
                    const saved = positionsRef.current[node.id];
                    if (saved) {
                        node.x = saved.x;
                        node.y = saved.y;
                        node.z = saved.z ?? 0;
                        // Temporarily fix positions to prevent simulation from scattering
                        node.fx = saved.x;
                        node.fy = saved.y;
                        if (is3D) node.fz = saved.z ?? 0;
                    }
                });
            }

            // Unfix positions after a short delay to allow smooth settling
            const timer = setTimeout(() => {
                if (data.nodes) {
                    data.nodes.forEach(node => {
                        node.fx = undefined;
                        node.fy = undefined;
                        node.fz = undefined;
                    });
                }
                setIsTransitioning(false);
            }, 500);

            prevIs3D.current = is3D;
            return () => clearTimeout(timer);
        }
    }, [is3D, data.nodes]);

    // Save current positions whenever they're updated (on each tick)
    const handleEngineStop = useCallback(() => {
        if (data.nodes) {
            data.nodes.forEach(node => {
                positionsRef.current[node.id] = {
                    x: node.x,
                    y: node.y,
                    z: node.z ?? 0
                };
            });
        }
    }, [data.nodes]);

    // Also save on engine tick for more frequent saves
    const handleEngineTick = useCallback(() => {
        if (data.nodes) {
            data.nodes.forEach(node => {
                positionsRef.current[node.id] = {
                    x: node.x,
                    y: node.y,
                    z: node.z ?? 0
                };
            });
        }
    }, [data.nodes]);

    // Camera Focus Effect (2D + 3D)
    useEffect(() => {
        if (focusNode && fgRef.current) {
            const { focusDistance, focusZoom2D, animationDuration } = graphConfig.camera;
            if (is3D) {
                // 3D Camera Logic - just look at the node without rotating the whole view
                // Calculate a position that looks at the node from a reasonable distance
                const lookAtPos = { x: focusNode.x, y: focusNode.y, z: focusNode.z };
                // Move camera to keep same relative viewing angle but closer to node
                const currentPos = fgRef.current.cameraPosition();
                const dirX = currentPos.x - focusNode.x;
                const dirY = currentPos.y - focusNode.y;
                const dirZ = currentPos.z - focusNode.z;
                const dist = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
                const scale = focusDistance / Math.max(dist, 1);

                fgRef.current.cameraPosition(
                    {
                        x: focusNode.x + dirX * scale,
                        y: focusNode.y + dirY * scale,
                        z: focusNode.z + dirZ * scale
                    },
                    lookAtPos,
                    animationDuration * 2
                );
            } else {
                // 2D Camera Logic
                fgRef.current.centerAt(focusNode.x, focusNode.y, animationDuration);
                fgRef.current.zoom(focusZoom2D, animationDuration);
            }
        }
    }, [focusNode, is3D]);

    // Configure 3D orbit controls: swap rotate/pan, adjust speeds
    useEffect(() => {
        if (is3D && fgRef.current) {
            // Small delay to ensure the graph is fully initialized
            const timer = setTimeout(() => {
                const controls = fgRef.current.controls();
                if (controls) {
                    // Swap mouse buttons: LEFT=pan (2), RIGHT=rotate (0)
                    controls.mouseButtons = {
                        LEFT: 2,   // THREE.MOUSE.PAN
                        MIDDLE: 1, // THREE.MOUSE.DOLLY  
                        RIGHT: 0   // THREE.MOUSE.ROTATE
                    };
                    // For touch: ONE finger = pan, TWO fingers = rotate
                    controls.touches = {
                        ONE: 1,  // THREE.TOUCH.PAN
                        TWO: 2   // THREE.TOUCH.DOLLY_ROTATE
                    };
                    // Adjust speeds
                    controls.zoomSpeed = 1.5;    // Faster zoom
                    controls.panSpeed = 0.4;     // Slower pan
                    controls.rotateSpeed = 0.8;  // Moderate rotation
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [is3D]);

    // Set initial zoom level when graph first loads or mode changes
    useEffect(() => {
        if (fgRef.current && data.nodes?.length > 0) {
            // If we have a focusNode, don't reset to 0,0,0. Let the focusNode effect handle it.
            if (focusNode) return;

            const timer = setTimeout(() => {
                const { initialZoom3D, initialZoom2D, animationDuration } = graphConfig.camera;
                if (is3D) {
                    fgRef.current.cameraPosition({ x: 0, y: 0, z: initialZoom3D }, { x: 0, y: 0, z: 0 }, animationDuration);
                } else {
                    fgRef.current.zoom(initialZoom2D, animationDuration);
                    fgRef.current.centerAt(0, 0, animationDuration);
                }
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [data.nodes?.length, is3D, focusNode]);

    // --- 3D Rendering Logic ---
    const nodeThreeObject = useCallback((node) => {
        const group = new THREE.Group();
        const color = getNodeColor(node);
        const { sizing, colors } = graphConfig;

        const radius = Math.sqrt(node.val) * sizing.baseRadius3D;
        const geometry = new THREE.SphereGeometry(radius);
        const material = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.9 });
        group.add(new THREE.Mesh(geometry, material));

        if (shouldShowAura(node)) {
            const aura = new THREE.Mesh(
                new THREE.SphereGeometry(radius * sizing.auraMultiplier),
                new THREE.MeshBasicMaterial({
                    color: colors.aura,
                    transparent: true,
                    opacity: node.score * 0.15,
                    depthWrite: false
                })
            );
            group.add(aura);
        }

        if (shouldShowLabel(node)) {
            const sprite = new SpriteText(node.name);
            sprite.color = 'white';
            sprite.textHeight = 3;
            sprite.position.y = radius + 3;
            group.add(sprite);
        }
        return group;
    }, []);

    // --- 2D Rendering Logic ---
    const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
        const { sizing, colors } = graphConfig;
        const radius = Math.sqrt(node.val) * sizing.baseRadius2D;

        // Aura
        if (shouldShowAura(node)) {
            const auraRadius = radius * (sizing.auraMultiplier + 1);
            ctx.beginPath();
            ctx.arc(node.x, node.y, auraRadius, 0, 2 * Math.PI, false);
            ctx.fillStyle = `rgba(59, 130, 246, ${node.score * 0.3})`;
            ctx.fill();
        }

        // Node
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
        ctx.fillStyle = getNodeColor(node);
        ctx.fill();

        // Label
        if (shouldShowLabel(node, globalScale)) {
            const fontSize = 12 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillText(node.name, node.x, node.y + radius + fontSize);
        }
    }, []);

    // Common props for both graph types
    const commonProps = {
        ref: fgRef,
        graphData: data,
        nodeLabel: "name",
        onNodeClick: onNodeClick,
        onEngineStop: handleEngineStop,
        onEngineTick: handleEngineTick,
        cooldownTicks: isTransitioning ? 0 : undefined, // Prevent simulation from running during transition
        warmupTicks: isTransitioning ? 0 : 100,
        backgroundColor: "#0f172a"
    };

    return (
        <div className="w-full h-full bg-slate-900 overflow-hidden relative">
            {is3D ? (
                <ForceGraph3D
                    {...commonProps}
                    nodeThreeObject={nodeThreeObject}
                    linkColor={() => "rgba(255,255,255,0.2)"}
                    linkWidth={link => link.strength * 0.5}
                    linkDirectionalParticles={link => link.strength > 0.8 ? 2 : 0}
                    linkDirectionalParticleSpeed={0.005}
                    showNavInfo={false}
                    controlType="orbit"
                />
            ) : (
                <ForceGraph2D
                    {...commonProps}
                    nodeCanvasObject={nodeCanvasObject}
                    nodeCanvasObjectMode={() => "replace"}
                    linkColor={() => "rgba(255,255,255,0.2)"}
                    linkLineDash={link => link.type === 'fuzzy' ? [5, 5] : null}
                    minZoom={graphConfig.camera.minZoom2D}
                    maxZoom={graphConfig.camera.maxZoom2D}
                />
            )}
        </div>
    );
}
