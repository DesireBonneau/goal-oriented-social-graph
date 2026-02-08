import { describe, it, expect } from 'vitest';
import {
    graphConfig,
    getNodeColor,
    shouldShowLabel,
    shouldShowAura,
    randomInRange
} from './graphConfig';

describe('graphConfig', () => {
    describe('config structure', () => {
        it('should have all required color keys', () => {
            expect(graphConfig.colors).toHaveProperty('self');
            expect(graphConfig.colors).toHaveProperty('connected');
            expect(graphConfig.colors).toHaveProperty('highScore');
            expect(graphConfig.colors).toHaveProperty('default');
            expect(graphConfig.colors).toHaveProperty('aura');
        });

        it('should have all required threshold keys', () => {
            expect(graphConfig.thresholds).toHaveProperty('highScore');
            expect(graphConfig.thresholds).toHaveProperty('showLabel');
            expect(graphConfig.thresholds).toHaveProperty('showAura');
        });

        it('should have all required camera settings', () => {
            expect(graphConfig.camera).toHaveProperty('initialZoom3D');
            expect(graphConfig.camera).toHaveProperty('initialZoom2D');
            expect(graphConfig.camera).toHaveProperty('focusDistance');
            expect(graphConfig.camera).toHaveProperty('animationDuration');
        });

        it('should have valid threshold values between 0 and 1', () => {
            expect(graphConfig.thresholds.highScore).toBeGreaterThan(0);
            expect(graphConfig.thresholds.highScore).toBeLessThanOrEqual(1);
            expect(graphConfig.thresholds.showLabel).toBeGreaterThan(0);
            expect(graphConfig.thresholds.showLabel).toBeLessThanOrEqual(1);
        });
    });

    describe('getNodeColor', () => {
        it('should return self color for user node', () => {
            const node = { id: 'user_0', score: 0.5, isConnected: false };
            expect(getNodeColor(node)).toBe(graphConfig.colors.self);
        });

        it('should return connected color for connected nodes', () => {
            const node = { id: 'user_1', score: 0.5, isConnected: true };
            expect(getNodeColor(node)).toBe(graphConfig.colors.connected);
        });

        it('should return highScore color for high-scoring nodes', () => {
            const node = { id: 'user_2', score: 0.9, isConnected: false };
            expect(getNodeColor(node)).toBe(graphConfig.colors.highScore);
        });

        it('should return default color for low-scoring nodes', () => {
            const node = { id: 'user_3', score: 0.3, isConnected: false };
            expect(getNodeColor(node)).toBe(graphConfig.colors.default);
        });

        it('should prioritize self over connected', () => {
            const node = { id: 'user_0', score: 0.9, isConnected: true };
            expect(getNodeColor(node)).toBe(graphConfig.colors.self);
        });

        it('should prioritize connected over highScore', () => {
            const node = { id: 'user_1', score: 0.9, isConnected: true };
            expect(getNodeColor(node)).toBe(graphConfig.colors.connected);
        });
    });

    describe('shouldShowLabel', () => {
        it('should always show label for user node', () => {
            const node = { id: 'user_0', score: 0.1 };
            expect(shouldShowLabel(node)).toBe(true);
        });

        it('should show label for high-scoring nodes', () => {
            const node = { id: 'user_1', score: 0.9 };
            expect(shouldShowLabel(node)).toBe(true);
        });

        it('should show label when zoomed in (globalScale > 2)', () => {
            const node = { id: 'user_1', score: 0.1 };
            expect(shouldShowLabel(node, 3)).toBe(true);
        });

        it('should not show label for low-scoring nodes when not zoomed', () => {
            const node = { id: 'user_1', score: 0.3 };
            expect(shouldShowLabel(node, 1)).toBe(false);
        });
    });

    describe('shouldShowAura', () => {
        it('should show aura for nodes above threshold', () => {
            const node = { score: 0.8 };
            expect(shouldShowAura(node)).toBe(true);
        });

        it('should not show aura for nodes below threshold', () => {
            const node = { score: 0.3 };
            expect(shouldShowAura(node)).toBe(false);
        });
    });

    describe('randomInRange', () => {
        it('should return values within specified range', () => {
            const range = [0.5, 0.8];
            for (let i = 0; i < 100; i++) {
                const value = randomInRange(range);
                expect(value).toBeGreaterThanOrEqual(range[0]);
                expect(value).toBeLessThanOrEqual(range[1]);
            }
        });
    });
});
