const axios = require("axios");

const API_BASE_URL = "http://localhost:3000/api/pii";

// Sample bill text with PII
const sampleBillText =
  "JDW Management PROPERTY MANAGEMENT AND INVESTMENT Invoice Date: 11/30/2024 23080 Alessandro Partners, LLC Moreno Valley, CA 92553 MANAGEMENT INVOICE Service Period: November 2024 Rental Income 69842.9 69842.9 X 0.04 = 2793.716 Total 2793.716 Thank you.";

async function testTextRedaction() {
  try {
    console.log("Testing text redaction...\n");
    console.log("Original text:");
    console.log(sampleBillText);

    const response = await axios.post(`${API_BASE_URL}/redact`, {
      text: sampleBillText,
    });

    console.log("\nRedacted text:");
    console.log(response.data.data.redactedText);

    console.log("\nRedacted fields:");
    response.data.data.redactedFields.forEach((field) => {
      console.log(
        `- ${field.type}: "${field.original}" → "${field.redacted}" (confidence: ${field.confidence})`
      );
    });

    console.log(`\nOverall confidence: ${response.data.data.confidence}`);
    console.log(`Total matches: ${response.data.data.totalMatches}`);
  } catch (error) {
    console.error(
      "Error testing text redaction:",
      error.response?.data || error.message
    );
  }
}

async function testHealthCheck() {
  try {
    const response = await axios.get("http://localhost:3000/health");
    console.log("Health check:", response.data);
  } catch (error) {
    console.error("Health check failed:", error.message);
  }
}

async function runTests() {
  console.log("🚀 Testing PII Redaction API\n");

  // Test health check first
  await testHealthCheck();
  console.log("");

  // Test text redaction
  await testTextRedaction();
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { testTextRedaction, testHealthCheck };
