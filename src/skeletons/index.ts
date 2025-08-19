// Import skeleton HTML files as strings
import creativeProHtml from './creative-professional.html?raw';
import galleryFirstHtml from './gallery-first.html?raw';
import newspaperHtml from './newspaper.html?raw';
import storytellerHtml from './storyteller.html?raw';

export interface SkeletonPreview {
  id: string;
  name: string;
  description: string;
  html: string;
  features: string[];
  color: string;
}

export const skeletonPreviews: Record<string, SkeletonPreview> = {
  'creative-professional': {
    id: 'creative-professional',
    name: 'Creative Professional',
    description: 'Warm, textured design perfect for designers and artists',
    html: creativeProHtml,
    features: ['Expandable Project Cards', 'Grain Texture', 'Skills Grid', 'Contact Methods'],
    color: 'from-amber-500 to-orange-500'
  },
  'gallery-first': {
    id: 'gallery-first',
    name: 'Gallery First',
    description: 'Dark, minimal layout that puts your visuals center stage',
    html: galleryFirstHtml,
    features: ['Dynamic Masonry', 'Filter Tags', 'Lightbox Effects', 'Image Navigation'],
    color: 'from-gray-700 to-gray-900'
  },
  'newspaper': {
    id: 'newspaper',
    name: 'Newspaper Style',
    description: 'Vintage editorial layout for content-heavy portfolios',
    html: newspaperHtml,
    features: ['Column Layout', 'Article Style', 'Modal Overlays', 'Stats Boxes'],
    color: 'from-yellow-600 to-amber-700'
  },
  'storyteller': {
    id: 'storyteller',
    name: 'Storyteller',
    description: 'Cinematic narrative flow for filmmakers and storytellers',
    html: storytellerHtml,
    features: ['Chapter System', 'Parallax Effects', 'Video Sections', 'Timeline Layout'],
    color: 'from-blue-600 to-indigo-700'
  }
};

export const getSkeletonPreview = (skeletonId: string): SkeletonPreview | null => {
  return skeletonPreviews[skeletonId] || null;
};

export const getAllSkeletonPreviews = (): SkeletonPreview[] => {
  return Object.values(skeletonPreviews);
};