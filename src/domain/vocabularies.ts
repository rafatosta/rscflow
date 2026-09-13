import { z } from 'zod';

export const schoolingValues = [
  'Ensino fundamental',
  'Ensino médio',
  'Curso técnico',
  'Graduação',
  'Especialização',
  'Mestrado',
  'Doutorado',
  'Pós-doutorado',
] as const;

export const educationTypeValues = [
  'Curso técnico',
  'Graduação',
  'Pós-graduação',
  'Aperfeiçoamento',
  'Capacitação',
  'Mestrado',
  'Doutorado',
  'Pós-doutorado',
] as const;

export const educationStatusValues = [
  'Em andamento',
  'Concluído',
  'Interrompido',
  'Trancado',
] as const;

export const schoolingSchema = z.enum(schoolingValues);
export const educationTypeSchema = z.enum(educationTypeValues);
export const educationStatusSchema = z.enum(educationStatusValues);
