import { Button } from "@/components/ui/button";

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏴‍☠️</span>
            <span className="text-xl font-bold tracking-tight">CTF Guide</span>
          </div>
          <nav className="flex items-center gap-4">
            <Button variant="ghost">Challenges</Button>
            <Button variant="ghost">Guides</Button>
            <Button variant="ghost">Leaderboard</Button>
            <Button>Sign In</Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">
          Master the Art of
          <span className="block text-primary">Capture The Flag</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Interactive challenges, step-by-step guides, and a thriving community
          to help you level up your cybersecurity skills from beginner to
          expert.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Button size="lg">Get Started Free</Button>
          <Button size="lg" variant="outline">
            Browse Challenges
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
            <div className="mb-4 text-3xl">🎯</div>
            <h3 className="mb-2 text-xl font-semibold">Hands-On Challenges</h3>
            <p className="text-muted-foreground">
              Practice on real-world scenarios spanning web exploitation,
              reverse engineering, cryptography, and more.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
            <div className="mb-4 text-3xl">📖</div>
            <h3 className="mb-2 text-xl font-semibold">Guided Learning Paths</h3>
            <p className="text-muted-foreground">
              Follow structured paths from beginner to advanced with detailed
              writeups and explanations for every challenge.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
            <div className="mb-4 text-3xl">🏆</div>
            <h3 className="mb-2 text-xl font-semibold">Leaderboards & Community</h3>
            <p className="text-muted-foreground">
              Compete with peers, track your progress, and join a community of
              aspiring security professionals.
            </p>
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

export default App;