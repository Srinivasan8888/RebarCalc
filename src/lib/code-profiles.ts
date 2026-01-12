import type { CodeProfile } from '../types';

// Predefined code profiles
export const CODE_PROFILES: Record<string, CodeProfile> = {
  IS456: {
    id: 'IS456',
    name: 'IS 456:2000',
    description: 'Indian Standard Code of Practice for Plain and Reinforced Concrete',
    standard: 'IS 456:2000',
    isEditable: false,
    defaultCover: 25,
    defaultHookMultiplier: 9,  // As per IS 456 clause 26.2.2.1
    bendDeductions: {
      deg45: 1,   // 1 × diameter
      deg90: 2,   // 2 × diameter  
      deg135: 3,  // 3 × diameter
    },
    memberDefaults: {
      BEAM: {
        defaultCover: 25,
        defaultSpacing: 150,
        commonDiameters: [8, 10, 12, 16, 20, 25]
      },
      COLUMN: {
        defaultCover: 40,
        defaultSpacing: 150,
        commonDiameters: [12, 16, 20, 25, 32]
      },
      SLAB: {
        defaultCover: 20,
        defaultSpacing: 150,
        commonDiameters: [8, 10, 12, 16]
      }
    },
    minimumCover: {
      BEAM: 25,
      COLUMN: 40,
      SLAB: 20
    },
    maximumSpacing: {
      BEAM: 300,
      COLUMN: 300,
      SLAB: 300
    },
    developmentLengthFactors: {
      straight: 1.0,
      hooked: 0.7,
      compression: 0.8
    }
  },
  
  BS8110: {
    id: 'BS8110',
    name: 'BS 8110',
    description: 'British Standard Code of Practice for Structural Concrete',
    standard: 'BS 8110',
    isEditable: false,
    defaultCover: 25,
    defaultHookMultiplier: 8,  // BS standard hook length
    bendDeductions: {
      deg45: 0.5,
      deg90: 1.5,
      deg135: 2.5,
    },
    memberDefaults: {
      BEAM: {
        defaultCover: 25,
        defaultSpacing: 200,
        commonDiameters: [8, 10, 12, 16, 20, 25]
      },
      COLUMN: {
        defaultCover: 35,
        defaultSpacing: 200,
        commonDiameters: [12, 16, 20, 25, 32]
      },
      SLAB: {
        defaultCover: 20,
        defaultSpacing: 200,
        commonDiameters: [8, 10, 12, 16]
      }
    },
    minimumCover: {
      BEAM: 25,
      COLUMN: 35,
      SLAB: 20
    },
    maximumSpacing: {
      BEAM: 250,
      COLUMN: 250,
      SLAB: 250
    },
    developmentLengthFactors: {
      straight: 1.0,
      hooked: 0.75,
      compression: 0.85
    }
  },
  
  CUSTOM: {
    id: 'CUSTOM',
    name: 'Custom',
    description: 'User-defined parameters',
    standard: 'Custom',
    isEditable: true,
    defaultCover: 25,
    defaultHookMultiplier: 9,
    bendDeductions: {
      deg45: 1,
      deg90: 2,
      deg135: 3,
    },
    memberDefaults: {
      BEAM: {
        defaultCover: 25,
        defaultSpacing: 150,
        commonDiameters: [8, 10, 12, 16, 20, 25]
      },
      COLUMN: {
        defaultCover: 40,
        defaultSpacing: 150,
        commonDiameters: [12, 16, 20, 25, 32]
      },
      SLAB: {
        defaultCover: 20,
        defaultSpacing: 150,
        commonDiameters: [8, 10, 12, 16]
      }
    },
    minimumCover: {
      BEAM: 20,
      COLUMN: 30,
      SLAB: 15
    },
    maximumSpacing: {
      BEAM: 400,
      COLUMN: 400,
      SLAB: 400
    },
    developmentLengthFactors: {
      straight: 1.0,
      hooked: 0.7,
      compression: 0.8
    }
  }
};

// Helper function to get all available profile IDs
export const getAvailableProfileIds = (): string[] => {
  return Object.keys(CODE_PROFILES);
};

// Helper function to get profile by ID
export const getProfileById = (id: string): CodeProfile | null => {
  return CODE_PROFILES[id] || null;
};