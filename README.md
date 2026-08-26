# Concierge Assessment Hub

IMPORTANTE: este projeto já está visualmente aprovado e funcional localmente.

NÃO redesenhe a aplicação.

NÃO altere layout, identidade visual, tipografia, cores, espaçamentos, textos, perguntas, opções, scores, metodologia, cálculos, gráficos ou lógica atual do Security Assessment, exceto quando estritamente necessário para implementar a infraestrutura descrita abaixo.

Antes de alterar qualquer arquivo:

1. Analise toda a estrutura atual do projeto.

2. Identifique como o formulário, autosave, resultados, scoring e estado atual funcionam.

3. Preserve integralmente o comportamento existente.

4. Faça apenas as alterações necessárias para conectar o produto ao Supabase e implementar o fluxo abaixo.

OBJETIVO

Transformar o Concierge Security Assessment atual em uma aplicação online onde:

1. Um Account Manager envia seu link individual para um cliente.

2. O sistema identifica silenciosamente qual AM originou aquele acesso.

3. O cliente realiza o Security Assessment normalmente.

4. Todas as respostas são persistidas no Supabase durante o preenchimento.

5. Ao finalizar, o diagnóstico continua sendo exibido normalmente ao cliente.

6. Todas as informações coletadas e os resultados calculados ficam registrados no Supabase.

7. Um relatório interno completo é enviado exclusivamente ao e-mail do AM responsável por aquele link.

8. Nenhuma informação interna sobre AM, roteamento, IDs, banco ou pré-dimensionamento interno deve ser exibida ao cliente.

==================================================

1. IDENTIFICAÇÃO DO ACCOUNT MANAGER

==================================================

Implementar identificação através de parâmetro de URL.

Exemplo:

/assessment?ref=IDENTIFICADOR_DO_AM

NÃO utilizar e-mail diretamente na URL.

O parâmetro "ref" deve corresponder a um identificador público/UUID armazenado no Supabase.

Criar tabela:

account_managers

Campos sugeridos:

id uuid primary key

public_ref text unique not null

name text not null

email text not null

active boolean default true

created_at timestamptz default now()

Exemplo conceitual:

public_ref: identificador não previsível

name: Fernando Muniz

email: e-mail corporativo correspondente

public_ref: outro identificador não previsível

name: Leo

email: e-mail corporativo correspondente

IMPORTANTE:

Não hardcode e-mails de AMs no frontend.

O frontend conhece apenas public_ref.

A resolução:

public_ref -> Account Manager -> e-mail

deve acontecer de forma segura no backend/Supabase.

O e-mail do AM nunca deve ser exposto através do parâmetro da URL.

==================================================

2. ORIGEM DA OPORTUNIDADE

==================================================

Preparar também suporte opcional ao parâmetro:

src

Exemplo:

/assessment?ref=IDENTIFICADOR&src=linkedin

Possíveis origens futuras:

linkedin

whatsapp

email

evento

indicacao

prospeccao

outro

Não é necessário mostrar isso ao cliente.

Apenas registrar no assessment.

==================================================

3. PERSISTÊNCIA DO ASSESSMENT

==================================================

Criar estrutura no Supabase para armazenar cada assessment.

Sugestão:

assessments

id uuid primary key

account_manager_id uuid foreign key

source text nullable

status text

company_name text

sector text

respondent_name text

respondent_role text

respondent_email text

users_count integer

units_count integer

overall_score numeric nullable

network_score numeric nullable

endpoint_score numeric nullable

continuity_score numeric nullable

identity_score numeric nullable

priority_domain text nullable

coverage_percentage numeric nullable

methodology_version text

started_at timestamptz

completed_at timestamptz nullable

created_at timestamptz default now()

updated_at timestamptz default now()

O schema pode ser melhorado caso a arquitetura atual do código justifique outra organização.

Não force este schema caso exista uma solução tecnicamente melhor.

==================================================

4. RESPOSTAS COMPLETAS

==================================================

Precisamos preservar TODAS as informações fornecidas pelo cliente.

Nenhuma resposta pode ser descartada.

Criar estrutura adequada para armazenar:

Empresa

Rede

Dispositivos

Continuidade

Acesso

Além de todos os campos de pré-dimensionamento existentes.

Pode utilizar JSONB para respostas completas caso isso preserve melhor a estrutura atual.

Exemplo:

assessment_responses

id

assessment_id

section

answers jsonb

created_at

updated_at

Ou arquitetura equivalente.

O requisito principal é:

TODAS AS RESPOSTAS DEVEM SER RECUPERÁVEIS POSTERIORMENTE.

==================================================

5. AUTOSAVE

==================================================

O sistema atualmente possui comportamento de salvamento durante o preenchimento.

Preservar a experiência visual existente.

Agora, além da persistência local existente, implementar persistência real no Supabase.

Fluxo desejado:

cliente inicia assessment

↓

assessment é criado

↓

recebe UUID

↓

cada etapa preenchida atualiza o registro

↓

cliente pode navegar entre etapas sem perder informações

↓

ao finalizar, todas as respostas já estão persistidas

Não depender exclusivamente do clique em "Finalizar" para salvar os dados.

Utilizar estratégia de debounce para evitar requisições excessivas.

Se houver falha temporária de conexão:

preservar estado local

tentar sincronizar novamente

não apagar respostas preenchidas

O indicador visual "Salvando..." existente deve continuar coerente com o estado real de persistência.

==================================================

6. SEGURANÇA DO BANCO

==================================================

Configurar Row Level Security adequadamente.

O cliente NÃO deve conseguir:

listar assessments de outras pessoas

consultar todos os registros

consultar tabela de Account Managers

descobrir e-mails de Account Managers

alterar assessments de terceiros

Não utilizar service_role key no frontend.

Nunca expor secrets no código cliente.

Qualquer operação privilegiada deve ocorrer server-side através de Edge Function ou mecanismo seguro equivalente.

Validar os dados recebidos também no backend.

==================================================

7. FINALIZAÇÃO

==================================================

Quando o cliente finalizar o diagnóstico:

1. Validar respostas.

2. Garantir que os dados finais estejam sincronizados.

3. Executar a metodologia de scoring JÁ EXISTENTE.

4. NÃO alterar os cálculos atuais.

5. Salvar os scores finais.

6. Salvar domínio prioritário.

7. Salvar achados.

8. Salvar cobertura do diagnóstico.

9. Registrar completed_at.

10. Alterar status para completed.

11. Exibir normalmente o Resultado já existente.

12. Acionar geração do relatório interno.

13. Enviar relatório somente ao Account Manager associado ao public_ref.

O envio do e-mail não pode bloquear a exibição do resultado para o cliente.

Se o e-mail falhar, o assessment deve permanecer salvo e marcado como concluído.

Registrar status de envio para permitir reprocessamento.

==================================================

8. RELATÓRIO INTERNO PARA O AM

==================================================

Este relatório NÃO é o relatório executivo apresentado ao cliente.

Ele funciona como briefing comercial e técnico inicial para o Account Manager.

O e-mail deve ser organizado, legível e profissional.

Assunto:

Novo Security Assessment | [Nome da Empresa]

Cabeçalho:

Concierge Security Assessment

Novo diagnóstico recebido

EMPRESA

Empresa:

Setor:

Contato:

Cargo:

E-mail:

Usuários:

Unidades:

RESPONSÁVEL COMERCIAL

Account Manager:

Origem:

RESUMO DO DIAGNÓSTICO

Score geral:

Classificação:

Cobertura do diagnóstico:

Prioridade identificada:

MATURIDADE POR DOMÍNIO

Rede e Perímetro:

Endpoints:

Backup e Continuidade:

Identidade e Acesso:

AMBIENTE INFORMADO

Apresentar TODAS as informações coletadas no onboarding.

REDE E PERÍMETRO

Listar todas as respostas fornecidas pelo cliente, incluindo, quando existentes:

tipo de proteção atual

acompanhamento de segurança

licenciamento

fabricante

modelo

quantidade de links

velocidade total

perfil de utilização

VPN remota

VPN entre unidades

VLANs

ENDPOINTS

Listar todas as respostas da etapa.

BACKUP E CONTINUIDADE

Listar todas as respostas da etapa.

IDENTIDADE E ACESSO

Listar todas as respostas da etapa.

ACHADOS IDENTIFICADOS

Para cada achado incluir:

Domínio

Severidade

Situação encontrada

Por que merece atenção

Possível impacto

Ponto técnico avaliado

Score relacionado

PRÉ-DIMENSIONAMENTO

Incluir todos os dados coletados que possam auxiliar posteriormente o Account Manager e a equipe técnica.

Não esconder esses dados no relatório interno.

METODOLOGIA

Registrar:

versão da metodologia

data e hora da conclusão

cobertura das respostas

Adicionar observação:

"Este Security Assessment representa um diagnóstico inicial baseado nas informações fornecidas pelo respondente e deverá ser revisado pela equipe Concierge antes de qualquer recomendação técnica ou comercial definitiva."

==================================================

9. ENVIO DO E-MAIL

==================================================

Implementar o envio server-side.

Nunca enviar diretamente pelo navegador usando credenciais expostas.

Utilizar Supabase Edge Function ou arquitetura server-side equivalente.

A função deve:

receber assessment_id

buscar o assessment

resolver account_manager_id

obter o e-mail do AM server-side

montar o relatório

enviar somente para aquele responsável

registrar resultado do envio

Criar controle como:

notification_status

notification_sent_at

notification_error

ou tabela de notifications.

Evitar envio duplicado caso o usuário atualize/recarregue a página Resultado.

A operação deve ser idempotente.

Um assessment concluído deve gerar apenas uma notificação normal ao AM.

==================================================

10. EXPERIÊNCIA DO CLIENTE

==================================================

Não mostrar:

nome do AM

e-mail do AM

public_ref

source

IDs internos

informações de banco

status de envio

dados classificados como uso interno

Para o cliente, o fluxo continua:

Início

↓

Diagnóstico

↓

Resultado

Preservar exatamente a experiência visual já aprovada.

==================================================

11. LINK SEM REF

==================================================

Precisamos tratar acessos diretos sem Account Manager.

Se alguém acessar:

/assessment

sem parâmetro ref:

permitir realizar o diagnóstico normalmente.

Salvar como assessment sem responsável atribuído.

NÃO perder o lead.

Neste caso, preparar uma configuração server-side de fallback para que o diagnóstico possa ser encaminhado futuramente para um e-mail administrativo padrão.

Não expor esse endereço no frontend.

==================================================

12. PRIVACIDADE E LGPD

==================================================

Como serão armazenados:

nome

cargo

e-mail

informações sobre infraestrutura corporativa

adicionar na tela inicial, antes de iniciar o assessment, uma informação curta e discreta sobre tratamento dos dados.

Não transformar isso em um texto jurídico longo.

Adicionar checkbox obrigatório de ciência antes de "Iniciar diagnóstico".

Texto inicial sugerido:

"Estou ciente de que as informações fornecidas serão utilizadas pela Concierge Segurança Digital para elaboração deste diagnóstico e eventual contato relacionado à avaliação apresentada."

Registrar:

consent_at

privacy_notice_version

Não marcar o checkbox por padrão.

==================================================

13. NÃO ALTERAR

==================================================

Muito importante.

Não alterar:

design atual

background atual

tipografia

cores

responsividade

logo

estrutura visual

gráficos

score circular

barras

storytelling

textos do diagnóstico

cards

achados

botões "Como chegamos..."

metodologia de scoring

pesos

faixas de maturidade

lógica dos achados

perguntas

opções de resposta

fluxo das cinco etapas

Não recriar componentes que já funcionam.

Estender o projeto existente.

==================================================

14. PREPARAR PARA FUTURA ÁREA INTERNA

==================================================

Não construir dashboard administrativo agora.

Apenas estruturar o banco de forma que futuramente seja possível termos:

Meus Assessments

Todos os Assessments

Empresa

Contato

Account Manager

Origem

Data

Score

Prioridade

Status

Respostas completas

Também devemos conseguir futuramente implementar:

AM -> visualiza somente seus assessments

Gestor -> visualiza todos

Não gastar tempo construindo essa interface agora.

==================================================

15. ENTREGA

==================================================

Após implementar:

1. Execute build.

2. Corrija erros TypeScript.

3. Verifique console.

4. Verifique persistência no Supabase.

5. Teste refresh durante o onboarding.

6. Teste voltar etapas.

7. Teste finalizar.

8. Teste resultado.

9. Teste envio de e-mail.

10. Teste link com ref.

11. Teste link sem ref.

12. Teste dois AMs diferentes e confirme que cada assessment é enviado somente ao respectivo responsável.

13. Confirme que nenhum e-mail ou dado interno do AM aparece no frontend.

14. Confirme que um refresh da tela Resultado não dispara outro e-mail.

Ao terminar, informe:

- quais tabelas foram criadas

- quais políticas RLS foram criadas

- quais Edge Functions foram criadas

- quais secrets precisam ser configurados

- qual serviço foi utilizado para envio de e-mail

- como cadastrar Fernando e Leo

- como gerar o link individual de cada AM

- como testar todo o fluxo

- quais arquivos do projeto foram alterados

Faça a implementação completa antes de solicitar alterações adicionais de design.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/83645f7c-fa5b-4163-b929-eedd02223c9a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
