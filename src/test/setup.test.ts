import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { arbValidDiameter, MIN_PROPERTY_ITERATIONS } from './helpers'
import { MEMBER_DEFAULTS } from '../lib/constants'

describe('Test Setup', () => {
  it('should run basic tests', () => {
    expect(1 + 1).toBe(2)
  })

  it('should support fast-check property testing', () => {
    fc.assert(
      fc.property(arbValidDiameter, (diameter) => {
        return diameter > 0 && diameter <= 32
      }),
      { numRuns: MIN_PROPERTY_ITERATIONS }
    )
  })

  it('should have MEMBER_DEFAULTS properly defined', () => {
    // Verify MEMBER_DEFAULTS has all required member types
    expect(MEMBER_DEFAULTS).toHaveProperty('BEAM')
    expect(MEMBER_DEFAULTS).toHaveProperty('COLUMN')
    expect(MEMBER_DEFAULTS).toHaveProperty('SLAB')

    // Verify each member type has required properties
    const memberTypes = ['BEAM', 'COLUMN', 'SLAB'] as const
    memberTypes.forEach(memberType => {
      expect(MEMBER_DEFAULTS[memberType]).toHaveProperty('defaultCover')
      expect(MEMBER_DEFAULTS[memberType]).toHaveProperty('defaultSpacing')
      expect(MEMBER_DEFAULTS[memberType]).toHaveProperty('commonDiameters')
      
      // Verify values are positive numbers
      expect(MEMBER_DEFAULTS[memberType].defaultCover).toBeGreaterThan(0)
      expect(MEMBER_DEFAULTS[memberType].defaultSpacing).toBeGreaterThan(0)
      expect(Array.isArray(MEMBER_DEFAULTS[memberType].commonDiameters)).toBe(true)
      expect(MEMBER_DEFAULTS[memberType].commonDiameters.length).toBeGreaterThan(0)
    })

    // Verify specific values match design requirements
    expect(MEMBER_DEFAULTS.BEAM.defaultCover).toBe(25)
    expect(MEMBER_DEFAULTS.COLUMN.defaultCover).toBe(40)
    expect(MEMBER_DEFAULTS.SLAB.defaultCover).toBe(20)
    
    expect(MEMBER_DEFAULTS.BEAM.defaultSpacing).toBe(150)
    expect(MEMBER_DEFAULTS.COLUMN.defaultSpacing).toBe(150)
    expect(MEMBER_DEFAULTS.SLAB.defaultSpacing).toBe(150)
  })
})
