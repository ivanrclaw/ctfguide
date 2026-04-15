import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !username || !password) {
      toast.error(t('register.errorFillFields'));
      return;
    }
    if (password.length < 8) {
      toast.error(t('register.errorPasswordLength'));
      return;
    }
    if (username.length < 3) {
      toast.error(t('register.errorUsernameLength'));
      return;
    }
    setIsLoading(true);
    try {
      await register(email, username, password);
      toast.success(t('register.successWelcome'));
      navigate('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('register.errorRegistrationFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('register.title')}</CardTitle>
          <CardDescription>{t('register.subtitle')}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('register.email')}</Label>
              <Input id="email" type="email" placeholder={t('register.emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">{t('register.username')}</Label>
              <Input id="username" type="text" placeholder={t('register.usernamePlaceholder')} value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('register.password')}</Label>
              <Input id="password" type="password" placeholder={t('register.passwordPlaceholder')} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('register.creatingAccount') : t('register.createAccount')}
            </Button>
            <p className="text-sm text-muted-foreground">
              {t('register.haveAccount')}{' '}
              <Link to="/login" className="text-primary underline hover:no-underline">{t('register.signIn')}</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}