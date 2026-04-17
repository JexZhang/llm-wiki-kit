export interface InitOptions {
  yes?: boolean;
  path?: string;
  name?: string;
}

export async function runInit(_opts: InitOptions): Promise<void> {
  throw new Error("init not implemented");
}
