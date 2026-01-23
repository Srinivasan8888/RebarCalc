/**
 * Property-based tests for Code Profile System
 * Feature: rebarcalc-enhancements, Property 17: Code Profile Parameter Application
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { codeProfileService } from '../services/code-profile-service';
import { CODE_PROFILES } from '../lib/code-profiles';
import type { ProjectConfig, CodeProfile } from '../types';
import {
  arbValidDiameter,
  arbBendMultiplier,
  arbHookMultiplier,
  arbCover,
  arbCodeStandard,
  MIN_PROPERTY_ITERATIONS,
} from './helpers';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Generate a valid ProjectConfig for testing
 */
const arbProjectConfig: fc.Arbitrary<ProjectConfig> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  codeStandard: arbCodeStandard,
  defaultCover: arbCover,
  defaultHookMultiplier: arbHookMultiplier,
  bendDeductions: fc.record({
    deg45: arbBendMultiplier,
    deg90: arbBendMultiplier,
    deg135: arbBendMultiplier,
  }),
  calculationMode: fc.constant('COMPONENT' as const),
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

/**
 * Generate a valid CodeProfile for testing
 */
const arbCodeProfile: fc.Arbitrary<CodeProfile> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  description: fc.string({ minLength: 1, maxLength: 200 }),
  standard: fc.string({ minLength: 1, maxLength: 50 }),
  isEditable: fc.boolean(),
  defaultCover: fc.integer({ min: 15, max: 75 }),
  defaultHookMultiplier: fc.integer({ min: 6, max: 12 }),
  bendDeductions: fc.record({
    deg45: fc.float({ min: Math.fround(0.5), max: Math.fround(3), noNaN: true }),
    deg90: fc.float({ min: Math.fround(1), max: Math.fround(4), noNaN: true }),
    deg135: fc.float({ min: Math.fround(2), max: Math.fround(5), noNaN: true }),
  }),
  memberDefaults: fc.record({
    BEAM: fc.record({
      defaultCover: fc.integer({ min: 20, max: 50 }),
      defaultSpacing: fc.integer({ min: 100, max: 300 }),
      commonDiameters: fc.array(arbValidDiameter, { minLength: 1, maxLength: 6 }),
    }),
    COLUMN: fc.record({
      defaultCover: fc.integer({ min: 30, max: 60 }),
      defaultSpacing: fc.integer({ min: 100, max: 300 }),
      commonDiameters: fc.array(arbValidDiameter, { minLength: 1, maxLength: 6 }),
    }),
    SLAB: fc.record({
      defaultCover: fc.integer({ min: 15, max: 40 }),
      defaultSpacing: fc.integer({ min: 100, max: 300 }),
      commonDiameters: fc.array(arbValidDiameter, { minLength: 1, maxLength: 6 }),
    }),
  }),
  minimumCover: fc.record({
    BEAM: fc.integer({ min: 15, max: 40 }),
    COLUMN: fc.integer({ min: 25, max: 50 }),
    SLAB: fc.integer({ min: 10, max: 30 }),
  }),
  maximumSpacing: fc.record({
    BEAM: fc.integer({ min: 200, max: 400 }),
    COLUMN: fc.integer({ min: 200, max: 400 }),
    SLAB: fc.integer({ min: 200, max: 400 }),
  }),
  developmentLengthFactors: fc.option(fc.record({
    straight: fc.float({ min: Math.fround(0.5), max: Math.fround(2.0), noNaN: true }),
    hooked: fc.float({ min: Math.fround(0.3), max: Math.fround(1.5), noNaN: true }),
    compression: fc.float({ min: Math.fround(0.5), max: Math.fround(1.5), noNaN: true }),
  }), { nil: undefined }),
});

/**
 * Generate a profile ID from available profiles
 */
const arbProfileId = fc.constantFrom(...Object.keys(CODE_PROFILES));

// ============================================================================
// PROPERTY 17: CODE PROFILE PARAMETER APPLICATION
// ============================================================================

describe('Property 17: Code Profile Parameter Application', () => {
  /**
   * **Feature: rebarcalc-enhancements, Property 17: Code Profile Parameter Application**
   * **Validates: Requirements 2.4, 2.5**
   * 
   * For any code profile selection, switching profiles should recalculate all existing bars 
   * with the new parameters, and the results should differ when parameters differ materially
   */
  it('applying different profiles with different parameters produces different results', () => {
    fc.assert(
      fc.property(
        arbProjectConfig,
        arbProfileId,
        arbProfileId,
        (originalConfig, profileId1, profileId2) => {
          // Skip if profiles are the same
          fc.pre(profileId1 !== profileId2);
          
          const profile1 = codeProfileService.getProfile(profileId1);
          const profile2 = codeProfileService.getProfile(profileId2);
          
          // Both profiles should exist
          expect(profile1).not.toBeNull();
          expect(profile2).not.toBeNull();
          
          if (!profile1 || !profile2) return;
          
          // Apply each profile to the same original config
          const config1 = codeProfileService.applyProfile(originalConfig, profile1);
          const config2 = codeProfileService.applyProfile(originalConfig, profile2);
          
          // If the profiles have materially different parameters, the configs should differ
          const hasDifferentCover = profile1.defaultCover !== profile2.defaultCover;
          const hasDifferentHook = profile1.defaultHookMultiplier !== profile2.defaultHookMultiplier;
          const hasDifferentBends = (
            profile1.bendDeductions.deg45 !== profile2.bendDeductions.deg45 ||
            profile1.bendDeductions.deg90 !== profile2.bendDeductions.deg90 ||
            profile1.bendDeductions.deg135 !== profile2.bendDeductions.deg135
          );
          
          if (hasDifferentCover || hasDifferentHook || hasDifferentBends) {
            // At least one parameter should be different
            const configsDiffer = (
              config1.defaultCover !== config2.defaultCover ||
              config1.defaultHookMultiplier !== config2.defaultHookMultiplier ||
              config1.bendDeductions.deg45 !== config2.bendDeductions.deg45 ||
              config1.bendDeductions.deg90 !== config2.bendDeductions.deg90 ||
              config1.bendDeductions.deg135 !== config2.bendDeductions.deg135
            );
            
            expect(configsDiffer).toBe(true);
          }
        }
      ),
      { numRuns: MIN_PROPERTY_ITERATIONS }
    );
  });

  it('applying a profile preserves the profile parameters in the project config', () => {
    fc.assert(
      fc.property(
        arbProjectConfig,
        arbProfileId,
        (originalConfig, profileId) => {
          const profile = codeProfileService.getProfile(profileId);
          expect(profile).not.toBeNull();
          
          if (!profile) return;
          
          const updatedConfig = codeProfileService.applyProfile(originalConfig, profile);
          
          // Profile parameters should be applied to config
          expect(updatedConfig.defaultCover).toBe(profile.defaultCover);
          expect(updatedConfig.defaultHookMultiplier).toBe(profile.defaultHookMultiplier);
          expect(updatedConfig.bendDeductions.deg45).toBe(profile.bendDeductions.deg45);
          expect(updatedConfig.bendDeductions.deg90).toBe(profile.bendDeductions.deg90);
          expect(updatedConfig.bendDeductions.deg135).toBe(profile.bendDeductions.deg135);
          
          // Other config properties should be preserved
          expect(updatedConfig.id).toBe(originalConfig.id);
          expect(updatedConfig.name).toBe(originalConfig.name);
          expect(updatedConfig.createdAt).toBe(originalConfig.createdAt);
          
          // updatedAt should be a valid Date
          expect(updatedConfig.updatedAt).toBeInstanceOf(Date);
        }
      ),
      { numRuns: MIN_PROPERTY_ITERATIONS }
    );
  });

  it('applying the same profile twice produces identical results', () => {
    fc.assert(
      fc.property(
        arbProjectConfig,
        arbProfileId,
        (originalConfig, profileId) => {
          const profile = codeProfileService.getProfile(profileId);
          expect(profile).not.toBeNull();
          
          if (!profile) return;
          
          const config1 = codeProfileService.applyProfile(originalConfig, profile);
          const config2 = codeProfileService.applyProfile(originalConfig, profile);
          
          // Both applications should produce the same parameter values
          expect(config1.defaultCover).toBe(config2.defaultCover);
          expect(config1.defaultHookMultiplier).toBe(config2.defaultHookMultiplier);
          expect(config1.bendDeductions.deg45).toBe(config2.bendDeductions.deg45);
          expect(config1.bendDeductions.deg90).toBe(config2.bendDeductions.deg90);
          expect(config1.bendDeductions.deg135).toBe(config2.bendDeductions.deg135);
          expect(config1.codeStandard).toBe(config2.codeStandard);
        }
      ),
      { numRuns: MIN_PROPERTY_ITERATIONS }
    );
  });

  it('profile validation correctly identifies valid profiles', () => {
    fc.assert(
      fc.property(
        arbProfileId,
        (profileId) => {
          const profile = codeProfileService.getProfile(profileId);
          expect(profile).not.toBeNull();
          
          if (!profile) return;
          
          const validation = codeProfileService.validateProfile(profile);
          
          // All predefined profiles should be valid
          expect(validation.valid).toBe(true);
          expect(validation.errors).toHaveLength(0);
        }
      ),
      { numRuns: MIN_PROPERTY_ITERATIONS }
    );
  });

  it('profile validation correctly identifies invalid profiles', () => {
    fc.assert(
      fc.property(
        arbCodeProfile,
        (profile) => {
          // Create an intentionally invalid profile by setting extreme values
          const invalidProfile: CodeProfile = {
            ...profile,
            defaultCover: -10, // Invalid: negative cover
            defaultHookMultiplier: 100, // Invalid: too large
            bendDeductions: {
              deg45: -1, // Invalid: negative deduction
              deg90: 10, // Invalid: too large
              deg135: 15, // Invalid: too large
            }
          };
          
          const validation = codeProfileService.validateProfile(invalidProfile);
          
          // Should be invalid with multiple errors
          expect(validation.valid).toBe(false);
          expect(validation.errors.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: MIN_PROPERTY_ITERATIONS }
    );
  });
});

// ============================================================================
// UNIT TESTS - KNOWN VALUES
// ============================================================================

describe('Code Profile Service - Unit Tests', () => {
  it('getAvailableProfiles returns all predefined profiles', () => {
    const profiles = codeProfileService.getAvailableProfiles();
    
    expect(profiles).toHaveLength(3);
    expect(profiles.map(p => p.id)).toContain('IS456');
    expect(profiles.map(p => p.id)).toContain('BS8110');
    expect(profiles.map(p => p.id)).toContain('CUSTOM');
  });

  it('getProfile returns correct profile for valid ID', () => {
    const is456Profile = codeProfileService.getProfile('IS456');
    
    expect(is456Profile).not.toBeNull();
    expect(is456Profile?.name).toBe('IS 456:2000');
    expect(is456Profile?.defaultHookMultiplier).toBe(9);
    expect(is456Profile?.bendDeductions.deg90).toBe(2);
  });

  it('getProfile returns null for invalid ID', () => {
    const invalidProfile = codeProfileService.getProfile('INVALID_ID');
    expect(invalidProfile).toBeNull();
  });

  it('applyProfile correctly maps IS456 to IS code standard', () => {
    const originalConfig: ProjectConfig = {
      id: 'test',
      name: 'Test',
      codeStandard: 'CUSTOM',
      defaultCover: 20,
      defaultHookMultiplier: 8,
      bendDeductions: { deg45: 0.5, deg90: 1.5, deg135: 2.5 },
      calculationMode: 'COMPONENT', createdAt: new Date(),
      updatedAt: new Date(),
    };

    const is456Profile = codeProfileService.getProfile('IS456')!;
    const updatedConfig = codeProfileService.applyProfile(originalConfig, is456Profile);

    expect(updatedConfig.codeStandard).toBe('IS');
    expect(updatedConfig.defaultCover).toBe(25);
    expect(updatedConfig.defaultHookMultiplier).toBe(9);
    expect(updatedConfig.bendDeductions.deg90).toBe(2);
  });

  it('applyProfile correctly maps BS8110 to BS code standard', () => {
    const originalConfig: ProjectConfig = {
      id: 'test',
      name: 'Test',
      codeStandard: 'IS',
      defaultCover: 25,
      defaultHookMultiplier: 9,
      bendDeductions: { deg45: 1, deg90: 2, deg135: 3 },
      calculationMode: 'COMPONENT', createdAt: new Date(),
      updatedAt: new Date(),
    };

    const bs8110Profile = codeProfileService.getProfile('BS8110')!;
    const updatedConfig = codeProfileService.applyProfile(originalConfig, bs8110Profile);

    expect(updatedConfig.codeStandard).toBe('BS');
    expect(updatedConfig.defaultCover).toBe(25);
    expect(updatedConfig.defaultHookMultiplier).toBe(8);
    expect(updatedConfig.bendDeductions.deg90).toBe(1.5);
  });

  it('createCustomProfile creates valid custom profile', () => {
    const baseProfile = codeProfileService.getProfile('IS456')!;
    const overrides = {
      name: 'My Custom Profile',
      defaultCover: 30,
      defaultHookMultiplier: 10,
    };

    const customProfile = codeProfileService.createCustomProfile(baseProfile, overrides);

    expect(customProfile.name).toBe('My Custom Profile');
    expect(customProfile.defaultCover).toBe(30);
    expect(customProfile.defaultHookMultiplier).toBe(10);
    expect(customProfile.isEditable).toBe(true);
    expect(customProfile.standard).toBe('Custom');
    
    // Other properties should be inherited from base
    expect(customProfile.bendDeductions.deg90).toBe(baseProfile.bendDeductions.deg90);
    expect(customProfile.minimumCover.BEAM).toBe(baseProfile.minimumCover.BEAM);
  });
});
