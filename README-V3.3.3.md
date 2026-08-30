# V3.3.3 - Ajuste de linguagem do terceiro card

Alteração somente em `src/pages/ClientResults.tsx`.

A mensagem do terceiro card agora depende do score absoluto do melhor domínio:

- abaixo de 60: melhor condição relativa, mas ainda com espaço importante para evolução;
- 60 a 79: base mais estruturada, porém ainda exige revisão de lacunas;
- 80 ou mais: condição madura o suficiente para recomendar manutenção e revisão periódica.

Isso evita que um domínio apenas "menos fraco" seja tratado como adequado.
