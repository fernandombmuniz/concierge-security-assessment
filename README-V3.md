# Concierge Security Assessment — Patch V3.0

## O que muda

A V3.0 troca a lógica centrada em rótulos de produto por uma avaliação de capacidades e processos. O score continua sendo metodologia própria da Concierge; NIST CSF 2.0 e CIS Controls v8.1 são referências de estrutura e cobertura, não fontes de uma nota oficial.

### Novos princípios
1. **Produto não define sozinho a maturidade.** MikroTik/roteador tradicional recebe uma base intermediária e a nota final depende de prevenção ativa, manutenção e monitoramento.
2. **"Não sei informar" não desaparece do cálculo.** O controle recebe valor neutro para não virar falha automática, mas reduz a cobertura e a confiança do domínio.
3. **Backup em nuvem não é sinônimo de recuperação resiliente.** Isolamento/imutabilidade e teste de restauração passam a ter peso próprio.
4. **Postura técnica e oportunidade comercial são separadas.** `opportunityFit` é interno e não altera a nota de maturidade.
5. **Contexto do negócio afeta prioridade, não a maturidade técnica.** Dados sensíveis, incidente anterior, sistemas críticos e baixa tolerância a parada aumentam a prioridade.

## Arquivos alterados
- `src/types.ts`
- `src/lib/assessment-schema.ts`
- `src/lib/assessment-sections.ts`
- `src/lib/assessment.functions.ts`
- `src/scoring.ts`
- `src/frameworkRegistry.ts` (novo)
- `src/sourceRegistry.ts`
- `src/pages/AssessmentForm.tsx`
- `src/pages/ClientResults.tsx`
- `src/pages/InternalResults.tsx`
- `src/components/DomainBars.tsx`

## Novas perguntas
- Proteções ativas no firewall/borda
- Rotina de atualização e revisão da rede
- Gestão centralizada de endpoints
- Inventário de ativos
- Gestão de vulnerabilidades
- Isolamento/imutabilidade de backup
- Proteção adicional de e-mail
- Preparação para resposta a incidentes

## Cenários de validação

### A — MikroTik tradicional
MikroTik/roteador corporativo + sem prevenção ativa + manutenção reativa + TI reativa.
Esperado: maturidade de rede intermediária/baixa, sem nota fixa por fabricante.

### B — MikroTik bem operado
MikroTik + algumas/boas proteções complementares + manutenção formal + monitoramento contínuo.
Esperado: melhora relevante da rede, mas sem equivalência automática a NGFW completo.

### C — MFA desconhecido
MFA = Não sei; contas compartilhadas = Não; offboarding = formal.
Esperado: Identidade não deve aparecer como 100/100 com alta confiança. Cobertura do domínio cai.

### D — Cloud sem isolamento
Backup em nuvem + mesma administração + nunca testado.
Esperado: maturidade baixa/intermediária apesar de estar na nuvem.

### E — Proteção madura
NGFW/proteções ativas + manutenção formal + SOC; EDR gerenciado; inventário e vulnerabilidades; backup isolado e testado; MFA amplo.
Esperado: maturidade alta e cobertura alta.

## Antes de subir
Execute:

```bash
npx tsc --noEmit
npm ci
npm run build
```

Depois teste os cinco cenários localmente. Só então faça commit/push.
