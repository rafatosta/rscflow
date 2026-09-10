import type { LocalProject, ProjectRepository, SaveState } from '@/domain/local-project';
import type { ProjectExport } from '@/domain/project';
import { portableProject } from '@/domain/portable-project';
import { storageErrorMessage } from '@/storage/project-repository';

/** Uma fila por sessão de edição; gravações nunca ultrapassam umas às outras. */
export class ProjectAutosave {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private pending: ProjectExport | undefined;
  private running: Promise<boolean> | undefined;
  private state: SaveState = { status: 'saved' };
  private disposed = false;

  constructor(
    private readonly repository: ProjectRepository,
    private record: LocalProject,
    private readonly onState: (state: SaveState) => void,
    private readonly delay = 500,
  ) {}

  get current(): LocalProject {
    return structuredClone(this.record);
  }
  get dirty(): boolean {
    return Boolean(this.pending || this.running);
  }

  schedule(project: ProjectExport): void {
    if (this.disposed) return;
    this.pending = portableProject(project);
    this.emit({ status: 'saving' });
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      void this.flush();
    }, this.delay);
  }

  async flush(): Promise<boolean> {
    clearTimeout(this.timer);
    if (this.running) return this.running;
    if (!this.pending) return this.state.status !== 'error';
    this.running = this.drain();
    try {
      return await this.running;
    } finally {
      this.running = undefined;
    }
  }

  private async drain(): Promise<boolean> {
    this.emit({ status: 'saving' });
    while (this.pending) {
      const snapshot = this.pending;
      this.pending = undefined;
      try {
        this.record = await this.repository.update(
          this.record.localId,
          this.record.revision,
          snapshot,
        );
      } catch (error) {
        // A edição mais recente prevalece sobre o snapshot que falhou.
        this.pending ??= snapshot;
        this.emit({ status: 'error', message: storageErrorMessage(error) });
        return false;
      }
    }
    this.emit({ status: 'saved' });
    return true;
  }

  async discardPending(): Promise<void> {
    clearTimeout(this.timer);
    this.pending = undefined;
    await this.running;
    this.pending = undefined;
  }

  dispose(): void {
    clearTimeout(this.timer);
    this.disposed = true;
  }

  private emit(state: SaveState): void {
    this.state = state;
    if (!this.disposed) this.onState(state);
  }
}
