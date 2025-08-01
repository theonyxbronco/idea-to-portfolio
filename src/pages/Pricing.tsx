import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import WaitlistForm from "@/components/WaitlistForm";
import { Check } from "lucide-react";
import { useParallax } from "@/hooks/use-parallax";

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
      description: "Ideal for students growing their presense, or building their portfolio",
      features: [
        "Up to 20 projects",
        "3 portfolio website",
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
        "10 portfolio website",
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

  const parallaxOffset = useParallax(0.2);
  const parallaxOffset2 = useParallax(0.15);

  return (
    <div className="min-h-screen bg-background py-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-28">
          <h1 className="text-5xl md:text-6xl font-semibold mb-3 bg-primary bg-clip-text text-transparent">
            Pricing in Your Interest
          </h1>
          <p className="text-xl text-primary font-regular opacity-60 max-w-3xl mx-auto">
            Choose the perfect plan for your needs. We make sure you never have to put a thought into worrying about your portfolio again.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-48 max-w-7xl mx-auto" 
          style={{ 
          transform: `translateY(${parallaxOffset}px)`,
          willChange: 'transform'
        }}>
          {plans.map((plan, index) => (
            <Card 
              key={index}
              className={`relative bg-gradient-card border-0 shadow-elegant hover:shadow-glow transition-all duration-300 ${
                plan.isPopular ? 'ring-2 ring-primary scale-105' : ''
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-white px-6 py-2">
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center p-8 mb-2">
                <h3 className="text-2xl font-bold mb-1">{plan.name}</h3>
                <div className="mb-4">
                  {plan.price === "0" ? (
                    <span className="text-4xl font-bold">Free</span>
                  ) : (
                    <>
                      <span className="text-4xl font-bold">€{plan.price}</span>
                      <span className="text-primary opacity-50">/{plan.period}</span>
                    </>
                  )}
                </div>
                <p className="text-primary opacity-60 pt-5">{plan.description}</p>
              </CardHeader>
              
              <CardContent className="p-8 pt-0 flex flex-col justify-between flex-1 h-[400px]">
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center">
                      <Check className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  variant={plan.isPopular ? "default" : "outline"} 
                  className="w-full"
                  size="lg"
                >
                  {plan.isPopular ? "Get Started" : "Choose Plan"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mb-80 mt-50" 
          style={{ 
          transform: `translateY(${parallaxOffset2}px)`,
          willChange: 'transform'
        }}>
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <Card className="bg-gradient-card border-0 shadow-elegant">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Can I change my plan anytime?</h3>
                <p className="text-muted-foreground">Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-card border-0 shadow-elegant">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Is there a free trial?</h3>
                <p className="text-muted-foreground">We offer a 14-day free trial for all plans. No credit card required to get started.</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-card border-0 shadow-elegant">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
                <p className="text-muted-foreground">We accept all major credit cards, PayPal, and bank transfers for annual plans.</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-0 shadow-elegant">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Underwhelmed?</h3>
                <p className="text-muted-foreground">We're just getting started. We're building this better every day, every minute, every second.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Beta Waitlist Section */}
        <div className="md:py-20 pt-52 max-w-4xl mx-auto">
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