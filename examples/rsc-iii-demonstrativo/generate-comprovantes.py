from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle


OUTPUT = Path(__file__).parent / "comprovantes"

DOCUMENTS = [
    {
        "file": "01-rsc-i-a1-gestao-escolar.pdf",
        "level": "RSC I",
        "code": "a.1",
        "requirement": "Gestão Escolar (Direção, Assistente de Direção, Gerente)",
        "period": "01/01/2018 a 31/12/2018",
        "quantity": "12 meses",
        "activity": "Direção fictícia da Escola Técnica Horizonte.",
    },
    {
        "file": "02-rsc-i-c1-curso-fic.pdf",
        "level": "RSC I",
        "code": "c.1",
        "requirement": "Cursos de formação inicial e continuada (FIC)",
        "period": "10/02/2020 a 20/06/2020",
        "quantity": "40 horas",
        "activity": "Docência fictícia no curso FIC de Introdução à Automação.",
    },
    {
        "file": "03-rsc-ii-a1-orientacao-tcc.pdf",
        "level": "RSC II",
        "code": "a.1",
        "requirement": "Orientação ou coorientação de TCC de cursos técnicos",
        "period": "01/03/2021 a 15/12/2021",
        "quantity": "2 orientações concluídas",
        "activity": "Orientação fictícia de dois trabalhos de conclusão de curso técnico.",
    },
    {
        "file": "04-rsc-ii-d1-projeto-extensao.pdf",
        "level": "RSC II",
        "code": "d.1",
        "requirement": "Elaboração, Coordenação ou Supervisão em projetos de pesquisa, inovação tecnológica e extensão de interesse institucional",
        "period": "01/04/2022 a 30/11/2022",
        "quantity": "1 projeto",
        "activity": "Coordenação fictícia do projeto Oficina Aberta de Robótica.",
    },
    {
        "file": "05-rsc-iii-a1-prototipo.pdf",
        "level": "RSC III",
        "code": "a.1",
        "requirement": "Elaboração e utilização de protótipo e tecnologia com aplicação em ensino, pesquisa e extensão.",
        "period": "01/02/2023 a 15/12/2023",
        "quantity": "1 contrato ou licenciamento",
        "activity": "Protótipo fictício de bancada didática para laboratório de automação.",
    },
    {
        "file": "06-rsc-iii-b1-ppc.pdf",
        "level": "RSC III",
        "code": "b.1",
        "requirement": "Participação em elaboração de Projeto Pedagógico de Cursos (PPC)",
        "period": "01/08/2023 a 20/12/2023",
        "quantity": "1 PPC",
        "activity": "Participação fictícia na elaboração do PPC de Tecnologias Industriais.",
    },
    {
        "file": "07-rsc-iii-c1-captacao-propria.pdf",
        "level": "RSC III",
        "code": "c.1",
        "requirement": "Captação de recursos em projetos de pesquisa, inovação tecnológica e extensão na própria instituição",
        "period": "01/03/2024 a 30/09/2024",
        "quantity": "1 Projeto",
        "activity": "Captação fictícia para o projeto Laboratório Móvel de Ciências.",
    },
    {
        "file": "08-rsc-iii-d1-captacao-parceria.pdf",
        "level": "RSC III",
        "code": "d.1",
        "requirement": "Captação de recursos em projetos de pesquisa, inovação tecnológicas e extensão em parceria com outras instituições",
        "period": "01/02/2025 a 30/10/2025",
        "quantity": "1 Projeto",
        "activity": "Captação fictícia em parceria para a Rede Escola Maker.",
    },
]


def build(document):
    OUTPUT.mkdir(parents=True, exist_ok=True)
    destination = OUTPUT / document["file"]
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="Warning",
            parent=styles["Heading1"],
            fontSize=14,
            leading=18,
            textColor=HexColor("#9a3412"),
            spaceAfter=16,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Body",
            parent=styles["BodyText"],
            fontSize=10.5,
            leading=15,
            textColor=HexColor("#1e293b"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="CellLabel",
            parent=styles["Body"],
            fontName="Helvetica-Bold",
            fontSize=9.5,
            leading=13,
        )
    )
    styles.add(
        ParagraphStyle(
            name="CellBody",
            parent=styles["Body"],
            fontSize=9.5,
            leading=13,
        )
    )
    story = [
        Paragraph("DOCUMENTO FICTÍCIO - SEM VALIDADE", styles["Warning"]),
        Paragraph("Comprovante demonstrativo para o RSCFlow", styles["Title"]),
        Spacer(1, 0.6 * cm),
        Paragraph(
            "Este arquivo existe somente para ilustrar o fluxo local de anexação, consulta e "
            "verificação de comprovantes. Não comprova atividade, vínculo, pontuação ou direito.",
            styles["Body"],
        ),
        Spacer(1, 0.7 * cm),
    ]
    fields = [
        ["Nível", document["level"]],
        ["Item do catálogo", document["code"]],
        ["Requisito", document["requirement"]],
        ["Período declarado", document["period"]],
        ["Quantidade declarada", document["quantity"]],
        ["Lançamento", document["activity"]],
        ["Identificação", "Exemplo fictício RSC III - Prof. Marina Duarte"],
    ]
    rows = [
        [Paragraph(label, styles["CellLabel"]), Paragraph(value, styles["CellBody"])]
        for label, value in fields
    ]
    table = Table(rows, colWidths=[4.2 * cm, 12.3 * cm], repeatRows=0)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), HexColor("#e2e8f0")),
                ("TEXTCOLOR", (0, 0), (-1, -1), HexColor("#0f172a")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.35, HexColor("#94a3b8")),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    story += [table, Spacer(1, 0.8 * cm)]
    story.append(
        Paragraph(
            "Gerado para demonstração local. Todos os nomes, instituições, atividades, períodos e "
            "resultados apresentados são fictícios.",
            styles["Body"],
        )
    )
    SimpleDocTemplate(
        str(destination),
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title="Comprovante fictício - RSCFlow",
        author="RSCFlow",
        invariant=1,
    ).build(story)


for item in DOCUMENTS:
    build(item)
