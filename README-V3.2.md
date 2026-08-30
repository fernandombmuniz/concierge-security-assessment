# Concierge Security Assessment V3.2

## Foco desta revisão
A V3.2 aprofunda a inteligência do assessment sem aumentar o questionário de forma linear. O objetivo é separar tecnologia instalada, capacidade operacional, contexto do negócio e sequência de evolução.

## Endpoint mais inteligente
- Antivírus básico, antivírus corporativo, EDR e EDR gerenciado possuem maturidades diferentes.
- Antivírus corporativo é reconhecido como uma camada real de proteção, mas não recebe a mesma nota de EDR.
- Nova pergunta adaptativa: quem acompanha/investiga um alerta do endpoint.
- EDR sem processo de resposta perde parte da maturidade operacional.
- Perguntas de administrador local e BYOD deixam de aparecer no questionário principal para reduzir carga.
- Gestão de vulnerabilidades aparece de forma adaptativa.

## Organização de dados e backup
Nova pergunta: onde os dados corporativos realmente ficam.

Possíveis cenários:
- ambiente corporativo centralizado;
- SaaS;
- ambiente misto;
- notebooks/endpoints;
- contas pessoais/nuvem não centralizada.

Quando os dados estão descentralizados, a engine cria uma dependência: organizar/centralizar os dados antes de concluir a estratégia final de backup.

## Dependency Engine
A engine agora pode indicar pré-requisitos, por exemplo:
- organizar dados antes do backup;
- consolidar inventário em paralelo à evolução de endpoint;
- validar operação/configuração de um NGFW existente antes de recomendar substituição.

## Priority Engine
A prioridade deixa de ser simplesmente o domínio com menor score. Agora cruza:
- gap técnico;
- dados sensíveis;
- histórico de incidente;
- criticidade/tolerância a parada;
- descentralização de dados;
- exposição de endpoints;
- contexto de rede.

## Opportunity Engine
Indicador exclusivamente interno e separado do score técnico:
- Endpoint / EDR
- Backup
- Firewall
- Identidade

Cada frente recebe fit de 0 a 100 e uma nota de orientação para o Account Manager. O indicador comercial não altera a maturidade técnica.

## Exemplo Gestex
Um cenário com antivírus corporativo tradicional, notebooks, dados sensíveis e dados descentralizados tende a produzir:
1. Endpoint/EDR como oportunidade forte.
2. Organização/centralização dos dados como dependência.
3. Backup como necessidade relevante após a organização dos dados.
4. Firewall avaliado pelo contexto e capacidades, sem assumir automaticamente que deve ser a primeira frente.

## Arquivos alterados
- src/types.ts
- src/lib/assessment-schema.ts
- src/lib/assessment-sections.ts
- src/lib/assessment.functions.ts
- src/pages/AssessmentForm.tsx
- src/pages/InternalResults.tsx
- src/scoring.ts

O pacote também contém os arquivos da V3.1 para facilitar a substituição completa da pasta src.

## Validação local
Não faça push antes de testar:

```powershell
npx tsc --noEmit
npm run build
```

Depois execute o assessment localmente e confira principalmente:
- antivírus corporativo sem EDR;
- EDR sem responsável por alertas;
- dados em notebooks/contas pessoais;
- NGFW existente sem monitoramento;
- prioridade e Opportunity Engine na tela interna.

## Metodologia
Versão: v3.2

Os scores e pesos são metodologia interna Concierge. NIST CSF 2.0 e CIS Controls v8.1 são usados como referências de estrutura e relevância dos controles, não como origem das notas numéricas.
