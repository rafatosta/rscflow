import { projectExportSchema, type ProjectExport } from '@/domain/project';

export type ProjectFileResult =
  { success: true; project: ProjectExport } | { success: false; errors: string[] };

export async function validateProjectFile(file: Pick<File, 'text'>): Promise<ProjectFileResult> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    return { success: false, errors: ['Não foi possível ler o arquivo. Selecione-o novamente.'] };
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return {
      success: false,
      errors: ['O arquivo não contém JSON válido. Verifique seu conteúdo.'],
    };
  }

  const result = projectExportSchema.safeParse(value);
  if (result.success) return { success: true, project: result.data };

  const errors = result.error.issues.map((issue) => {
    const field = issue.path.join('.');
    if (field === 'schemaVersion')
      return 'Versão do esquema ausente ou incompatível. Esperado: 1.0, 2.0, 2.1 ou 3.0.';
    if (!field) return 'O conteúdo deve ser um objeto de projeto.';
    if (field === 'regulation') return 'Referência normativa ausente ou inválida.';
    if (field === 'userData') return 'Dados do usuário ausentes ou inválidos. Esperado: um objeto.';
    return `Campo ${field} ausente ou inválido.`;
  });
  return { success: false, errors: [...new Set(errors)] };
}
