# V3.3.5 - Simplificação do formulário

Substitua apenas `src/pages/AssessmentForm.tsx`.

Mudanças:
- velocidade da internet em faixas;
- acesso remoto em opções simples, sem número exato;
- segmentação da rede em Sim / Parcialmente / Não / Não sei informar;
- remove “Não precisa ser exato”;
- padroniza “Se não souber, deixe em branco.” nos campos opcionais;
- mantém compatibilidade com o scoring atual por meio de valores representativos internos.

Valide com:

```powershell
npx tsc --noEmit
npm run build
```
