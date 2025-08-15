const express = require("express");
const PiiRedactionService = require("../services/piiRedactionServiceWithLibrary");

const router = express.Router();

// Text redaction endpoint
router.post("/redact", async (req, res) => {
  try {
    // Validate request body
    if (!req.body) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Request body is required",
      });
    }

    const { text } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Text field is required and must be a string",
      });
    }

    if (text.trim().length === 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Text cannot be empty",
      });
    }

    const piiService = new PiiRedactionService();
    const result = await piiService.redactText(text);

    res.status(200).json({
      success: true,
      data: {
        originalText: result.originalText,
        redactedText: result.redactedText,
        redactedFields: result.redactedFields,
        confidence: result.confidence,
        totalMatches: result.totalMatches,
      },
    });
  } catch (error) {
    console.error("Text Redaction Error:", error);

    // Handle specific error types
    if (error.message.includes("Invalid text input")) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid text input provided",
      });
    }

    res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
});

module.exports = router;
