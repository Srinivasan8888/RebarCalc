import type { ProjectConfig, BarEntry } from '../types';
import { serializeProject, deserializeProject, validateSerializedProject } from './json-serializer';

// Storage key prefix for projects
const PROJECT_KEY_PREFIX = 'bbs_project_';
const PROJECT_LIST_KEY = 'bbs_project_list';

// Result types for storage operations
export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ProjectListItem {
  id: string;
  name: string;
  lastModified: string;
}

/**
 * Checks if localStorage is available and accessible
 */
function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Saves a project (config + bars) to local storage
 */
export function saveToLocalStorage(config: ProjectConfig, bars: BarEntry[]): StorageResult<void> {
  if (!isLocalStorageAvailable()) {
    return {
      success: false,
      error: 'Local storage is not available. Your data cannot be saved.'
    };
  }

  try {
    const serialized = serializeProject(config, bars);
    const key = PROJECT_KEY_PREFIX + config.id;
    
    // Save the project data
    localStorage.setItem(key, JSON.stringify(serialized));
    
    // Update the project list
    updateProjectList(config.id, config.name, serialized.lastModified);
    
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Check if it's a quota exceeded error
    if (errorMessage.includes('QuotaExceededError') || errorMessage.includes('quota')) {
      return {
        success: false,
        error: 'Storage quota exceeded. Please export and delete old projects to free up space.'
      };
    }
    
    return {
      success: false,
      error: `Failed to save project: ${errorMessage}`
    };
  }
}

/**
 * Loads a project from local storage
 */
export function loadFromLocalStorage(projectId: string): StorageResult<{ config: ProjectConfig; bars: BarEntry[] }> {
  if (!isLocalStorageAvailable()) {
    return {
      success: false,
      error: 'Local storage is not available.'
    };
  }

  try {
    const key = PROJECT_KEY_PREFIX + projectId;
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      return {
        success: false,
        error: 'Project not found in local storage.'
      };
    }

    const parsed = JSON.parse(stored);
    
    if (!validateSerializedProject(parsed)) {
      return {
        success: false,
        error: 'Invalid project data format. The stored data may be corrupted.'
      };
    }

    const { config, bars } = deserializeProject(parsed);
    
    return {
      success: true,
      data: { config, bars }
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: `Failed to load project: ${errorMessage}`
    };
  }
}

/**
 * Gets the list of all saved projects
 */
export function getProjectList(): StorageResult<ProjectListItem[]> {
  if (!isLocalStorageAvailable()) {
    return {
      success: false,
      error: 'Local storage is not available.'
    };
  }

  try {
    const stored = localStorage.getItem(PROJECT_LIST_KEY);
    
    if (!stored) {
      return {
        success: true,
        data: []
      };
    }

    const parsed = JSON.parse(stored);
    
    if (!Array.isArray(parsed)) {
      // Reset corrupted project list
      localStorage.removeItem(PROJECT_LIST_KEY);
      return {
        success: true,
        data: []
      };
    }

    return {
      success: true,
      data: parsed
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: `Failed to load project list: ${errorMessage}`
    };
  }
}

/**
 * Deletes a project from local storage
 */
export function deleteFromLocalStorage(projectId: string): StorageResult<void> {
  if (!isLocalStorageAvailable()) {
    return {
      success: false,
      error: 'Local storage is not available.'
    };
  }

  try {
    const key = PROJECT_KEY_PREFIX + projectId;
    localStorage.removeItem(key);
    
    // Remove from project list
    removeFromProjectList(projectId);
    
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: `Failed to delete project: ${errorMessage}`
    };
  }
}

/**
 * Exports project data as JSON string for backup
 */
export function exportProjectAsJSON(config: ProjectConfig, bars: BarEntry[]): StorageResult<string> {
  try {
    const serialized = serializeProject(config, bars);
    const jsonString = JSON.stringify(serialized, null, 2);
    
    return {
      success: true,
      data: jsonString
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: `Failed to export project: ${errorMessage}`
    };
  }
}

/**
 * Imports project data from JSON string
 */
export function importProjectFromJSON(jsonString: string): StorageResult<{ config: ProjectConfig; bars: BarEntry[] }> {
  try {
    const parsed = JSON.parse(jsonString);
    
    if (!validateSerializedProject(parsed)) {
      return {
        success: false,
        error: 'Invalid project data format. Please check the JSON file.'
      };
    }

    const { config, bars } = deserializeProject(parsed);
    
    return {
      success: true,
      data: { config, bars }
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: `Failed to import project: ${errorMessage}`
    };
  }
}

/**
 * Updates the project list with a new or modified project
 */
function updateProjectList(id: string, name: string, lastModified: string): void {
  const listResult = getProjectList();
  const currentList = listResult.success ? listResult.data! : [];
  
  // Remove existing entry if it exists
  const filteredList = currentList.filter(item => item.id !== id);
  
  // Add the updated entry
  const updatedList = [...filteredList, { id, name, lastModified }];
  
  // Sort by last modified (most recent first)
  updatedList.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
  
  localStorage.setItem(PROJECT_LIST_KEY, JSON.stringify(updatedList));
}

/**
 * Removes a project from the project list
 */
function removeFromProjectList(id: string): void {
  const listResult = getProjectList();
  if (!listResult.success) return;
  
  const currentList = listResult.data!;
  const filteredList = currentList.filter(item => item.id !== id);
  
  localStorage.setItem(PROJECT_LIST_KEY, JSON.stringify(filteredList));
}

/**
 * Clears all project data from local storage (for cleanup/reset)
 */
export function clearAllProjects(): StorageResult<void> {
  if (!isLocalStorageAvailable()) {
    return {
      success: false,
      error: 'Local storage is not available.'
    };
  }

  try {
    // Get all project keys
    const keys = Object.keys(localStorage).filter(key => key.startsWith(PROJECT_KEY_PREFIX));
    
    // Remove all project data
    keys.forEach(key => localStorage.removeItem(key));
    
    // Clear project list
    localStorage.removeItem(PROJECT_LIST_KEY);
    
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: `Failed to clear projects: ${errorMessage}`
    };
  }
}