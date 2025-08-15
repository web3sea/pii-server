const axios = require("axios");

const API_BASE_URL = "http://localhost:3000/api/pii";

// Sample bill text with PII
const sampleBillText =
  "# 4000 HOWARDS JANITORIAL SERVICE\n\n261 W Wilson Street, Rialto Ca 92376 (909) 329-7358 howardp587@gmail.com\n\nINVOICE # 1025\n\n|  Bill to Julia & David Properties INC | Went to  |\n| --- | --- |\n|  Customer | Recipient  |\n|  Customer ID# | Address 564 W. Foothill Blvd Rialto Ca  |\n|  Address | Phone 92376  |\n|  Phone | 6571 478-9668  |\n|  Payment Bill |   |\n|  Payment Terms | Date of Service  |\n|  Payments | Service Person  |\n|  Payable To | Job Correction  |\n\n|  ITEM | QTY | DESCRIPTION | SQFT | UNIT PRICE | LINE TOTAL  |\n| --- | --- | --- | --- | --- | --- |\n|  1 | 1 | Pressure washing | Flat |  | 225.00  |\n|   |  | 411 Side walk Area |  |  |   |\n|  2 | 1 | Graffiti removal | Flat |  | 225.00  |\n|   |  | To Remove All |  |  |   |\n|   |  | Graffiti from |  |  |   |\n|   |  | Side walk & Buildings F. |  |  |   |\n|   |  | Hoor's To Complete |  |  |   |\n|   |  | Job 3.5-5.0 Hoor's |  |  |   |\n\nThank you for your business!";

async function testTextRedaction() {
  try {
    console.log("Testing text redaction...\n");
    console.log("Original text:");
    console.log(sampleBillText);

    const response = await axios.post(`${API_BASE_URL}/redact-text`, {
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
