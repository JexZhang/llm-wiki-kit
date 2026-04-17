export interface ConvertOptions {
  input: string;
  output: string;
}

export async function runConvert(_opts: ConvertOptions): Promise<void> {
  throw new Error("convert not implemented");
}
