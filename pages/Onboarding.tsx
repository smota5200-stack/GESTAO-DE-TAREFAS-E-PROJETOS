import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ROLE_OPTIONS = [
  'Membro de equipe ou colaborador individual',
  'Gerente ou gestor',
  'Diretor',
  'Executivo (ex.: vice-presidente ou diretor)',
  'Proprietário da empresa',
  'Freelancer',
  'Estudante',
  'Outros',
  'Prefiro não dizer'
];

const JOB_FUNCTIONS = [
  'Assistente administrativo',
  'Captação de recursos',
  'Comunicações',
  'Dados ou análises',
  'Design',
  'Educação',
  'Engenharia',
  'Experiência do cliente',
  'Financeiro ou contabilidade',
  'Gerenciamento de produtos',
  'Gestão de projetos ou programas',
  'Jurídico',
  'Marketing',
  'Operações',
  'Pesquisa e desenvolvimento',
  'Recursos humanos',
  'Saúde',
  'Tecnologia da informação (TI)',
  'Vendas',
  'Outros',
  'Prefiro não dizer'
];

const GOALS = [
  'Planejamento de criação',
  'Sprints de design',
  'Criação de ativo',
  'Calendário de conteúdo',
  'Planejamento estratégico',
  'Pedidos e aprovações de criação',
  'Avaliações de modelos',
  'Integração de funcionários',
  'Gestão de projetos',
  'Gestão de portfólio',
  'Gestão de carga de trabalho',
  'Gerenciamento de metas',
  'Outros',
  'Prefiro não dizer'
];

const TOOLS = [
  { name: 'Gmail', color: 'text-red-500', icon: 'mail' },
  { name: 'Google Drive', color: 'text-blue-500', icon: 'add_to_drive' },
  { name: 'Microsoft OneDrive', color: 'text-blue-600', icon: 'cloud' },
  { name: 'Microsoft Outlook', color: 'text-blue-700', icon: 'mark_email_read' },
  { name: 'Microsoft Teams', color: 'text-indigo-600', icon: 'group' },
  { name: 'Slack', color: 'text-purple-600', icon: 'tag' },
  { name: 'Zoom', color: 'text-blue-500', icon: 'videocam' },
  { name: 'Dropbox', color: 'text-blue-600', icon: 'inventory_2' },
  { name: 'GitHub', color: 'text-slate-900 dark:text-white', icon: 'code' },
  { name: 'Figma', color: 'text-pink-500', icon: 'draw' },
  { name: 'Canva', color: 'text-cyan-500', icon: 'brush' },
  { name: 'Jira Cloud', color: 'text-blue-500', icon: 'view_kanban' },
  { name: 'Notion', color: 'text-slate-800 dark:text-slate-200', icon: 'description' },
  { name: 'Salesforce', color: 'text-blue-400', icon: 'cloud_done' },
  { name: 'Zendesk', color: 'text-emerald-600', icon: 'support_agent' },
  { name: 'HubSpot', color: 'text-orange-500', icon: 'hub' },
  { name: 'Zapier', color: 'text-orange-600', icon: 'bolt' },
  { name: 'Outros', color: 'text-slate-500', icon: 'widgets' },
];

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  
  const [role, setRole] = useState('Freelancer');
  const [jobFunction, setJobFunction] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [tools, setTools] = useState<string[]>([]);
  const [defaultView, setDefaultView] = useState<'lista' | 'quadro' | 'calendario' | 'cronograma'>('lista');

  const handleNext = () => {
    if (step < 5) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFinish = () => {
    // Salvar configurações
    localStorage.setItem('freela_onboarding_complete', 'true');
    const prefs = { role, jobFunction, goals, tools, defaultView };
    localStorage.setItem('freela_user_prefs', JSON.stringify(prefs));
    
    // Navegar para o app
    navigate('/');
  };

  const toggleSelection = (setter: React.Dispatch<React.SetStateAction<string[]>>, current: string[], item: string) => {
    if (current.includes(item)) {
      setter(current.filter(i => i !== item));
    } else {
      setter([...current, item]);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col font-sans">
      {/* Top Header */}
      <header className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-rose-600">
          <div className="flex gap-1 items-center justify-center">
             <div className="size-6 bg-primary rounded shadow-lg shadow-primary/30 flex items-center justify-center text-slate-900 shrink-0">
               <span className="material-symbols-outlined text-sm">auto_awesome</span>
             </div>
             <span className="font-bold text-xl tracking-tight text-slate-900">FreelanceOS</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center pt-8 pb-20 px-4">
        <div className="w-full max-w-2xl bg-white rounded-xl shadow-sm border border-slate-200 p-8 md:p-12 relative">
          
          {step > 1 && (
            <button 
              onClick={handleBack}
              className="absolute left-6 top-8 text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              <span className="text-sm font-medium">Voltar</span>
            </button>
          )}

          <div className="mt-8">
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-semibold text-slate-900 mb-6">Qual é a sua função?</h2>
                <div className="relative">
                  <select 
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full appearance-none bg-white border border-slate-300 text-slate-900 text-base rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer shadow-sm"
                  >
                    {ROLE_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    expand_more
                  </span>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-semibold text-slate-900 mb-6">Que função melhor descreve o seu trabalho?</h2>
                <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar space-y-2">
                  <div className="border border-slate-200 rounded-md bg-slate-50 relative overflow-hidden">
                    <div className="flex items-center justify-between p-3 bg-slate-100 border-b border-slate-200 cursor-pointer">
                       <span className="text-sm font-medium text-slate-700">Função</span>
                       <span className="material-symbols-outlined text-slate-400 text-sm">expand_more</span>
                    </div>
                    <div className="p-2 space-y-1 bg-white">
                      {JOB_FUNCTIONS.map(fn => (
                        <label 
                          key={fn} 
                          className={`flex items-center gap-3 px-3 py-2.5 rounded hover:bg-slate-50 cursor-pointer transition-colors ${jobFunction.includes(fn) ? 'bg-primary/5' : ''}`}
                        >
                          <input 
                            type="checkbox" 
                            checked={jobFunction.includes(fn)}
                            onChange={() => toggleSelection(setJobFunction, jobFunction, fn)}
                            className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary focus:ring-offset-0"
                          />
                          <span className="text-[15px] text-slate-700 select-none">{fn}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <h2 className="text-2xl font-semibold text-slate-900 mb-6">O que você gostaria de gerenciar no FreelaOS?</h2>
                 <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar space-y-2">
                    <div className="border border-slate-200 rounded-md bg-white relative overflow-hidden py-2 px-2">
                      {GOALS.map(goal => (
                        <label 
                          key={goal} 
                          className={`flex items-center gap-3 px-3 py-2.5 rounded hover:bg-slate-50 cursor-pointer transition-colors ${goals.includes(goal) ? 'bg-primary/5' : ''}`}
                        >
                          <input 
                            type="checkbox" 
                            checked={goals.includes(goal)}
                            onChange={() => toggleSelection(setGoals, goals, goal)}
                            className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary focus:ring-offset-0"
                          />
                          <span className="text-[15px] text-slate-700 select-none">{goal}</span>
                        </label>
                      ))}
                    </div>
                 </div>
              </div>
            )}

            {step === 4 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col">
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">Que ferramentas você usa?</h2>
                <p className="text-slate-500 mb-8 max-w-lg leading-relaxed">
                  O FreelaOS se integra ou planeja se integrar às ferramentas que você usa diariamente. Conhecer melhor essas ferramentas nos ajudará a personalizar sua experiência.
                </p>
                
                <div className="flex flex-wrap gap-3 mb-10">
                  {TOOLS.map(t => {
                    const isSelected = tools.includes(t.name);
                    return (
                      <button
                        key={t.name}
                        onClick={() => toggleSelection(setTools, tools, t.name)}
                        className={`
                          flex items-center gap-2 px-4 py-2 border rounded-full text-sm font-medium transition-all
                          ${isSelected 
                            ? 'border-primary bg-primary/5 text-primary shadow-sm' 
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                          }
                        `}
                      >
                        <span className={`material-symbols-outlined text-[18px] ${isSelected ? 'text-primary' : t.color}`}>
                          {t.icon}
                        </span>
                        {t.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col">
                <div className="text-center mb-8">
                   <h2 className="text-2xl font-semibold text-slate-900 mb-2">Boas-vindas ao seu primeiro projeto no FreelaOS!</h2>
                   <p className="text-slate-500">Selecione uma visualização padrão para o seu fluxo de trabalho.</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { id: 'lista', label: 'Lista', icon: 'view_list' },
                    { id: 'quadro', label: 'Quadro', icon: 'view_kanban' },
                    { id: 'calendario', label: 'Calendário', icon: 'calendar_month' },
                    { id: 'cronograma', label: 'Cronograma', icon: 'view_timeline' }
                  ].map(view => (
                    <button
                      key={view.id}
                      onClick={() => setDefaultView(view.id as any)}
                      className={`
                        flex flex-col items-center gap-3 p-6 border-2 rounded-xl transition-all
                        ${defaultView === view.id 
                          ? 'border-primary bg-primary/5 text-primary shadow-sm' 
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:shadow-md'
                        }
                      `}
                    >
                      <span className={`material-symbols-outlined text-4xl ${defaultView === view.id ? 'text-primary' : 'text-slate-400'}`}>
                        {view.icon}
                      </span>
                      <span className="font-semibold">{view.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={`mt-10 flex justify-end`}>
              <button 
                onClick={handleNext}
                className="bg-primary hover:bg-primary/90 text-slate-900 font-medium px-8 py-2.5 rounded-md transition-all shadow-md active:scale-[0.98]"
              >
                {step === 5 ? 'Avançar' : 'Avançar'}
              </button>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default Onboarding;
