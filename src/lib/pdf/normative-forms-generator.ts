import { jsPDF } from "jspdf";
import { autoTable, type UserOptions } from "jspdf-autotable";

import {
  boldFontBase64,
  regularFontBase64,
} from "@/lib/pdf/rscflow-sans-fonts";
import type { NormativeProcessDocument } from "@/lib/pdf/normative-model";

const MARGIN = { top: 72, right: 36, bottom: 48, left: 36 };
const CONTENT_WIDTH = 523;
const annexes = ["IV", "V", "VI"];

const levelLabel = (level: string) =>
  level
    .replace("rsc-", "RSC ")
    .toUpperCase()
    .replace("I I", "II")
    .replace("I I I", "III");

const number = (value?: number) =>
  value === undefined
    ? "-"
    : new Intl.NumberFormat("pt-BR", {
        maximumFractionDigits: 4,
      }).format(value);

type Level = NormativeProcessDocument["levels"][number];
type Directive = Level["directives"][number];
type Criterion = Directive["criteria"][number];

/* -------------------------------------------------------------------------- */
/* Fontes                                                                     */
/* -------------------------------------------------------------------------- */

function installFonts(document: jsPDF) {
  document.addFileToVFS("RSCFlowSans-Regular.ttf", regularFontBase64);

  document.addFont("RSCFlowSans-Regular.ttf", "RSCFlowSans", "normal");

  document.addFileToVFS("RSCFlowSans-Bold.ttf", boldFontBase64);

  document.addFont("RSCFlowSans-Bold.ttf", "RSCFlowSans", "bold");

  document.setFont("RSCFlowSans", "normal");
}

/* -------------------------------------------------------------------------- */
/* Títulos                                                                    */
/* -------------------------------------------------------------------------- */

function title(
  document: jsPDF,
  annex: string,
  value: string,
  continuation = false,
) {
  document.setFont("RSCFlowSans", "bold");
  document.setFontSize(8);
  document.setTextColor(90);

  document.text(
    `${annex}${continuation ? " · CONTINUAÇÃO" : ""}`,
    MARGIN.left,
    40,
  );

  document.setFontSize(11);
  document.setTextColor(20);

  document.text(value, MARGIN.left, 57, {
    maxWidth: CONTENT_WIDTH,
  });
}

/* -------------------------------------------------------------------------- */
/* Rodapé                                                                     */
/* -------------------------------------------------------------------------- */

function footer(document: jsPDF) {
  const pages = document.getNumberOfPages();

  for (let page = 1; page <= pages; page += 1) {
    document.setPage(page);

    document.setFont("RSCFlowSans", "normal");
    document.setFontSize(7);
    document.setTextColor(90);

    document.text(`RSCFlow · página ${page} de ${pages}`, MARGIN.left, 818);
  }
}

/* -------------------------------------------------------------------------- */
/* Tabela base                                                                */
/* -------------------------------------------------------------------------- */

function table(document: jsPDF, options: UserOptions) {
  autoTable(document, {
    margin: MARGIN,
    showHead: "everyPage",
    rowPageBreak: "avoid",

    styles: {
      font: "RSCFlowSans",
      fontSize: 7,
      cellPadding: 3,
      overflow: "linebreak",
      valign: "middle",
      lineColor: [90, 90, 90],
      lineWidth: 0.45,
    },

    headStyles: {
      fontStyle: "bold",
      fillColor: [240, 240, 240],
      textColor: [20, 20, 20],
      lineColor: [90, 90, 90],
      lineWidth: 0.45,
    },

    bodyStyles: {
      lineColor: [90, 90, 90],
      lineWidth: 0.45,
    },

    ...options,
  });
}

/* -------------------------------------------------------------------------- */
/* Títulos de continuação                                                     */
/* -------------------------------------------------------------------------- */

function continuationTitles(
  document: jsPDF,
  firstPage: number,
  annex: string,
  heading: string,
) {
  const lastPage = document.getNumberOfPages();

  for (let page = firstPage + 1; page <= lastPage; page += 1) {
    document.setPage(page);
    title(document, annex, heading, true);
  }

  document.setPage(lastPage);
}

/* -------------------------------------------------------------------------- */
/* Helpers dos anexos IV, V e VI                                              */
/* -------------------------------------------------------------------------- */

function levelBandRow(level: string) {
  return [
    {
      content: `RECONHECIMENTO DE SABERES E COMPETÊNCIAS - ${levelLabel(
        level,
      )}`,
      colSpan: 9,
      styles: {
        halign: "center" as const,
        valign: "middle" as const,
        fontStyle: "bold" as const,
        fillColor: [255, 255, 220],
        textColor: [0, 0, 0],
        lineColor: [60, 60, 60],
        lineWidth: 0.6,
      },
    },
  ];
}

function directiveHeaderRow(directive: Directive) {
  return [
    {
      content: `${directive.code}) ${directive.title}`,
      colSpan: 2,
      styles: {
        fontStyle: "bold" as const,
        halign: "left" as const,
        valign: "middle" as const,
        fillColor: [220, 220, 220],
        textColor: [0, 0, 0],
      },
    },

    {
      content: "Fator de\npontuação\np/ unidade",
      styles: {
        fontStyle: "bold" as const,
        halign: "center" as const,
        valign: "middle" as const,
        fillColor: [220, 220, 220],
      },
    },

    {
      content: "UN",
      styles: {
        fontStyle: "bold" as const,
        halign: "center" as const,
        valign: "middle" as const,
        fillColor: [220, 220, 220],
      },
    },

    {
      content: "Quantidade\nMáxima/UN",
      styles: {
        fontStyle: "bold" as const,
        halign: "center" as const,
        valign: "middle" as const,
        fillColor: [220, 220, 220],
      },
    },

    {
      content: "Peso",
      styles: {
        fontStyle: "bold" as const,
        halign: "center" as const,
        valign: "middle" as const,
        fillColor: [220, 220, 220],
      },
    },

    {
      content: "Quantidade\nComprovada\n(UN)",
      styles: {
        fontStyle: "bold" as const,
        halign: "center" as const,
        valign: "middle" as const,
        fillColor: [220, 220, 220],
      },
    },

    {
      content: "Pontuação\nfinal",
      styles: {
        fontStyle: "bold" as const,
        halign: "center" as const,
        valign: "middle" as const,
        fillColor: [220, 220, 220],
      },
    },

    {
      content: "Pág.",
      styles: {
        fontStyle: "bold" as const,
        halign: "center" as const,
        valign: "middle" as const,
        fillColor: [220, 220, 220],
      },
    },
  ];
}

function criterionRow(directive: Directive, criterion: Criterion) {
  return [
    {
      content: `${directive.code}.${criterion.code}`,
      styles: {
        halign: "center" as const,
        valign: "middle" as const,
      },
    },

    {
      content: criterion.description,
      styles: {
        halign: "left" as const,
        valign: "middle" as const,
      },
    },

    {
      content: number(criterion.factor),
      styles: {
        halign: "center" as const,
        valign: "middle" as const,
      },
    },

    {
      content: criterion.unit || "-",
      styles: {
        halign: "center" as const,
        valign: "middle" as const,
      },
    },

    {
      content: number(criterion.maximumQuantity),
      styles: {
        halign: "center" as const,
        valign: "middle" as const,
      },
    },

    {
      content: number(criterion.weight),
      styles: {
        halign: "center" as const,
        valign: "middle" as const,
      },
    },

    {
      content: number(criterion.provenQuantity),
      styles: {
        halign: "center" as const,
        valign: "middle" as const,
      },
    },

    {
      content: number(criterion.finalScore),
      styles: {
        halign: "center" as const,
        valign: "middle" as const,
      },
    },

    {
      content: criterion.proofPage ? String(criterion.proofPage) : "-",
      styles: {
        halign: "center" as const,
        valign: "middle" as const,
      },
    },
  ];
}

function directiveFooterRow(directive: Directive) {
  return [
    {
      content: `Pontuação máxima da diretriz: ${number(
        directive.maximumScore,
      )} pontos`,
      colSpan: 5,
      styles: {
        fontStyle: "bold" as const,
        halign: "center" as const,
        valign: "middle" as const,
        fillColor: [220, 220, 220],
      },
    },

    {
      content: `Pontuação obtida: ${number(directive.obtainedScore)}`,
      colSpan: 3,
      styles: {
        fontStyle: "bold" as const,
        halign: "center" as const,
        valign: "middle" as const,
        fillColor: [220, 220, 220],
      },
    },

    {
      content: "",
      styles: {
        fillColor: [220, 220, 220],
      },
    },
  ];
}

function spacerRow() {
  return [
    {
      content: "",
      colSpan: 9,
      styles: {
        minCellHeight: 12,
        fillColor: [255, 255, 255],
        lineColor: [255, 255, 255],
        lineWidth: 0,
      },
    },
  ];
}

function buildCriteriaSectionBody(level: Level) {
  return [
    levelBandRow(level.level),

    ...level.directives.flatMap((directive, index) => [
      ...(index === 0 ? [] : [spacerRow()]),

      directiveHeaderRow(directive),

      ...directive.criteria.map((criterion) =>
        criterionRow(directive, criterion),
      ),

      directiveFooterRow(directive),
    ]),
  ];
}

/* -------------------------------------------------------------------------- */
/* Geração do PDF                                                             */
/* -------------------------------------------------------------------------- */

export function generateNormativeFormsPdf(
  model: NormativeProcessDocument,
): Uint8Array {
  const document = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
    compress: true,
  });

  installFonts(document);

  document.setProperties({
    title: "Formulários e anexos do processo de RSC",
    author: "RSCFlow",
    creator: "RSCFlow",
    subject: `Resolução ${model.regulation.number}/${model.regulation.year}`,
  });

  /* -------------------------------------------------------------------------- */
  /* ANEXO II                                                                   */
  /* -------------------------------------------------------------------------- */

  const getRequestField = (...labels: string[]) => {
    const normalizedLabels = labels.map((label) =>
      label
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim(),
    );

    const field = model.request.fields.find((item) => {
      const normalized = item.label
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

      return normalizedLabels.some(
        (label) => normalized === label || normalized.includes(label),
      );
    });

    return field?.value ?? "";
  };

  const requestName = getRequestField(
    "nome do(a) docente",
    "nome do docente",
    "nome",
  );

  const requestCpf = getRequestField("cpf");

  const requestSiape = getRequestField(
    "matrícula siape",
    "matricula siape",
    "siape",
  );

  const requestCargo = getRequestField("cargo");

  const requestCampus = getRequestField(
    "campus de lotação",
    "campus de lotacao",
    "campus",
  );

  const requestEmail = getRequestField("e-mail", "email");

  const requestPhone = getRequestField("telefone");

  const requestCurrentRsc = getRequestField(
    "rt ou rsc",
    "rsc atual",
    "nº do processo",
    "numero do processo",
  );

  const requestOrdinance = getRequestField(
    "portaria de concessão",
    "portaria de concessao",
    "portaria",
  );

  const requestEffectiveDate = getRequestField(
    "data de vigência",
    "data de vigencia",
    "vigência",
    "vigencia",
  );

  /*
   * O Anexo II ocupa uma página própria.
   */
  document.setFont("RSCFlowSans", "bold");
  document.setTextColor(0, 0, 0);

  /* ANEXO - II */
  document.setFontSize(12);

  document.text("ANEXO - II", document.internal.pageSize.getWidth() / 2, 58, {
    align: "center",
  });

  /* -------------------------------------------------------------------------- */
  /* Cabeçalho institucional                                                    */
  /* -------------------------------------------------------------------------- */

  autoTable(document, {
    startY: 82,

    margin: {
      left: 56,
      right: 56,
    },

    tableWidth: 483,

    body: [
      [
        {
          content:
            "SOLICITAÇÃO DE RECONHECIMENTO DE SABERES E COMPETÊNCIAS À CPPD",
          styles: {
            halign: "center",
            valign: "middle",
            fontStyle: "bold",
            fontSize: 10.5,
          },
        },
      ],
      [
        {
          content: "INSTITUTO FEDERAL DA BAHIA",
          styles: {
            halign: "center",
            valign: "middle",
            fontStyle: "bold",
            fontSize: 10.5,
          },
        },
      ],
    ],

    styles: {
      font: "RSCFlowSans",
      textColor: [0, 0, 0],
      fillColor: [255, 255, 255],
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      cellPadding: 4,
    },

    didParseCell: (data) => {
      data.cell.styles.minCellHeight = 24;

      /*
       * Remove a linha interna horizontal para que
       * o cabeçalho aparente ser um único quadro.
       */
      if (data.row.index === 0) {
        data.cell.styles.lineWidth = {
          top: 0.5,
          right: 0.5,
          bottom: 0,
          left: 0.5,
        };
      }

      if (data.row.index === 1) {
        data.cell.styles.lineWidth = {
          top: 0,
          right: 0.5,
          bottom: 0.5,
          left: 0.5,
        };
      }
    },
  });

  /* -------------------------------------------------------------------------- */
  /* Dados do servidor                                                          */
  /* -------------------------------------------------------------------------- */

  const headerFinalY = (
    document as jsPDF & {
      lastAutoTable: {
        finalY: number;
      };
    }
  ).lastAutoTable.finalY;

  autoTable(document, {
    startY: headerFinalY + 22,

    margin: {
      left: 56,
      right: 56,
    },

    tableWidth: 483,

    body: [
      /*
       * Nome | CPF | SIAPE
       */
      [
        {
          content: `Nome do(a) docente:\n${requestName}`,
          colSpan: 5,
          styles: {
            minCellHeight: 36,
          },
        },

        {
          content: `CPF:\n${requestCpf}`,
          colSpan: 2,
          styles: {
            minCellHeight: 36,
          },
        },

        {
          content: `Matrícula SIAPE:\n${requestSiape}`,
          colSpan: 2,
          styles: {
            minCellHeight: 36,
          },
        },
      ],

      /*
       * Cargo
       */
      [
        {
          content: `Cargo:\n${requestCargo}`,
          colSpan: 9,
          styles: {
            minCellHeight: 36,
          },
        },
      ],

      /*
       * Campus
       */
      [
        {
          content: `Campus de lotação:\n${requestCampus}`,
          colSpan: 9,
          styles: {
            minCellHeight: 36,
          },
        },
      ],

      /*
       * E-mail | telefone
       */
      [
        {
          content: `E-mail:\n${requestEmail}`,
          colSpan: 5,
          styles: {
            minCellHeight: 36,
          },
        },

        {
          content: `Telefone:\n${requestPhone}`,
          colSpan: 4,
          styles: {
            minCellHeight: 36,
          },
        },
      ],

      /*
       * RSC atual | portaria | vigência
       */
      [
        {
          content: `RT ou RSC (atual) - c/ nº do processo:\n${requestCurrentRsc}`,
          colSpan: 5,
          styles: {
            minCellHeight: 36,
          },
        },

        {
          content: `Portaria de concessão:\n${requestOrdinance}`,
          colSpan: 2,
          styles: {
            minCellHeight: 36,
          },
        },

        {
          content: `Data de vigência:\n${requestEffectiveDate}`,
          colSpan: 3,
          styles: {
            minCellHeight: 36,
          },
        },
      ],
    ],

    columnStyles: {
      0: { cellWidth: 53.67 },
      1: { cellWidth: 53.67 },
      2: { cellWidth: 53.67 },
      3: { cellWidth: 53.67 },
      4: { cellWidth: 53.67 },
      5: { cellWidth: 53.67 },
      6: { cellWidth: 53.67 },
      7: { cellWidth: 53.67 },
      8: { cellWidth: 53.67 },
    },

    styles: {
      font: "RSCFlowSans",
      fontSize: 11,
      textColor: [0, 0, 0],
      fillColor: [255, 255, 255],
      lineColor: [0, 0, 0],
      lineWidth: 0.45,
      cellPadding: 3,
      valign: "top",
      overflow: "linebreak",
    },

    didParseCell: (data) => {
      /*
       * O rótulo fica em negrito junto com o valor.
       * É a opção mais simples com AutoTable.
       */
      data.cell.styles.fontStyle = "bold";
    },
  });

  /* -------------------------------------------------------------------------- */
  /* Requerimento                                                               */
  /* -------------------------------------------------------------------------- */

  const dataFinalY = (
    document as jsPDF & {
      lastAutoTable: {
        finalY: number;
      };
    }
  ).lastAutoTable.finalY;

  const requestLevel = model.request.requestedLevel;

  const rscI = requestLevel === "rsc-i" ? "( X )" : "(   )";

  const rscII = requestLevel === "rsc-ii" ? "( X )" : "(   )";

  const rscIII = requestLevel === "rsc-iii" ? "( X )" : "(   )";

  autoTable(document, {
    startY: dataFinalY,

    margin: {
      left: 56,
      right: 56,
    },

    tableWidth: 483,

    body: [
      /*
       * Título do requerimento
       */
      [
        {
          content: "REQUERIMENTO",
          styles: {
            minCellHeight: 50,
            halign: "center",
            valign: "middle",
            fontStyle: "bold",
            fontSize: 11,
          },
        },
      ],

      /*
       * Texto
       */
      [
        {
          content:
            `Venho requerer, conforme disposto no Art. 18, da Lei nº 12.772, e sob os termos do Regulamento de RSC, aprovado pela Resolução ${model.regulation.authority} nº ${model.regulation.number}/${model.regulation.year}, a concessão do RSC, declarando a veracidade da documentação apresentada neste processo, sob as penas da Lei.\n\n` +
            `Nível de RSC pretendido:\n\n` +
            `RSC – I     ${rscI}\n` +
            `RSC – II    ${rscII}\n` +
            `RSC – III   ${rscIII}`,

          styles: {
            minCellHeight: 205,
            valign: "top",
            halign: "left",
            fontStyle: "normal",
            fontSize: 11,
            cellPadding: {
              top: 7,
              right: 4,
              bottom: 7,
              left: 4,
            },
          },
        },
      ],
    ],

    styles: {
      font: "RSCFlowSans",
      textColor: [0, 0, 0],
      fillColor: [255, 255, 255],
      lineColor: [0, 0, 0],
      lineWidth: 0.45,
      overflow: "linebreak",
    },
  });

  /* -------------------------------------------------------------------------- */
  /* Data                                                                       */
  /* -------------------------------------------------------------------------- */

  const requirementFinalY = (
    document as jsPDF & {
      lastAutoTable: {
        finalY: number;
      };
    }
  ).lastAutoTable.finalY;

  document.setFont("RSCFlowSans", "normal");

  document.setFontSize(9);
  document.setTextColor(0, 0, 0);

  document.text(
    "______________________, ____ de ____________________ de __________",
    document.internal.pageSize.getWidth() / 2,
    requirementFinalY + 58,
    {
      align: "center",
    },
  );

  /* -------------------------------------------------------------------------- */
  /* Assinatura                                                                 */
  /* -------------------------------------------------------------------------- */

  const signatureY = requirementFinalY + 122;

  document.setLineWidth(0.5);

  document.line(150, signatureY, 445, signatureY);

  document.text(
    "Assinatura",
    document.internal.pageSize.getWidth() / 2,
    signatureY + 15,
    {
      align: "center",
    },
  );

  /* ------------------------------------------------------------------------ */
  /* ANEXO III                                                                */
  /* ------------------------------------------------------------------------ */

  document.addPage();

  title(document, "ANEXO III", "FORMULÁRIO PARA INDICAR PONTUAÇÃO OBTIDA");

  const annexThreeFirstPage = document.getNumberOfPages();

  table(document, {
    head: [],

    body: model.levels.flatMap((level) => {
      const totalWeight = level.directives.reduce(
        (sum, item) => sum + item.weight,
        0,
      );

      const totalMaximumScore = level.directives.reduce(
        (sum, item) => sum + item.maximumScore,
        0,
      );

      return [
        /* Título do nível */

        [
          {
            content: `RECONHECIMENTO DE SABERES E COMPETÊNCIAS - ${levelLabel(
              level.level,
            )}`,

            colSpan: 5,

            styles: {
              halign: "center",
              valign: "middle",
              fontStyle: "bold",
              fillColor: [255, 255, 220],
              textColor: [0, 0, 0],
              lineColor: [0, 0, 0],
              lineWidth: 0.5,
            },
          },
        ],

        /* Cabeçalho */

        [
          {
            content: "DIRETRIZ",

            styles: {
              halign: "center",
              valign: "middle",
              fontStyle: "bold",
              fillColor: [220, 220, 220],
              textColor: [0, 0, 0],
            },
          },

          {
            content: "PESO",

            styles: {
              halign: "center",
              valign: "middle",
              fontStyle: "bold",
              fillColor: [220, 220, 220],
              textColor: [0, 0, 0],
            },
          },

          {
            content: "PONTUAÇÃO\nMÁXIMA",

            styles: {
              halign: "center",
              valign: "middle",
              fontStyle: "bold",
              fillColor: [220, 220, 220],
              textColor: [0, 0, 0],
            },
          },

          {
            content: "PONTUAÇÃO\nOBTIDA",

            styles: {
              halign: "center",
              valign: "middle",
              fontStyle: "bold",
              fillColor: [220, 220, 220],
              textColor: [0, 0, 0],
            },
          },

          {
            content: "% OBTIDO EM\nRELAÇÃO AO\nMÁXIMO",

            styles: {
              halign: "center",
              valign: "middle",
              fontStyle: "bold",
              fillColor: [220, 220, 220],
              textColor: [0, 0, 0],
            },
          },
        ],

        /* Diretrizes */

        ...level.directives.map((directive) => [
          `${directive.code}) ${directive.title}`,

          {
            content: number(directive.weight),

            styles: {
              halign: "center",
              valign: "middle",
            },
          },

          {
            content: number(directive.maximumScore),

            styles: {
              halign: "center",
              valign: "middle",
            },
          },

          {
            content: number(directive.obtainedScore),

            styles: {
              halign: "center",
              valign: "middle",
            },
          },

          {
            content: directive.maximumScore
              ? `${number(
                  (directive.obtainedScore / directive.maximumScore) * 100,
                )}%`
              : "0%",

            styles: {
              halign: "center",
              valign: "middle",
            },
          },
        ]),

        /* Total */

        [
          {
            content: "TOTAL",

            styles: {
              halign: "center",
              valign: "middle",
              fontStyle: "bold",
              fillColor: [220, 220, 220],
            },
          },

          {
            content: number(totalWeight),

            styles: {
              halign: "center",
              valign: "middle",
              fontStyle: "bold",
              fillColor: [220, 220, 220],
            },
          },

          {
            content: number(totalMaximumScore),

            styles: {
              halign: "center",
              valign: "middle",
              fontStyle: "bold",
              fillColor: [220, 220, 220],
            },
          },

          {
            content: number(level.obtainedScore),

            styles: {
              halign: "center",
              valign: "middle",
              fontStyle: "bold",
              fillColor: [220, 220, 220],
            },
          },

          {
            content:
              totalMaximumScore > 0
                ? `${number((level.obtainedScore / totalMaximumScore) * 100)}%`
                : "0%",

            styles: {
              halign: "center",
              valign: "middle",
              fontStyle: "bold",
              fillColor: [220, 220, 220],
            },
          },
        ],

        /* Separador */

        [
          {
            content: "",
            colSpan: 5,

            styles: {
              minCellHeight: 10,
              fillColor: [255, 255, 255],
              lineColor: [255, 255, 255],
            },
          },
        ],
      ];
    }) as NonNullable<UserOptions["body"]>,

    columnStyles: {
      0: {
        cellWidth: 282,
      },

      1: {
        cellWidth: 48,
        halign: "center",
      },

      2: {
        cellWidth: 64,
        halign: "center",
      },

      3: {
        cellWidth: 68,
        halign: "center",
      },

      4: {
        cellWidth: 60,
        halign: "center",
      },
    },

    styles: {
      fontSize: 8,
      cellPadding: 3,
      valign: "middle",
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      textColor: [0, 0, 0],
      overflow: "linebreak",
    },
  });

  continuationTitles(
    document,
    annexThreeFirstPage,
    "ANEXO III",
    "FORMULÁRIO PARA INDICAR PONTUAÇÃO OBTIDA",
  );

  /* ------------------------------------------------------------------------ */
  /* ANEXOS IV, V E VI                                                        */
  /* ------------------------------------------------------------------------ */

  model.levels.forEach((level, index) => {
    document.addPage();

    const heading = `QUADRO DE REFERÊNCIA DE CRITÉRIOS PARA O ${levelLabel(
      level.level,
    )}`;

    const annex = `ANEXO ${annexes[index]}`;

    title(document, annex, heading);

    /*
     * Subtítulo equivalente ao formulário normativo.
     */
    document.setFont("RSCFlowSans", "bold");

    document.setFontSize(10);

    document.setTextColor(20);

    document.text("FORMULÁRIO DE PONTUAÇÃO", MARGIN.left, 73);

    const annexFirstPage = document.getNumberOfPages();

    table(document, {
      startY: 84,

      /*
       * O cabeçalho não é global.
       * Cada diretriz possui seu próprio cabeçalho.
       */
      showHead: "never",

      head: [],

      body: buildCriteriaSectionBody(level) as NonNullable<
        UserOptions["body"]
      >,

      /*
       * Evita, quando possível, partir uma linha
       * individual entre duas páginas.
       */
      rowPageBreak: "avoid",

      styles: {
        font: "RSCFlowSans",
        fontSize: 6.3,
        cellPadding: 2.5,
        overflow: "linebreak",
        valign: "middle",
        lineColor: [60, 60, 60],
        lineWidth: 0.45,
        textColor: [0, 0, 0],
      },

      columnStyles: {
        /*
         * 1. Código do critério
         */
        0: {
          cellWidth: 29,
          halign: "center",
        },

        /*
         * 2. Descrição
         */
        1: {
          cellWidth: 190,
          halign: "left",
        },

        /*
         * 3. Fator
         */
        2: {
          cellWidth: 45,
          halign: "center",
        },

        /*
         * 4. Unidade
         */
        3: {
          cellWidth: 43,
          halign: "center",
        },

        /*
         * 5. Quantidade máxima
         */
        4: {
          cellWidth: 55,
          halign: "center",
        },

        /*
         * 6. Peso
         */
        5: {
          cellWidth: 31,
          halign: "center",
        },

        /*
         * 7. Quantidade comprovada
         */
        6: {
          cellWidth: 55,
          halign: "center",
        },

        /*
         * 8. Pontuação final
         */
        7: {
          cellWidth: 44,
          halign: "center",
        },

        /*
         * 9. Página da comprovação
         */
        8: {
          cellWidth: 31,
          halign: "center",
        },
      },
    });

    continuationTitles(document, annexFirstPage, annex, heading);
  });

  /* ------------------------------------------------------------------------ */
  /* ANEXO VII                                                               */
  /* ------------------------------------------------------------------------ */

  document.addPage();
  const annexSevenHeading = "QUADRO DE PONTUAÇÃO MÁXIMA DOS ITENS";
  title(document, "ANEXO VII", annexSevenHeading);
  const annexSevenFirstPage = document.getNumberOfPages();

  table(document, {
    head: [["Diretriz", "Peso", "Pontuação máxima"]],
    body: model.levels.flatMap((level) => [
      ...level.directives.map((directive) => [
        `${levelLabel(level.level)} · ${directive.code}) ${directive.title}`,
        number(directive.weight),
        number(directive.maximumScore),
      ]),
      [
        `TOTAL ${levelLabel(level.level)}`,
        number(level.directives.reduce((sum, item) => sum + item.weight, 0)),
        number(
          level.directives.reduce(
            (sum, item) => sum + item.maximumScore,
            0,
          ),
        ),
      ],
    ]),
    columnStyles: {
      0: { cellWidth: 384 },
      1: { cellWidth: 60, halign: "center" },
      2: { cellWidth: 78, halign: "center" },
    },
  });

  continuationTitles(
    document,
    annexSevenFirstPage,
    "ANEXO VII",
    annexSevenHeading,
  );

  /* ------------------------------------------------------------------------ */
  /* Rodapé final                                                             */
  /* ------------------------------------------------------------------------ */

  footer(document);

  return new Uint8Array(document.output("arraybuffer"));
}
