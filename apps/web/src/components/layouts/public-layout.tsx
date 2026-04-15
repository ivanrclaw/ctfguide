import { Link, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';

export function PublicLayout() {
  const { t } = useTranslation('common');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🏴‍☠️</span>
            <span className="text-xl font-bold tracking-tight">CTF Guide</span>
          </Link>
          <nav className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <Button variant="ghost" asChild>
              <Link to="/login">{t('publicLayout.signIn')}</Link>
            </Button>
            <Button asChild>
              <Link to="/register">{t('publicLayout.signUp')}</Link>
            </Button>
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  );
}