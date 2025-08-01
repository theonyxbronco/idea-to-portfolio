import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface WaitlistFormProps {
  title?: string;
  subtitle?: string;
}

const WaitlistForm = ({ 
  title = "Join the Pro Waitlist",
  subtitle = "Be the first to get access to all of our tools we're building for you."
}: WaitlistFormProps) => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: "Thank you for joining the waitlist!",
      description: "We'll notify you when beta access is available.",
    });
    
    setEmail("");
    setIsLoading(false);
  };

  return (
    <div className="p-8">
      <div className="text-center mb-6">
        <h3 className="text-5xl text-primary font-semibold mb-2">{title}</h3>
        <p className="text-primary opacity-60 text-md font-light">{subtitle}</p>
      </div>
      
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1 py-6 px-6"
        />
        <Button 
          type="submit" 
          variant="default"
          size="lg"
          disabled={isLoading}
          className="sm:w-auto text-md py-6 px-10"
        >
          {isLoading ? "Joining..." : "Join Waitlist"}
        </Button>
      </form>
    </div>
  );
};

export default WaitlistForm;