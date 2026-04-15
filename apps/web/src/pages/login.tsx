import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error(t('login.errorFillFields'));
      return;
    }
    setIsLoading(true);
    try {
      await login(email, password);
      toast.success(t('login.successWelcomeBack'));
      navigate('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('login.errorLoginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('login.title')}</CardTitle>
          <CardDescription>{t('login.subtitle')}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('login.email')}</Label>
              <Input id="email" type="email" placeholder={t('login.emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('login.password')}</Label>
              <Input id="password" type="password" placeholder={t('login.passwordPlaceholder')} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('login.signingIn') : t('login.signIn')}
            </Button>
            <p className="text-sm text-muted-foreground">
              {t('login.noAccount')}{' '}
              <Link to="/register" className="text-primary underline hover:no-underline">{t('login.signUp')}</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}