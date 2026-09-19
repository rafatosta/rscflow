# Demonstração fictícia de RSC III

Este diretório contém um processo completo, inteiramente fictício, para apresentar e testar o fluxo
do RSCFlow. Não representa pessoa, curso, instituição, atividade, documento ou pontuação real. Os
PDFs dizem explicitamente que não possuem validade.

O projeto está no formato JSON atualmente exportado pelo RSCFlow e usa somente IDs de critérios
presentes no catálogo `ifba-189-2026` distribuído pelo aplicativo. Ele declara RSC III como nível
pretendido e inclui formação, oito lançamentos nos níveis RSC I, II e III, referências de
comprovantes e um memorial preenchido.

## Carregar o exemplo

1. Execute `npm run dev` e abra o RSCFlow no navegador.
2. Na página inicial, em **Restaurar backup**, selecione
   `processo-rsc-iii-demonstrativo.json`.
3. Abra o projeto restaurado. Em **Requisitos**, cada lançamento já contém o nome do PDF
   correspondente em `comprovantes/`. Se quiser testar o seletor de anexos, abra o lançamento,
   escolha o respectivo PDF e salve.
4. Percorra as seções de Memorial, Revisão e Documentos para conferir os dados importados.

O JSON não contém bytes de arquivos por contrato de portabilidade. Por isso, os nomes dos
comprovantes são restaurados, mas os respectivos arquivos devem ser selecionados novamente quando
for necessário anexá-los ao navegador.

| Nível   | Item | Lançamento                    | PDF                                   |
| ------- | ---- | ----------------------------- | ------------------------------------- |
| RSC I   | a.1  | Gestão escolar fictícia       | `01-rsc-i-a1-gestao-escolar.pdf`      |
| RSC I   | c.1  | Curso FIC fictício            | `02-rsc-i-c1-curso-fic.pdf`           |
| RSC II  | a.1  | Orientação fictícia de TCC    | `03-rsc-ii-a1-orientacao-tcc.pdf`     |
| RSC II  | d.1  | Projeto de extensão fictício  | `04-rsc-ii-d1-projeto-extensao.pdf`   |
| RSC III | a.1  | Protótipo fictício            | `05-rsc-iii-a1-prototipo.pdf`         |
| RSC III | b.1  | Elaboração fictícia de PPC    | `06-rsc-iii-b1-ppc.pdf`               |
| RSC III | c.1  | Captação fictícia interna     | `07-rsc-iii-c1-captacao-propria.pdf`  |
| RSC III | d.1  | Captação fictícia em parceria | `08-rsc-iii-d1-captacao-parceria.pdf` |

O primeiro comprovante possui duas páginas para demonstrar intervalos no mapa; os demais possuem
uma página cada.

## Regenerar os PDFs

`generate-comprovantes.py` gera os oito PDFs de forma determinística com `reportlab`.
