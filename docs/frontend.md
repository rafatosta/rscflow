# Frontend

O shell usa React Router com rotas de histórico do navegador. A aplicação é inteiramente local: as URLs identificam cópias no IndexedDB, não recursos de uma API.

| Rota                      | Conteúdo funcional                                                                     |
| ------------------------- | -------------------------------------------------------------------------------------- |
| `/`                       | Lista, criação, continuar, duplicação, exclusão confirmada, importação e exportação    |
| `/project/:id`            | Visão geral, progresso aproximado e regulamento vinculado                              |
| `/project/:id/profile`    | Título, identificação do docente e RSC pretendido                                      |
| `/project/:id/education`  | Cadastro e remoção de formações                                                        |
| `/project/:id/activities` | Registro/remoção de atividades e cadastro de referências de comprovantes               |
| `/project/:id/criteria`   | Vínculos existentes e seleção de critérios quando o dataset vinculado estiver validado |
| `/project/:id/scoring`    | Resultado do motor ou motivos reais de indisponibilidade                               |
| `/project/:id/memorial`   | Título, introdução e conclusão                                                         |
| `/project/:id/preview`    | Prévia textual montada com os dados registrados                                        |
| `/project/:id/review`     | Checklist de preenchimento com links às seções                                         |
| `/project/:id/export`     | Download JSON e edição avançada integral dos dados                                     |

O parâmetro `id` corresponde ao `localId` da cópia. Acesso direto carrega o projeto correto mesmo se outro estiver selecionado. Endereços inválidos e projetos ausentes mostram recuperação para a tela inicial. Formatos legados mantêm editor JSON e exportação sem conversão silenciosa.

## Componentes e estado

- `app/App.tsx`: composição do shell, rota ativa e proteção de navegação.
- `components/project-home.tsx`: gestão de projetos locais.
- `components/project-section.tsx`: apresentação e formulários das seções.
- `components/ui/`: primitives genéricos Button, Sheet (Radix Dialog) e ConfirmDialog (Radix AlertDialog).
- `features/project-shell/`: interpretação de rotas, criação de rascunhos, projeção do progresso e ligação ao motor existente.
- `memorial/preview.ts`: montagem textual independente das regras normativas.

O autosave e a sessão de edição são compartilhados entre seções. React Router bloqueia temporariamente uma mudança de rota enquanto o autosave conclui. Dados inválidos ou falhas mantêm a rota e a edição atuais. Voltar/avançar seguem a mesma proteção.

## Dados do docente

A rota de perfil usa React Hook Form com resolver Zod. Labels permanecem visíveis e os erros são ligados aos campos por `aria-describedby` e `aria-invalid`. CPF e telefone aceitam pontuação durante a edição e são persistidos somente com dígitos; não há máscara que reposicione o cursor. Datas usam controles nativos acessíveis com valor ISO.

Cada alteração com estrutura de rascunho válida alimenta o mesmo autosave do projeto. Erros de completude permanecem visíveis sem criar um segundo estado de domínio. Depois da recarga, o formulário é reconstruído exclusivamente a partir do projeto persistido. Os mesmos campos alimentam a montagem do memorial e futuras saídas em PDF.

## Publicação estática

O servidor de arquivos deve encaminhar URLs desconhecidas para `index.html` (fallback de SPA) para permitir recarga direta de `/project/...`. Vite já faz isso em desenvolvimento. Isso não requer backend de dados. Os arquivos exportados são baixados por Blob; não há chamadas remotas para projetos.
