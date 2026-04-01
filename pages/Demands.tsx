import React, { useState } from 'react';
import { Demand } from '../types';

const Demands: React.FC = () => {
  const [demands, setDemands] = useState<Demand[]>([]);

  const handleStatusChange = (id: string, newStatus: Demand['status']) => {
    setDemands(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));
  };

  const pendingDemands = demands.filter(d => d.status === 'Pending');
  const pastDemands = demands.filter(d => d.status !== 'Pending');

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'High': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'Medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'Low': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2);
  };

  const DemandCard: React.FC<{ demand: Demand; isPast?: boolean }> = ({ demand, isPast = false }) => (
    <div className={`bg-white dark:bg-surface-dark border rounded-2xl p-5 shadow-sm transition-all ${isPast ? 'border-slate-200 dark:border-white/5 opacity-80' : 'border-primary/20 hover:shadow-md hover:border-primary/50 relative overflow-hidden'
      }`}>
      {!isPast && (
        <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
      )}

      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 flex items-center justify-center font-bold text-sm text-slate-700 dark:text-slate-300">
            {getInitials(demand.clientName)}
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{demand.clientName}</h4>
            <p className="text-xs text-slate-500">{demand.company}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-[10px] font-medium text-slate-400">{demand.requestDate}</span>
          {!isPast && (
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${getUrgencyColor(demand.urgency)}`}>
              {demand.urgency} Priority
            </span>
          )}
          {isPast && (
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${demand.status === 'Approved' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : 'text-slate-500 bg-slate-500/10 border-slate-500/20'
              }`}>
              {demand.status}
            </span>
          )}
        </div>
      </div>

      <div className="mb-5">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">{demand.title}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
          {demand.description}
        </p>
      </div>

      {!isPast ? (
        <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
          <button
            onClick={() => handleStatusChange(demand.id, 'Approved')}
            className="flex-1 bg-primary text-slate-900 py-2 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-sm shadow-primary/20"
          >
            <span className="material-symbols-outlined text-sm">check_circle</span>
            Approve Request
          </button>
          <button
            onClick={() => handleStatusChange(demand.id, 'Declined')}
            className="flex-1 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 py-2 rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-white/10 transition-colors border border-transparent dark:hover:border-white/10"
          >
            Decline
          </button>
        </div>
      ) : (
        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-white/5">
          <button className="text-xs font-bold text-slate-500 hover:text-primary transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">chat_bubble</span> Send Message
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Demands Inbox</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Review new client requests and convert them to active projects.</p>
        </div>
        <button className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 hover:border-primary/30 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-sm">
          <span className="material-symbols-outlined text-[20px]">filter_list</span>
          Filter
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            Pending Requests
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">{pendingDemands.length}</span>
          </h2>

          {pendingDemands.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {pendingDemands.map(demand => (
                <DemandCard key={demand.id} demand={demand} />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-surface-dark border border-dashed border-slate-300 dark:border-white/10 rounded-2xl p-12 text-center">
              <div className="size-16 rounded-full bg-slate-100 dark:bg-black/30 flex items-center justify-center text-slate-400 mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl">task_alt</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">You're all caught up!</h3>
              <p className="text-slate-500 text-sm">No new pending demands from your clients at the moment.</p>
            </div>
          )}
        </div>

        {pastDemands.length > 0 && (
          <div className="pt-8 border-t border-slate-200 dark:border-white/5">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Recently Processed</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {pastDemands.map(demand => (
                <DemandCard key={demand.id} demand={demand} isPast={true} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Demands;