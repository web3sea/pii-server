const express = require("express");
const PiiRedactionService = require("../services/piiRedactionServiceWithLibrary");

const router = express.Router();

// Text redaction endpoint
router.post("/redact", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Text is required",
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
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
});

module.exports = router;
