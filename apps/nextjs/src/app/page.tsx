import { HydrateClient } from "~/trpc/server";
import { AuthShowcase } from "./_components/auth-showcase";

export default function HomePage() {
  return (
    <HydrateClient>
      <main className="container flex min-h-screen flex-col items-center justify-center py-16">
        <div className="flex flex-col items-center justify-center gap-8 text-center">
          {/* Hero Section */}
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
              TikTok{" "}
              <span className="bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
                Creator Network
              </span>
            </h1>
            <p className="text-muted-foreground max-w-2xl text-lg">
              Upload your clips, schedule publishing, track performance, and earn rewards.
              Join our network of content creators.
            </p>
          </div>

          {/* Auth Section */}
          <AuthShowcase />

          {/* Features Grid */}
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              title="Upload & Schedule"
              description="Upload your TikTok clips and schedule them for optimal publishing times."
              icon="📤"
            />
            <FeatureCard
              title="Track Performance"
              description="Monitor views, likes, comments, and shares with real-time stats."
              icon="📊"
            />
            <FeatureCard
              title="Earn Rewards"
              description="Get paid based on your content performance. More views = more earnings."
              icon="💰"
            />
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="bg-card border-border flex flex-col gap-2 rounded-xl border p-6 text-left shadow-sm transition-shadow hover:shadow-md">
      <span className="text-3xl">{icon}</span>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}
