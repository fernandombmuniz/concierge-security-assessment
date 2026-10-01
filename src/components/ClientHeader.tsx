import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { loadDraft, saveDraft, getSubmission } from '../storage';
import { loadSession } from '../lib/assessment-session';
import { ConciergeBrandLockup } from './ExecutiveVisual';

export default function ClientHeader() {
  const location = useLocation();
  const [hasAnswers, setHasAnswers] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);
  const [canAccessDiagnostic, setCanAccessDiagnostic] = useState(false);

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
    setCanAccessDiagnostic(Boolean(loadSession()));
    setHasAnswers(draftHasAnswers || !!persistedLastId);
  }, [location.pathname, location.search]);

  const navLinkClass = (path: string, disabled = false) => {
    const active = location.pathname === path;
    if (disabled) {
      return 'flex min-h-10 items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 opacity-70 sm:text-sm';
    }
    return `flex min-h-10 items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold transition sm:text-sm ${
      active
        ? 'border border-cyan-400/25 bg-cyan-500/10 text-cyan-300'
        : 'text-slate-300 hover:bg-slate-900/55 hover:text-white'
    }`;
  };

  const handleEditClick = () => {
    if (!canAccessDiagnostic) return;
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const persistedLastId = id || localStorage.getItem('concierge-client-last-assessment-id-v2');
    if (!persistedLastId) return;
    const sub = getSubmission(persistedLastId);
    if (!sub) return;

    saveDraft(sub.data);
    localStorage.setItem('concierge-client-editing-id-v2', persistedLastId);
    localStorage.setItem('concierge-client-assessment-step-v2', '0');
  };

  const resultadoPath = lastId ? `/resultado?id=${lastId}` : '/resultado';

  return (
    <header className="mb-6 flex flex-col gap-4 rounded-2xl border border-cyan-300/[0.10] bg-[#081426]/68 px-4 py-3 backdrop-blur-md sm:px-5 lg:flex-row lg:items-center lg:justify-between">
      <ConciergeBrandLockup compact />

      <nav className="grid grid-cols-3 gap-1.5 rounded-xl border border-slate-800 bg-slate-950/50 p-1.5 lg:flex lg:items-center">
        <Link to="/" className={navLinkClass('/')}>Início</Link>
        {canAccessDiagnostic ? (
          <Link to="/diagnostico" className={navLinkClass('/diagnostico')}>Diagnóstico</Link>
        ) : (
          <span className={navLinkClass('/diagnostico', true)} aria-disabled="true">Diagnóstico</span>
        )}
        <Link to={resultadoPath} className={navLinkClass('/resultado')}>Resultado</Link>
        {hasAnswers && canAccessDiagnostic && (
          <Link
            to="/diagnostico"
            onClick={handleEditClick}
            className="col-span-3 mt-1 flex min-h-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/15 sm:text-sm lg:col-auto lg:mt-0"
          >
            Editar respostas
          </Link>
        )}
      </nav>
    </header>
  );
}
