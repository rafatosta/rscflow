# RSCFlow

O RSCFlow ajuda docentes do IFBA a organizar o Memorial Descritivo do Reconhecimento de Saberes e
Competências (RSC). A aplicação reúne as informações do processo em um fluxo guiado e gera os
documentos para conferência e entrega.

## Acessar o sistema

Acesse o [RSCFlow](https://rafatosta.github.io/rscflow/).

## O que é possível fazer

- criar e manter mais de um projeto de RSC;
- preencher dados docentes, formação e atividades de RSC I, II e III;
- anexar comprovantes aos lançamentos;
- preparar e editar o memorial descritivo;
- revisar pendências antes de gerar os documentos;
- gerar o memorial, os formulários e os comprovantes em PDF;
- baixar um pacote com os documentos finais;
- exportar e restaurar uma cópia completa do projeto.

O repositório também oferece um [processo fictício completo de RSC III](examples/rsc-iii-demonstrativo/)
para conhecer o fluxo. Os dados e documentos desse exemplo não têm validade.

## Privacidade e conservação dos dados

Os projetos e comprovantes ficam armazenados no navegador usado para acessar o RSCFlow. O sistema
não exige conta e não envia dados pessoais ou documentos para serviços externos.

Limpar os dados do site, usar uma janela privativa ou trocar de navegador ou dispositivo pode
impedir o acesso aos projetos salvos. Baixe regularmente uma cópia completa no formato `.rscflow`,
principalmente antes de limpar o navegador ou mudar de equipamento.

## Situação das regras de pontuação

O catálogo de critérios ainda aguarda validação humana final. O sistema pode mostrar pontuações
provisórias por requisito, acompanhadas de aviso, mas não apresenta o total do projeto enquanto a
validação estiver pendente. Um critério do RSC II possui conflito no texto oficial e, por isso, não
é calculado.

Confira os resultados e os documentos gerados antes de utilizá-los em um processo oficial. Em caso
de divergência, prevalece a regulamentação oficial do IFBA.

## Como reportar um problema

Abra uma [nova issue](https://github.com/rafatosta/rscflow/issues/new) e informe:

- o que você estava tentando fazer;
- o que aconteceu e o que esperava que acontecesse;
- os passos para reproduzir o problema;
- o navegador e o dispositivo utilizados;
- imagens da tela, se ajudarem a explicar o problema.

Não inclua dados pessoais, comprovantes ou documentos do seu processo no relato.

## Documentação técnica

As instruções para instalação, desenvolvimento, testes, arquitetura e publicação estão na
[documentação técnica](docs/technical-guide.md).
