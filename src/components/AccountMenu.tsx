import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase, useSession, signInWithEmail, signOut } from '@/lib/supabase';

// Renders nothing when cloud sync is not configured, so the localStorage-only build looks unchanged.
export function AccountMenu() {
  const session = useSession();
  const [email, setEmail] = useState('');
  const [note, setNote] = useState<string | null>(null);
  if (!supabase || session === undefined) return null;

  if (session) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground" title="Signed in; projects sync to the cloud">{session.user.email}</span>
        <Button variant="ghost" size="sm" onClick={() => signOut()}>Sign out</Button>
      </div>
    );
  }

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={async e => {
        e.preventDefault();
        const err = await signInWithEmail(email.trim());
        setNote(err ?? `Sign-in link sent to ${email.trim()}`);
      }}
    >
      {note ? (
        <span className="text-sm text-muted-foreground" role="status">{note}</span>
      ) : (
        <>
          <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="work email" className="h-8 w-44" aria-label="Email for sign-in link" />
          <Button type="submit" size="sm" variant="outline">Sign in</Button>
        </>
      )}
    </form>
  );
}
