import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_URL) {
  throw new Error("Missing SUPABASE_URL environment variable");
}

if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_KEY environment variable");
}

export const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
  db: {
    schema: "public",
  },
});

// Storage bucket configuration
export const STORAGE_BUCKETS = {
  CHARTS: "chart-images",
} as const;

// Initialize storage buckets
export async function initializeStorageBuckets() {
  try {
    // Create charts bucket if it doesn't exist
    const { data: chartsBucket, error: chartsError } = await supabase.storage.createBucket(STORAGE_BUCKETS.CHARTS, {
      public: false,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ["image/png", "image/jpeg"],
    });

    if (chartsError && chartsError.message !== "Bucket already exists") {
      throw chartsError;
    }

    // Update bucket policy to allow public read
    await supabase.storage.updateBucket(STORAGE_BUCKETS.CHARTS, {
      public: true,
    });

    console.log("Storage buckets initialized successfully");
  } catch (error) {
    console.error("Error initializing storage buckets:", error);
    throw error;
  }
}
