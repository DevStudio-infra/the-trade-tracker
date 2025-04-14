/**
 * Auth utilities for the application
 */

import { API_URL } from "./constants";

/**
 * Get the current user ID from localStorage or other sources
 * This is a temporary solution until proper authentication is implemented
 */
export async function getCurrentUserId(): Promise<string> {
  // In a real application, this would come from your auth system
  // For now, we'll use localStorage as a temporary solution
  const storedUserId = localStorage.getItem("userId");

  if (storedUserId) {
    return storedUserId;
  }

  try {
    // Try to fetch the user profile from the server
    const response = await fetch(`${API_URL}/user/profile`, {
      headers: {
        "dev-auth": "true",
      },
    });

    if (response.ok) {
      const userProfile = await response.json();
      // Store the real user ID in localStorage
      localStorage.setItem("userId", userProfile.id);
      return userProfile.id;
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
  }

  // If we can't get a real user ID, generate a random one
  const randomUserId = `user-${Math.random().toString(36).substring(2, 10)}`;
  localStorage.setItem("userId", randomUserId);

  return randomUserId;
}

/**
 * Set the current user ID in localStorage
 */
export function setCurrentUserId(userId: string): void {
  localStorage.setItem("userId", userId);
}
