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
  RefreshCw,
  Eye,
  Globe
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
        }
      ];
      setPortfolios(mockPortfolios);
      
      // Extract all unique skills and tags for filters
      const uniqueSkills = [...new Set(mockPortfolios.flatMap(p => p.skills))].sort();
      const uniqueTags = [...new Set(mockPortfolios.flatMap(p => p.projects.flatMap(pr => pr.tags)))].sort();
      setAllSkills(uniqueSkills);
      setAllTags(uniqueTags);
    } catch (err) {
      console.error('Error loading portfolios:', err);
      setError(err instanceof Error ? err.message : 'Failed to load portfolios');
      toast({
        title: "Demo Mode",
        description: "Using sample portfolio data for demonstration",
      });
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
      <div className="min-h-screen bg-[#FFFEEA] dark:bg-[#06070A] flex items-center justify-center transition-colors duration-500">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#06070A] dark:text-[#FFFEEA] mx-auto mb-4" />
          <p className="text-[#06070A]/60 dark:text-[#FFFEEA]/60">Loading portfolio showroom...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFEEA] dark:bg-[#06070A] pt-20 transition-colors duration-500">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-light mb-4 text-[#06070A] dark:text-[#FFFEEA]" style={{ fontFamily: 'Waldenburg, system-ui, sans-serif' }}>
              Portfolio Showroom
            </h1>
            <p className="text-xl text-[#06070A]/60 dark:text-[#FFFEEA]/60 mb-6 font-light">
              Discover amazing portfolios created with Prism AI
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

            <div className="flex justify-center space-x-8 text-sm text-[#06070A]/60 dark:text-[#FFFEEA]/60">
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
                className="flex items-center gap-2 rounded-full font-light"
              >
                <User className="h-4 w-4" />
                Filter by Skills
                {selectedSkills.length > 0 && (
                  <Badge className="ml-1 px-1 py-0 text-xs min-w-[20px] h-5 bg-[#06070A] dark:bg-[#FFFEEA] text-[#FFFEEA] dark:text-[#06070A] border-0">
                    {selectedSkills.length}
                  </Badge>
                )}
              </Button>

              <Button
                variant={showTagsFilter ? "default" : "outline"}
                size="sm"
                onClick={() => setShowTagsFilter(!showTagsFilter)}
                className="flex items-center gap-2 rounded-full font-light"
              >
                <Tag className="h-4 w-4" />
                Filter by Project Tags
                {selectedTags.length > 0 && (
                  <Badge className="ml-1 px-1 py-0 text-xs min-w-[20px] h-5 bg-[#06070A] dark:bg-[#FFFEEA] text-[#FFFEEA] dark:text-[#06070A] border-0">
                    {selectedTags.length}
                  </Badge>
                )}
              </Button>

              {(selectedSkills.length > 0 || selectedTags.length > 0) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearAllFilters}
                  className="text-[#06070A]/60 dark:text-[#FFFEEA]/60 hover:text-[#06070A] dark:hover:text-[#FFFEEA] rounded-full font-light"
                >
                  Clear All Filters
                </Button>
              )}
            </div>

            {/* Collapsible Filter Sections */}
            <div className="space-y-4">
              {/* Skills Filter */}
              {showSkillsFilter && (
                <div className="border border-[#06070A]/10 dark:border-[#FFFEEA]/20 rounded-xl p-4 bg-white dark:bg-[#FFFEEA]/5">
                  <h3 className="text-sm font-light text-[#06070A] dark:text-[#FFFEEA] mb-3 flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Skills & Expertise
                  </h3>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-[#06070A]/5 dark:bg-[#FFFEEA]/5 rounded border-2 border-dashed border-[#06070A]/10 dark:border-[#FFFEEA]/10">
                    {allSkills.map((skill) => (
                      <Badge
                        key={skill}
                        variant={selectedSkills.includes(skill) ? "default" : "outline"}
                        className={`cursor-pointer transition-all hover:scale-105 font-light text-xs ${
                          selectedSkills.includes(skill) 
                            ? 'bg-[#06070A] dark:bg-[#FFFEEA] text-[#FFFEEA] dark:text-[#06070A] hover:bg-[#06070A]/90 dark:hover:bg-[#FFFEEA]/90' 
                            : 'hover:bg-[#06070A]/10 dark:hover:bg-[#FFFEEA]/10'
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
                <div className="border border-[#06070A]/10 dark:border-[#FFFEEA]/20 rounded-xl p-4 bg-white dark:bg-[#FFFEEA]/5">
                  <h3 className="text-sm font-light text-[#06070A] dark:text-[#FFFEEA] mb-3 flex items-center">
                    <Tag className="h-4 w-4 mr-2" />
                    Project Tags
                  </h3>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-[#06070A]/5 dark:bg-[#FFFEEA]/5 rounded border-2 border-dashed border-[#06070A]/10 dark:border-[#FFFEEA]/10">
                    {allTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant={selectedTags.includes(tag) ? "default" : "outline"}
                        className={`cursor-pointer transition-all hover:scale-105 font-light text-xs ${
                          selectedTags.includes(tag) 
                            ? 'bg-[#06070A] dark:bg-[#FFFEEA] text-[#FFFEEA] dark:text-[#06070A] hover:bg-[#06070A]/90 dark:hover:bg-[#FFFEEA]/90' 
                            : 'hover:bg-[#06070A]/10 dark:hover:bg-[#FFFEEA]/10'
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
                className="group relative overflow-hidden border-[#06070A]/10 dark:border-[#FFFEEA]/20 rounded-xl bg-white dark:bg-[#FFFEEA]/5 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
              >
                {/* Portfolio Preview - Main Content */}
                <div className="relative h-64 bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-xl overflow-hidden">
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <Globe className="h-12 w-12 text-gray-400" />
                  </div>
                  
                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => handleVisitPortfolio(portfolio.portfolioUrl)}
                        size="sm"
                        className="bg-white/90 text-[#06070A] hover:bg-white rounded-full font-light"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Visit
                      </Button>
                      <Button
                        onClick={() => handleViewInfo(portfolio)}
                        size="sm"
                        variant="outline"
                        className="bg-white/90 hover:bg-white border-white/50 text-[#06070A] rounded-full font-light"
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
                      <h3 className="font-light text-lg text-[#06070A] dark:text-[#FFFEEA]">{portfolio.personName}</h3>
                      <p className="text-[#06070A]/60 dark:text-[#FFFEEA]/60 font-light">{portfolio.title}</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {portfolio.skills.slice(0, 3).map((skill, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs font-light bg-[#06070A]/10 dark:bg-[#FFFEEA]/10 text-[#06070A] dark:text-[#FFFEEA] border-0">
                          {skill}
                        </Badge>
                      ))}
                      {portfolio.skills.length > 3 && (
                        <Badge variant="secondary" className="text-xs font-light bg-[#06070A]/10 dark:bg-[#FFFEEA]/10 text-[#06070A] dark:text-[#FFFEEA] border-0">
                          +{portfolio.skills.length - 3}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-sm text-[#06070A]/60 dark:text-[#FFFEEA]/60">
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
                <div className="text-[#06070A]/60 dark:text-[#FFFEEA]/60">
                  <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-light mb-2">No portfolios match your filters</h3>
                  <p className="text-sm mb-4 font-light">Try adjusting your filter criteria or clear all filters to see all portfolios.</p>
                  <Button variant="outline" onClick={clearAllFilters} className="rounded-full font-light">
                    Clear All Filters
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Info Dialog */}
          <Dialog open={!!selectedPortfolio} onOpenChange={() => setSelectedPortfolio(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-[#06070A] border-[#06070A]/10 dark:border-[#FFFEEA]/20 rounded-xl">
              {selectedPortfolio && (
                <>
                  <DialogHeader className="border-b border-[#06070A]/10 dark:border-[#FFFEEA]/20 pb-4">
                    <DialogTitle className="text-2xl flex items-center font-light text-[#06070A] dark:text-[#FFFEEA]">
                      <User className="h-6 w-6 mr-3" />
                      {selectedPortfolio.personName}
                    </DialogTitle>
                    <DialogDescription className="text-lg text-[#06070A]/60 dark:text-[#FFFEEA]/60 font-light">
                      {selectedPortfolio.title}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6 py-4 overflow-y-auto flex-1 pr-2"
                       style={{ maxHeight: 'calc(90vh - 120px)' }}>
                    {/* Personal Info */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-light border-b border-[#06070A]/10 dark:border-[#FFFEEA]/20 pb-2 text-[#06070A] dark:text-[#FFFEEA]">
                        Personal Information
                      </h3>
                      
                      {selectedPortfolio.bio && (
                        <p className="text-[#06070A]/60 dark:text-[#FFFEEA]/60 font-light">{selectedPortfolio.bio}</p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-[#06070A]/60 dark:text-[#FFFEEA]/60" />
                          <span className="text-sm text-[#06070A] dark:text-[#FFFEEA]">{selectedPortfolio.email}</span>
                        </div>
                        
                        {selectedPortfolio.phone && (
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-[#06070A]/60 dark:text-[#FFFEEA]/60" />
                            <span className="text-sm text-[#06070A] dark:text-[#FFFEEA]">{selectedPortfolio.phone}</span>
                          </div>
                        )}
                        
                        {selectedPortfolio.linkedin && (
                          <div className="flex items-center space-x-2">
                            <Linkedin className="h-4 w-4 text-[#06070A]/60 dark:text-[#FFFEEA]/60" />
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
                            <Instagram className="h-4 w-4 text-[#06070A]/60 dark:text-[#FFFEEA]/60" />
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
                        <h4 className="font-light mb-2 text-[#06070A] dark:text-[#FFFEEA]">Skills & Expertise</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedPortfolio.skills.map((skill, idx) => (
                            <Badge key={idx} variant="secondary" className="font-light bg-[#06070A]/10 dark:bg-[#FFFEEA]/10 text-[#06070A] dark:text-[#FFFEEA] border-0">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Projects */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-light border-b border-[#06070A]/10 dark:border-[#FFFEEA]/20 pb-2 text-[#06070A] dark:text-[#FFFEEA]">
                        Portfolio Projects ({selectedPortfolio.projects.length})
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedPortfolio.projects.map((project) => (
                          <Card key={project.id} className="border border-[#06070A]/10 dark:border-[#FFFEEA]/20 bg-white dark:bg-[#FFFEEA]/5">
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div>
                                  <h4 className="font-light text-[#06070A] dark:text-[#FFFEEA]">{project.title}</h4>
                                  {project.subtitle && (
                                    <p className="text-sm text-[#06070A]/60 dark:text-[#FFFEEA]/60 font-light">{project.subtitle}</p>
                                  )}
                                </div>
                                
                                {project.overview && (
                                  <p className="text-sm text-[#06070A]/60 dark:text-[#FFFEEA]/60 font-light">{project.overview}</p>
                                )}
                                
                                <div className="flex items-center justify-between text-xs text-[#06070A]/60 dark:text-[#FFFEEA]/60">
                                  <Badge variant="outline" className="text-xs font-light bg-[#06070A]/10 dark:bg-[#FFFEEA]/10 text-[#06070A] dark:text-[#FFFEEA] border-0">
                                    {project.category}
                                  </Badge>
                                  <div className="flex items-center space-x-3">
                                    <span>{project.processImagesCount + project.finalImagesCount} images</span>
                                    <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                                  </div>
                                </div>
                                
                                <div className="flex flex-wrap gap-1">
                                  {project.tags.map((tag, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs font-light bg-[#06070A]/10 dark:bg-[#FFFEEA]/10 text-[#06070A] dark:text-[#FFFEEA] border-0">
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
                    <div className="flex justify-center pt-4 border-t border-[#06070A]/10 dark:border-[#FFFEEA]/20">
                      <Button
                        onClick={() => handleVisitPortfolio(selectedPortfolio.portfolioUrl)}
                        size="lg"
                        className="px-8 rounded-full font-light bg-[#06070A] dark:bg-[#FFFEEA] text-[#FFFEEA] dark:text-[#06070A] hover:scale-105 transition-all"
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
          <div className="text-center mt-16 py-12 bg-[#06070A] dark:bg-[#FFFEEA] rounded-2xl">
            <h2 className="text-2xl font-light mb-4 text-[#FFFEEA] dark:text-[#06070A]" style={{ fontFamily: 'Waldenburg, system-ui, sans-serif' }}>
              Ready to Create Your Own Portfolio?
            </h2>
            <p className="text-[#FFFEEA]/60 dark:text-[#06070A]/60 mb-6 max-w-2xl mx-auto font-light">
              Join these talented creatives and showcase your work with an AI-generated portfolio in minutes.
            </p>
            <Button size="lg" className="px-8 py-3 rounded-full font-light bg-[#FFFEEA] dark:bg-[#06070A] text-[#06070A] dark:text-[#FFFEEA] hover:scale-105 transition-all">
              Start Creating Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Showroom;