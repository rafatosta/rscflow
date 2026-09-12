# Dados e motor normativos

## Atualização de fonte — nova bateria de 11/09/2026

A resolução é a única fonte normativa oficial. A planilha anteriormente chamada de oficial é
material informal auxiliar de terceiro. Esta orientação substitui essa classificação anterior.
O schema preserva o campo legado `officialScoringSpreadsheet`, atualmente null, por compatibilidade;
a planilha não participa nem é requisito da validação. Em 12/09/2026, os Anexos IV, V e VI foram
incorporados como transcrição de trabalho, ainda pendente de validação humana final.

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

## Níveis, diretrizes e múltiplos enquadramentos

O dataset possui exatamente os níveis RSC I, RSC II e RSC III. Cada nível agrupa diretrizes e cada
critério aponta para uma dessas diretrizes. O motor consolida as quantidades por critério, aplica o
limite do item, soma os critérios até o teto da diretriz, soma as diretrizes até 100 pontos no nível
e então soma os três níveis. Os mínimos quantitativos são 60 pontos no total e 36 pontos, sem
arredondamento intermediário, no nível pretendido.

Uma atividade aceita um único `criterionId` e um único `selectedLevel`, em cumprimento à escolha
explícita do art. 16. O projeto pode ter várias atividades e elas podem declarar critérios distintos
ou o mesmo critério; nesse segundo caso, suas quantidades compartilham o limite do item. A aplicação
não reconhece automaticamente que cadastros diferentes descrevem a mesma ocorrência. Cabe ao
docente não duplicar uma ocorrência para obter múltiplos enquadramentos; nenhuma deduplicação ou
classificação é inferida por título, período, categoria ou evidência compartilhada.

## Catálogo e validação

Os JSONs em `src/data/regulations/ifba-189-2026/` são a representação normativa consumida pela
aplicação e foram transcritos dos Anexos IV, V e VI da Resolução nº 189/2026. RSC I contém 8
diretrizes e 48 critérios; RSC II, 7 e 36; RSC III, 7 e 53. Permanecem pendentes de validação humana
final, com versão normativa null. A conferência estrutural e da política de cálculo não promove o
catálogo a validado; o motor retorna `unavailable`, sem total.

O explorador de critérios lê diretamente níveis, diretrizes, critérios e proveniência. A busca e a
apresentação não mantêm cópias de fator, unidade, peso, quantidade máxima, descrição ou teto. Assim,
editar o JSON altera a consulta sem alterar componentes. O catálogo pendente fica visível para
consulta, enquanto o seletor de lançamentos permanece indisponível e preserva referências existentes.

No RSC II/d.5, o Anexo V, página 20 do PDF, imprime peso **14**, enquanto o art. 15 limita os pesos
a 1 ou 2 e o Anexo VII atribui peso 1 à diretriz d. O JSON mantém literalmente 14 e registra
`provenance.issue.type = normative-conflict`. A interface anuncia o conflito; schemas impedem
validar o nível enquanto a marca existir; motor e cadastro quantitativo continuam bloqueados.
A precedência da resolução sobre a planilha não resolve essa ambiguidade interna da normativa.

Schemas verificam três níveis distintos, referência normativa, IDs globais únicos, códigos únicos por coleção/nível e vínculo critério–diretriz. A convenção técnica de código é letras minúsculas para diretriz e `<diretriz>.<inteiro positivo>` para critério. Valores devem ser finitos e não negativos. Valores ausentes nunca são convertidos em zero.

Cada linha registra status, origem e responsável pela conferência. Dataset validado exige versão, fontes e todos os níveis com conteúdo validado. Aprovação estrutural não certifica validação humana. Fixtures normativas são recortes identificados e não substituem um catálogo completo.

Os testes de exploração usam uma fixture sintética, declarada como tal e validada somente para exercitar busca, seleção e renderização. Ela não é carregada pela aplicação e não acrescenta valores ao catálogo oficial pendente.

## Estados do motor

`calculateProjectScore` exige envelope tipado 2.0, versão normativa correspondente, requerimento, catálogo e política validados. Um critério inválido, referência inexistente ou escolha incompatível torna o cálculo indisponível. Não há total parcial apresentado como definitivo.

Os únicos resultados quantitativos são `quantitative-requirements-met`, `quantitative-requirements-not-met` e `unavailable`. Eles não concedem RSC nem verificam requisitos qualitativos, prazos, autenticidade dos comprovantes ou pareceres da comissão.

## Procedimento para corrigir o JSON normativo

1. Localize o dispositivo e o anexo na resolução oficial em `docs/ifba/`; use a planilha apenas como
   apoio de transcrição.
2. Compare resolução, planilha e JSON. Se houver divergência externa, aplique a resolução e registre
   aqui o item, os dois valores, arquivo, página e célula quando houver. Se a resolução for
   internamente ambígua, mantenha a linha pendente e solicite decisão do mantenedor.
3. Edite somente `metadata.json`, `rsc-i.json`, `rsc-ii.json` ou `rsc-iii.json`, conforme o dado. Não
   crie condição por código de item em `src/rules/` nem copie o valor para componentes.
4. Atualize `provenance`, `status`, responsável, fontes e versão. Um nível só pode ser
   marcado `validated` depois da conferência integral; a política validada isoladamente não valida o
   catálogo.
5. Acrescente regressão em `tests/regulation/` com valor esperado independente da implementação e
   execute também schemas, motor, integração e E2E aplicáveis.
6. Atualize esta documentação e `CHANGELOG.md`. Registre mudanças incompatíveis de contrato em
   `docs/data-model.md`; uma simples correção de valor dentro do schema não exige alterar a lógica.

Nunca substitua ausência por zero, promova fixture sintética a dado oficial ou atualize
silenciosamente a versão normativa de projetos existentes.
