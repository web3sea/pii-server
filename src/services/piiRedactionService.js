const fs = require("fs").promises;
const path = require("path");
const pdfParse = require("pdf-parse");
const Tesseract = require("tesseract.js");

class PiiRedactionService {
  constructor() {
    // PII patterns for detection
    this.piiPatterns = {
      // Property addresses (various formats)
      propertyAddress: [
        /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl|Way|Terrace|Ter)\b/gi,
        /\b[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl|Way|Terrace|Ter)\s+\d+\b/gi,
        /\b\d+\s+[A-Za-z\s]+(?:Apartment|Apt|Unit|Suite|Ste|Floor|Fl|Building|Bldg)\s+\d*\b/gi,
        /\b\d+\s+[A-Za-z\s]+(?:Blvd|Boulevard)\s+[A-Za-z\s]+\b/gi,
        /\b\d+\s+[A-Za-z\s]+(?:Blvd|Boulevard)\s+[A-Za-z\s]+\s+[A-Za-z\s]+\b/gi,
        /\b\d+\s+[A-Za-z\s]+(?:Blvd|Boulevard)\s+[A-Za-z\s]+\s+[A-Za-z\s]+\s+[A-Za-z]{2}\b/gi,
        /\b(?:Address|Addr)\s+\d+\s+[A-Za-z\s]+(?:Blvd|Boulevard)\s+[A-Za-z\s]+\s+[A-Za-z\s]+\s+[A-Za-z]{2}\b/gi,
        /\b(?:Address|Addr)\s+\d+\s+[A-Za-z\s]+(?:Blvd|Boulevard)\s+[A-Za-z\s]+\s+[A-Za-z\s]+\b/gi,
        /\b\d+\s+[A-Za-z\s]+(?:Blvd|Boulevard)\s+[A-Za-z\s]+\s+[A-Za-z\s]+\s+[A-Za-z]{2}\b/gi,
      ],

      // Phone numbers (process first to avoid conflicts)
      phoneNumber: [
        /\(\d{3}\)\s*\d{3}[-.]?\d{4}/g,
        /\b\+\d{1,3}\s*\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
        /\b\d{3}[-.]\d{3}[-.]?\d{4}\b/g,
        /\b(?:Phone|Tel|Telephone|Call|Contact)\s*[:#]?\s*\d{3}[-.]?\d{3}[-.]?\d{4}\b/gi,
        /\b\d{4}\s*\d{3}[-.]?\d{4}\b/g, // 4-digit area code format
      ],

      // Account numbers (various formats) - more specific patterns
      accountNumber: [
        /\b(?:Account|Acct|Acc|A\/C|A\/C No|Account Number|Account No|Acc No)\s*[:#]?\s*(\d{4,20})\b/gi,
        /\b(?:Account|Acct|Acc|A\/C|A\/C No|Account Number|Account No|Acc No)\s*[:#]?\s*([A-Z]{2,4}\d{6,12})\b/gi, // Alphanumeric account numbers
        /\b(?:Account|Acct|Acc|A\/C|A\/C No|Account Number|Account No|Acc No)\s*[:#]?\s*(\d{3,4}[- ]?\d{4,6}[- ]?\d{4,6})\b/g, // Formatted account numbers
        /\b(?:Account|Acct|Acc|A\/C|A\/C No|Account Number|Account No|Acc No)\s*[:#]?\s*(\d{10})\b/gi, // 10-digit account numbers
      ],

      // Property names and company names
      propertyName: [
        /\b(?:Property|Building|Complex|Tower|Plaza|Center|Gardens|Manor|Residence|Residential|Apartment|Apt)\s+[A-Za-z\s]{2,30}(?=\s|$)\b/gi,
        /\b[A-Za-z\s]{2,30}\s+(?:Property|Building|Complex|Tower|Plaza|Center|Gardens|Manor|Residence|Residential|Apartment|Apt)\b/gi,
        /\b[A-Za-z\s&]+(?:Properties|Property|INC|LLC|LTD|Corp|Corporation|Company|Co|Services|Service)\b/gi,
        /\b[A-Za-z\s&]+(?:Properties|Property|INC|LLC|LTD|Corp|Corporation|Company|Co|Services|Service)(?=\s|$)\b/gi,
        /\b(?:Bill to|Invoice to)\s+[A-Za-z\s&]+(?:Properties|Property|INC|LLC|LTD|Corp|Corporation|Company|Co|Services|Service)\b/gi,
        /\b[A-Za-z\s]+(?:JANITORIAL|Janitorial)\s+[A-Za-z\s]+\b/gi,
      ],

      // Email addresses
      email: [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g],

      // Social Security Numbers
      ssn: [/\b\d{3}-\d{2}-\d{4}\b/g, /\b\d{9}\b/g],

      // Credit Card Numbers
      creditCard: [
        /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
        /\b\d{4}[- ]?\d{6}[- ]?\d{5}\b/g,
        /\b(?:Visa|MasterCard|American Express|Discover|Card)\s*#?\s*\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/gi,
      ],

      // Invoice numbers
      invoiceNumber: [
        /\b(?:INVOICE|Invoice|Bill|Receipt)\s*#?\s*\d{3,6}\b/gi,
        /\b#\s*\d{3,6}\b/g,
      ],

      // ZIP codes
      zipCode: [/\b\d{5}\b/g, /\b[A-Z]{2}\s+\d{5}\b/gi],
    };
  }

  async redactFile(filePath) {
    try {
      const fileExtension = path.extname(filePath).toLowerCase();
      let extractedText = "";

      if (fileExtension === ".pdf") {
        extractedText = await this.extractTextFromPdf(filePath);
      } else if ([".jpg", ".jpeg", ".png"].includes(fileExtension)) {
        extractedText = await this.extractTextFromImage(filePath);
      } else {
        throw new Error("Unsupported file format");
      }

      return this.redactText(extractedText);
    } catch (error) {
      throw new Error(`File processing error: ${error.message}`);
    }
  }

  async extractTextFromPdf(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } catch (error) {
      throw new Error(`PDF parsing error: ${error.message}`);
    }
  }

  async extractTextFromImage(filePath) {
    try {
      const result = await Tesseract.recognize(filePath, "eng", {
        logger: (m) => console.log(m),
      });
      return result.data.text;
    } catch (error) {
      throw new Error(`OCR error: ${error.message}`);
    }
  }

  redactText(text) {
    if (!text || typeof text !== "string") {
      throw new Error("Invalid text input");
    }

    const originalText = text;
    let redactedText = text;
    const redactedFields = [];
    let confidence = 0;
    let totalMatches = 0;

    // Process patterns in specific order to avoid conflicts
    const patternOrder = [
      "phoneNumber",
      "email",
      "ssn",
      "creditCard",
      "invoiceNumber",
      "zipCode",
      "accountNumber",
      "propertyAddress",
      "propertyName",
    ];

    patternOrder.forEach((piiType) => {
      const patterns = this.piiPatterns[piiType];
      if (patterns) {
        patterns.forEach((pattern) => {
          const matches = redactedText.match(pattern);
          if (matches) {
            matches.forEach((match) => {
              const redactedValue = this.generateRedaction(match, piiType);
              redactedText = redactedText.replace(match, redactedValue);

              redactedFields.push({
                type: piiType,
                original: match,
                redacted: redactedValue,
                confidence: this.calculateConfidence(match, piiType),
              });

              totalMatches++;
            });
          }
        });
      }
    });

    // Calculate overall confidence
    if (redactedFields.length > 0) {
      confidence =
        redactedFields.reduce((sum, field) => sum + field.confidence, 0) /
        redactedFields.length;
    }

    return {
      originalText,
      redactedText,
      redactedFields,
      confidence: Math.round(confidence * 100) / 100,
      totalMatches,
    };
  }

  generateRedaction(originalValue, piiType) {
    const length = originalValue.length;

    switch (piiType) {
      case "propertyAddress":
        return "[PROPERTY_ADDRESS]";
      case "accountNumber":
        return "[ACCOUNT_NUMBER]";
      case "propertyName":
        return "[PROPERTY_NAME]";
      case "phoneNumber":
        return "[PHONE_NUMBER]";
      case "email":
        return "[EMAIL_ADDRESS]";
      case "ssn":
        return "[SSN]";
      case "creditCard":
        return "[CREDIT_CARD]";
      case "invoiceNumber":
        return "[INVOICE_NUMBER]";
      case "zipCode":
        return "[ZIP_CODE]";
      default:
        return "[REDACTED]";
    }
  }

  calculateConfidence(match, piiType) {
    // Base confidence scores for different PII types
    const baseConfidence = {
      propertyAddress: 0.8,
      accountNumber: 0.9,
      propertyName: 0.7,
      phoneNumber: 0.95,
      email: 0.98,
      ssn: 0.99,
      creditCard: 0.95,
      invoiceNumber: 0.9,
      zipCode: 0.85,
    };

    let confidence = baseConfidence[piiType] || 0.5;

    // Adjust confidence based on pattern quality
    if (piiType === "accountNumber") {
      if (match.length >= 8 && match.length <= 16) {
        confidence += 0.1;
      }
    } else if (piiType === "propertyAddress") {
      if (
        match.includes("Street") ||
        match.includes("Avenue") ||
        match.includes("Road")
      ) {
        confidence += 0.1;
      }
    }

    return Math.min(confidence, 1.0);
  }

  // Method to get statistics about detected PII
  getPiiStatistics(text) {
    const stats = {};

    Object.entries(this.piiPatterns).forEach(([piiType, patterns]) => {
      stats[piiType] = 0;
      patterns.forEach((pattern) => {
        const matches = text.match(pattern);
        if (matches) {
          stats[piiType] += matches.length;
        }
      });
    });

    return stats;
  }
}

module.exports = PiiRedactionService;
