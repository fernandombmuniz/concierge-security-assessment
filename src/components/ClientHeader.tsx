import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../assets/logo-concierge.jpg';
import { loadDraft, saveDraft, getSubmission } from '../storage';

export default function ClientHeader() {
  const location = useLocation();
  const [hasAnswers, setHasAnswers] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);

  useEffect(() => {
    const draft = loadDraft();
    const draftHasAnswers = !!(
      draft.companyName ||
      draft.contactName ||
      draft.contactEmail ||
      (draft.users && draft.users > 0) ||
      (draft.devices && draft.devices > 0) ||
      draft.firewallLevel !== 'unknown' ||
      draft.endpointLevel !== 'unknown' ||
      draft.backupLevel !== 'unknown' ||
      draft.mfa !== 'unknown'
    );
    const persistedLastId = localStorage.getItem('concierge-client-last-assessment-id-v2');
    setLastId(persistedLastId);
    setHasAnswers(draftHasAnswers || !!persistedLastId);
  }, [location.pathname, location.search]);

  const navLinkClass = (path: string) => {
    const active = location.pathname === path;
    return `px-3.5 py-2 text-sm font-semibold transition rounded-lg ${
      active
        ? 'text-teal-400 bg-teal-500/10'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
    }`;
  };

  const handleEditClick = () => {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if (id) {
      const sub = getSubmission(id);
      if (sub) {
        saveDraft(sub.data);
        localStorage.setItem('concierge-client-editing-id-v2', id);
        localStorage.setItem('concierge-client-assessment-step-v2', '0');
      }
    } else {
      const persistedLastId = localStorage.getItem('concierge-client-last-assessment-id-v2');
      if (persistedLastId) {
        const sub = getSubmission(persistedLastId);
        if (sub) {
          saveDraft(sub.data);
          localStorage.setItem('concierge-client-editing-id-v2', persistedLastId);
          localStorage.setItem('concierge-client-assessment-step-v2', '0');
        }
      }
    }
  };

  const resultadoPath = lastId ? `/resultado?id=${lastId}` : '/resultado';

  return (
    <header className="mb-7 flex flex-col gap-5 rounded-2xl border border-slate-800/80 bg-slate-950/35 p-5 backdrop-blur md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <img src={logo} className="h-14 w-auto rounded-lg object-contain" />
        <div>
          <div className="text-xs font-bold uppercase tracking-[.22em] text-teal-400">
            Concierge Segurança Digital
          </div>
          <h1 className="mt-0.5 text-xl font-bold md:text-2xl">Security Assessment</h1>
          <p className="text-xs text-slate-400">
            Diagnóstico inicial de segurança para pequenas e médias empresas
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:items-end">
        <nav className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/50 p-1">
          <Link to="/" className={navLinkClass('/')}>
            Início
          </Link>
          <Link to="/diagnostico" className={navLinkClass('/diagnostico')}>
            Diagnóstico
          </Link>
          <Link to={resultadoPath} className={navLinkClass('/resultado')}>
            Resultado
          </Link>
          {hasAnswers && (
            <Link
              to="/diagnostico"
              onClick={handleEditClick}
              className="px-3 py-2 text-sm font-semibold transition rounded-lg text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
            >
              Editar respostas
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}