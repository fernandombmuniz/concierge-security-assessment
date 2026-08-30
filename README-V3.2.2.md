# Concierge Security Assessment V3.2.2

Revisão de linguagem da interface pública. Não altera scoring, coverage, confidence, banco, Supabase ou fluxo de e-mail.

## Alterações

- Remove `Leitura consistente`, `Leitura inicial` e `Leitura limitada` da apresentação padrão.
- Quando há informação suficiente no domínio, não mostra nenhum rótulo adicional.
- Quando faltam respostas relevantes, mostra apenas uma orientação simples:
  - `Alguns pontos precisam ser confirmados`
  - `Há pontos importantes a confirmar`
- Substitui `Qualidade da leitura` no resumo executivo por `Próximo passo`.
- O próximo passo passa a acompanhar o domínio priorizado pela engine.
- Mantém `coverage` e `confidence` internamente, sem expor a mecânica ao cliente.

## Arquivos a substituir

- `src/components/DomainBars.tsx`
- `src/pages/ClientResults.tsx`

## Validação

```powershell
npx tsc --noEmit
npm run build
```
