/**
 * Camada de compatibilidade de roteamento.
 *
 * O projeto original usava react-router-dom. Aqui expomos a mesma API mínima
 * (Link, useNavigate, useSearchParams, useLocation, useParams) implementada
 * sobre o TanStack Router, preservando o comportamento e o visual existentes.
 */
import {
  Link as RouterLink,
  useNavigate as useRouterNavigate,
  useParams as useRouterParams,
  useRouterState,
} from "@tanstack/react-router";
import type { AnchorHTMLAttributes, ReactNode } from "react";

function splitTo(to: string): { pathname: string; search: Record<string, string> } {
  const [pathname, query = ""] = to.split("?");
  const search: Record<string, string> = {};
  new URLSearchParams(query).forEach((value, key) => {
    search[key] = value;
  });
  return { pathname: pathname || "/", search };
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  to: string;
  children?: ReactNode;
  replace?: boolean;
};

export function Link({ to, children, replace, ...rest }: LinkProps) {
  const { pathname, search } = splitTo(to);
  const Anchor = RouterLink as unknown as React.ComponentType<Record<string, unknown>>;
  return (
    <Anchor to={pathname} search={search} replace={replace} {...rest}>
      {children}
    </Anchor>
  );
}

export function useNavigate() {
  const navigate = useRouterNavigate();
  return (to: string, opts?: { replace?: boolean }) => {
    const { pathname, search } = splitTo(to);
    navigate({ to: pathname, search, replace: opts?.replace } as never);
  };
}

export function useLocation() {
  return useRouterState({
    select: (state) => ({
      pathname: state.location.pathname,
      search: state.location.searchStr ?? "",
    }),
  });
}

export function useSearchParams(): [URLSearchParams] {
  const searchStr = useRouterState({ select: (state) => state.location.searchStr ?? "" });
  return [new URLSearchParams(searchStr)];
}

export function useParams<T extends Record<string, string> = Record<string, string>>(): T {
  return useRouterParams({ strict: false } as never) as T;
}
