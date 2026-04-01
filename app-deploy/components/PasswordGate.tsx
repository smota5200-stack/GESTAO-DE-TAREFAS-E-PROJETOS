import React, { useState, useEffect } from 'react';

interface PasswordGateProps {
  children: React.ReactNode;
}

const PasswordGate: React.FC<PasswordGateProps> = ({ children }) => {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const authStatus = localStorage.getItem('freela_os_auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '1234') {
      setIsAuthenticated(true);
      localStorage.setItem('freela_os_auth', 'true');
      setError('');
    } else {
      setError('Senha incorreta. Tente novamente.');
      setPassword('');
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark p-4">
      <div className="w-full max-w-md bg-white dark:bg-surface-dark rounded-2xl shadow-2xl p-8 border border-primary/10">
        <div className="flex flex-col items-center mb-8">
          <div className="size-16 bg-primary rounded-2xl flex items-center justify-center text-slate-900 shadow-xl shadow-primary/30 mb-4">
            <span className="material-symbols-outlined text-4xl">lock</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Acesso Restrito</h1>
          <p className="text-slate-500 dark:text-slate-400 text-center mt-2">
            Digite a senha para acessar o painel administrativo do FreelaOS.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-100 dark:bg-black/20 border-none rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 transition-all outline-none"
              placeholder="Digite sua senha"
              autoFocus
            />
            {error && <p className="mt-2 text-sm text-red-500 font-medium">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-slate-900 py-3 rounded-lg font-bold transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-[0.98]"
          >
            Entrar no Sistema
          </button>
        </form>
      </div>
    </div>
  );
};

export default PasswordGate;
