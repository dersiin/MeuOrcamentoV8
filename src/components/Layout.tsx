import React, { useState, useEffect } from 'react';
import { 
  Home, 
  PlusCircle, 
  CreditCard, 
  Tags, 
  Target,
  Settings,
  DollarSign,
  LogOut,
  User,
  Bell,
  Menu,
  X,
  BarChart3,
  ArrowLeftRight,
  ChevronDown,
  Calculator,
  FileText,
  TrendingDown,
  Scan,
  Camera,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Sun,
  Moon,
  EyeOff,
  Eye,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { AuthService, type AuthUser } from '../lib/auth';
import { DatabaseService } from '../lib/database';
import { UnifiedChatBot } from './ChatBot/UnifiedChatBot';
import { NotificationPanel } from './Notifications/NotificationPanel';
import { createContext, useContext } from 'react';
import { Tooltip } from './Common/Tooltip';

// Contexto para ofuscar valores
export const ValoresContext = createContext({ valoresOfuscados: false, toggleValores: () => {} });

export function useValores() {
  return useContext(ValoresContext);
}

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
  onGoBack?: () => void;
  canGoBack?: boolean;
  user: AuthUser;
  lancamentos: any[];
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'lancamentos', label: 'Lançamentos', icon: PlusCircle },
  { id: 'contas', label: 'Contas', icon: CreditCard },
  { id: 'fatura', label: 'Fatura Cartão', icon: FileText },
  { id: 'categorias', label: 'Categorias', icon: Tags },
  { id: 'metas', label: 'Metas', icon: Target },
  { id: 'orcamentos', label: 'Orçamentos', icon: Calculator },
  { id: 'transferencias', label: 'Transferências', icon: ArrowLeftRight },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
];

const advancedMenuItems = [
  { id: 'conciliacao', label: 'Conciliação', icon: FileText },
  { id: 'dividas', label: 'Dívidas', icon: TrendingDown },
  { id: 'sankey', label: 'Fluxo Sankey', icon: BarChart3 },
  { id: 'ocr', label: 'OCR Recibos', icon: Camera },
];

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem('theme');
  if (saved === 'dark' || saved === 'light') return saved;
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

export function Layout({ children, currentPage, onPageChange, onGoBack, canGoBack, user, lancamentos }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showAdvancedMenu, setShowAdvancedMenu] = useState(false);
  const [notificacoesPendentes, setNotificacoesPendentes] = useState<any[]>([]);
  const [theme, setTheme] = useState(getInitialTheme());
  const [valoresOfuscados, setValoresOfuscados] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('valoresOfuscados') === 'true';
    }
    return false;
  });
  const [showCalendarioModal, setShowCalendarioModal] = useState(false);

  useEffect(() => {
    loadNotificacoes();
    const interval = setInterval(loadNotificacoes, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    AuthService.applyTheme(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('valoresOfuscados', valoresOfuscados ? 'true' : 'false');
  }, [valoresOfuscados]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const toggleValores = () => setValoresOfuscados(v => !v);

  useEffect(() => {
    // Auto-collapse sidebar on mobile
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(false);
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Check initial size

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadNotificacoes = async () => {
    try {
      const notificacoes = await DatabaseService.getNotificacoesPendentes();
      setNotificacoesPendentes(notificacoes);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      if (error instanceof Error && error.message === 'Usuário não autenticado') {
        await AuthService.signOut();
        return;
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await AuthService.signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const handlePageChange = (pageId: string) => {
    onPageChange(pageId);
    setSidebarOpen(false);
    setUserMenuOpen(false);
    setShowAdvancedMenu(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-dropdown]')) {
        setNotificationsOpen(false);
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Calendário Mensal ---
  function CalendarioSidebar({ lancamentos }: { lancamentos: any[] }) {
    const [diaSelecionado, setDiaSelecionado] = React.useState<string | null>(null);
    const mesAtualDate = new Date();
    const ano = mesAtualDate.getFullYear();
    const mes = mesAtualDate.getMonth();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();
    const dias = Array.from({ length: diasNoMes }, (_, i) => i + 1);
    const lancamentosPorDia: Record<string, any[]> = {};
    lancamentos.forEach(l => {
      if (!l.data) return;
      const d = new Date(l.data);
      if (d.getMonth() === mes && d.getFullYear() === ano) {
        const dia = d.getDate();
        if (!lancamentosPorDia[dia]) lancamentosPorDia[dia] = [];
        lancamentosPorDia[dia].push(l);
      }
    });
    return (
      <div className="mt-6 mb-4 bg-white dark:bg-gray-900 rounded-xl shadow p-3">
        <div className="mb-2 flex justify-between items-center">
          <span className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
            <Calendar className="w-4 h-4 text-blue-600" /> Calendário
          </span>
          <span className="text-xs text-gray-500 font-semibold">{mesAtualDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^./, c => c.toUpperCase())}</span>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium mb-1">
          {['D','S','T','Q','Q','S','S'].map((dia, idx) => <div key={dia + idx}>{dia}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {Array(new Date(ano, mes, 1).getDay()).fill(null).map((_, i) => <div key={i}></div>)}
          {dias.map(dia => {
            const lancs = lancamentosPorDia[dia] || [];
            const temReceita = lancs.some(l => l.tipo === 'RECEITA');
            const temDespesa = lancs.some(l => l.tipo === 'DESPESA');
            return (
              <button
                key={dia}
                className={`rounded h-7 w-7 flex items-center justify-center border transition-all duration-150
                  ${diaSelecionado === String(dia) ? 'ring-2 ring-blue-400 border-blue-400' : 'border-gray-200 dark:border-gray-700'}
                  ${temReceita && temDespesa ? 'bg-gradient-to-r from-green-100 to-red-100 dark:from-green-900/30 dark:to-red-900/30' : temReceita ? 'bg-green-100 dark:bg-green-900/30' : temDespesa ? 'bg-red-100 dark:bg-red-900/30' : 'bg-transparent'}
                  hover:scale-110`}
                onClick={() => setDiaSelecionado(String(dia))}
              >
                {dia}
              </button>
            );
          })}
        </div>
        {diaSelecionado && (
          <div className="mt-2 p-2 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-xs">Lançamentos {diaSelecionado}/{mes+1}</span>
              <button className="ml-auto text-xs text-blue-500 hover:underline" onClick={() => setDiaSelecionado(null)}>Fechar</button>
            </div>
            {(lancamentosPorDia[Number(diaSelecionado)] || []).length === 0 ? (
              <div className="text-gray-500 text-xs">Nenhum lançamento neste dia.</div>
            ) : (
              <ul className="space-y-0.5">
                {lancamentosPorDia[Number(diaSelecionado)].map(l => (
                  <li key={l.id} className="flex items-center gap-1 text-xs">
                    {l.tipo === 'RECEITA' ? <TrendingUp className="w-3 h-3 text-green-600" /> : <TrendingDown className="w-3 h-3 text-red-600" />}
                    <span className="truncate flex-1">{l.descricao}</span>
                    <span className={`font-semibold ${l.tipo === 'RECEITA' ? 'text-green-600' : 'text-red-600'}`}>{l.valor}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <ValoresContext.Provider value={{ valoresOfuscados, toggleValores }}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col lg:flex-row">
        {/* Sidebar */}
        <aside
          className={`
          fixed inset-y-0 left-0 z-50 bg-white dark:bg-gray-950 shadow-xl border-r border-gray-200 dark:border-gray-800 transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          ${sidebarCollapsed ? 'w-16' : 'w-64'}
          lg:translate-x-0 lg:static lg:inset-0
          flex flex-col
        `}
          aria-label="Menu lateral"
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-800">
            <div className={`flex items-center space-x-3 transition-opacity duration-200 ${sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}> 
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  FinanceApp
                </h1>
                <p className="text-xs text-gray-500 leading-tight">Gestão Inteligente</p>
              </div>
            </div>
            {/* Collapse button - only on desktop */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              aria-label={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            {/* Close button - only on mobile */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              aria-label="Fechar menu lateral"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Sidebar Content */}
          <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
            {/* Main Menu */}
            <div className={`mb-4 ${sidebarCollapsed ? 'text-center' : ''}`}> 
              <h3 className={`text-xs font-semibold text-gray-500 uppercase tracking-wider ${sidebarCollapsed ? 'hidden' : 'px-3 mb-2'}`}>Principal</h3>
              {menuItems.map(item => (
                <button
                  key={item.id}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors w-full text-left ${currentPage === item.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 font-bold' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                  onClick={() => handlePageChange(item.id)}
                  title={item.label}
                >
                  <item.icon className="w-5 h-5" />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              ))}
            </div>
            {/* Advanced Menu */}
            <div className={`mb-4 ${sidebarCollapsed ? 'text-center' : ''}`}> 
              <div className={`${sidebarCollapsed ? 'hidden' : 'px-3 mb-2'}`}> 
                <button
                  onClick={() => setShowAdvancedMenu(!showAdvancedMenu)}
                  className="flex items-center justify-between w-full text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
                  aria-expanded={showAdvancedMenu}
                  aria-controls="advanced-menu"
                >
                  <span>Avançado</span>
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showAdvancedMenu ? 'rotate-180' : ''}`} />
                </button>
              </div>
              {(showAdvancedMenu || sidebarCollapsed) && advancedMenuItems.map(item => (
                <button
                  key={item.id}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors w-full text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800`}
                  onClick={() => handlePageChange(item.id)}
                  title={item.label}
                >
                  <item.icon className="w-5 h-5" />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              ))}
            </div>
            {/* Calendário Mensal */}
            {!sidebarCollapsed && (
              <CalendarioSidebar lancamentos={lancamentos} />
            )}
            {sidebarCollapsed && (
              <button
                className="flex items-center gap-3 px-4 py-2 rounded-lg transition-colors w-full text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 mt-2"
                onClick={() => setShowCalendarioModal(true)}
                title="Calendário"
              >
                <Calendar className="w-5 h-5" />
              </button>
            )}
            {/* Após o grupo Avançado (ou card do calendário), adicionar sempre um espaçamento maior antes de Configurações e Sair: */}
            <div className="mt-8">
              <button
                className="flex items-center gap-3 px-4 py-2 rounded-lg transition-colors w-full text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => handlePageChange('configuracoes')}
                title="Configurações"
              >
                <Settings className="w-5 h-5" />
                {!sidebarCollapsed && <span>Configurações</span>}
              </button>
              <button
                className="flex items-center gap-3 px-4 py-2 rounded-lg transition-colors w-full text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 mt-1"
                onClick={handleSignOut}
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
                {!sidebarCollapsed && <span>Sair</span>}
              </button>
            </div>
          </nav>
          {/* Sidebar Footer */}
          {/* Removed Sidebar Footer as per edit hint */}
        </aside>
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-gray-900 bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fechar menu lateral"
          />
        )}
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
          {/* Top Header */}
          <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                {/* Left side - Mobile menu and back button */}
                <div className="flex items-center space-x-3">
                  {/* Mobile menu button */}
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="lg:hidden p-2 text-gray-500 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Abrir menu lateral"
                  >
                    <Menu className="w-6 h-6" />
                  </button>
                  {/* Back button */}
                  {canGoBack && onGoBack && (
                    <button
                      onClick={onGoBack}
                      className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                      aria-label="Voltar"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">Voltar</span>
                    </button>
                  )}
                </div>
                {/* Right side actions */}
                <div className="flex items-center gap-3">
                  {/* Dark mode toggle */}
                  <Tooltip text={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'} position="bottom">
                    <button
                      onClick={toggleTheme}
                      className={`p-2 ${theme === 'dark' ? 'text-blue-500' : 'text-gray-500'} bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-md rounded-xl transition-colors hover:bg-gray-100 dark:hover:bg-gray-700`}
                      aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
                    >
                      {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                  </Tooltip>
                  {/* Ofuscar valores toggle */}
                  <Tooltip text={valoresOfuscados ? 'Exibir valores financeiros' : 'Ocultar valores financeiros'} position="bottom">
                    <button
                      onClick={toggleValores}
                      className={`p-2 ${valoresOfuscados ? 'text-blue-500' : 'text-gray-500'} bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-md rounded-xl transition-colors hover:bg-gray-100 dark:hover:bg-gray-700`}
                      aria-label={valoresOfuscados ? 'Exibir valores' : 'Ocultar valores'}
                    >
                      {valoresOfuscados ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                    </button>
                  </Tooltip>
                  {/* Notifications */}
                  <div className="relative" data-dropdown>
                    <Tooltip text="Notificações e alertas" position="bottom">
                      <button
                        onClick={() => setNotificationsOpen(!notificationsOpen)}
                        className={`relative p-2 ${notificationsOpen ? 'text-blue-500' : 'text-gray-500'} bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-md rounded-xl transition-colors hover:bg-gray-100 dark:hover:bg-gray-700`}
                        aria-label="Notificações"
                      >
                        <Bell className="w-5 h-5" />
                        {notificacoesPendentes.length > 0 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg animate-pulse">
                            {notificacoesPendentes.length > 9 ? '9+' : notificacoesPendentes.length}
                          </span>
                        )}
                      </button>
                    </Tooltip>
                    {notificationsOpen && (
                      <NotificationPanel 
                        notificacoes={notificacoesPendentes}
                        onClose={() => setNotificationsOpen(false)}
                        onRefresh={loadNotificacoes}
                      />
                    )}
                  </div>
                  {/* User Menu */}
                  <div className="relative" data-dropdown>
                    <Tooltip text="Abrir menu do usuário" position="bottom">
                      <button
                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                        className="flex items-center space-x-3 p-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-md rounded-xl transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                        aria-label="Menu do usuário"
                      >
                        <div className="hidden sm:block text-right">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                            {user.profile?.nome || user.email || 'Usuário'}
                          </p>
                          {user.profile?.nome && (
                            <p className="text-xs text-gray-500 dark:text-gray-300 leading-tight truncate max-w-32">
                              {user.email}
                            </p>
                          )}
                        </div>
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md border border-gray-100 dark:border-gray-700" >
                          {user.profile?.avatar_url ? (
                            <img 
                              src={user.profile.avatar_url} 
                              alt="Avatar" 
                              className="w-full h-full rounded-xl object-cover"
                            />
                          ) : (
                            <User className="w-5 h-5 text-white" />
                          )}
                        </div>
                      </button>
                    </Tooltip>
                    {userMenuOpen && (
                      <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 z-50">
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md border border-gray-100 dark:border-gray-700">
                              {user.profile?.avatar_url ? (
                                <img 
                                  src={user.profile.avatar_url} 
                                  alt="Avatar" 
                                  className="w-full h-full rounded-xl object-cover"
                                />
                              ) : (
                                <User className="w-5 h-5 text-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              {/* User menu dropdown */}
                              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {user.profile?.nome || user.email || 'Usuário'}
                              </p>
                              {user.profile?.nome && (
                                <p className="text-xs text-gray-500 dark:text-gray-300 truncate">{user.email}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handlePageChange('configuracoes')}
                          className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          aria-label="Configurações"
                        >
                          <Settings className="w-4 h-4" />
                          <span>Configurações</span>
                        </button>
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-gray-700 transition-colors"
                          aria-label="Sair"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sair</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </header>
          {/* Main Content Area */}
          <main className="flex-1 overflow-auto">
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
        {/* ChatBot */}
        <UnifiedChatBot />
        {/* Calendário Mensal em Modal */}
        {showCalendarioModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 relative w-full max-w-md mx-auto">
              <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 dark:hover:text-white" onClick={() => setShowCalendarioModal(false)}><X className="w-5 h-5" /></button>
              <CalendarioSidebar lancamentos={lancamentos} />
            </div>
          </div>
        )}
      </div>
    </ValoresContext.Provider>
  );
}