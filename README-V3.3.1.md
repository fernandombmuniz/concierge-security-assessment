# Concierge Security Assessment V3.3.1

Correção visual da transição entre a landing page e o início do diagnóstico.

## Alteração
- `src/pages/LandingPage.tsx`

## O que muda
- Ao clicar em **Iniciar diagnóstico**, um overlay aparece imediatamente.
- A criação da sessão continua acontecendo normalmente em segundo plano.
- A transição permanece visível por no mínimo ~850 ms para evitar a sensação de refresh/piscada.
- A navegação passa a usar `replace: true` no React Router.
- A lógica de privacidade da V3.2.5 é preservada.

## Validação

```powershell
npx tsc --noEmit
npm run build
```
