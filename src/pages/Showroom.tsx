import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Info, 
  ExternalLink, 
  User, 
  FolderOpen, 
  Mail, 
  Phone, 
  Linkedin, 
  Instagram,
  Calendar,
  Tag,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/services/api';

interface Portfolio {
  id: string;
  personName: string;
  title: string;
  email: string;
  phone?: string;
  linkedin?: string;
  instagram?: string;
  bio?: string;
  portfolioUrl: string;
  deployedAt: string;
  projects: Project[];
  skills: string[];
}

interface Project {
  id: string;
  title: string;
  subtitle?: string;
  overview?: string;
  category: string;
  tags: string[];
  createdAt: string;
  processImagesCount: number;
  finalImagesCount: number;
}

const Showroom = () => {
  const { toast } = useToast();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [filteredPortfolios, setFilteredPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allSkills, setAllSkills] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [showSkillsFilter, setShowSkillsFilter] = useState(false);
  const [showTagsFilter, setShowTagsFilter] = useState(false);

  // Load portfolios from the API
  const loadPortfolios = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // This would be your API call to get deployed portfolios
      // For now, I'll create a mock API call structure
      const response = await fetch(`${import.meta.env.VITE_API_URL || API_BASE_URL}/api/get-showroom-portfolios`);
      
      if (!response.ok) {
        throw new Error(`Failed to load portfolios: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setPortfolios(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to load portfolios');
      }
    } catch (err) {
      console.error('Error loading portfolios:', err);
      setError(err instanceof Error ? err.message : 'Failed to load portfolios');
      
      // Mock data for development/demo purposes
      const mockPortfolios: Portfolio[] = [
        {
          id: '1',
          personName: 'Sarah Chen',
          title: 'UI/UX Designer',
          email: 'sarah@example.com',
          linkedin: 'linkedin.com/in/sarahchen',
          bio: 'Passionate UI/UX designer with 5 years of experience creating intuitive digital experiences.',
          portfolioUrl: 'https://sarah-chen-portfolio.netlify.app',
          deployedAt: '2025-01-15T10:30:00Z',
          skills: ['Figma', 'Adobe XD', 'Prototyping', 'User Research'],
          projects: [
            {
              id: 'p1',
              title: 'E-commerce Mobile App',
              subtitle: 'Fashion shopping experience',
              overview: 'Redesigned mobile shopping experience for a fashion retailer, focusing on seamless user journey and improved conversion rates.',
              category: 'Mobile App Design',
              tags: ['Mobile', 'E-commerce', 'iOS', 'Android'],
              createdAt: '2025-01-10T00:00:00Z',
              processImagesCount: 8,
              finalImagesCount: 3
            },
            {
              id: 'p2',
              title: 'Dashboard Redesign',
              subtitle: 'Analytics platform UI',
              overview: 'Complete redesign of a complex analytics dashboard, improving usability and data visualization.',
              category: 'Web Design',
              tags: ['Dashboard', 'Analytics', 'Data Visualization'],
              createdAt: '2025-01-05T00:00:00Z',
              processImagesCount: 12,
              finalImagesCount: 4
            }
          ]
        },
        {
          id: '2',
          personName: 'Marcus Thompson',
          title: 'Brand Designer',
          email: 'marcus@example.com',
          instagram: '@marcusdesigns',
          bio: 'Creative brand designer specializing in visual identity and packaging design.',
          portfolioUrl: 'https://marcus-thompson-brand.netlify.app',
          deployedAt: '2025-01-12T14:20:00Z',
          skills: ['Adobe Illustrator', 'Branding', 'Packaging', 'Typography'],
          projects: [
            {
              id: 'p3',
              title: 'Coffee Brand Identity',
              subtitle: 'Artisan coffee roasters',
              overview: 'Complete brand identity design for a local coffee roastery, including logo, packaging, and marketing materials.',
              category: 'Branding',
              tags: ['Logo Design', 'Packaging', 'Print Design'],
              createdAt: '2025-01-08T00:00:00Z',
              processImagesCount: 15,
              finalImagesCount: 6
            }
          ]
        },
        {
          id: '3',
          personName: 'Elena Rodriguez',
          title: 'Product Designer',
          email: 'elena@example.com',
          linkedin: 'linkedin.com/in/elenarodriguez',
          phone: '+1 (555) 123-4567',
          bio: 'Product designer focused on creating inclusive and accessible digital products.',
          portfolioUrl: 'https://elena-rodriguez-product.netlify.app',
          deployedAt: '2025-01-18T09:45:00Z',
          skills: ['Product Design', 'Accessibility', 'User Testing', 'Sketch'],
          projects: [
            {
              id: 'p4',
              title: 'Accessibility Toolkit',
              subtitle: 'Design system for inclusive products',
              overview: 'Comprehensive accessibility toolkit and design system for creating inclusive digital products.',
              category: 'Design System',
              tags: ['Accessibility', 'Design System', 'Inclusive Design'],
              createdAt: '2025-01-15T00:00:00Z',
              processImagesCount: 20,
              finalImagesCount: 8
            },
            {
              id: 'p5',
              title: 'Healthcare App',
              subtitle: 'Patient management interface',
              overview: 'User-friendly healthcare application for patient management and appointment scheduling.',
              category: 'Healthcare Design',
              tags: ['Healthcare', 'Mobile App', 'UX Research'],
              createdAt: '2025-01-12T00:00:00Z',
              processImagesCount: 10,
              finalImagesCount: 5
            }
          ]
        },
        {
          id: '4',
          personName: 'James Wilson',
          title: 'Graphic Designer',
          email: 'james@example.com',
          instagram: '@jameswilsonart',
          bio: 'Freelance graphic designer with a passion for bold, impactful visual communication.',
          portfolioUrl: 'https://james-wilson-graphics.netlify.app',
          deployedAt: '2025-01-20T16:10:00Z',
          skills: ['Adobe Creative Suite', 'Print Design', 'Digital Art', 'Illustration'],
          projects: [
            {
              id: 'p6',
              title: 'Music Festival Branding',
              subtitle: 'Visual identity for summer festival',
              overview: 'Complete visual identity and promotional materials for a 3-day music festival.',
              category: 'Event Branding',
              tags: ['Music', 'Festival', 'Poster Design', 'Social Media'],
              createdAt: '2025-01-18T00:00:00Z',
              processImagesCount: 18,
              finalImagesCount: 7
            }
          ]
        },
        {
          id: '5',
          personName: 'Aisha Patel',
          title: 'Web Designer',
          email: 'aisha@example.com',
          linkedin: 'linkedin.com/in/aishapatel',
          bio: 'Full-stack designer who bridges the gap between design and development.',
          portfolioUrl: 'https://aisha-patel-web.netlify.app',
          deployedAt: '2025-01-22T11:30:00Z',
          skills: ['Web Design', 'Frontend Development', 'React', 'CSS Animation'],
          projects: [
            {
              id: 'p7',
              title: 'SaaS Landing Page',
              subtitle: 'Conversion-optimized design',
              overview: 'High-converting landing page design for a B2B SaaS platform with focus on user onboarding.',
              category: 'Web Design',
              tags: ['SaaS', 'Landing Page', 'Conversion Optimization'],
              createdAt: '2025-01-20T00:00:00Z',
              processImagesCount: 12,
              finalImagesCount: 4
            },
            {
              id: 'p8',
              title: 'Interactive Portfolio',
              subtitle: 'Creative developer showcase',
              overview: 'Interactive portfolio website with custom animations and micro-interactions.',
              category: 'Interactive Design',
              tags: ['Interactive', 'Animation', 'Portfolio', 'JavaScript'],
              createdAt: '2025-01-17T00:00:00Z',
              processImagesCount: 14,
              finalImagesCount: 6
            }
          ]
        },
        {
          id: '6',
          personName: 'David Kim',
          title: 'Motion Designer',
          email: 'david@example.com',
          instagram: '@davidkimmotion',
          bio: 'Motion graphics designer creating engaging animations for digital and broadcast media.',
          portfolioUrl: 'https://david-kim-motion.netlify.app',
          deployedAt: '2025-01-25T13:45:00Z',
          skills: ['After Effects', '3D Animation', 'Cinema 4D', 'Motion Graphics'],
          projects: [
            {
              id: 'p9',
              title: 'Brand Animation Series',
              subtitle: 'Animated logo transitions',
              overview: 'Series of animated logo transitions and brand elements for various client projects.',
              category: 'Motion Graphics',
              tags: ['Animation', 'Branding', 'Logo Animation'],
              createdAt: '2025-01-22T00:00:00Z',
              processImagesCount: 25,
              finalImagesCount: 10
            }
          ]
        }
      ];
      setPortfolios(mockPortfolios);
      
      // Extract all unique skills and tags for filters
      const uniqueSkills = [...new Set(mockPortfolios.flatMap(p => p.skills))].sort();
      const uniqueTags = [...new Set(mockPortfolios.flatMap(p => p.projects.flatMap(pr => pr.tags)))].sort();
      setAllSkills(uniqueSkills);
      setAllTags(uniqueTags);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolios();
  }, []);

  // Filter portfolios based on selected skills and tags
  useEffect(() => {
    let filtered = portfolios;

    if (selectedSkills.length > 0) {
      filtered = filtered.filter(portfolio => 
        selectedSkills.some(skill => portfolio.skills.includes(skill))
      );
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter(portfolio =>
        portfolio.projects.some(project =>
          selectedTags.some(tag => project.tags.includes(tag))
        )
      );
    }

    setFilteredPortfolios(filtered);
  }, [portfolios, selectedSkills, selectedTags]);

  const handleSkillToggle = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearAllFilters = () => {
    setSelectedSkills([]);
    setSelectedTags([]);
    setShowSkillsFilter(false);
    setShowTagsFilter(false);
  };

  const handleViewInfo = (portfolio: Portfolio) => {
    setSelectedPortfolio(portfolio);
  };

  const handleVisitPortfolio = (url: string) => {
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading portfolio showroom...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
              Portfolio Showroom
            </h1>
            <p className="text-xl text-muted-foreground mb-6">
              Discover amazing portfolios created with Moodi AI
            </p>
            
            {error && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 max-w-md mx-auto">
                <div className="flex items-center">
                  <RefreshCw className="h-5 w-5 text-yellow-600 mr-2" />
                  <p className="text-sm text-yellow-800">
                    {error} - Showing demo portfolios
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-center space-x-8 text-sm text-muted-foreground">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span>{filteredPortfolios.length} Live Portfolios</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                <span>AI Generated</span>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-8">
            {/* Filter Toggle Buttons */}
            <div className="flex flex-wrap gap-3 mb-4">
              <Button
                variant={showSkillsFilter ? "default" : "outline"}
                size="sm"
                onClick={() => setShowSkillsFilter(!showSkillsFilter)}
                className="flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                Filter by Skills
                {selectedSkills.length > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1 py-0 text-xs min-w-[20px] h-5">
                    {selectedSkills.length}
                  </Badge>
                )}
              </Button>

              <Button
                variant={showTagsFilter ? "default" : "outline"}
                size="sm"
                onClick={() => setShowTagsFilter(!showTagsFilter)}
                className="flex items-center gap-2"
              >
                <Tag className="h-4 w-4" />
                Filter by Project Tags
                {selectedTags.length > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1 py-0 text-xs min-w-[20px] h-5">
                    {selectedTags.length}
                  </Badge>
                )}
              </Button>

              {(selectedSkills.length > 0 || selectedTags.length > 0) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearAllFilters}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Clear All Filters
                </Button>
              )}
            </div>

            {/* Collapsible Filter Sections */}
            <div className="space-y-4">
              {/* Skills Filter */}
              {showSkillsFilter && (
                <div className="border border-border rounded-lg p-4 bg-card">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Skills & Expertise
                  </h3>
                  <div 
                    className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-muted/30 rounded border-2 border-dashed border-border"
                  >
                    {allSkills.map((skill) => (
                      <Badge
                        key={skill}
                        variant={selectedSkills.includes(skill) ? "default" : "outline"}
                        className={`cursor-pointer transition-all hover:scale-105 ${
                          selectedSkills.includes(skill) 
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                            : 'hover:bg-secondary'
                        }`}
                        onClick={() => handleSkillToggle(skill)}
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags Filter */}
              {showTagsFilter && (
                <div className="border border-border rounded-lg p-4 bg-card">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center">
                    <Tag className="h-4 w-4 mr-2" />
                    Project Tags
                  </h3>
                  <div 
                    className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-muted/30 rounded border-2 border-dashed border-border"
                  >
                    {allTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant={selectedTags.includes(tag) ? "default" : "outline"}
                        className={`cursor-pointer transition-all hover:scale-105 ${
                          selectedTags.includes(tag) 
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                            : 'hover:bg-secondary'
                        }`}
                        onClick={() => handleTagToggle(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Portfolio Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPortfolios.length > 0 ? (
              filteredPortfolios.map((portfolio) => (
              <Card 
                key={portfolio.id} 
                className="group relative overflow-hidden border-0 shadow-medium hover:shadow-large transition-all duration-300 hover:transform hover:scale-[1.02]"
              >
                {/* Portfolio Preview - Main Content */}
                <div className="relative h-64 bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-lg overflow-hidden">
                  <iframe
                    src={portfolio.portfolioUrl}
                    className="w-full h-full border-0 pointer-events-none scale-[0.3] origin-top-left transform translate-x-0 translate-y-0"
                    style={{ 
                      width: '300%', 
                      height: '300%',
                      transform: 'scale(0.33) translate(-50%, -50%)',
                      transformOrigin: 'top left'
                    }}
                    title={`${portfolio.personName} Portfolio Preview`}
                    sandbox="allow-same-origin"
                  />
                  
                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => handleVisitPortfolio(portfolio.portfolioUrl)}
                        size="sm"
                        className="bg-white/90 text-black hover:bg-white"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Visit
                      </Button>
                      <Button
                        onClick={() => handleViewInfo(portfolio)}
                        size="sm"
                        variant="outline"
                        className="bg-white/90 hover:bg-white border-white/50"
                      >
                        <Info className="h-4 w-4 mr-1" />
                        Info
                      </Button>
                    </div>
                  </div>

                  {/* Info Icon in top-right */}
                  <button
                    onClick={() => handleViewInfo(portfolio)}
                    className="absolute top-3 right-3 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100"
                  >
                    <Info className="h-4 w-4 text-gray-700" />
                  </button>
                </div>

                {/* Portfolio Info */}
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{portfolio.personName}</h3>
                      <p className="text-muted-foreground">{portfolio.title}</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {portfolio.skills.slice(0, 3).map((skill, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {portfolio.skills.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{portfolio.skills.length - 3}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <FolderOpen className="h-4 w-4 mr-1" />
                        <span>{portfolio.projects.length} project{portfolio.projects.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>{new Date(portfolio.deployedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
            ) : (
              <div className="col-span-full text-center py-12">
                <div className="text-muted-foreground">
                  <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No portfolios match your filters</h3>
                  <p className="text-sm mb-4">Try adjusting your filter criteria or clear all filters to see all portfolios.</p>
                  <Button variant="outline" onClick={clearAllFilters}>
                    Clear All Filters
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Info Dialog */}
          <Dialog open={!!selectedPortfolio} onOpenChange={() => setSelectedPortfolio(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              {selectedPortfolio && (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-2xl flex items-center">
                      <User className="h-6 w-6 mr-3" />
                      {selectedPortfolio.personName}
                    </DialogTitle>
                    <DialogDescription className="text-lg">
                      {selectedPortfolio.title}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6 py-4 overflow-y-auto flex-1 pr-2"
                       style={{ maxHeight: 'calc(90vh - 120px)' }}>
                    {/* Personal Info */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold border-b border-border pb-2">
                        Personal Information
                      </h3>
                      
                      {selectedPortfolio.bio && (
                        <p className="text-muted-foreground">{selectedPortfolio.bio}</p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{selectedPortfolio.email}</span>
                        </div>
                        
                        {selectedPortfolio.phone && (
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{selectedPortfolio.phone}</span>
                          </div>
                        )}
                        
                        {selectedPortfolio.linkedin && (
                          <div className="flex items-center space-x-2">
                            <Linkedin className="h-4 w-4 text-muted-foreground" />
                            <a 
                              href={`https://${selectedPortfolio.linkedin}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline"
                            >
                              {selectedPortfolio.linkedin}
                            </a>
                          </div>
                        )}
                        
                        {selectedPortfolio.instagram && (
                          <div className="flex items-center space-x-2">
                            <Instagram className="h-4 w-4 text-muted-foreground" />
                            <a 
                              href={`https://instagram.com/${selectedPortfolio.instagram.replace('@', '')}`}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline"
                            >
                              {selectedPortfolio.instagram}
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Skills */}
                      <div>
                        <h4 className="font-medium mb-2">Skills & Expertise</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedPortfolio.skills.map((skill, idx) => (
                            <Badge key={idx} variant="secondary">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Projects */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold border-b border-border pb-2">
                        Portfolio Projects ({selectedPortfolio.projects.length})
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedPortfolio.projects.map((project) => (
                          <Card key={project.id} className="border border-border">
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div>
                                  <h4 className="font-semibold">{project.title}</h4>
                                  {project.subtitle && (
                                    <p className="text-sm text-muted-foreground">{project.subtitle}</p>
                                  )}
                                </div>
                                
                                {project.overview && (
                                  <p className="text-sm">{project.overview}</p>
                                )}
                                
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <Badge variant="outline" className="text-xs">
                                    {project.category}
                                  </Badge>
                                  <div className="flex items-center space-x-3">
                                    <span>{project.processImagesCount + project.finalImagesCount} images</span>
                                    <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                                  </div>
                                </div>
                                
                                <div className="flex flex-wrap gap-1">
                                  {project.tags.map((tag, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Portfolio Link */}
                    <div className="flex justify-center pt-4 border-t border-border">
                      <Button
                        onClick={() => handleVisitPortfolio(selectedPortfolio.portfolioUrl)}
                        size="lg"
                        className="px-8"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Visit Live Portfolio
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>

          {/* Footer Call to Action */}
          <div className="text-center mt-16 py-12 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to Create Your Own Portfolio?
            </h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Join these talented creatives and showcase your work with an AI-generated portfolio in minutes.
            </p>
            <Button size="lg" className="px-8 py-3">
              Start Creating Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Showroom;