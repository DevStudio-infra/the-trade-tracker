"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/api";

export function TestApi() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testApiConnection = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Testing API connection...");
      console.log("Base URL:", api.defaults.baseURL);
      const response = await api.get("/test");
      console.log("API Response:", response.data);
      setResult(JSON.stringify(response.data, null, 2));
    } catch (err) {
      console.error("API Test Error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-4">
        <Button onClick={testApiConnection} disabled={loading} className="bg-blue-500 hover:bg-blue-600 text-white">
          {loading ? "Testing..." : "Test API Connection"}
        </Button>
        {error && <div className="text-red-500">Error: {error}</div>}
      </div>
      {result && <pre className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-auto">{result}</pre>}
    </div>
  );
}
