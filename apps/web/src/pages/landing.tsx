import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Layers, Users, ArrowRight, PenTool, ListChecks, Share2 } from 'lucide-react';

const categories = [
  { name: 'Web Exploitation', emoji: '🌐', key: 'web' },
  { name: 'Binary Exploitation', emoji: '💥', key: 'pwn' },
  { name: 'Reverse Engineering', emoji: '🔧', key: 'reverse' },
  { name: 'Cryptography', emoji: '🔐', key: 'crypto' },
  { name: 'Forensics', emoji: '🔍', key: 'forensics' },
  { name: 'OSINT', emoji: '🕵️', key: 'osint' },
  { name: 'Miscellaneous', emoji: '🎭', key: 'misc' },
];

const steps = [
  {
    number: '01',
    title: 'Create a Guide',
    description: 'Start by adding a new guide for a CTF challenge you\'ve solved.',
    icon: PenTool,
  },
  {
    number: '02',
    title: 'Add Your Steps',
    description: 'Document your approach, tools, and methodology step by step.',
    icon: ListChecks,
  },
  {
    number: '03',
    title: 'Share with the Community',
    description: 'Publish your guide so others can learn from your experience.',
    icon: Share2,
  },
];

const features = [
  {
    title: 'Step-by-Step Walkthroughs',
    description: 'Break down complex CTF challenges into clear, repeatable steps that anyone can follow and learn from.',
    icon: BookOpen,
  },
  {
    title: 'Category Organization',
    description: 'Guides are organized by category and difficulty, making it easy to find exactly what you need to practice.',
    icon: Layers,
  },
  {
    title: 'Community Driven',
    description: 'Learn from the collective knowledge of security enthusiasts. Share your own solutions and grow together.',
    icon: Users,
  },
];

export function Landing() {
  return (
    <div>
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 text-center">
        <Badge variant="secondary" className="mb-6 text-sm px-4 py-1">
          🚀 Open source CTF learning platform
        </Badge>
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">
          Master the Art of
          <span className="block text-primary">Capture The Flag</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Create and share step-by-step CTF guides, organize your walkthroughs
          by category and difficulty, and help others level up their
          cybersecurity skills.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Button size="lg" asChild>
            <Link to="/register">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/login">Browse Guides</Link>
          </Button>
        </div>
      </section>

      <Separator className="mx-auto max-w-4xl" />

      {/* Categories Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Explore Categories</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Guides organized across all major CTF challenge categories
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {categories.map((cat) => (
            <Card key={cat.key} className="group cursor-pointer transition-colors hover:bg-accent">
              <CardContent className="flex items-center gap-3 p-4">
                <span className="text-3xl">{cat.emoji}</span>
                <div>
                  <p className="font-semibold">{cat.name}</p>
                  <p className="text-sm text-muted-foreground">{cat.key}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator className="mx-auto max-w-4xl" />

      {/* How It Works Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How It Works</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Three simple steps to share your CTF knowledge
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                <div className="mb-2 text-sm font-bold text-primary">{step.number}</div>
                <h3 className="mb-2 text-xl font-semibold">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <Separator className="mx-auto max-w-4xl" />

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Why CTF Guide?</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Everything you need to document and share CTF solutions
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to Share Your Knowledge?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-foreground/80">
            Join the community and start creating CTF guides today. Help others
            learn from your experience and expand the collective knowledge base.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/register">
                Create Your First Guide
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 text-sm text-muted-foreground">
          <span>&copy; 2026 CTF Guide. All rights reserved.</span>
          <div className="flex gap-4">
            <span>Privacy</span>
            <span>Terms</span>
            <span>Contact</span>
          </div>
        </div>
      </footer>
    </div>
  );
}