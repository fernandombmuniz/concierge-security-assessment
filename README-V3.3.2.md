# Concierge Security Assessment V3.3.2

Correção da transição Landing -> Diagnóstico.

## O que muda
- O overlay de "Preparando seu diagnóstico" agora persiste durante a troca de rota.
- A landing grava um sinal temporário em `sessionStorage` antes de navegar.
- O formulário lê esse sinal no primeiro paint e mantém o mesmo overlay por alguns milissegundos.
- Isso elimina o flash visual causado pela desmontagem da LandingPage antes da montagem do AssessmentForm.
- A lógica de privacidade e limpeza do respondente anterior permanece intacta.

## Arquivos alterados
- `src/pages/LandingPage.tsx`
- `src/pages/AssessmentForm.tsx`

## Validação local
```powershell
npx tsc --noEmit
npm run build
```
