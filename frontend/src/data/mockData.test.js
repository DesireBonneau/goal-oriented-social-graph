import { describe, it, expect } from 'vitest';
import { generateMockGraph, simulateSearch } from './mockData';
import { graphConfig } from '../config/graphConfig';

describe('mockData', () => {
    describe('generateMockGraph', () => {
        it('should generate the correct number of nodes', () => {
            const { nodes } = generateMockGraph(30);
            expect(nodes).toHaveLength(30);
        });

        it('should have user_0 as the first node with score 1.0', () => {
            const { nodes } = generateMockGraph(10);
            expect(nodes[0].id).toBe('user_0');
            expect(nodes[0].score).toBe(1.0);
            expect(nodes[0].name).toBe('You');
        });

        it('should generate nodes with valid schema properties', () => {
            const { nodes } = generateMockGraph(20);
            nodes.forEach(node => {
                expect(node).toHaveProperty('id');
                expect(node).toHaveProperty('name');
                expect(node).toHaveProperty('info');
                expect(node.info).toHaveProperty('major');
                expect(node.info).toHaveProperty('experience');
                expect(node).toHaveProperty('score');
                expect(node).toHaveProperty('val');
                expect(node).toHaveProperty('isFuzzy');
                expect(node).toHaveProperty('isConnected');
            });
        });

        it('should generate valid links with required properties', () => {
            const { links } = generateMockGraph(20);
            expect(links.length).toBeGreaterThan(0);
            links.forEach(link => {
                expect(link).toHaveProperty('source');
                expect(link).toHaveProperty('target');
                expect(link).toHaveProperty('strength');
                expect(link).toHaveProperty('type');
                expect(['direct', 'fuzzy']).toContain(link.type);
            });
        });

        it('should have some nodes marked as isConnected', () => {
            const { nodes } = generateMockGraph(30);
            const connected = nodes.filter(n => n.isConnected);
            expect(connected.length).toBeGreaterThan(0);
        });

        it('should have some nodes marked as isFuzzy', () => {
            const { nodes } = generateMockGraph(30);
            const fuzzy = nodes.filter(n => n.isFuzzy);
            expect(fuzzy.length).toBeGreaterThan(0);
        });

        it('should have score distribution across degrees', () => {
            const { nodes } = generateMockGraph(40);

            // Skip user_0
            const others = nodes.slice(1);

            const highScore = others.filter(n => n.score >= 0.8);
            const midScore = others.filter(n => n.score >= 0.4 && n.score < 0.8);
            const lowScore = others.filter(n => n.score < 0.4);

            expect(highScore.length).toBeGreaterThan(0);
            expect(midScore.length).toBeGreaterThan(0);
            expect(lowScore.length).toBeGreaterThan(0);
        });

        it('should create links from user_0 to first-degree nodes', () => {
            const { links } = generateMockGraph(20);
            const userLinks = links.filter(l => l.source === 'user_0');
            expect(userLinks.length).toBeGreaterThan(0);
        });
    });

    describe('simulateSearch', () => {
        it('should update scores based on query match', () => {
            const graph = generateMockGraph(30);
            const result = simulateSearch(graph, 'Computer Science');

            // Some nodes should have high scores if they match
            const highScores = result.nodes.filter(n => n.score >= 0.8);
            expect(highScores.length).toBeGreaterThan(0);
        });

        it('should keep user_0 at score 1.0 regardless of query', () => {
            const graph = generateMockGraph(10);
            const result = simulateSearch(graph, 'nonexistent query');

            const userNode = result.nodes.find(n => n.id === 'user_0');
            expect(userNode.score).toBe(1.0);
        });

        it('should return the same graph object (mutation)', () => {
            const graph = generateMockGraph(10);
            const result = simulateSearch(graph, 'test');

            expect(result).toBe(graph); // Same reference
        });

        it('should reset scores when query is empty', () => {
            const graph = generateMockGraph(20);

            // First search
            simulateSearch(graph, 'Google');

            // Reset with empty query
            const result = simulateSearch(graph, '');

            // Scores should be in valid ranges
            result.nodes.slice(1).forEach(node => {
                expect(node.score).toBeGreaterThanOrEqual(0);
                expect(node.score).toBeLessThanOrEqual(1);
            });
        });

        it('should update val based on score', () => {
            const graph = generateMockGraph(10);
            const result = simulateSearch(graph, 'Computer');

            result.nodes.forEach(node => {
                const expectedVal = node.score * 8 + 2;
                expect(node.val).toBeCloseTo(expectedVal, 1);
            });
        });
    });
});
