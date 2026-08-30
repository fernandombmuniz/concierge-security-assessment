# Concierge Security Assessment V3.2.3

Revisão visual e de feedback durante o envio do assessment.

## Alterações

### Envio do assessment
- botão entra imediatamente em estado de processamento;
- spinner no próprio botão;
- proteção contra clique duplo;
- depois de 700 ms, caso o processamento continue, aparece um overlay discreto;
- texto: **Preparando seu diagnóstico**;
- em caso de falha, o estado de loading é encerrado e o usuário pode tentar novamente.

### ScoreGauge
- arco anima de 0 até o score final;
- número faz contagem de 0 até a nota;
- animação de entrada com escala e fade discretos;
- duração aproximada de 1 segundo;
- sem bounce ou efeitos exagerados.

## Arquivos alterados
- `src/pages/AssessmentForm.tsx`
- `src/components/ScoreGauge.tsx`

## Validação
Antes de qualquer push:

```powershell
npx tsc --noEmit
npm run build
```
