# Concierge Security Assessment V3.2.5

## Correção de privacidade e novo assessment

Esta revisão corrige o reaproveitamento de dados locais do respondente anterior em um novo link público.

### O que mudou
- Um acesso por link público com `?ref=` e/ou `?src=` passa a ser tratado como uma nova entrada.
- Antes de renderizar o cabeçalho, o app remove rascunho, resultado local, step, edição e sessão do respondente anterior.
- O Supabase não é apagado. Apenas o estado local do navegador é limpo.
- Ao clicar em **Iniciar diagnóstico**, existe uma segunda limpeza defensiva antes de criar a nova sessão.
- `ref` e `src` são redefinidos para a nova entrada. Um `src` antigo não pode mais ser herdado por um novo cliente.
- Navegar internamente para `/` sem `ref/src` não limpa um assessment em andamento.

### Arquivos alterados
- `src/storage.ts`
- `src/lib/assessment-session.ts`
- `src/pages/LandingPage.tsx`

### Validação
`npx tsc --noEmit` passou sem erros no ambiente de validação.

O build Vite não pôde ser executado neste ambiente por permissão do binário do `node_modules` copiado de outro SO. Rode normalmente no Windows:

```powershell
npx tsc --noEmit
npm run build
```

### Teste recomendado antes do push
1. Preencha um assessment com Empresa A e conclua.
2. Abra novamente `/?ref=fernando&src=teste-privacidade` no mesmo navegador.
3. Confirme que não aparece resultado anterior no header e que o novo diagnóstico inicia vazio.
4. Preencha Empresa B e confirme que o Supabase recebe um novo assessment.
