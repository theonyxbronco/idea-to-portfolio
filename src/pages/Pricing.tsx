import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import WaitlistForm from "@/components/WaitlistForm";
import { Check } from "lucide-react";
import { useParallax } from "@/hooks/use-parallax";
import { Link, useNavigate } from "react-router-dom";

const Pricing = () => {
  const plans = [
    {
      name: "Starter",
      price: "0",
      period: "month",
      description: "Perfect for individuals who are getting to know the product and service",
      features: [
        "Up to 3 projects",
        "1 portfolio website",
        "Limited edit features",
        "Basic analytics",
        "Email support",
        "2GB file storage",
      ],
      isPopular: false
    },
    {
      name: "Student",
      price: "7",
      period: "month",
      description: "Ideal for students growing their presence, or building their portfolio",
      features: [
        "Up to 20 projects",
        "3 portfolio websites",
        "Edit features",
        "Analytics",
        "Priority support",
        "25GB file storage",
      ],
      isPopular: true
    },
    {
      name: "PRO",
      price: "12",
      period: "month",
      description: "Complete solution for professional creatives, or those who value organization",
      features: [
        "Unlimited projects",
        "10 portfolio websites",
        "Edit features",
        "Analytics",
        "Priority support",
        "25GB file storage",
        "On-premise custom deployment",
        "24/7 phone support"
      ],
      isPopular: false
    }
  ];

  const navigate = useNavigate();
  // Parallax effect for smooth scrolling
  const parallaxOffset = useParallax(0.2);
  const parallaxOffset2 = useParallax(0.15);

  return (
    <div className="min-h-screen bg-[#FFFEEA] dark:bg-[#06070A] py-20 pt-36 transition-colors duration-500">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-light mb-3 text-[#06070A] dark:text-[#FFFEEA]" style={{ fontFamily: 'Waldenburg, system-ui, sans-serif' }}>
            Pricing in Your Interest
          </h1>
          <p className="text-xl text-[#06070A]/60 dark:text-[#FFFEEA]/60 max-w-3xl mx-auto font-light">
            Choose the perfect plan for your needs. We make sure you never have to put a thought into worrying about your portfolio again.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-20 max-w-7xl mx-auto" 
          style={{ 
          transform: `translateY(${parallaxOffset}px)`,
          willChange: 'transform'
        }}>
          {plans.map((plan, index) => (
            <Card 
              key={index}
              className={`relative bg-white dark:bg-[#FFFEEA]/5 border-[#06070A]/10 dark:border-[#FFFEEA]/20 rounded-xl transition-all duration-300 hover:shadow-lg ${
                plan.isPopular ? 'ring-2 ring-[#06070A] dark:ring-[#FFFEEA] scale-105' : ''
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-[#06070A] dark:bg-[#FFFEEA] text-[#FFFEEA] dark:text-[#06070A] px-4 py-1 text-xs font-light border-0">
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center p-6 mb-2">
                <h3 className="text-2xl font-light mb-1 text-[#06070A] dark:text-[#FFFEEA]">{plan.name}</h3>
                <div className="mb-4">
                  {plan.price === "0" ? (
                    <span className="text-4xl font-light text-[#06070A] dark:text-[#FFFEEA]">Free</span>
                  ) : (
                    <>
                      <span className="text-4xl font-light text-[#06070A] dark:text-[#FFFEEA]">€{plan.price}</span>
                      <span className="text-[#06070A]/60 dark:text-[#FFFEEA]/60">/{plan.period}</span>
                    </>
                  )}
                </div>
                <p className="text-[#06070A]/60 dark:text-[#FFFEEA]/60 pt-4 font-light text-sm">{plan.description}</p>
              </CardHeader>
              
              <CardContent className="p-6 pt-0 flex flex-col justify-between flex-1 h-[400px]">
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center">
                      <Check className="w-4 h-4 text-[#06070A] dark:text-[#FFFEEA] mr-3 flex-shrink-0" />
                      <span className="text-sm text-[#06070A]/60 dark:text-[#FFFEEA]/60 font-light">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  onClick={() => navigate('/sign-in')}
                  className={`w-full rounded-full font-light transition-all duration-300 hover:scale-105 ${
                    plan.isPopular 
                      ? 'bg-[#06070A] dark:bg-[#FFFEEA] text-[#FFFEEA] dark:text-[#06070A] hover:shadow-lg' 
                      : 'bg-transparent border border-[#06070A] dark:border-[#FFFEEA] text-[#06070A] dark:text-[#FFFEEA] hover:bg-[#06070A] hover:text-[#FFFEEA] dark:hover:bg-[#FFFEEA] dark:hover:text-[#06070A]'
                  }`}
                  size="lg"
                >
                  {plan.isPopular ? "Get Started" : "Choose Plan"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mb-20" 
          style={{ 
          transform: `translateY(${parallaxOffset2}px)`,
          willChange: 'transform'
        }}>
          <h2 className="text-3xl font-light text-center mb-12 text-[#06070A] dark:text-[#FFFEEA]" style={{ fontFamily: 'Waldenburg, system-ui, sans-serif' }}>
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <Card className="bg-white dark:bg-[#FFFEEA]/5 border-[#06070A]/10 dark:border-[#FFFEEA]/20 rounded-xl">
              <CardContent className="p-6">
                <h3 className="font-light mb-2 text-[#06070A] dark:text-[#FFFEEA]">Can I change my plan anytime?</h3>
                <p className="text-[#06070A]/60 dark:text-[#FFFEEA]/60 font-light">Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.</p>
              </CardContent>
            </Card>
            
            <Card className="bg-white dark:bg-[#FFFEEA]/5 border-[#06070A]/10 dark:border-[#FFFEEA]/20 rounded-xl">
              <CardContent className="p-6">
                <h3 className="font-light mb-2 text-[#06070A] dark:text-[#FFFEEA]">Is there a free trial?</h3>
                <p className="text-[#06070A]/60 dark:text-[#FFFEEA]/60 font-light">We offer a 14-day free trial for all plans. No credit card required to get started.</p>
              </CardContent>
            </Card>
            
            <Card className="bg-white dark:bg-[#FFFEEA]/5 border-[#06070A]/10 dark:border-[#FFFEEA]/20 rounded-xl">
              <CardContent className="p-6">
                <h3 className="font-light mb-2 text-[#06070A] dark:text-[#FFFEEA]">What payment methods do you accept?</h3>
                <p className="text-[#06070A]/60 dark:text-[#FFFEEA]/60 font-light">We accept all major credit cards, PayPal, and bank transfers for annual plans.</p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-[#FFFEEA]/5 border-[#06070A]/10 dark:border-[#FFFEEA]/20 rounded-xl">
              <CardContent className="p-6">
                <h3 className="font-light mb-2 text-[#06070A] dark:text-[#FFFEEA]">Underwhelmed?</h3>
                <p className="text-[#06070A]/60 dark:text-[#FFFEEA]/60 font-light">We're just getting started. We're building this better every day, every minute, every second.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Beta Waitlist Section */}
        <div className="max-w-4xl mx-auto pt-12">
          <WaitlistForm 
            title="Join the pro waitlist"
            subtitle="Get early access to all features at a special discounted rate"
          />
        </div>
      </div>
    </div>
  );
};

export default Pricing;