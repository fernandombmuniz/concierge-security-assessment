# Concierge Security Assessment V3.4 - Relatório em PDF

Esta atualização adiciona ao final do resultado o botão:

**Baixar relatório em PDF**

## O que foi implementado

- Geração do PDF diretamente no navegador.
- Mantém o visual escuro/teal do relatório exibido no site.
- Força layout desktop para o PDF, mesmo quando o download é feito no celular.
- Expande automaticamente os detalhes técnicos dos três principais pontos durante a geração.
- Inclui todas as áreas visíveis do resultado:
  - resumo do diagnóstico;
  - indicador de maturidade;
  - visão por área;
  - leitura executiva;
  - prioridade;
  - principais pontos;
  - detalhes técnicos e referências;
  - cenário operacional;
  - referência ANPD/LGPD quando aplicável;
  - próximos passos.
- Paginação A4.
- Rodapé com nome da empresa e número da página.
- Nome do arquivo no padrão:
  `concierge-security-assessment-nome-da-empresa.pdf`
- O botão não aparece dentro do próprio PDF.
- Não altera Supabase, scoring, Edge Functions ou Resend.

## Por que usamos `html2canvas-pro`

O projeto utiliza Tailwind moderno. O `html2canvas` tradicional possui problemas conhecidos com funções de cor CSS modernas como `oklch()`. O `html2canvas-pro` possui suporte a essas funções e é mais adequado para capturar o visual atual da aplicação.

## Instalação

1. Extraia este ZIP.
2. Copie a pasta `src` para a raiz do seu projeto.
3. Coloque `apply-report-pdf.ps1` na raiz do projeto.
4. Abra o PowerShell na raiz do projeto e execute:

```powershell
powershell -ExecutionPolicy Bypass -File .\apply-report-pdf.ps1
```

5. Instale as dependências:

```powershell
npm install html2canvas-pro jspdf
```

6. Valide:

```powershell
npx tsc --noEmit
npm run build
```

## Teste recomendado

1. Execute `npm run dev`.
2. Abra um resultado já concluído.
3. Vá até o final da página.
4. Clique em **Baixar relatório em PDF**.
5. Confirme:
   - nome correto da empresa;
   - score;
   - quatro áreas;
   - três principais pontos;
   - detalhes técnicos expandidos;
   - cenário financeiro;
   - ANPD/LGPD quando aplicável;
   - páginas sem cortes relevantes.

## Observação

A implementação captura o próprio relatório visual já renderizado pela aplicação, em vez de manter uma segunda versão de texto separada. Isso reduz o risco de o PDF ficar diferente do que o cliente visualizou no site.
