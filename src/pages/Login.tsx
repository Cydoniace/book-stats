import { useState } from 'react';
import { supabase } from '../lib/store';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setErr(error.message === 'Invalid login credentials' ? 'Неверный email или пароль' : error.message);
  };
  return (
    <div className="login">
      <form onSubmit={submit} className="card">
        <div className="empty-emoji">📚🌸</div>
        <h2>Книжная статистика</h2>
        <p className="muted small">Привет! Входи, книжки ждут 💗</p>
        <label className="field"><span>Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" /></label>
        <label className="field"><span>Пароль</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></label>
        {err && <p className="err-text">{err}</p>}
        <button className="primary" disabled={busy}>{busy ? 'Вход…' : 'Войти'}</button>
      </form>
    </div>
  );
}
