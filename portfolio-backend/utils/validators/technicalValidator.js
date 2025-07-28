// portfolio-backend/utils/validators/technicalValidator.js
const cheerio = require('cheerio');
const axios = require('axios');

class TechnicalValidator {
  constructor() {
    this.validationResults = {
      links: [],
      images: [],
      html: [],
      responsive: [],
      performance: []
    };
  }

  async validateTechnical(htmlContent, processedImages = {}) {
    console.log('🔧 Starting technical validation...');
    
    const $ = cheerio.load(htmlContent);
    const results = {
      score: 0,
      issues: [],
      fixes: [],
      details: {
        links: await this.validateLinks($),
        images: this.validateImages($, processedImages),
        htmlStructure: this.validateHtmlStructure($),
        responsive: this.validateResponsive($),
        performance: this.validatePerformance($)
      }
    };

    // Calculate overall technical score
    const scores = Object.values(results.details).map(detail => detail.score);
    results.score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    // Collect all issues and fixes
    Object.values(results.details).forEach(detail => {
      results.issues.push(...detail.issues);
      results.fixes.push(...detail.fixes);
    });

    console.log(`✅ Technical validation complete. Score: ${results.score}/100`);
    return results;
  }

  async validateLinks($) {
    console.log('🔗 Validating links...');
    const links = $('a[href]').toArray();
    const linkResults = {
      score: 100,
      issues: [],
      fixes: [],
      totalLinks: links.length,
      workingLinks: 0,
      brokenLinks: 0
    };

    for (const link of links) {
      const href = $(link).attr('href');
      
      // Skip javascript: links, anchors, and tel/mailto
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || 
          href.startsWith('tel:') || href.startsWith('mailto:')) {
        linkResults.workingLinks++;
        continue;
      }

      try {
        // For external links, do a simple validation
        if (href.startsWith('http')) {
          // In production, you might want to actually test these
          // For now, just validate format
          new URL(href);
          linkResults.workingLinks++;
        } else {
          // Relative links - assume they work for portfolio context
          linkResults.workingLinks++;
        }
      } catch (error) {
        linkResults.brokenLinks++;
        linkResults.issues.push(`Broken link: ${href}`);
        linkResults.fixes.push({
          type: 'link-fix',
          description: `Fix broken link: ${href}`,
          element: $(link).toString(),
          suggestion: 'Update or remove this link'
        });
      }
    }

    // Calculate link score
    if (links.length > 0) {
      linkResults.score = Math.round((linkResults.workingLinks / links.length) * 100);
    }

    if (linkResults.brokenLinks > 0) {
      linkResults.score = Math.max(linkResults.score - (linkResults.brokenLinks * 10), 0);
    }

    console.log(`🔗 Links validation: ${linkResults.workingLinks}/${links.length} working`);
    return linkResults;
  }

  validateImages($, processedImages) {
    console.log('🖼️ Validating images...');
    const images = $('img').toArray();
    const imageResults = {
      score: 100,
      issues: [],
      fixes: [],
      totalImages: images.length,
      workingImages: 0,
      missingAlt: 0,
      brokenSrc: 0
    };

    images.forEach((img, index) => {
      const $img = $(img);
      const src = $img.attr('src');
      const alt = $img.attr('alt');

      // Check for src attribute
      if (!src || src.trim() === '') {
        imageResults.brokenSrc++;
        imageResults.issues.push(`Image ${index + 1}: Missing src attribute`);
        imageResults.fixes.push({
          type: 'image-src-fix',
          description: `Add src attribute to image ${index + 1}`,
          element: $img.toString(),
          suggestion: 'Add a valid image source'
        });
      } else {
        // Check if it's using client's actual images
        const isClientImage = Object.values(processedImages).flat()
          .some(processedImg => src.includes(processedImg.filename || processedImg.id));
        
        if (isClientImage) {
          imageResults.workingImages++;
        } else if (src.startsWith('http') || src.startsWith('/uploads/')) {
          imageResults.workingImages++;
        } else {
          imageResults.brokenSrc++;
          imageResults.issues.push(`Image ${index + 1}: Potentially broken src - ${src}`);
        }
      }

      // Check for alt text
      if (!alt || alt.trim() === '') {
        imageResults.missingAlt++;
        imageResults.issues.push(`Image ${index + 1}: Missing alt text`);
        imageResults.fixes.push({
          type: 'alt-text-fix',
          description: `Add alt text to image ${index + 1}`,
          element: $img.toString(),
          suggestion: 'Add descriptive alt text for accessibility'
        });
      }
    });

    // Calculate image score
    let penalties = 0;
    penalties += imageResults.brokenSrc * 15; // -15 points per broken image
    penalties += imageResults.missingAlt * 5;  // -5 points per missing alt

    imageResults.score = Math.max(100 - penalties, 0);

    console.log(`🖼️ Images validation: ${imageResults.workingImages}/${images.length} working`);
    return imageResults;
  }

  validateHtmlStructure($) {
    console.log('📝 Validating HTML structure...');
    const structureResults = {
      score: 100,
      issues: [],
      fixes: [],
      hasDoctype: false,
      hasTitle: false,
      hasMetaCharset: false,
      hasMetaViewport: false,
      semanticElements: 0,
      headingHierarchy: true
    };

    // Check for DOCTYPE (cheerio might not preserve this perfectly)
    const htmlContent = $.html();
    structureResults.hasDoctype = htmlContent.toLowerCase().includes('<!doctype html>');

    // Check for essential meta tags
    structureResults.hasTitle = $('title').length > 0;
    structureResults.hasMetaCharset = $('meta[charset]').length > 0;
    structureResults.hasMetaViewport = $('meta[name="viewport"]').length > 0;

    // Count semantic elements
    const semanticTags = ['header', 'nav', 'main', 'section', 'article', 'aside', 'footer'];
    semanticTags.forEach(tag => {
      structureResults.semanticElements += $(tag).length;
    });

    // Check heading hierarchy
    const headings = $('h1, h2, h3, h4, h5, h6').toArray();
    let lastLevel = 0;
    headings.forEach(heading => {
      const level = parseInt(heading.name.charAt(1));
      if (level > lastLevel + 1) {
        structureResults.headingHierarchy = false;
        structureResults.issues.push(`Heading hierarchy issue: ${heading.name} follows h${lastLevel}`);
      }
      lastLevel = level;
    });

    // Add issues and fixes
    if (!structureResults.hasTitle) {
      structureResults.issues.push('Missing <title> tag');
      structureResults.fixes.push({
        type: 'title-fix',
        description: 'Add title tag to document head',
        suggestion: 'Add <title>Your Portfolio Name</title> in the head section'
      });
    }

    if (!structureResults.hasMetaViewport) {
      structureResults.issues.push('Missing viewport meta tag');
      structureResults.fixes.push({
        type: 'viewport-fix',
        description: 'Add viewport meta tag for mobile responsiveness',
        suggestion: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> in the head'
      });
    }

    if (structureResults.semanticElements === 0) {
      structureResults.issues.push('No semantic HTML elements found');
      structureResults.fixes.push({
        type: 'semantic-fix',
        description: 'Use semantic HTML elements for better structure',
        suggestion: 'Replace generic divs with header, main, section, article, etc.'
      });
    }

    // Calculate structure score
    let penalties = 0;
    if (!structureResults.hasTitle) penalties += 10;
    if (!structureResults.hasMetaViewport) penalties += 15;
    if (structureResults.semanticElements === 0) penalties += 20;
    if (!structureResults.headingHierarchy) penalties += 10;

    structureResults.score = Math.max(100 - penalties, 0);

    console.log(`📝 HTML structure validation complete. Score: ${structureResults.score}/100`);
    return structureResults;
  }

  validateResponsive($) {
    console.log('📱 Validating responsive design...');
    const responsiveResults = {
      score: 100,
      issues: [],
      fixes: [],
      hasViewportMeta: false,
      hasMediaQueries: false,
      hasFlexboxGrid: false,
      hasResponsiveImages: 0,
      totalImages: 0
    };

    // Check viewport meta tag
    responsiveResults.hasViewportMeta = $('meta[name="viewport"]').length > 0;

    // Check for CSS that indicates responsive design
    const styles = $('style').html() || '';
    const inlineStyles = $('[style]').toArray().map(el => $(el).attr('style')).join(' ');
    const allStyles = styles + ' ' + inlineStyles;

    responsiveResults.hasMediaQueries = /@media/.test(allStyles);
    responsiveResults.hasFlexboxGrid = /display:\s*(flex|grid)/.test(allStyles) || 
                                       /flex|grid/.test(allStyles);

    // Check for responsive images
    const images = $('img').toArray();
    responsiveResults.totalImages = images.length;
    
    images.forEach(img => {
      const $img = $(img);
      const style = $img.attr('style') || '';
      if (style.includes('max-width') || style.includes('width: 100%') || 
          $img.hasClass('responsive') || $img.hasClass('img-responsive')) {
        responsiveResults.hasResponsiveImages++;
      }
    });

    // Add issues and fixes
    if (!responsiveResults.hasViewportMeta) {
      responsiveResults.issues.push('Missing viewport meta tag');
      responsiveResults.fixes.push({
        type: 'responsive-meta-fix',
        description: 'Add viewport meta tag',
        suggestion: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">'
      });
    }

    if (!responsiveResults.hasMediaQueries) {
      responsiveResults.issues.push('No media queries detected');
      responsiveResults.fixes.push({
        type: 'media-query-fix',
        description: 'Add responsive media queries',
        suggestion: 'Add CSS media queries for different screen sizes'
      });
    }

    if (!responsiveResults.hasFlexboxGrid) {
      responsiveResults.issues.push('No modern layout methods detected');
      responsiveResults.fixes.push({
        type: 'layout-fix',
        description: 'Use Flexbox or CSS Grid for layout',
        suggestion: 'Replace float-based layouts with Flexbox or CSS Grid'
      });
    }

    // Calculate responsive score
    let penalties = 0;
    if (!responsiveResults.hasViewportMeta) penalties += 25;
    if (!responsiveResults.hasMediaQueries) penalties += 30;
    if (!responsiveResults.hasFlexboxGrid) penalties += 20;
    if (responsiveResults.totalImages > 0 && responsiveResults.hasResponsiveImages === 0) {
      penalties += 15;
    }

    responsiveResults.score = Math.max(100 - penalties, 0);

    console.log(`📱 Responsive validation complete. Score: ${responsiveResults.score}/100`);
    return responsiveResults;
  }

  validatePerformance($) {
    console.log('⚡ Validating performance...');
    const performanceResults = {
      score: 100,
      issues: [],
      fixes: [],
      hasMinifiedCSS: false,
      hasOptimizedImages: false,
      hasExcessiveDOM: false,
      inlineStylesCount: 0,
      externalResources: 0
    };

    // Check for minified CSS
    const styles = $('style').html() || '';
    performanceResults.hasMinifiedCSS = styles.length > 0 && 
      (styles.includes('/*') === false || styles.split('\n').length < 10);

    // Count inline styles (performance anti-pattern)
    performanceResults.inlineStylesCount = $('[style]').length;

    // Count external resources
    performanceResults.externalResources = $('link[rel="stylesheet"], script[src]').length;

    // Check DOM size
    const totalElements = $('*').length;
    performanceResults.hasExcessiveDOM = totalElements > 1500;

    // Add issues and fixes
    if (performanceResults.inlineStylesCount > 10) {
      performanceResults.issues.push(`Too many inline styles (${performanceResults.inlineStylesCount})`);
      performanceResults.fixes.push({
        type: 'inline-styles-fix',
        description: 'Move inline styles to CSS classes',
        suggestion: 'Create CSS classes instead of using inline styles'
      });
    }

    if (performanceResults.hasExcessiveDOM) {
      performanceResults.issues.push(`Large DOM size (${totalElements} elements)`);
      performanceResults.fixes.push({
        type: 'dom-size-fix',
        description: 'Reduce DOM complexity',
        suggestion: 'Simplify HTML structure and remove unnecessary elements'
      });
    }

    if (performanceResults.externalResources > 10) {
      performanceResults.issues.push(`Many external resources (${performanceResults.externalResources})`);
      performanceResults.fixes.push({
        type: 'resources-fix',
        description: 'Minimize external resources',
        suggestion: 'Bundle and minimize external CSS/JS files'
      });
    }

    // Calculate performance score
    let penalties = 0;
    if (performanceResults.inlineStylesCount > 10) penalties += 15;
    if (performanceResults.hasExcessiveDOM) penalties += 20;
    if (performanceResults.externalResources > 10) penalties += 10;

    performanceResults.score = Math.max(100 - penalties, 0);

    console.log(`⚡ Performance validation complete. Score: ${performanceResults.score}/100`);
    return performanceResults;
  }

  // Auto-fix common technical issues
  async autoFixIssues(htmlContent, issues) {
    console.log('🔧 Applying auto-fixes...');
    let $ = cheerio.load(htmlContent);
    let fixesApplied = [];

    for (const fix of issues) {
      try {
        switch (fix.type) {
          case 'title-fix':
            if ($('title').length === 0) {
              $('head').append('<title>Portfolio</title>');
              fixesApplied.push('Added title tag');
            }
            break;

          case 'viewport-fix':
            if ($('meta[name="viewport"]').length === 0) {
              $('head').append('<meta name="viewport" content="width=device-width, initial-scale=1">');
              fixesApplied.push('Added viewport meta tag');
            }
            break;

          case 'alt-text-fix':
            $('img').each((i, img) => {
              const $img = $(img);
              if (!$img.attr('alt')) {
                $img.attr('alt', 'Portfolio image');
                fixesApplied.push(`Added alt text to image ${i + 1}`);
              }
            });
            break;

          default:
            console.log(`Unknown fix type: ${fix.type}`);
        }
      } catch (error) {
        console.error(`Failed to apply fix ${fix.type}:`, error);
      }
    }

    console.log(`🔧 Applied ${fixesApplied.length} auto-fixes`);
    return {
      fixedHtml: $.html(),
      fixesApplied
    };
  }
}

module.exports = TechnicalValidator;