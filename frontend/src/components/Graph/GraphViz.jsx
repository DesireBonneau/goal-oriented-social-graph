import React, { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import SpriteText from 'three-spritetext';
import {
    graphConfig,
    getNodeColor,
    getLinkStyle,
    shouldShowLabel,
    shouldShowAura,
} from '../../config/graphConfig';

/**
 * @param {Object} props
 * @param {Object} props.data
 * @param {(node: Object) => void} props.onNodeClick
 * @param {Object | null} props.focusNode    - Single focus node (zooms camera to it)
 * @param {Object | null} props.secondNode   - Second node in comparison (camera fits both)
 * @param {string | null} props.selectedNodeId   - ID of selected node (for colour)
 * @param {string | null} props.comparisonNodeId - ID of comparison node (for colour)
 * @param {boolean} props.is3D
 */
export default function GraphViz({
    data,
    onNodeClick,
    focusNode,
    secondNode,
    selectedNodeId,
    comparisonNodeId,
    is3D = false,
}) {
    const fgRef = useRef();
    const positionsRef = useRef({});
    const [isTransitioning, setIsTransitioning] = useState(false);
    const prevIs3D = useRef(is3D);

    // ── Virtual edge for comparison mode ──────────────────────────────────────
    const graphDataWithVirtualEdge = useMemo(() => {
        if (!focusNode || !secondNode) return data;

        const focusId = focusNode.id ?? focusNode;
        const secondId = secondNode.id ?? secondNode;

        const hasRealEdge = data.links.some(l => {
            const s = l.source?.id ?? l.source;
            const t = l.target?.id ?? l.target;
            return (s === focusId && t === secondId) || (s === secondId && t === focusId);
        });

        if (hasRealEdge) return data;

        return {
            ...data,
            links: [
                ...data.links,
                { source: focusId, target: secondId, type: 'virtual', strength: 0, __virtual: true }
            ]
        };
    }, [data, focusNode, secondNode]);

    // ── Node colour helper (uses props, not global singleton) ─────────────────
    const getNodeColorWithState = useCallback((node) => {
        const { colors, selfId } = graphConfig;
        const isInComparisonMode = selectedNodeId !== null || comparisonNodeId !== null;

        if (comparisonNodeId && node.id === comparisonNodeId) return colors.comparison;
        if (selectedNodeId && node.id === selectedNodeId) return colors.selected;
        if (selfId && node.id === selfId && isInComparisonMode) return colors.selfHighlighted;
        return getNodeColor(node);
    }, [selectedNodeId, comparisonNodeId]);

    // ── View switch: save and restore positions ────────────────────────────────
    useEffect(() => {
        if (prevIs3D.current !== is3D) {
            setIsTransitioning(true);
            if (data.nodes && Object.keys(positionsRef.current).length > 0) {
                data.nodes.forEach(node => {
                    const saved = positionsRef.current[node.id];
                    if (saved) {
                        node.x = saved.x; node.y = saved.y; node.z = saved.z ?? 0;
                        node.fx = saved.x; node.fy = saved.y;
                        if (is3D) node.fz = saved.z ?? 0;
                    }
                });
            }
            const timer = setTimeout(() => {
                if (data.nodes) {
                    data.nodes.forEach(node => {
                        node.fx = undefined; node.fy = undefined; node.fz = undefined;
                    });
                }
                setIsTransitioning(false);
            }, 500);
            prevIs3D.current = is3D;
            return () => clearTimeout(timer);
        }
    }, [is3D, data.nodes]);

    const savePositions = useCallback(() => {
        data.nodes?.forEach(node => {
            positionsRef.current[node.id] = { x: node.x, y: node.y, z: node.z ?? 0 };
        });
    }, [data.nodes]);

    // ── Camera: focus on one or two nodes ─────────────────────────────────────
    // ── Camera: focus on one or two nodes (triggered externally via props) ─────
    useEffect(() => {
        if (!fgRef.current || !focusNode) return;

        // Skip if this effect was already run for this exact pair of nodes recently
        // to avoid fighting with manual user clicks
        const { focusDistance, focusZoom2D, animationDuration } = graphConfig.camera;
        const safeZoom2D = Math.min(focusZoom2D, 1.8);

        if (focusNode && secondNode) {
            if (!is3D) {
                const midX = ((focusNode.x ?? 0) + (secondNode.x ?? 0)) / 2;
                const midY = ((focusNode.y ?? 0) + (secondNode.y ?? 0)) / 2;
                fgRef.current.centerAt(midX, midY, animationDuration);
                fgRef.current.zoom(safeZoom2D * 0.8, animationDuration);
            } else {
                const midX = ((focusNode.x ?? 0) + (secondNode.x ?? 0)) / 2;
                const midY = ((focusNode.y ?? 0) + (secondNode.y ?? 0)) / 2;
                const midZ = ((focusNode.z ?? 0) + (secondNode.z ?? 0)) / 2;
                fgRef.current.cameraPosition(
                    { x: midX, y: midY, z: midZ + focusDistance * 1.5 },
                    undefined,
                    animationDuration
                );
            }
        } else if (focusNode) {
            if (is3D) {
                const distance = focusDistance;
                const nodeX = focusNode.x ?? 0;
                const nodeY = focusNode.y ?? 0;
                const nodeZ = focusNode.z ?? 0;
                const distRatio = 1 + distance / Math.max(Math.hypot(nodeX, nodeY, nodeZ), 1);

                const newPos = (nodeX || nodeY || nodeZ)
                    ? { x: nodeX * distRatio, y: nodeY * distRatio, z: nodeZ * distRatio }
                    : { x: 0, y: 0, z: distance };

                fgRef.current.cameraPosition(
                    newPos,
                    { x: nodeX, y: nodeY, z: nodeZ },
                    animationDuration
                );
            } else {
                fgRef.current.centerAt(focusNode.x, focusNode.y, animationDuration);
                fgRef.current.zoom(safeZoom2D, animationDuration);
            }
        }
    }, [focusNode?.id, secondNode?.id, is3D]);

    // ── Handle Manual Node Clicks ──────────────────────────────────────────────
    const handleNodeClickInternal = useCallback((node) => {
        if (fgRef.current && !secondNode) {
            const { focusDistance, focusZoom2D, animationDuration } = graphConfig.camera;
            if (is3D) {
                const distance = focusDistance;
                const nodeX = node.x ?? 0;
                const nodeY = node.y ?? 0;
                const nodeZ = node.z ?? 0;
                const distRatio = 1 + distance / Math.max(Math.hypot(nodeX, nodeY, nodeZ), 1);

                const newPos = (nodeX || nodeY || nodeZ)
                    ? { x: nodeX * distRatio, y: nodeY * distRatio, z: nodeZ * distRatio }
                    : { x: 0, y: 0, z: distance };

                fgRef.current.cameraPosition(
                    newPos,
                    { x: nodeX, y: nodeY, z: nodeZ },
                    animationDuration
                );
            } else {
                fgRef.current.centerAt(node.x, node.y, animationDuration);
                fgRef.current.zoom(Math.min(focusZoom2D, 1.8), animationDuration);
            }
        }
        if (onNodeClick) onNodeClick(node);
    }, [is3D, secondNode, onNodeClick]);

    // ── Configure 3D orbit controls ────────────────────────────────────────────
    useEffect(() => {
        if (is3D && fgRef.current) {
            const timer = setTimeout(() => {
                const controls = fgRef.current.controls();
                if (controls) {
                    controls.rotateSpeed = 0.5;
                    controls.panSpeed = 0.8;
                    controls.zoomSpeed = 1.2;
                    controls.enableDamping = true;
                    controls.dampingFactor = 0.1;
                    controls.maxDistance = 4000;
                    controls.minDistance = 10;
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [is3D]);

    // ── Configure D3 Forces (spread nodes) ─────────────────────────────────────
    useEffect(() => {
        if (fgRef.current && data.nodes?.length > 0) {
            // Push nodes apart so it's not a clustered blob
            fgRef.current.d3Force('charge').strength(-300);
            
            // Weak connections settle further apart than strong ones
            fgRef.current.d3Force('link').distance(link => {
                const strength = link.strength || 0.1;
                return 200 - (strength * 150); // range roughly ~200 down to 50
            });
            
            fgRef.current.d3ReheatSimulation();
        }
    }, [data.nodes, is3D]);

    // ── Initial zoom ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (fgRef.current && data.nodes?.length > 0 && !focusNode) {
            const timer = setTimeout(() => {
                const { initialZoom3D, initialZoom2D, animationDuration } = graphConfig.camera;
                if (is3D) {
                    fgRef.current.cameraPosition({ x: 0, y: 0, z: initialZoom3D }, undefined, animationDuration);
                } else {
                    fgRef.current.zoom(initialZoom2D, animationDuration);
                    fgRef.current.centerAt(0, 0, animationDuration);
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [data.nodes?.length, is3D]);

    // ── 3D Rendering ──────────────────────────────────────────────────────────
    // Deps include selectedNodeId/comparisonNodeId so THREE objects rebuild on selection change
    const nodeThreeObject = useCallback((node) => {
        const group = new THREE.Group();
        const color = getNodeColorWithState(node);
        const { sizing, colors } = graphConfig;
        const radius = Math.sqrt(node.val || 5) * sizing.baseRadius3D;

        const isHighlighted = node.id === selectedNodeId || node.id === comparisonNodeId;
        if (isHighlighted) {
            const ringGeo = new THREE.TorusGeometry(radius * 1.8, 0.5, 8, 32);
            const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 });
            group.add(new THREE.Mesh(ringGeo, ringMat));
        }

        const geometry = new THREE.SphereGeometry(radius);
        const material = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.9 });
        group.add(new THREE.Mesh(geometry, material));

        if (shouldShowAura(node)) {
            const aura = new THREE.Mesh(
                new THREE.SphereGeometry(radius * sizing.auraMultiplier),
                new THREE.MeshBasicMaterial({ color: colors.aura, transparent: true, opacity: node.score * 0.15, depthWrite: false })
            );
            group.add(aura);
        }

        if (shouldShowLabel(node) || isHighlighted) {
            const sprite = new SpriteText(node.name);
            sprite.color = 'white';
            sprite.textHeight = 3;
            sprite.position.y = radius + 3;
            group.add(sprite);
        }
        return group;
    }, [selectedNodeId, comparisonNodeId, getNodeColorWithState]);

    // ── 2D Rendering ──────────────────────────────────────────────────────────
    // Deps include selectedNodeId/comparisonNodeId so canvas redraws on selection change
    const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
        const { sizing } = graphConfig;
        const radius = Math.sqrt(node.val || 5) * sizing.baseRadius2D;
        const color = getNodeColorWithState(node);
        const isHighlighted = node.id === selectedNodeId || node.id === comparisonNodeId;

        if (shouldShowAura(node) && !isHighlighted) {
            const auraRadius = radius * (sizing.auraMultiplier + 1);
            ctx.beginPath();
            ctx.arc(node.x, node.y, auraRadius, 0, 2 * Math.PI);
            ctx.fillStyle = `rgba(59, 130, 246, ${node.score * 0.3})`;
            ctx.fill();
        }

        if (isHighlighted) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius * 2.8, 0, 2 * Math.PI);
            ctx.fillStyle = `${color}30`;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(node.x, node.y, radius * 1.7, 0, 2 * Math.PI);
            ctx.strokeStyle = `${color}CC`;
            ctx.lineWidth = 1.5 / globalScale;
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();

        if (shouldShowLabel(node, globalScale) || isHighlighted) {
            const fontSize = Math.max(12 / globalScale, isHighlighted ? 10 / globalScale : 0);
            ctx.font = `${isHighlighted ? 'bold ' : ''}${fontSize}px Sans-Serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = isHighlighted ? '#fff' : 'rgba(255,255,255,0.8)';
            ctx.fillText(node.name, node.x, node.y + radius + fontSize * 1.2);
        }
    }, [selectedNodeId, comparisonNodeId, getNodeColorWithState]);

    // ── Common props ──────────────────────────────────────────────────────────
    const commonProps = {
        ref: fgRef,
        graphData: graphDataWithVirtualEdge,
        nodeLabel: 'name',
        onNodeClick: handleNodeClickInternal,
        onEngineStop: savePositions,
        onEngineTick: savePositions,
        cooldownTicks: isTransitioning ? 0 : undefined,
        warmupTicks: isTransitioning ? 0 : 100,
        backgroundColor: '#0f172a',
        d3AlphaDecay: 0.02,
        d3VelocityDecay: 0.3,
    };

    return (
        <div className="w-full h-full bg-slate-900 overflow-hidden relative">
            {is3D ? (
                <ForceGraph3D
                    {...commonProps}
                    nodeThreeObject={nodeThreeObject}
                    nodeThreeObjectExtend={false}
                    linkColor={link => getLinkStyle(link, link.__virtual).color}
                    linkWidth={link => getLinkStyle(link, link.__virtual).width}
                    linkDashLen={link => getLinkStyle(link, link.__virtual).dashed ? 4 : 0}
                    linkDashGap={link => getLinkStyle(link, link.__virtual).dashed ? 2 : 0}
                    linkDirectionalParticles={link => link.__virtual ? 3 : (link.strength > 0.8 ? 2 : 0)}
                    linkDirectionalParticleColor={link => getLinkStyle(link, link.__virtual).color}
                    linkDirectionalParticleSpeed={0.005}
                    showNavInfo={false}
                    controlType="orbit"
                />
            ) : (
                <ForceGraph2D
                    {...commonProps}
                    nodeCanvasObject={nodeCanvasObject}
                    nodeCanvasObjectMode={() => 'replace'}
                    linkColor={link => getLinkStyle(link, link.__virtual).color}
                    linkWidth={link => getLinkStyle(link, link.__virtual).width}
                    linkLineDash={link => getLinkStyle(link, link.__virtual).dashed ? [4, 2] : null}
                    minZoom={graphConfig.camera.minZoom2D}
                    maxZoom={graphConfig.camera.maxZoom2D}
                />
            )}
        </div>
    );
}
