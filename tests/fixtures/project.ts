export const projectFixture = {
  schemaVersion: '1.0',
  applicationVersion: '0.1.0',
  regulation: { id: 'referencia-de-teste', version: 'versao-declarada' },
  userData: { note: 'Dado opaco', nested: { values: [1, null, true] } },
};

export const currentProjectFixture = {
  ...projectFixture,
  schemaVersion: '2.0',
  userData: {
    id: 'projeto-1',
    title: 'Memorial',
    teacher: { name: 'Pessoa de teste' },
    request: { level: 'rsc-i' },
    education: [],
    evidence: [{ id: 'e1', title: 'Comprovante' }],
    activities: [
      {
        id: 'a1',
        title: 'Atividade',
        criterionId: 'criterio-teste',
        quantity: 1,
        evidenceIds: ['e1'],
      },
    ],
    memorial: null,
  },
};
