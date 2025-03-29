/**
 * Utility functions for pane management
 */

export function getNextAvailablePaneIndex(existingPanes: Record<number, boolean>): number {
  let paneIndex = 2; // Start from 2 (0 is main chart, 1 is volume)

  while (existingPanes[paneIndex]) {
    paneIndex++;
  }

  return paneIndex;
}
