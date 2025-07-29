class HtmlValidator {
  
    /**
     * Check if HTML appears to be complete
     * @param {string} htmlString - The HTML content to validate
     * @returns {Object} - Validation result with isComplete flag and details
     */
    validateCompleteness(htmlString) {
      if (!htmlString || typeof htmlString !== 'string') {
        return {
          isComplete: false,
          estimatedCompletion: 0,
          issues: ['No HTML content provided'],
          canContinue: false
        };
      }
  
      const issues = [];
      let estimatedCompletion = 0;
      let canContinue = false;
  
      // Clean the HTML string
      const cleanHtml = htmlString.trim();
      
      // Basic structure checks
      const hasDoctype = cleanHtml.toLowerCase().includes('<!doctype');
      const hasHtmlOpen = cleanHtml.toLowerCase().includes('<html');
      const hasHtmlClose = cleanHtml.toLowerCase().includes('</html>');
      const hasBodyOpen = cleanHtml.toLowerCase().includes('<body');
      const hasBodyClose = cleanHtml.toLowerCase().includes('</body>');
      const hasHeadSection = cleanHtml.toLowerCase().includes('<head');
      
      // Content checks
      const hasStyleTag = cleanHtml.toLowerCase().includes('<style');
      const hasContent = cleanHtml.length > 1000; // Arbitrary minimum content length
      const hasScriptTag = cleanHtml.toLowerCase().includes('<script');
      
      // Tag balance check
      const openTags = (cleanHtml.match(/<[^/][^>]*>/g) || []).length;
      const closeTags = (cleanHtml.match(/<\/[^>]*>/g) || []).length;
      const selfClosingTags = (cleanHtml.match(/<[^>]*\/>/g) || []).length;
      
      // Calculate estimated completion
      if (hasDoctype) estimatedCompletion += 5;
      if (hasHtmlOpen) estimatedCompletion += 10;
      if (hasHeadSection) estimatedCompletion += 10;
      if (hasBodyOpen) estimatedCompletion += 15;
      if (hasStyleTag) estimatedCompletion += 20;
      if (hasContent) estimatedCompletion += 20;
      if (hasBodyClose) estimatedCompletion += 10;
      if (hasHtmlClose) estimatedCompletion += 10;
      
      // Check for common incomplete patterns
      const endsAbruptly = !cleanHtml.endsWith('</html>') && 
                          !cleanHtml.endsWith('</body>') && 
                          !cleanHtml.endsWith('-->');
      
      const hasUnfinishedTag = cleanHtml.match(/<[^>]*$/);
      const hasUnfinishedComment = cleanHtml.includes('<!--') && 
                                  !cleanHtml.lastIndexOf('<!--') < cleanHtml.lastIndexOf('-->');
      
      // Identify specific issues
      if (!hasDoctype && hasHtmlOpen) issues.push('Missing DOCTYPE declaration');
      if (!hasHtmlOpen) issues.push('Missing opening <html> tag');
      if (!hasHeadSection) issues.push('Missing <head> section');
      if (!hasBodyOpen) issues.push('Missing opening <body> tag');
      if (!hasStyleTag && !cleanHtml.includes('<link')) issues.push('No CSS styling detected');
      if (!hasBodyClose) issues.push('Missing closing </body> tag');
      if (!hasHtmlClose) issues.push('Missing closing </html> tag');
      if (hasUnfinishedTag) issues.push('Incomplete HTML tag at end');
      if (hasUnfinishedComment) issues.push('Unclosed HTML comment');
      if (endsAbruptly) issues.push('Content appears to end abruptly');
      
      // Tag balance issues
      const expectedCloseTags = openTags - selfClosingTags;
      if (closeTags < expectedCloseTags * 0.8) {
        issues.push('Significant number of unclosed HTML tags');
      }
      
      // Determine if we can continue generation
      canContinue = hasHtmlOpen && hasBodyOpen && cleanHtml.length > 500;
      
      // Adjust completion based on issues
      if (issues.length > 5) estimatedCompletion = Math.max(estimatedCompletion - 20, 10);
      if (!hasBodyClose || !hasHtmlClose) estimatedCompletion = Math.min(estimatedCompletion, 75);
      
      const isComplete = issues.length === 0 || (hasHtmlClose && hasBodyClose && issues.length <= 2);
      
      return {
        isComplete,
        estimatedCompletion: Math.min(Math.max(estimatedCompletion, 0), 100),
        issues,
        canContinue,
        structure: {
          hasDoctype,
          hasHtmlOpen,
          hasHtmlClose,
          hasBodyOpen, 
          hasBodyClose,
          hasHeadSection,
          hasStyleTag,
          hasScriptTag
        },
        stats: {
          totalLength: cleanHtml.length,
          openTags,
          closeTags,
          selfClosingTags,
          tagBalance: closeTags / Math.max(expectedCloseTags, 1)
        }
      };
    }
  
    /**
     * Generate a continuation prompt for incomplete HTML
     * @param {string} partialHtml - The incomplete HTML 
     * @param {Object} portfolioData - Original portfolio data
     * @returns {string} - Prompt for continuing generation
     */
    generateContinuationPrompt(partialHtml, portfolioData) {
      const validation = this.validateCompleteness(partialHtml);
      
      let continuationPrompt = `CONTINUE GENERATING THE INCOMPLETE HTML PORTFOLIO:
  
  CRITICAL INSTRUCTIONS:
  1. You are continuing an incomplete HTML generation that was cut off
  2. DO NOT restart or regenerate from the beginning
  3. Analyze the incomplete HTML and continue from where it left off
  4. Complete all missing sections and fix any structural issues
  5. Ensure the final result is a complete, valid HTML document
  6. Maintain consistency with the existing style and structure
  7. Pay special attention to these incomplete sections:
  
  INCOMPLETE HTML TO CONTINUE:
  ---START OF INCOMPLETE HTML---
  ${partialHtml}
  ---END OF INCOMPLETE HTML---
  
  ANALYSIS OF WHAT'S MISSING:
  `;
  
      // Add detailed structural analysis
      if (!validation.structure.hasBodyClose) {
        continuationPrompt += "- Missing closing </body> tag\n";
      }
      if (!validation.structure.hasHtmlClose) {
        continuationPrompt += "- Missing closing </html> tag\n";
      }
      if (validation.structure.tagBalance < 0.8) {
        continuationPrompt += `- Approximately ${Math.round((1-validation.structure.tagBalance)*100)}% of tags are unclosed\n`;
      }
  
      continuationPrompt += `
  COMPLETION STATUS: ${validation.estimatedCompletion}% complete
  
  ORIGINAL PROJECT REQUIREMENTS:
  - Personal Info: ${portfolioData.personalInfo?.name} - ${portfolioData.personalInfo?.title}
  - Number of Projects: ${portfolioData.projects?.length || 0}
  - Style Preferences: ${JSON.stringify(portfolioData.stylePreferences || {})}
  
  CONTINUATION INSTRUCTIONS:
  1. Continue the HTML from exactly where it was cut off
  2. Complete any unfinished sections
  3. Add missing closing tags (</body>, </html>, etc.)
  4. Ensure all projects are included
  5. Maintain the same design style and structure
  6. Fix any broken HTML tags or syntax errors
  7. Return ONLY the completion part that should be appended to fix the incomplete HTML
  8. If adding new sections, maintain consistent styling
  9. Ensure all images have proper alt text
  10. Verify all links work properly
  
  RETURN FORMAT: Only return the HTML content needed to complete the incomplete portfolio. Do not include the original partial content.`;
  
      return continuationPrompt;
    }
  
    /**
     * Merge partial HTML with continuation
     * @param {string} partialHtml - Original incomplete HTML
     * @param {string} continuation - Generated continuation
     * @returns {string} - Complete merged HTML
     */
    mergeHtmlParts(partialHtml, continuation) {
      // Remove any duplicate tags that might appear at the start of continuation
      let cleanContinuation = continuation.trim();
      
      // Remove common duplicate opening tags from continuation
      cleanContinuation = cleanContinuation.replace(/^<\!DOCTYPE[^>]*>/i, '');
      cleanContinuation = cleanContinuation.replace(/^<html[^>]*>/i, '');
      cleanContinuation = cleanContinuation.replace(/^<head[^>]*>.*?<\/head>/is, '');
      cleanContinuation = cleanContinuation.replace(/^<body[^>]*>/i, '');
      
      // If partial HTML ends abruptly in a tag, try to complete it
      const partialTrimmed = partialHtml.trim();
      let mergedHtml = partialTrimmed;
      
      // Add continuation
      mergedHtml += cleanContinuation;
      
      // Ensure proper closing tags if still missing
      if (!mergedHtml.includes('</body>')) {
        mergedHtml += '\n</body>';
      }
      if (!mergedHtml.includes('</html>')) {
        mergedHtml += '\n</html>';
      }
      
      return mergedHtml;
    }
  }
  
  module.exports = new HtmlValidator();