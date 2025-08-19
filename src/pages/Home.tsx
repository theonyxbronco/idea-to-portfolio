import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Eye, Zap, Sparkles, Globe, Accessibility, 
  ArrowRight, Play, Square, Volume2, VolumeX, Wand2,
  CheckCircle, Circle, RotateCcw, Send, Loader2
} from 'lucide-react';

// Types
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
}

interface SpeechRecognitionStatic {
  new(): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionStatic;
    webkitSpeechRecognition: SpeechRecognitionStatic;
  }
}

const VoiceWebBuilderLanding: React.FC = () => {
  // State
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasAudioPermission, setHasAudioPermission] = useState<boolean | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [volume, setVolume] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [processingStep, setProcessingStep] = useState(0);
  const [showDemo, setShowDemo] = useState(false);

  // Refs
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  const volumeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Sample prompts for inspiration
  const samplePrompts = [
    "Create a modern portfolio website for a graphic designer with a dark theme and animated elements",
    "Build a restaurant website with online ordering, menu showcase, and contact information",
    "Make a tech startup landing page with hero section, features, testimonials, and pricing",
    "Design a photography portfolio with image galleries, about section, and booking form",
    "Create an e-commerce store for handmade jewelry with product catalog and shopping cart"
  ];

  const processingSteps = [
    { icon: Volume2, text: "Analyzing your voice input...", color: "text-blue-500" },
    { icon: Sparkles, text: "Understanding your vision...", color: "text-purple-500" },
    { icon: Wand2, text: "Generating your website...", color: "text-green-500" },
    { icon: Eye, text: "Preparing edit interface...", color: "text-orange-500" },
    { icon: CheckCircle, text: "Ready for eye tracking!", color: "text-emerald-500" }
  ];

  // Check for speech recognition support
  useEffect(() => {
    const checkSpeechSupport = () => {
      if (typeof window !== 'undefined') {
        const supported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
        setSpeechSupported(supported);
        return supported;
      }
      return false;
    };

    checkSpeechSupport();
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (!speechSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      startVolumeMonitoring();
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
          setConfidence(event.results[i][0].confidence);
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
        setInterimTranscript('');
      } else {
        setInterimTranscript(interim);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setHasAudioPermission(false);
      }
      setIsListening(false);
      stopVolumeMonitoring();
    };

    recognition.onend = () => {
      setIsListening(false);
      stopVolumeMonitoring();
    };

    speechRecognitionRef.current = recognition;

    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      stopVolumeMonitoring();
    };
  }, [speechSupported]);

  // Volume monitoring for visual feedback
  const startVolumeMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasAudioPermission(true);
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      volumeIntervalRef.current = setInterval(() => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setVolume(average / 255);
        }
      }, 100);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setHasAudioPermission(false);
    }
  };

  const stopVolumeMonitoring = () => {
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setVolume(0);
  };

  // Toggle speech recognition
  const toggleListening = () => {
    if (!speechRecognitionRef.current) return;

    if (isListening) {
      speechRecognitionRef.current.stop();
    } else {
      speechRecognitionRef.current.start();
    }
  };

  // Clear transcript
  const clearTranscript = () => {
    setTranscript('');
    setInterimTranscript('');
    setConfidence(0);
  };

  // Generate website
  const generateWebsite = async () => {
    if (!transcript.trim()) return;

    setIsGenerating(true);
    setProcessingStep(0);

    // Simulate processing steps
    for (let i = 0; i < processingSteps.length; i++) {
      setProcessingStep(i);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // In a real implementation, this would call your API
    setTimeout(() => {
      setIsGenerating(false);
      alert(`🎉 Website generated! Moving to edit interface...\n\nYour prompt: "${transcript}"`);
    }, 1000);
  };

  // Use sample prompt
  const useSamplePrompt = (prompt: string) => {
    setTranscript(prompt);
    setInterimTranscript('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-2000" />
      </div>

      {/* Demo mode overlay */}
      {showDemo && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full">
            <h3 className="text-2xl font-bold mb-4">Live Demo</h3>
            <p className="text-gray-600 mb-6">
              This is a demo of the voice web builder. In the full version, your voice input would generate a complete website that you can then edit using eye tracking and voice commands.
            </p>
            <button 
              onClick={() => setShowDemo(false)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              Close Demo
            </button>
          </div>
        </div>
      )}

      <div className="relative z-10">
        {/* Header */}
        <header className="container mx-auto px-6 py-8">
          <nav className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">VoiceBuilder</span>
            </div>
            <button 
              onClick={() => setShowDemo(true)}
              className="bg-white/10 backdrop-blur-md text-white px-6 py-2 rounded-full border border-white/20 hover:bg-white/20 transition-all"
            >
              View Demo
            </button>
          </nav>
        </header>

        {/* Hero Section */}
        <main className="container mx-auto px-6 py-12">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md px-6 py-3 rounded-full text-white/90 text-sm font-medium mb-8">
              <Accessibility className="w-4 h-4" />
              <span>Built for accessibility and ease of use</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Build Websites with
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> Voice</span>
            </h1>
            
            <p className="text-xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed">
              Speak your vision, watch it come to life. Edit with your eyes and voice commands. 
              The most accessible way to create stunning websites.
            </p>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-16">
              {[
                {
                  icon: Mic,
                  title: "Voice Generation",
                  description: "Describe your website and watch it materialize"
                },
                {
                  icon: Eye,
                  title: "Eye Tracking",
                  description: "Look at elements to select them for editing"
                },
                {
                  icon: Zap,
                  title: "Voice Commands",
                  description: "Edit content with simple voice instructions"
                }
              ].map((feature, index) => (
                <div key={index} className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                  <feature.icon className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-white/70">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Voice Input Section */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl">
              {!speechSupported ? (
                <div className="text-center text-white/80">
                  <VolumeX className="w-16 h-16 mx-auto mb-4 text-red-400" />
                  <h3 className="text-xl font-semibold mb-2">Speech Recognition Not Supported</h3>
                  <p>Your browser doesn't support speech recognition. Please use Chrome, Edge, or Safari.</p>
                </div>
              ) : hasAudioPermission === false ? (
                <div className="text-center text-white/80">
                  <MicOff className="w-16 h-16 mx-auto mb-4 text-red-400" />
                  <h3 className="text-xl font-semibold mb-2">Microphone Permission Required</h3>
                  <p>Please allow microphone access to use voice commands.</p>
                  <button 
                    onClick={toggleListening}
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
                  >
                    Grant Permission
                  </button>
                </div>
              ) : isGenerating ? (
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-white mb-8">Creating Your Website</h3>
                  
                  <div className="space-y-6">
                    {processingSteps.map((step, index) => {
                      const Icon = step.icon;
                      const isActive = index === processingStep;
                      const isCompleted = index < processingStep;
                      
                      return (
                        <div 
                          key={index}
                          className={`flex items-center justify-center space-x-4 transition-all duration-500 ${
                            isActive ? 'scale-110' : isCompleted ? 'opacity-60' : 'opacity-30'
                          }`}
                        >
                          <div className={`p-3 rounded-full ${
                            isCompleted ? 'bg-green-500/20' : 
                            isActive ? 'bg-blue-500/20 animate-pulse' : 'bg-gray-500/20'
                          }`}>
                            <Icon className={`w-6 h-6 ${isCompleted ? 'text-green-400' : step.color}`} />
                          </div>
                          <span className={`text-lg font-medium ${
                            isActive ? 'text-white' : 'text-white/70'
                          }`}>
                            {step.text}
                          </span>
                          {isActive && <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-white mb-4">
                      Describe Your Website
                    </h2>
                    <p className="text-white/70">
                      Press the microphone and tell us what kind of website you want to create
                    </p>
                  </div>

                  {/* Voice Input Interface */}
                  <div className="relative">
                    {/* Transcript Display */}
                    <div className="bg-black/20 rounded-2xl p-6 mb-6 min-h-[120px] border border-white/10">
                      {transcript || interimTranscript ? (
                        <div className="text-white">
                          <span className="text-white">{transcript}</span>
                          {interimTranscript && (
                            <span className="text-white/60 italic"> {interimTranscript}</span>
                          )}
                        </div>
                      ) : (
                        <div className="text-white/50 text-center flex items-center justify-center h-full">
                          <Mic className="w-6 h-6 mr-2" />
                          Click the microphone to start speaking...
                        </div>
                      )}
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-center space-x-4 mb-6">
                      <button
                        onClick={toggleListening}
                        disabled={isGenerating}
                        className={`relative p-6 rounded-full transition-all duration-300 transform hover:scale-110 ${
                          isListening 
                            ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                            : 'bg-blue-600 hover:bg-blue-700'
                        } text-white shadow-2xl`}
                      >
                        {isListening ? (
                          <Square className="w-8 h-8" />
                        ) : (
                          <Mic className="w-8 h-8" />
                        )}
                        
                        {/* Volume visualization */}
                        {isListening && (
                          <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-ping" 
                               style={{ 
                                 transform: `scale(${1 + volume * 0.3})`,
                                 opacity: volume 
                               }} 
                          />
                        )}
                      </button>

                      {transcript && (
                        <>
                          <button
                            onClick={clearTranscript}
                            className="p-3 bg-gray-600 hover:bg-gray-700 text-white rounded-full transition-all"
                          >
                            <RotateCcw className="w-5 h-5" />
                          </button>
                          
                          <button
                            onClick={generateWebsite}
                            disabled={isGenerating}
                            className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-4 rounded-full font-bold text-lg transition-all transform hover:scale-105 shadow-2xl"
                          >
                            <Send className="w-6 h-6" />
                            <span>Generate Website</span>
                            <ArrowRight className="w-6 h-6" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Status indicators */}
                    {isListening && (
                      <div className="text-center space-y-2">
                        <div className="flex items-center justify-center space-x-2 text-green-400">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce delay-100" />
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce delay-200" />
                          <span className="ml-2 font-medium">Listening...</span>
                        </div>
                        {confidence > 0 && (
                          <div className="text-sm text-white/60">
                            Confidence: {Math.round(confidence * 100)}%
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Sample Prompts */}
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-white mb-4 text-center">
                      Need inspiration? Try these examples:
                    </h3>
                    <div className="grid gap-3">
                      {samplePrompts.map((prompt, index) => (
                        <button
                          key={index}
                          onClick={() => useSamplePrompt(prompt)}
                          className="text-left p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all text-white/80 hover:text-white"
                        >
                          <div className="flex items-start space-x-3">
                            <Sparkles className="w-5 h-5 mt-0.5 text-purple-400 flex-shrink-0" />
                            <span className="text-sm">{prompt}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* How it works */}
          <div className="mt-24 text-center">
            <h2 className="text-4xl font-bold text-white mb-12">How It Works</h2>
            <div className="grid md:grid-cols-4 gap-8">
              {[
                {
                  step: "1",
                  icon: Mic,
                  title: "Speak Your Vision",
                  description: "Describe the website you want to create using natural language"
                },
                {
                  step: "2", 
                  icon: Wand2,
                  title: "AI Generation",
                  description: "Our AI understands your requirements and generates a complete website"
                },
                {
                  step: "3",
                  icon: Eye,
                  title: "Eye Tracking Edit",
                  description: "Look at any element on your website to select it for editing"
                },
                {
                  step: "4",
                  icon: Globe,
                  title: "Voice Deploy",
                  description: "Say 'deploy' to publish your website live on the internet"
                }
              ].map((item, index) => (
                <div key={index} className="relative">
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <item.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                    <p className="text-white/70 text-sm">{item.description}</p>
                  </div>
                  <div className="absolute -top-3 -left-3 w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {item.step}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="container mx-auto px-6 py-12 text-center text-white/60">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Eye className="w-5 h-5" />
            <span className="font-semibold">VoiceBuilder</span>
          </div>
          <p>Building the future of accessible web development</p>
        </footer>
      </div>
    </div>
  );
};

export default VoiceWebBuilderLanding;