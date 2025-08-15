const nlp = require("compromise");

class PiiRedactionServiceWithLibrary {
  constructor() {
    // Initialize compromise with custom patterns for property management
    this.customPatterns = {
      // Property management specific patterns
      propertyAddress: [
        // Specific pattern for "23080 Alessandro Partners, LLC Moreno Valley, CA 92553"
        /\b\d+\s+[A-Za-z\s&]+(?:Partners|Partnership|LLC|LTD|INC|Corp|Corporation|Company|Co)[,\s]+[A-Za-z\s]+\s+[A-Za-z]{2}\s+\d{5}\b/gi,
        // General address pattern
        /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl|Way|Terrace|Ter)\s+[A-Za-z\s]+\s+[A-Za-z]{2}\s+\d{5}\b/gi,
        // Company address pattern (more flexible)
        /\b\d+\s+[A-Za-z\s&]+(?:LLC|LTD|INC|Corp|Corporation|Company|Co)[,\s]+[A-Za-z\s]+\s+[A-Za-z]{2}\s+\d{5}\b/gi,
      ],
      propertyName: [
        // More specific patterns to avoid false positives
        /\b[A-Za-z\s&]+(?:Properties|Property|INC|LLC|LTD|Corp|Corporation|Company|Co)\b/gi,
        /\b[A-Za-z\s]+(?:Management|Mgmt)\s+(?:AND|&)\s+[A-Za-z\s]+\b/gi,
        // Specific pattern for "JDW Management"
        /\b[A-Za-z]{2,4}\s+(?:Management|Mgmt)\b/gi,
      ],
      accountNumber: [
        /\b(?:Account|Acct|Acc|A\/C|A\/C No|Account Number|Account No|Acc No)\s*[:#]?\s*(\d{4,20})\b/gi,
        /\b(?:Account|Acct|Acc|A\/C|A\/C No|Account Number|Account No|Acc No)\s*[:#]?\s*([A-Z]{2,4}\d{6,12})\b/gi,
      ],
      invoiceNumber: [
        /\b(?:INVOICE|Invoice|Bill|Receipt)\s*#?\s*\d{3,6}\b/gi,
        /\b#\s*\d{3,6}\b/g,
      ],
    };
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

    // First, handle false positives to prevent them from being redacted
    redactedText = this.preventFalsePositives(redactedText);

    // Use compromise for natural language processing
    const doc = nlp(redactedText);

    // Redact emails using compromise
    try {
      const emails = doc.emails();
      if (emails && emails.length > 0) {
        emails.forEach((email) => {
          const emailText = email.text();
          redactedText = redactedText.replace(emailText, "[EMAIL_ADDRESS]");
          redactedFields.push({
            type: "email",
            original: emailText,
            redacted: "[EMAIL_ADDRESS]",
            confidence: 0.98,
          });
          totalMatches++;
        });
      }
    } catch (error) {
      console.log("Email detection error:", error.message);
    }

    // Redact phone numbers using compromise
    try {
      const phones = doc.phoneNumbers();
      if (phones && phones.length > 0) {
        phones.forEach((phone) => {
          const phoneText = phone.text();
          redactedText = redactedText.replace(phoneText, "[PHONE_NUMBER]");
          redactedFields.push({
            type: "phoneNumber",
            original: phoneText,
            redacted: "[PHONE_NUMBER]",
            confidence: 0.95,
          });
          totalMatches++;
        });
      }
    } catch (error) {
      console.log("Phone detection error:", error.message);
    }

    // Apply custom patterns FIRST for property management specific entities
    // This ensures our specific patterns take priority over compromise's general detection
    Object.entries(this.customPatterns).forEach(([piiType, patterns]) => {
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
    });

    // Then redact organizations using compromise (but only if not already redacted)
    try {
      const organizations = doc.organizations();
      if (organizations && organizations.length > 0) {
        organizations.forEach((org) => {
          const orgText = org.text();
          // Only redact if it's not already been redacted and is a property management org
          if (
            redactedText.includes(orgText) &&
            this.isPropertyManagementOrg(orgText)
          ) {
            redactedText = redactedText.replace(orgText, "[PROPERTY_NAME]");
            redactedFields.push({
              type: "propertyName",
              original: orgText,
              redacted: "[PROPERTY_NAME]",
              confidence: 0.8,
            });
            totalMatches++;
          }
        });
      }
    } catch (error) {
      console.log("Organization detection error:", error.message);
    }

    // Finally redact addresses using compromise (but only if not already redacted)
    try {
      const places = doc.places();
      if (places && places.length > 0) {
        places.forEach((place) => {
          const placeText = place.text();
          // Only redact if it's not already been redacted and is a property address
          if (
            redactedText.includes(placeText) &&
            this.isPropertyAddress(placeText)
          ) {
            redactedText = redactedText.replace(
              placeText,
              "[PROPERTY_ADDRESS]"
            );
            redactedFields.push({
              type: "propertyAddress",
              original: placeText,
              redacted: "[PROPERTY_ADDRESS]",
              confidence: 0.85,
            });
            totalMatches++;
          }
        });
      }
    } catch (error) {
      console.log("Place detection error:", error.message);
    }

    // Restore placeholders
    redactedText = this.restorePlaceholders(redactedText);

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

  isPropertyManagementOrg(org) {
    const propertyKeywords = [
      "property",
      "properties",
      "management",
      "mgmt",
      "partners",
      "llc",
      "inc",
      "corporation",
      "company",
      "co",
      "services",
      "service",
    ];
    return propertyKeywords.some((keyword) =>
      org.toLowerCase().includes(keyword)
    );
  }

  isPropertyAddress(address) {
    const addressKeywords = [
      "street",
      "avenue",
      "road",
      "boulevard",
      "blvd",
      "lane",
      "drive",
      "court",
      "place",
      "way",
      "terrace",
      "partners",
      "llc",
      "inc",
    ];
    return addressKeywords.some((keyword) =>
      address.toLowerCase().includes(keyword)
    );
  }

  generateRedaction(originalValue, piiType) {
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
      case "date":
        return "[DATE]";
      default:
        return "[REDACTED]";
    }
  }

  calculateConfidence(match, piiType) {
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
      date: 0.9,
    };

    return baseConfidence[piiType] || 0.5;
  }

  preventFalsePositives(text) {
    // Replace specific false positive patterns with placeholders
    const falsePositivePatterns = [
      {
        pattern: /\bMANAGEMENT INVOICE Service\b/gi,
        replacement: "MANAGEMENT_INVOICE_SERVICE_PLACEHOLDER",
      },
      {
        pattern: /\bPROPERTY MANAGEMENT AND INVESTMENT Invoice Date\b/gi,
        replacement: "PROPERTY_MANAGEMENT_INVESTMENT_INVOICE_DATE_PLACEHOLDER",
      },
    ];

    falsePositivePatterns.forEach(({ pattern, replacement }) => {
      text = text.replace(pattern, replacement);
    });

    return text;
  }

  restorePlaceholders(text) {
    // Restore placeholders back to original text
    const placeholderMappings = {
      MANAGEMENT_INVOICE_SERVICE_PLACEHOLDER: "MANAGEMENT INVOICE Service",
      PROPERTY_MANAGEMENT_INVESTMENT_INVOICE_DATE_PLACEHOLDER:
        "PROPERTY MANAGEMENT AND INVESTMENT Invoice Date",
    };

    Object.entries(placeholderMappings).forEach(([placeholder, original]) => {
      text = text.replace(new RegExp(placeholder, "g"), original);
    });

    return text;
  }

  getPiiStatistics(text) {
    try {
      const doc = nlp(text);
      const stats = {
        emails: doc.emails().length || 0,
        phones: doc.phoneNumbers().length || 0,
        organizations: doc.organizations().length || 0,
        places: doc.places().length || 0,
      };

      return stats;
    } catch (error) {
      console.log("Statistics error:", error.message);
      return {
        emails: 0,
        phones: 0,
        organizations: 0,
        places: 0,
      };
    }
  }
}

module.exports = PiiRedactionServiceWithLibrary;
