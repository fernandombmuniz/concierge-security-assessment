import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../assets/logo-concierge.jpg';
import {
  loadDraft,
  saveDraft,
  getSubmission,
} from '../storage';

export default function ClientHeader() {
  const location = useLocation();

  const [hasAnswers, setHasAnswers] =
    useState(false);

  const [lastId, setLastId] =
    useState<string | null>(null);

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

    const persistedLastId =
      localStorage.getItem(
        'concierge-client-last-assessment-id-v2',
      );

    setLastId(persistedLastId);

    setHasAnswers(
      draftHasAnswers || !!persistedLastId,
    );
  }, [location.pathname, location.search]);

  const navLinkClass = (path: string) => {
    const active =
      location.pathname === path;

    return `
      flex min-h-11 items-center justify-center
      rounded-lg px-2 py-2
      text-center text-xs font-semibold
      transition
      sm:px-3.5 sm:text-sm
      ${
        active
          ? 'bg-teal-500/10 text-teal-400'
          : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
      }
    `;
  };

  const handleEditClick = () => {
    const params =
      new URLSearchParams(location.search);

    const id = params.get('id');

    if (id) {
      const sub = getSubmission(id);

      if (sub) {
        saveDraft(sub.data);

        localStorage.setItem(
          'concierge-client-editing-id-v2',
          id,
        );

        localStorage.setItem(
          'concierge-client-assessment-step-v2',
          '0',
        );
      }

      return;
    }

    const persistedLastId =
      localStorage.getItem(
        'concierge-client-last-assessment-id-v2',
      );

    if (persistedLastId) {
      const sub =
        getSubmission(persistedLastId);

      if (sub) {
        saveDraft(sub.data);

        localStorage.setItem(
          'concierge-client-editing-id-v2',
          persistedLastId,
        );

        localStorage.setItem(
          'concierge-client-assessment-step-v2',
          '0',
        );
      }
    }
  };

  const resultadoPath = lastId
    ? `/resultado?id=${lastId}`
    : '/resultado';

  return (
    <header
      className="
        mb-7
        rounded-2xl
        border border-slate-800/80
        bg-slate-950/35
        p-4
        backdrop-blur
        sm:p-5
        md:flex
        md:items-center
        md:justify-between
        md:gap-6
      "
    >
      {/* Identidade */}
      <div
        className="
          flex min-w-0
          flex-col items-center
          text-center
          md:flex-row
          md:items-center
          md:text-left
        "
      >
        <div
          className="
            flex shrink-0
            items-center justify-center
          "
        >
          <img
            src={logo}
            alt="Concierge Segurança Digital"
            className="
              h-auto
              w-[190px]
              max-w-full
              rounded-lg
              object-contain
              sm:w-[220px]
              md:w-auto
              md:h-14
            "
          />
        </div>

        <div
          className="
            mt-5
            min-w-0
            md:mt-0
            md:ml-4
          "
        >
          <div
            className="
              text-[10px]
              font-bold
              uppercase
              leading-relaxed
              tracking-[0.2em]
              text-teal-400
              sm:text-xs
              md:tracking-[0.22em]
            "
          >
            Concierge Segurança Digital
          </div>

          <h1
            className="
              mt-1
              break-words
              text-2xl
              font-bold
              leading-tight
              text-white
              md:text-2xl
            "
          >
            Security Assessment
          </h1>

          <p
            className="
              mx-auto
              mt-2
              max-w-[290px]
              text-xs
              leading-relaxed
              text-slate-400
              sm:max-w-sm
              md:mx-0
              md:max-w-md
            "
          >
            Diagnóstico inicial de segurança
            para pequenas e médias empresas
          </p>
        </div>
      </div>

      {/* Navegação */}
      <div
        className="
          mt-6
          w-full
          md:mt-0
          md:w-auto
          md:shrink-0
        "
      >
        <nav
          className="
            grid
            w-full
            grid-cols-3
            gap-1
            rounded-xl
            border border-slate-800
            bg-slate-950/50
            p-1
            md:flex
            md:w-auto
            md:flex-wrap
            md:items-center
          "
        >
          <Link
            to="/"
            className={navLinkClass('/')}
          >
            Início
          </Link>

          <Link
            to="/diagnostico"
            className={navLinkClass(
              '/diagnostico',
            )}
          >
            Diagnóstico
          </Link>

          <Link
            to={resultadoPath}
            className={navLinkClass(
              '/resultado',
            )}
          >
            Resultado
          </Link>

          {hasAnswers && (
            <Link
              to="/diagnostico"
              onClick={handleEditClick}
              className="
                col-span-3
                mt-1
                flex min-h-11
                items-center
                justify-center
                rounded-lg
                bg-amber-500/10
                px-3 py-2
                text-center
                text-xs
                font-semibold
                text-amber-400
                transition
                hover:bg-amber-500/20
                sm:text-sm
                md:col-auto
                md:mt-0
              "
            >
              Editar respostas
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}