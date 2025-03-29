"use client";

import { ChartApiWithPanes } from "./ChartTypes";

/**
 * Pane reference tracker
 * Helps track created panes and their statuses
 */
export interface PaneReferenceTracker {
  [key: number]: boolean;
}

/**
 * Oscillator pane tracker
 * Maps indicator keys to their pane indices
 */
export interface OscillatorPaneTracker {
  [key: string]: number;
}

/**
 * Generate an indicator key
 * Creates a unique key for a given indicator instance
 *
 * @param type Indicator type
 * @param id Indicator ID
 * @returns A unique indicator key
 */
export function generateIndicatorKey(type: string, id: string): string {
  return `${type}-${id}`;
}

/**
 * Get the next available pane index
 *
 * @param occupiedPanes Map of panes already in use
 * @param startIndex The index to start searching from (default: 2, after main and volume)
 * @returns The next available pane index
 */
export function getNextAvailablePaneIndex(occupiedPanes: OscillatorPaneTracker, startIndex = 2): number {
  // Find all used pane indices
  const usedPanes = new Set<number>(Object.values(occupiedPanes));

  // Start from the default index (usually 2, after main chart and volume)
  let nextPaneIndex = startIndex;

  // Find the next unused pane index
  while (usedPanes.has(nextPaneIndex)) {
    nextPaneIndex++;
  }

  console.log(
    `CHART UTILS: getNextAvailablePaneIndex: returning ${nextPaneIndex}, current occupied panes:`,
    JSON.stringify(occupiedPanes),
    "used panes:",
    Array.from(usedPanes).sort().join(", ")
  );

  return nextPaneIndex;
}

/**
 * Ensure a pane exists at the given index
 *
 * @param chart The chart instance
 * @param paneIndex The desired pane index
 * @param panesRef Reference to track pane creation
 * @param heightMap Optional map of pane heights by index
 * @returns True if pane exists or was created, false otherwise
 */
export function ensurePaneExists(chart: ChartApiWithPanes, paneIndex: number, panesRef: PaneReferenceTracker, heightMap?: { [key: number]: number }): boolean {
  // If pane already exists in our tracking, we're good
  if (panesRef[paneIndex]) {
    return true;
  }

  console.log(`CHART UTILS: Ensuring pane ${paneIndex} exists`);

  try {
    // Check if we have a chart with panes support
    if (chart.panes && typeof chart.panes === "function") {
      const currentPanes = chart.panes();
      console.log(`CHART UTILS: Current panes count: ${currentPanes.length}`);

      // If the pane index is beyond current panes length
      if (paneIndex >= currentPanes.length && chart.createPane) {
        // Create new panes until we reach the desired index
        for (let i = currentPanes.length; i <= paneIndex; i++) {
          console.log(`CHART UTILS: Creating pane ${i}`);

          // Get the appropriate height for this pane
          const paneHeight = getPaneHeight(i, heightMap);

          // Create the pane
          chart.createPane({
            height: paneHeight,
          });

          // Mark as created
          panesRef[i] = true;
        }

        console.log(`CHART UTILS: Created panes up to index ${paneIndex}`);
        return true;
      } else if (paneIndex < currentPanes.length) {
        // Pane exists in the chart but not in our tracking
        panesRef[paneIndex] = true;

        // Ensure the pane has appropriate height
        updatePaneHeight(chart, paneIndex, heightMap);

        return true;
      }
    }
  } catch (error) {
    console.error("CHART UTILS: Error ensuring pane exists:", error);
  }

  return false;
}

/**
 * Get the appropriate height for a pane based on its index
 *
 * @param paneIndex The pane index
 * @param heightMap Optional map of pane heights by index
 * @returns The appropriate height for the pane
 */
export function getPaneHeight(paneIndex: number, heightMap?: { [key: number]: number }): number {
  // Use height from map if available
  if (heightMap && heightMap[paneIndex] !== undefined) {
    return heightMap[paneIndex];
  }

  // Default heights based on pane index
  switch (paneIndex) {
    case 0: // Main chart
      return 500;
    case 1: // Volume
      return 100;
    default: // Oscillators and other indicators
      return 150;
  }
}

/**
 * Update the height of an existing pane
 *
 * @param chart The chart instance
 * @param paneIndex The pane index to update
 * @param heightMap Optional map of pane heights by index
 */
export function updatePaneHeight(chart: ChartApiWithPanes, paneIndex: number, heightMap?: { [key: number]: number }): void {
  try {
    // Skip main and volume panes (0 and 1)
    if (paneIndex <= 1) {
      return;
    }

    // Check if we have a chart with panes support
    if (chart.panes && typeof chart.panes === "function") {
      const panes = chart.panes();

      // If pane exists
      if (paneIndex < panes.length) {
        const pane = panes[paneIndex];

        // Update height if it's too small
        if (pane && typeof pane.setHeight === "function") {
          const height = getPaneHeight(paneIndex, heightMap);
          pane.setHeight(height);
          console.log(`CHART UTILS: Updated height for pane ${paneIndex} to ${height}`);
        }
      }
    }
  } catch (error) {
    console.error(`CHART UTILS: Error updating pane height for pane ${paneIndex}:`, error);
  }
}

/**
 * Clean up unused panes
 *
 * @param chart The chart instance
 * @param activePaneIndices Set of pane indices that are still in use
 * @param panesRef Reference to track pane creation
 */
export function cleanUpUnusedPanes(chart: ChartApiWithPanes, activePaneIndices: Set<number>, panesRef: PaneReferenceTracker): void {
  try {
    // Check if we have a chart with panes support
    if (chart.panes && typeof chart.panes === "function") {
      const panes = chart.panes();

      // Find panes that should be removed (not in active indices and index > 1)
      for (let i = panes.length - 1; i > 1; i--) {
        // If this pane is not in active indices, it can be removed
        if (!activePaneIndices.has(i)) {
          // Double-check that it's actually empty
          const pane = panes[i];
          if (pane && typeof pane.getSeries === "function") {
            const series = pane.getSeries();

            // Only remove if truly empty
            if (series.length === 0 && chart.removePane) {
              console.log(`CHART UTILS: Removing empty pane at index ${i}`);
              chart.removePane(i);
              delete panesRef[i];
            } else if (series.length > 0) {
              console.log(`CHART UTILS: Can't remove pane ${i} because it still has ${series.length} series`);
            }
          }
        }
      }

      // Update our tracking to match reality
      for (const paneIndex of Object.keys(panesRef).map(Number)) {
        // Skip main and volume panes (0 and 1)
        if (paneIndex > 1 && !activePaneIndices.has(paneIndex)) {
          // This pane isn't used by any active indicator, remove from tracking
          delete panesRef[paneIndex];
          console.log(`CHART UTILS: Removed pane ${paneIndex} from tracking`);
        }
      }
    }
  } catch (error) {
    console.error("CHART UTILS: Error during pane cleanup:", error);
  }
}

/**
 * Check if a pane is empty
 *
 * @param chart The chart instance
 * @param paneIndex The pane index to check
 * @returns True if pane is empty, false otherwise
 */
export function isPaneEmpty(chart: ChartApiWithPanes, paneIndex: number): boolean {
  try {
    if (chart.panes && typeof chart.panes === "function") {
      const panes = chart.panes();

      if (paneIndex < panes.length) {
        const pane = panes[paneIndex];

        if (pane && typeof pane.getSeries === "function") {
          const series = pane.getSeries();
          return series.length === 0;
        }
      }
    }
  } catch (error) {
    console.error(`CHART UTILS: Error checking if pane ${paneIndex} is empty:`, error);
  }

  return false;
}
