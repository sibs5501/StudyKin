import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageCircle, BookOpen, Brain, Target, Users, Star } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-study-ai.jpg";

const HomePage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <span className="text-xl sm:text-2xl font-bold text-foreground">StudyKin</span>
          </div>
          <nav className="hidden lg:flex space-x-6">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">About</a>
            <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</a>
          </nav>
          <div className="flex space-x-1 sm:space-x-2">
            <Link to="/signin">
              <Button variant="outline" size="sm" className="text-xs sm:text-sm">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="text-xs sm:text-sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 sm:py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Your AI-Powered 
              <span className="text-primary"> Study Companion</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto px-4">
              Transform your learning experience with personalized AI assistance, smart study plans, and wellness tracking. StudyKin adapts to your learning style for maximum efficiency.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12 px-4">
              <Link to="/signup" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4">
                  Start Learning Today
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 flex items-center justify-center gap-2"
              >
                <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                Try AI Chat
              </Button>
            </div>
            
            {/* Hero Image */}
            <div className="relative max-w-4xl mx-auto px-4">
              <img 
                src={heroImage} 
                alt="StudyKin AI Interface" 
                className="w-full rounded-xl sm:rounded-2xl shadow-2xl border border-border"
              />
              <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 bg-primary text-primary-foreground px-2 py-1 sm:px-4 sm:py-2 rounded-full font-semibold text-xs sm:text-sm">
                AI Powered
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 sm:py-16 px-4 bg-secondary/5">
        <div className="container mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-foreground mb-8 sm:mb-12">
            Why Choose StudyKin?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <Brain className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-3">AI-Powered Learning</h3>
              <p className="text-muted-foreground">
                Get personalized study recommendations and instant answers to your questions with advanced AI technology.
              </p>
            </Card>
            
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <Target className="h-12 w-12 text-wellness mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-3">Smart Study Plans</h3>
              <p className="text-muted-foreground">
                Adaptive study schedules that adjust to your progress and learning style for optimal results.
              </p>
            </Card>
            
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <BookOpen className="h-12 w-12 text-gamify mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-3">Wellness Tracking</h3>
              <p className="text-muted-foreground">
                Monitor your study habits and maintain healthy learning patterns with built-in wellness features.
              </p>
            </Card>
            
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <Users className="h-12 w-12 text-accent mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-3">Collaborative Learning</h3>
              <p className="text-muted-foreground">
                Connect with study groups and share knowledge with peers in a supportive learning environment.
              </p>
            </Card>
            
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <Star className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-3">Progress Gamification</h3>
              <p className="text-muted-foreground">
                Stay motivated with achievements, streaks, and progress tracking that makes learning engaging.
              </p>
            </Card>
            
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <MessageCircle className="h-12 w-12 text-wellness mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-3">24/7 AI Assistant</h3>
              <p className="text-muted-foreground">
                Get instant help with homework, explanations, and study guidance whenever you need it.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold text-foreground mb-6">
            Ready to Transform Your Learning?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of students who are already experiencing smarter, more effective learning with StudyKin.
          </p>
          <Link to="/signup">
            <Button size="lg" className="text-lg px-8 py-4">
              Get Started Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Brain className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold text-foreground">StudyKin</span>
          </div>
          <p className="text-muted-foreground">
            © 2024 StudyKin. Empowering learners worldwide with AI.
          </p>
        </div>
      </footer>

      {/* Floating Chat Button */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6">
        <Button 
          size="lg" 
          className="rounded-full h-12 w-12 sm:h-14 sm:w-14 shadow-lg hover:shadow-xl transition-all"
        >
          <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
        </Button>
      </div>
    </div>
  );
};

export default HomePage;