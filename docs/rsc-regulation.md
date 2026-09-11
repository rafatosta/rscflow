# Dados e motor normativos

## Precedência das fontes

Decisão do mantenedor em 10/09/2026: **em divergências, prevalece sempre a normativa**. Essa decisão substitui o bloqueio anterior por divergências entre resolução, planilha e JSON. A fonte primária é a Resolução CONSUP/IFBA nº 189/2026 em `docs/ifba/`; a planilha é fonte auxiliar. Não se corrigem ambiguidades internas da resolução por inferência.

Divergências conhecidas resolvidas pela precedência:

- RSC I/a.3: adotar fator **0,41**, Anexo IV, página 17 do PDF, em lugar de 0,415 armazenado em `RSC I!C7` da planilha.
- RSC I/g.1: adotar unidade **certame**, Anexo IV, página 19 do PDF, em lugar de mês em `RSC I!D64`.

Os recortes de regressão registram os valores da resolução. As fontes originais não foram modificadas.

## Política de cálculo conferida

`metadata.json.scoring` contém os parâmetros; nenhum limiar ou fator normativo é fixado em React ou no algoritmo:

- Art. 12 §3 e art. 17, páginas 8 e 10: mínimo total 60 e mínimo 36 no nível pretendido.
- Art. 15 §2 I, página 10: máximo 100 por nível.
- Art. 15 e §2 III–V, páginas 9–10: quantidade máxima por item, fator × quantidade × peso; soma dos critérios com teto de diretriz; soma dos três níveis.
- Art. 15 §2 VI, página 10: arredondamento do resultado final para inteiro, fração inferior a 0,50 para baixo e a partir de 0,50 para cima. O contrato `rounding.scope = total` aplica-o ao total geral, sem arredondar itens, diretrizes ou níveis. O mínimo no nível pretendido é comparado ao subtotal sem arredondamento.
- Art. 16, página 10: atividade pontuada em um único nível explicitamente escolhido pelo docente.

O máximo de quantidade é compartilhado por todas as atividades do mesmo critério. A pontuação individual é informativa, anterior à consolidação; somá-la diretamente pode exceder os limites compartilhados. O peso da diretriz é descritivo e não é multiplicado novamente.

## Catálogo e validação

Os três arquivos de níveis continuam com status `pending-official-validation` e arrays vazios: não foi concluída a transcrição e validação integral dos anexos. A conferência da política de cálculo não torna o catálogo validado. A versão normativa permanece null. O motor retorna `unavailable`, sem total, para esse dataset.

O explorador de critérios lê diretamente os níveis, diretrizes, critérios e proveniência desse contrato. A busca e a apresentação não mantêm cópias de fator, unidade, peso, quantidade máxima, descrição ou teto de diretriz. Assim, editar um JSON validado altera a interface sem alterar componentes. Enquanto o catálogo IFBA permanecer pendente e vazio, a tela informa essa condição e o seletor de atividades fica indisponível, preservando referências importadas sem criar enquadramentos fictícios.

Durante a conferência, a célula de peso de RSC II/d.5 (Anexo V, PDF p. 20) apresenta a sequência “14”, enquanto os arts. 7 e 15 descrevem pesos 1 ou 2. A célula não foi interpretada nem transcrita. Sua eventual anotação/ambiguidade interna precisa ser esclarecida antes da validação integral do catálogo; a precedência sobre a planilha não resolve ambiguidades dentro da própria normativa.

Schemas verificam três níveis distintos, referência normativa, IDs globais únicos, códigos únicos por coleção/nível e vínculo critério–diretriz. A convenção técnica de código é letras minúsculas para diretriz e `<diretriz>.<inteiro positivo>` para critério. Valores devem ser finitos e não negativos. Valores ausentes nunca são convertidos em zero.

Cada linha registra status, origem e responsável pela conferência. Dataset validado exige versão, fontes e todos os níveis com conteúdo validado. Aprovação estrutural não certifica validação humana. Fixtures normativas são recortes identificados e não substituem um catálogo completo.

Os testes de exploração usam uma fixture sintética, declarada como tal e validada somente para exercitar busca, seleção e renderização. Ela não é carregada pela aplicação e não acrescenta valores ao catálogo oficial pendente.

## Estados do motor

`calculateProjectScore` exige envelope tipado 2.0, versão normativa correspondente, requerimento, catálogo e política validados. Um critério inválido, referência inexistente ou escolha incompatível torna o cálculo indisponível. Não há total parcial apresentado como definitivo.

Os únicos resultados quantitativos são `quantitative-requirements-met`, `quantitative-requirements-not-met` e `unavailable`. Eles não concedem RSC nem verificam requisitos qualitativos, prazos, autenticidade dos comprovantes ou pareceres da comissão.
