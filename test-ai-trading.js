// Simple test script to test the AI Trading functionality

const axios = require("axios");
const API_URL = "http://localhost:3001"; // Update with your actual server URL

async function testAITradingEndpoints() {
  try {
    console.log("Testing AI Trading endpoints...");

    // Step 1: Test analyzing a chart (this assumes you have a mock auth token)
    const authToken = "test-token"; // Replace with your test token

    console.log("\n1. Testing chart analysis endpoint...");
    const analysisResponse = await axios.post(
      `${API_URL}/api/ai/analyze`,
      {
        pair: "EURUSD",
        timeframe: "1h",
        credentialId: "test-credential-id",
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    console.log("Analysis response status:", analysisResponse.status);
    console.log("Analysis data:", JSON.stringify(analysisResponse.data, null, 2));

    if (analysisResponse.data && analysisResponse.data.id) {
      const signalId = analysisResponse.data.id;

      // Step 2: Test signal confirmation
      console.log("\n2. Testing signal confirmation endpoint...");
      const confirmationResponse = await axios.post(
        `${API_URL}/api/ai/confirm-signal`,
        {
          signalId,
          higherTimeframe: "4h",
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      console.log("Confirmation response status:", confirmationResponse.status);
      console.log("Confirmation data:", JSON.stringify(confirmationResponse.data, null, 2));
    }

    // Step 3: Test getting signals
    console.log("\n3. Testing getting signals endpoint...");
    const signalsResponse = await axios.get(`${API_URL}/api/ai/signals`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    console.log("Signals response status:", signalsResponse.status);
    console.log(`Retrieved ${signalsResponse.data.length} signals`);

    console.log("\nAll tests completed successfully!");
  } catch (error) {
    console.error("Error during tests:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  }
}

// Run the tests
testAITradingEndpoints();
