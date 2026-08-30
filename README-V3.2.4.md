# Concierge Security Assessment V3.2.4

Patch visual focado em duas melhorias:

- Loading de envio aparece imediatamente e permanece visível por no mínimo ~950 ms.
- ScoreGauge inicia a animação após 180 ms, conta de 0 até o score em ~1,4 s e anima o arco junto.

Arquivos alterados:
- src/pages/AssessmentForm.tsx
- src/components/ScoreGauge.tsx

Valide localmente:

```powershell
npx tsc --noEmit
npm run build
```
