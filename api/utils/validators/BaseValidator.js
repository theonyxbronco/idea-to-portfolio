/**
 * Base validator class to eliminate duplication across all validators
 */

class BaseValidator {
  constructor(validatorName = 'BaseValidator') {
    this.validatorName = validatorName;
    this.passedChecks = [];
    this.issues = [];
    this.suggestions = [];
  }

  /**
   * Reset validator state
   */
  reset() {
    this.passedChecks = [];
    this.issues = [];
    this.suggestions = [];
  }

  /**
   * Add a passed check
   */
  addPassedCheck(message) {
    this.passedChecks.push(message);
  }

  /**
   * Add an issue
   */
  addIssue(message, severity = 'medium') {
    this.issues.push({ message, severity });
  }

  /**
   * Add a suggestion
   */
  addSuggestion(message) {
    this.suggestions.push(message);
  }

  /**
   * Get validation results
   */
  getResults() {
    return {
      validator: this.validatorName,
      passed: this.issues.length === 0,
      passedChecks: this.passedChecks,
      issues: this.issues,
      suggestions: this.suggestions,
      summary: {
        totalChecks: this.passedChecks.length + this.issues.length,
        passed: this.passedChecks.length,
        failed: this.issues.length,
        suggestions: this.suggestions.length,
      }
    };
  }

  /**
   * Abstract validate method - must be implemented by subclasses
   */
  async validate() {
    throw new Error(`validate() method must be implemented by ${this.validatorName}`);
  }
}

module.exports = BaseValidator;
