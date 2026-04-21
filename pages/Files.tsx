import React from 'react';

const Files: React.FC = () => {
    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 shrink-0">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Meus Recentes</h1>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-12 shrink-0">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Search Input */}
                    <div className="relative flex items-center w-full lg:w-64">
                        <span className="material-symbols-outlined absolute left-3 text-slate-400 text-sm">search</span>
                        <input 
                            type="text" 
                            placeholder="Procurar" 
                            className="w-full pl-9 pr-10 py-2 text-sm bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-primary/50 text-slate-700 dark:text-slate-300"
                        />
                        <button className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors flex items-center">
                            <span className="material-symbols-outlined text-sm">tune</span>
                        </button>
                    </div>

                    {/* Filter Icons */}
                    <div className="flex items-center gap-1 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-1">
                        <button className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors" title="Imagens"><span className="material-symbols-outlined text-sm">image</span></button>
                        <button className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors" title="Vídeos"><span className="material-symbols-outlined text-sm">play_circle</span></button>
                        <button className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors" title="Áudio"><span className="material-symbols-outlined text-sm">headphones</span></button>
                        <button className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors" title="Documentos"><span className="material-symbols-outlined text-sm">description</span></button>
                        <button className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors" title="Planilhas"><span className="material-symbols-outlined text-sm">table_chart</span></button>
                        <button className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors" title="Tags"><span className="material-symbols-outlined text-sm">sell</span></button>
                    </div>

                    {/* Dropdown */}
                    <select className="bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-primary/50 w-32 cursor-pointer">
                        <option>Todas</option>
                        <option>Hoje</option>
                        <option>Esta semana</option>
                    </select>
                </div>

                <div className="flex items-center gap-3">
                    <button className="px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">add</span> Criar novo
                    </button>
                    <button className="px-4 py-2 text-sm font-bold text-white bg-slate-900 dark:bg-primary dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-primary/90 flex items-center gap-2 transition-colors shadow-md">
                        <span className="material-symbols-outlined text-[16px]">file_upload</span> Importar
                    </button>
                </div>
            </div>

            {/* Empty State */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white/50 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/10 rounded-2xl relative">
                {/* Visual elements reflecting the 'recent files clock' mockup */}
                <div className="relative mb-6">
                    {/* Background faint cards */}
                    <div className="absolute top-4 -left-12 w-24 h-32 bg-slate-100 dark:bg-white/5 rounded-xl -rotate-12 border border-slate-200 dark:border-white/10 shadow-sm"></div>
                    <div className="absolute top-4 -right-12 w-24 h-32 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm  rotate-12"></div>
                    {/* Main sharp card */}
                    <div className="w-28 h-36 bg-white dark:bg-surface-dark border-2 border-slate-200 dark:border-white/10 rounded-xl relative z-10 p-3 shadow-xl flex flex-col shadow-black/5">
                        <div className="w-full h-16 bg-slate-100 dark:bg-black/20 rounded-lg mb-4 flex items-center justify-center text-slate-400">
                            <span className="material-symbols-outlined text-3xl">schedule</span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-full mb-2"></div>
                        <div className="w-2/3 h-2 bg-slate-200 dark:bg-white/10 rounded-full"></div>
                    </div>
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">Nada recente por aqui</h3>
                <p className="text-sm text-slate-500 max-w-sm text-center">Faça o upload ou importe arquivos para que eles apareçam rapidamente nesta área central de resumos.</p>
            </div>
        </div>
    );
};

export default Files;
