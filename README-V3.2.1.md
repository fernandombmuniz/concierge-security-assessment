# Concierge Security Assessment V3.2.1

Patch consolidado da V3.2 com ajuste de linguagem da qualidade da leitura.

## Alterações desta revisão
- Remove percentuais de "cobertura" da interface do cliente.
- Remove "confiança alta/baixa" da primeira camada visual.
- Exibe apenas três estados executivos por domínio:
  - Leitura consistente
  - Leitura inicial
  - Leitura limitada
- Mantém `coverage`, `confidence` e controles desconhecidos na engine para uso interno.
- Atualiza o texto de explicação do score para falar em validação adicional, sem exigir que o cliente entenda cobertura estatística.
- Troca "Cobertura das respostas" por "Qualidade da leitura" na leitura executiva.
- Mantém o comportamento e o scoring da V3.2 inalterados.
- Inclui as correções de tipos/schema já validadas localmente para evitar as duplicidades de `EndpointResponseLevel` e `DataLocationLevel`.

## Instalação
Copie a pasta `src` para a raiz do projeto e aceite substituir os arquivos existentes.

Depois rode:

```powershell
npx tsc --noEmit
npm run build
```

Não faça push antes de validar localmente.
