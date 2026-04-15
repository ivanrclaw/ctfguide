import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Layers, Users, ArrowRight, PenTool, ListChecks, Share2 } from 'lucide-react';

const categoryKeys = [
  { translationKey: 'landing.categoryWeb', emoji: '🌐', key: 'web' },
  { translationKey: 'landing.categoryPwn', emoji: '💥', key: 'pwn' },
  { translationKey: 'landing.categoryReverse', emoji: '🔧', key: 'reverse' },
  { translationKey: 'landing.categoryCrypto', emoji: '🔐', key: 'crypto' },
  { translationKey: 'landing.categoryForensics', emoji: '🔍', key: 'forensics' },
  { translationKey: 'landing.categoryOsint', emoji: '🕵️', key: 'osint' },
  { translationKey: 'landing.categoryMisc', emoji: '🎭', key: 'misc' },
];

const stepKeys = [
  {
    number: '01',
    titleKey: 'landing.step1Title',
    descriptionKey: 'landing.step1Description',
    icon: PenTool,
  },
  {
    number: '02',
    titleKey: 'landing.step2Title',
    descriptionKey: 'landing.step2Description',
    icon: ListChecks,
  },
  {
    number: '03',
    titleKey: 'landing.step3Title',
    descriptionKey: 'landing.step3Description',
    icon: Share2,
  },
];

const featureKeys = [
  {
    titleKey: 'landing.feature1Title',
    descriptionKey: 'landing.feature1Description',
    icon: BookOpen,
  },
  {
    titleKey: 'landing.feature2Title',
    descriptionKey: 'landing.feature2Description',
    icon: Layers,
  },
  {
    titleKey: 'landing.feature3Title',
    descriptionKey: 'landing.feature3Description',
    icon: Users,
  },
];

export function Landing() {
  const { t } = useTranslation('common');

  return (
    <div>
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 text-center">
        <Badge variant="secondary" className="mb-6 text-sm px-4 py-1">
          {t('landing.badge')}
        </Badge>
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">
          {t('landing.heroTitle1')}
          <span className="block text-primary">{t('landing.heroTitle2')}</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          {t('landing.heroDescription')}
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Button size="lg" asChild>
            <Link to="/register">
              {t('landing.getStartedFree')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/login">{t('landing.browseGuides')}</Link>
          </Button>
        </div>
      </section>

      <Separator className="mx-auto max-w-4xl" />

      {/* Categories Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('landing.exploreCategories')}</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t('landing.categoriesSubtitle')}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {categoryKeys.map((cat) => (
            <Card key={cat.key} className="group cursor-pointer transition-colors hover:bg-accent">
              <CardContent className="flex items-center gap-3 p-4">
                <span className="text-3xl">{cat.emoji}</span>
                <div>
                  <p className="font-semibold">{t(cat.translationKey)}</p>
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
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('landing.howItWorks')}</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t('landing.howItWorksSubtitle')}
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {stepKeys.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                <div className="mb-2 text-sm font-bold text-primary">{step.number}</div>
                <h3 className="mb-2 text-xl font-semibold">{t(step.titleKey)}</h3>
                <p className="text-muted-foreground">{t(step.descriptionKey)}</p>
              </div>
            );
          })}
        </div>
      </section>

      <Separator className="mx-auto max-w-4xl" />

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('landing.whyCtfGuide')}</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t('landing.featuresSubtitle')}
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {featureKeys.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.titleKey} className="transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">{t(feature.titleKey)}</h3>
                  <p className="text-muted-foreground">{t(feature.descriptionKey)}</p>
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
            {t('landing.ctaTitle')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-foreground/80">
            {t('landing.ctaDescription')}
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/register">
                {t('landing.ctaButton')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 text-sm text-muted-foreground">
          <span>&copy; 2026 {t('landing.footerCopyright')}</span>
          <div className="flex gap-4">
            <span>{t('landing.footerPrivacy')}</span>
            <span>{t('landing.footerTerms')}</span>
            <span>{t('landing.footerContact')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}