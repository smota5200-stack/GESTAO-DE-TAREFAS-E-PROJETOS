import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

interface PaymentNotification {
  id: string;
  demand_id: string;
  client_name: string;
  demand_title: string;
  amount: number;
  status: string;
  created_at: string;
}

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Perfil do Usuário
  const [userName, setUserName] = useState('Sergio Mota');
  const [userRole, setUserRole] = useState('Administrador');
  const [userAvatar, setUserAvatar] = useState('https://ui-avatars.com/api/?name=Sergio+Mota&background=bcd200&color=171717');

  // Theme Toggle
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem('freela_theme');
    if (savedTheme) return savedTheme === 'dark';
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    // Carregar Perfil do localStorage se existir
    const savedName = localStorage.getItem('freela_user_name');
    const savedRole = localStorage.getItem('freela_user_role');
    const savedAvatar = localStorage.getItem('freela_user_avatar');

    if (savedName) setUserName(savedName);
    if (savedRole) setUserRole(savedRole);
    if (savedAvatar) setUserAvatar(savedAvatar);

    // Update Theme
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('freela_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('freela_theme', 'light');
    }
  }, [isDark]);

  // Notificações
  const [notifications, setNotifications] = useState<PaymentNotification[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('payment_notifications')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (data) setNotifications(data);
  };

  useEffect(() => {
    const onboardingComplete = localStorage.getItem('freela_onboarding_complete');
    if (!onboardingComplete) {
      navigate('/onboarding');
      return;
    }
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [navigate]);

  // Close panel on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleApprove = async (notif: PaymentNotification) => {
    // Marcar demanda como paga
    await supabase.from('project_demands').update({ payment_status: 'Pago', work_status: 'Entregue' }).eq('id', notif.demand_id);
    // Marcar notificação como aprovada
    await supabase.from('payment_notifications').update({ status: 'approved' }).eq('id', notif.id);
    fetchNotifications();
  };

  const handleDismiss = async (notif: PaymentNotification) => {
    await supabase.from('payment_notifications').update({ status: 'dismissed' }).eq('id', notif.id);
    fetchNotifications();
  };

  const navItems = [
    { path: '/', icon: 'dashboard', label: 'Painel' },
    { path: '/kanban', icon: 'view_kanban', label: 'Kanban' },
    { path: '/projetos', icon: 'work', label: 'Projetos' },
    { path: '/orcamentos', icon: 'request_quote', label: 'Orçamentos' },
    { path: '/relatorios', icon: 'insert_chart', label: 'Relatórios' },
    { path: '/precos', icon: 'sell', label: 'Tabela de Preços' },
    { path: '/financas', icon: 'account_balance_wallet', label: 'Finanças' },
    { path: '/clientes', icon: 'group', label: 'Clientes' },
    { path: '/notas', icon: 'sticky_note_2', label: 'Notas' },
    { path: '/senhas', icon: 'lock', label: 'Senhas' },
    { path: '/arquivos', icon: 'folder', label: 'Arquivos' },
  ];
  
  const handleAction = (msg: string) => {
    alert(msg);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark">
      {/* Sidebar Navigation */}
      <aside className={`${sidebarCollapsed ? 'w-[72px]' : 'w-64'} flex-shrink-0 border-r border-primary/10 bg-white dark:bg-surface-dark flex flex-col z-30 shadow-xl shadow-black/5 absolute inset-y-0 left-0 transform transition-all duration-300 md:relative md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0 !w-64' : '-translate-x-full'}`}>
        <div className={`p-6 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} gap-3`}>
          <div className="flex items-center gap-3 w-full">
            <div className={`flex items-center justify-start shrink-0 transition-all ${sidebarCollapsed ? 'w-10' : 'w-24'} h-10 bg-white p-1 rounded-sm`}>
              <img src="/logo.png" alt="Motta Logo" className="w-full h-full object-contain origin-left" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
              <span className="material-symbols-outlined text-primary hidden text-3xl">auto_awesome</span>
            </div>
            {!sidebarCollapsed && (
              <div className="flex items-center gap-1.5 hidden md:flex">
                <span className="text-[#CCFF00] flex items-center mt-[-3px]">
                  <span className="material-symbols-outlined text-xl !font-[700]" style={{ fontVariationSettings: "'FILL' 1" }}>flare</span>
                </span>
                <span className="text-[#CCFF00] text-xl font-bold tracking-tight uppercase">FREELANCEOS</span>
              </div>
            )}
          </div>
          <button className="md:hidden text-slate-500" onClick={() => setMobileMenuOpen(false)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1 mt-4 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              title={sidebarCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center ${sidebarCollapsed ? 'justify-center' : ''} gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${isActive || (item.path === '/projetos' && location.pathname.startsWith('/projetos')) || (item.path === '/clientes' && location.pathname.startsWith('/clientes'))
                  ? 'bg-primary/10 text-primary border-l-4 border-primary'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-primary/5 hover:text-primary border-l-4 border-transparent'
                }`
              }
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {!sidebarCollapsed && item.label}
            </NavLink>
          ))}
        <NavLink
            to="/configuracoes"
            onClick={() => setMobileMenuOpen(false)}
            title={sidebarCollapsed ? 'Configurações' : undefined}
            className={({ isActive }) =>
              `flex items-center ${sidebarCollapsed ? 'justify-center' : ''} gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${isActive
                ? 'bg-primary/10 text-primary border-l-4 border-primary'
                : 'text-slate-600 dark:text-slate-400 hover:bg-primary/5 hover:text-primary border-l-4 border-transparent'
              }`
            }
          >
            <span className="material-symbols-outlined">settings</span>
            {!sidebarCollapsed && 'Configurações'}
          </NavLink>
        </nav>

        <div className="p-4 mt-auto border-t border-primary/10 space-y-2">
          {/* Toggle collapse button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`w-full hidden md:flex items-center ${sidebarCollapsed ? 'justify-center' : ''} gap-3 px-2 py-2 text-sm font-medium rounded-lg transition-all text-slate-400 hover:bg-primary/5 hover:text-primary`}
            title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            <span className="material-symbols-outlined text-lg">{sidebarCollapsed ? 'chevron_right' : 'chevron_left'}</span>
            {!sidebarCollapsed && <span className="text-xs">Recolher</span>}
          </button>

          {!sidebarCollapsed && (
            <div onClick={() => navigate('/configuracoes')} className="flex items-center gap-3 px-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 p-2 rounded-lg transition-colors">
              <div className="size-10 rounded-full bg-slate-800 border-2 border-primary/30 bg-cover bg-center shadow-md shrink-0" style={{ backgroundImage: `url('${userAvatar}')` }}></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-slate-900 dark:text-white">{userName}</p>
                <p className="text-xs text-slate-500 truncate">{userRole}</p>
              </div>
              <span className="material-symbols-outlined text-slate-400 text-sm">more_vert</span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative w-full">
        {/* Global Top Bar */}
        <header className="h-16 border-b border-primary/10 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md flex items-center justify-between px-4 md:px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4 flex-1">
            <button onClick={() => setMobileMenuOpen(true)} className="md:hidden flex items-center gap-2 text-primary p-2">
              <span className="material-symbols-outlined text-2xl font-bold">menu</span>
            </button>
            <div className="relative w-full max-w-md hidden sm:block group">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
              <input
                className="w-full bg-slate-100 dark:bg-black/20 border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-500 text-slate-900 dark:text-white"
                placeholder="Pesquisar projetos, faturas, clientes..."
                type="text"
                onKeyDown={(e) => { if (e.key === 'Enter') handleAction('Pesquisa global ainda não conectada à API.'); }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            {/* Theme Toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              className="flex items-center justify-center size-10 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Alternar Tema"
            >
              <span className="material-symbols-outlined">{isDark ? 'light_mode' : 'dark_mode'}</span>
            </button>
            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifPanel(!showNotifPanel)}
                className="flex items-center justify-center size-10 rounded-lg text-slate-400 hover:bg-primary/10 hover:text-primary transition-colors relative"
              >
                <span className="material-symbols-outlined">notifications</span>
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1 border-2 border-white dark:border-surface-dark">
                    {notifications.length}
                  </span>
                )}
              </button>

              {/* Notification Panel */}
              {showNotifPanel && (
                <div className="absolute right-0 top-12 w-96 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/20 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-5 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-sm">notifications</span>
                      Notificações
                    </h3>
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-full">{notifications.length}</span>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center">
                        <span className="material-symbols-outlined text-3xl text-slate-300 dark:text-slate-600 mb-2 block">inbox</span>
                        <p className="text-sm text-slate-500">Nenhuma notificação pendente</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="px-5 py-4 border-b border-slate-100 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="size-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="material-symbols-outlined text-sm">payments</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white">
                                {n.client_name} informou pagamento
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5 truncate">{n.demand_title}</p>
                              <p className="text-xs font-black text-primary mt-1">R$ {parseFloat(String(n.amount)).toFixed(2)}</p>
                              <p className="text-[10px] text-slate-400 mt-1">
                                {new Date(n.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </p>
                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={() => handleApprove(n)}
                                  className="flex-1 py-1.5 rounded-lg text-[10px] font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[12px]">check</span>
                                  Confirmar Pago
                                </button>
                                <button
                                  onClick={() => handleDismiss(n)}
                                  className="flex-1 py-1.5 rounded-lg text-[10px] font-bold text-slate-500 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[12px]">close</span>
                                  Dispensar
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate('/projetos', { state: { openNewModal: true } })}
              className="bg-primary hover:bg-primary/90 text-slate-900 px-3 py-2 md:px-4 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span className="hidden sm:inline">Novo Projeto</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setMobileMenuOpen(false)}></div>
      )}
    </div>
  );
};

export default Layout;