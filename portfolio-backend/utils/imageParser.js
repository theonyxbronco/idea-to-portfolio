import { createCanvas, loadImage } from 'canvas';
import * as tf from '@tensorflow/tfjs-node';
import * as mobilenet from '@tensorflow-models/mobilenet';

class ImageParser {
  constructor() {
    this.model = null;
  }

  async loadModel() {
    this.model = await mobilenet.load();
  }

  async loadImageContext(path) {
    const img = await loadImage(path);
    const maxSize = 1024;
    let { width, height } = img;

    if (width > height && width > maxSize) {
      height *= maxSize / width;
      width = maxSize;
    } else if (height > maxSize) {
      width *= maxSize / height;
      height = maxSize;
    }

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    return ctx;
  }

  analyzeColors(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height).data;
    let r = 0, g = 0, b = 0, brightness = 0;
    const colorSamples = [];
    const colorFrequency = {};
    const step = width > 800 ? 80 : 40;

    for (let i = 0; i < imageData.length; i += step * 4) {
      const cr = imageData[i];
      const cg = imageData[i + 1];
      const cb = imageData[i + 2];
      if (imageData[i + 3] < 128) continue;

      r += cr;
      g += cg;
      b += cb;

      brightness += (0.299 * cr + 0.587 * cg + 0.114 * cb);
      const quantized = `${Math.floor(cr / 10) * 10},${Math.floor(cg / 10) * 10},${Math.floor(cb / 10) * 10}`;
      colorFrequency[quantized] = (colorFrequency[quantized] || 0) + 1;
      colorSamples.push([cr, cg, cb]);
    }

    const pixelCount = colorSamples.length;
    if (pixelCount === 0) {
      return {
        mainColor: 'rgb(255, 255, 255)',
        accentColor: 'rgb(200, 200, 200)',
        brightness: 255,
        colorPalette: []
      };
    }

    const avgColor = {
      r: Math.floor(r / pixelCount),
      g: Math.floor(g / pixelCount),
      b: Math.floor(b / pixelCount)
    };

    let dominantColor = [0, 0, 0];
    let maxCount = 0;
    for (const [color, count] of Object.entries(colorFrequency)) {
      if (count > maxCount) {
        maxCount = count;
        dominantColor = color.split(',').map(Number);
      }
    }

    let accentColor = [0, 0, 0];
    let maxSaturation = 0;
    for (const [r, g, b] of colorSamples) {
      const min = Math.min(r, g, b);
      const max = Math.max(r, g, b);
      const saturation = max - min;
      const diff = Math.sqrt(
        Math.pow(r - dominantColor[0], 2) +
        Math.pow(g - dominantColor[1], 2) +
        Math.pow(b - dominantColor[2], 2)
      );
      if (saturation > maxSaturation && diff > 60) {
        maxSaturation = saturation;
        accentColor = [r, g, b];
      }
    }

    if (maxSaturation === 0) {
      accentColor = colorSamples[Math.floor(Math.random() * colorSamples.length)];
    }

    const sortedColors = Object.entries(colorFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([color]) => `rgb(${color})`);

    return {
      mainColor: `rgb(${dominantColor[0]},${dominantColor[1]},${dominantColor[2]})`,
      accentColor: `rgb(${accentColor[0]},${accentColor[1]},${accentColor[2]})`,
      brightness: brightness / pixelCount,
      colorPalette: sortedColors
    };
  }

  async classifyImage(canvas) {
    const imageTensor = tf.browser.fromPixels(canvas);
    const predictions = await this.model.classify(imageTensor);
    imageTensor.dispose();

    return predictions
      .filter(p => p.probability > 0.1)
      .map(p => ({
        className: p.className,
        confidence: Math.round(p.probability * 100)
      }));
  }

  interpretStyle(tags, brightness) {
    const mood = brightness > 200 ? 'bright' : brightness < 80 ? 'dark' : 'balanced';

    let vibe = 'clean';
    const tagNames = tags.map(t => t.className.toLowerCase());

    if (tagNames.some(t => t.includes('abstract') || t.includes('art'))) vibe = 'creative';
    else if (tagNames.some(t => t.includes('fashion') || t.includes('beauty'))) vibe = 'elegant';
    else if (tagNames.some(t => t.includes('technology') || t.includes('interface'))) vibe = 'modern';
    else if (tagNames.some(t => t.includes('nature') || t.includes('landscape'))) vibe = 'organic';
    else if (tagNames.some(t => t.includes('vintage') || t.includes('retro'))) vibe = 'nostalgic';

    let layoutSpecs = {
      type: 'centered',
      grid: 'symmetrical',
      spacing: '64px vertical rhythm',
      imageTreatment: 'editorial-style with soft shadows'
    };

    switch (vibe) {
      case 'creative':
        layoutSpecs = {
          type: 'asymmetrical',
          grid: 'irregular columns',
          spacing: 'variable whitespace',
          imageTreatment: 'dynamic cropping with overlap effects'
        };
        break;
      case 'modern':
        layoutSpecs = {
          type: 'modular',
          grid: 'strict 12-column',
          spacing: '24px gutters',
          imageTreatment: 'consistent aspect ratios'
        };
        break;
      case 'elegant':
        layoutSpecs = {
          type: 'minimalist',
          grid: 'flexbox-based',
          spacing: 'generous margins',
          imageTreatment: 'full-bleed hero images'
        };
        break;
      case 'organic':
        layoutSpecs = {
          type: 'flowing',
          grid: 'irregular mosaic',
          spacing: 'natural rhythm',
          imageTreatment: 'textured overlays'
        };
        break;
      case 'nostalgic':
        layoutSpecs = {
          type: 'eclectic',
          grid: 'broken grid',
          spacing: 'variable density',
          imageTreatment: 'vintage filters'
        };
        break;
    }

    let typography = {
      family: 'sans-serif',
      stack: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      scale: '1.125 modular ratio',
      baseSize: '18px'
    };

    switch (vibe) {
      case 'creative':
        typography = {
          family: 'display',
          stack: '"Poppins", "Helvetica Neue", sans-serif',
          scale: '1.25 modular ratio',
          baseSize: '16px'
        };
        break;
      case 'elegant':
        typography = {
          family: 'serif',
          stack: '"Playfair Display", Georgia, serif',
          scale: '1.2 modular ratio',
          baseSize: '20px'
        };
        break;
      case 'nostalgic':
        typography = {
          family: 'vintage',
          stack: '"Courier New", monospace',
          scale: '1.1 modular ratio',
          baseSize: '16px'
        };
        break;
    }

    return { 
      mood, 
      vibe, 
      layoutSpecs,
      typography,
      interactions: {
        hover: '10% lightness shift',
        transition: '200ms ease-in-out',
        focus: '2px solid outline with 4px offset'
      }
    };
  }

  async analyzeImage(imagePath) {
    await this.loadModel();
    const ctx = await this.loadImageContext(imagePath);
    const { width, height } = ctx.canvas;
    const colorAnalysis = this.analyzeColors(ctx, width, height);
    const tags = await this.classifyImage(ctx.canvas);
    const styleAnalysis = this.interpretStyle(tags, colorAnalysis.brightness);

    return {
      theme: `${styleAnalysis.mood} ${styleAnalysis.vibe}`,
      technicalSpecs: {
        colors: {
          primary: colorAnalysis.mainColor,
          accent: colorAnalysis.accentColor,
          palette: colorAnalysis.colorPalette,
          brightness: Math.round(colorAnalysis.brightness)
        },
        layout: styleAnalysis.layoutSpecs,
        typography: styleAnalysis.typography,
        interactions: styleAnalysis.interactions,
        imageHandling: {
          dominantAspectRatio: `${width}/${height}`,
          gridGaps: '24px minimum',
          loading: 'lazy with blur-up'
        }
      },
      tags: tags.slice(0, 5),
      implementationGuide: `
PORTFOLIO IMPLEMENTATION GUIDE
=============================
COLORS:
- Primary: ${colorAnalysis.mainColor}
- Accent: ${colorAnalysis.accentColor}
- Palette: ${colorAnalysis.colorPalette.join(', ')}
- Brightness: ${Math.round(colorAnalysis.brightness)} (${styleAnalysis.mood})

LAYOUT:
- Type: ${styleAnalysis.layoutSpecs.type}
- Grid: ${styleAnalysis.layoutSpecs.grid}
- Spacing: ${styleAnalysis.layoutSpecs.spacing}
- Images: ${styleAnalysis.layoutSpecs.imageTreatment}

TYPOGRAPHY:
- Family: ${styleAnalysis.typography.family}
- Stack: ${styleAnalysis.typography.stack}
- Scale: ${styleAnalysis.typography.scale}
- Base Size: ${styleAnalysis.typography.baseSize}

INTERACTIONS:
- Hover: ${styleAnalysis.interactions.hover}
- Transition: ${styleAnalysis.interactions.transition}
- Focus: ${styleAnalysis.interactions.focus}
`.trim()
    };
  }

  async analyzeMoodboard(imagePath) {
    await this.loadModel();
    const ctx = await this.loadImageContext(imagePath);
    const { width, height } = ctx.canvas;
    return {
      colors: this.analyzeColors(ctx, width, height),
      tags: await this.classifyImage(ctx.canvas),
      dimensions: { width, height }
    };
  }
}

export default new ImageParser();