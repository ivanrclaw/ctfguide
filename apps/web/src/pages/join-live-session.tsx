import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Radio, Loader2, Users, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const PUBLIC_API = (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api');

export function JoinLiveSession() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'code' | 'name' | 'joining'>('code');
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [error, setError] = useState('');

  const lookupSession = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${PUBLIC_API}/public/live-sessions/${code.trim().toUpperCase()}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.message || t('joinLive.sessionNotFound'));
        return;
      }
      const data = await res.json();

      if (data.status === 'finished') {
        setError(t('joinLive.sessionEnded'));
        return;
      }

      if (data.status === 'running') {
        // Allow reconnect - go to name step
        setSessionInfo(data);
        setStep('name');
        return;
      }

      setSessionInfo(data);
      setStep('name');
    } catch {
      setError(t('joinLive.connectionError'));
    } finally {
      setLoading(false);
    }
  };

  const joinSession = async () => {
    if (!name.trim()) {
      toast.error(t('joinLive.enterName'));
      return;
    }

    setLoading(true);
    setError('');
    setStep('joining');

    try {
      // Try to reconnect first
      const reconnectRes = await fetch(
        `${PUBLIC_API}/public/live-sessions/${code.trim().toUpperCase()}/reconnect`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim() }),
        },
      );

      if (reconnectRes.ok) {
        const reconnectData = await reconnectRes.json();
        if (reconnectData.found) {
          // Reconnected - go to session
          navigate(`/live/${code.trim().toUpperCase()}/${encodeURIComponent(name.trim())}`, {
            state: {
              participant: reconnectData.participant,
              session: sessionInfo,
              isReconnect: true,
            },
          });
          return;
        }
      }

      // New join
      const res = await fetch(
        `${PUBLIC_API}/public/live-sessions/${code.trim().toUpperCase()}/join`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim() }),
        },
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.message || t('joinLive.failedToJoin'));
        setStep('name');
        return;
      }

      const data = await res.json();
      navigate(`/live/${code.trim().toUpperCase()}/${encodeURIComponent(name.trim())}`, {
        state: { participant: data.participant, session: sessionInfo },
      });
    } catch {
      setError(t('joinLive.connectionError'));
      setStep('name');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Radio className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold">{t('joinLive.title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('joinLive.subtitle')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 'code' && t('joinLive.enterCodeTitle')}
              {step === 'name' && t('joinLive.enterNameTitle')}
              {step === 'joining' && t('joinLive.joiningTitle')}
            </CardTitle>
            <CardDescription>
              {step === 'code' && t('joinLive.enterCodeDesc')}
              {step === 'name' && sessionInfo && (
                <span>
                  {t('joinLive.guideLabel')}: <strong>{sessionInfo.guide?.title}</strong>
                </span>
              )}
              {step === 'joining' && t('joinLive.joiningText')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {step === 'code' && (
              <div className="space-y-4">
                <Input
                  placeholder={t('joinLive.joinCodePlaceholder')}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                  onKeyDown={(e) => e.key === 'Enter' && lookupSession()}
                  className="text-center text-xl tracking-widest uppercase"
                  maxLength={6}
                  autoFocus
                />
                <Button
                  className="w-full"
                  onClick={lookupSession}
                  disabled={loading || code.length < 4}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('joinLive.lookingUp')}
                    </>
                  ) : (
                    <>
                      <ArrowRight className="mr-2 h-4 w-4" />
                      {t('joinLive.continue')}
                    </>
                  )}
                </Button>
              </div>
            )}

            {step === 'name' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-md bg-muted p-3 text-sm">
                  <Users className="h-4 w-4" />
                  <span>
                    {sessionInfo?.guide?.title} — {sessionInfo?.guide?.ctfName}
                  </span>
                </div>
                <Input
                  placeholder={t('joinLive.namePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && joinSession()}
                  maxLength={30}
                  autoFocus
                />
                <Button className="w-full" onClick={joinSession} disabled={loading || !name.trim()}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('joinLive.joinSession')}
                    </>
                  ) : (
                    <>
                      <Radio className="mr-2 h-4 w-4" />
                      {t('joinLive.joinSession')}
                    </>
                  )}
                </Button>
              </div>
            )}

            {step === 'joining' && (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">{t('joinLive.joiningText')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t('joinLive.noRegistration')}
        </p>
      </div>
    </div>
  );
}
