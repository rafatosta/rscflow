# Demonstração fictícia de RSC III

Este diretório contém um processo completo, inteiramente fictício, para apresentar e testar o fluxo
do RSCFlow. Não representa pessoa, curso, instituição, atividade, documento ou pontuação real. Os
PDFs dizem explicitamente que não possuem validade.

O projeto usa o envelope portátil 3.0 e somente IDs de critérios presentes no catálogo
`ifba-189-2026` distribuído pelo aplicativo. Ele declara RSC III como nível pretendido e inclui
formação, oito lançamentos nos níveis RSC I, II e III, referências de comprovantes e um memorial
preenchido.

## Carregar o exemplo

1. Execute `npm run dev` e abra o RSCFlow no navegador.
2. Em **Gerar documentos**, selecione `processo-rsc-iii-demonstrativo.json` em **Arquivo de projeto
   JSON** e escolha **Importar como novo projeto**.
3. Em **Requisitos**, abra cada lançamento abaixo para edição, selecione o PDF correspondente em
   `comprovantes/` e salve. O RSCFlow reutiliza o descritor já presente no JSON e grava os bytes no
   IndexedDB local.
4. Em **Gerar documentos**, use **Verificar documentos**. Os oito arquivos devem aparecer como
   disponíveis; então percorra Memorial, Revisão, Prévia e a geração do PDF do memorial.

O JSON não contém bytes de arquivos por contrato de portabilidade. Após apenas a importação, a
interface corretamente indicará os comprovantes como ausentes; anexar os PDFs locais completa o
exemplo e também permite testar a recuperação de anexos após importação.

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

## Regenerar os PDFs

`generate-comprovantes.py` gera os oito PDFs de forma determinística com `reportlab`. Depois de
alterar o gerador, atualize tamanho e SHA-256 dos descritores no JSON; o RSCFlow verifica ambos ao
abrir um arquivo local.
