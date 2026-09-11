import fixture from '../../fixtures/criteria-regulation.json';
import { regulationSchema, type Regulation } from '@/domain/regulation';
import {
  loadIfbaRegulation as loadProductionRegulation,
  parseRegulation,
} from '../../../src/data/regulations/load';

const syntheticRegulation = regulationSchema.parse(fixture);

export { parseRegulation };
export function loadIfbaRegulation(): Regulation {
  return loadProductionRegulation();
}
export function loadRegulations(): Regulation[] {
  return [loadProductionRegulation(), syntheticRegulation];
}
