import * as fc from 'fast-check'

/**
 * Common arbitraries for property-based testing
 */

// Valid bar diameters in mm
export const validDiameters = [6, 8, 10, 12, 16, 20, 25, 32] as const
export type ValidDiameter = typeof validDiameters[number]

export const arbValidDiameter = fc.constantFrom(...validDiameters)

// Positive dimension in mm (1-10000mm range)
export const arbPositiveDimension = fc.integer({ min: 1, max: 10000 })

// Positive quantity (1-1000)
export const arbPositiveQuantity = fc.integer({ min: 1, max: 1000 })

// Non-negative spacing (0-500mm)
export const arbSpacing = fc.integer({ min: 0, max: 500 })

// Shape codes
export const shapeCodesArray = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'] as const
export type ShapeCode = typeof shapeCodesArray[number]

export const arbShapeCode = fc.constantFrom(...shapeCodesArray)

// Member types
export const memberTypesArray = ['BEAM', 'COLUMN', 'SLAB'] as const
export type MemberType = typeof memberTypesArray[number]

export const arbMemberType = fc.constantFrom(...memberTypesArray)

// Code standards
export const codeStandardsArray = ['IS', 'BS', 'CUSTOM'] as const
export type CodeStandard = typeof codeStandardsArray[number]

export const arbCodeStandard = fc.constantFrom(...codeStandardsArray)

// Bend deduction multipliers (positive numbers)
export const arbBendMultiplier = fc.float({ min: 0.5, max: 5, noNaN: true })

// Hook multiplier (typically 6-12)
export const arbHookMultiplier = fc.float({ min: 6, max: 12, noNaN: true })

// Cover in mm (15-75mm typical range)
export const arbCover = fc.integer({ min: 15, max: 75 })

/**
 * Helper to run property tests with minimum iterations
 */
export const MIN_PROPERTY_ITERATIONS = 100

export function runProperty<T>(
  _name: string,
  arb: fc.Arbitrary<T>,
  predicate: (value: T) => boolean | void
) {
  return fc.assert(fc.property(arb, predicate), {
    numRuns: MIN_PROPERTY_ITERATIONS,
    verbose: true,
  })
}
