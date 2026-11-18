# Concierge Assessment Lúmina V3.0.2

Projeto completo com os dois diagnósticos, apresentação e relatórios Lúmina em PDF.

## Abrir no Windows

1. Extraia o ZIP e abra a pasta `Concierge_Assessment_Lumina_V3`.
2. Copie `.env.local` do Assessment que você já utiliza para esta pasta, junto de `package.json`.
3. Abra `INICIAR_WINDOWS.bat` e mantenha o terminal aberto.

O iniciador prepara as dependências e abre `http://127.0.0.1:8080`. A primeira preparação precisa de internet e pode levar alguns minutos. Para encerrar, use Ctrl+C.

## Gerar build no Windows

Abra `GERAR_BUILD_WINDOWS.bat` ou execute:

```powershell
npm run build
```

A preparação das dependências é automática também nesse comando. Vite é executado pelo arquivo local via Node, sem depender de instalação global ou de um atalho `vite.cmd`.

`build` gera os arquivos de produção. Para abrir o app no navegador, use o iniciador ou `npm run dev`.

## Pelo terminal

Para abrir o app:

```powershell
npm run dev -- --host 127.0.0.1 --port 8080 --strictPort --open
```

Para conferir TypeScript:

```powershell
npm run check
```

Para preparar apenas as dependências:

```powershell
npm run setup
```

Cada comando verifica a instalação antes de continuar. A primeira execução ou uma mudança no arquivo de dependências, sistema operacional, arquitetura ou versão principal do Node exige nova preparação. As dependências de desenvolvimento, incluindo Vite, são instaladas explicitamente.

## macOS ou Linux

Copie a configuração `.env.local` e execute `bash INICIAR_MAC_LINUX.sh`. Os comandos npm acima também funcionam.

## Requisitos e configuração

- Node.js 22.12 ou superior, ou Node.js 20.19+ da linha 20, e npm.
- Internet na primeira instalação e para usar os serviços remotos.
- Porta 8080 livre para o iniciador.
- Configuração do Supabase em `.env.local`. Se não tiver a configuração anterior, copie `.env.example` como `.env.local` e preencha os valores do seu projeto.

O projeto usa TanStack Start. Deve ser aberto pelo iniciador ou servidor de desenvolvimento.

## Rotas

- `/`: entrada do diagnóstico completo.
- `/executive`: diagnóstico executivo.
- `/resultado`: resultado do preenchimento disponível neste navegador.

## Correções consolidadas

- 3.0.1: conversão correta de caminhos Windows e pastas com espaços, usando `fileURLToPath`; rota do formulário configurada para execução no navegador.
- 3.0.2: preparação automática das dependências e execução direta das ferramentas locais pelo Node, inclusive ao chamar `npm run build` em uma extração nova.

As perguntas, as notas e os relatórios seguem a versão anterior. Nenhuma biblioteca de navegação adicional foi instalada.
Leia `VALIDACAO_E_RELATORIOS.md` para os detalhes dos relatórios e das verificações.
