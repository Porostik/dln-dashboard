export type ParsedIxLog = {
  programId: string;
  ix: string;
  programData: Buffer[];
};

export const collectProgramLogs = (
  logs: string[] | null,
  programIds: string[],
): { programId: string; lines: string[] }[] => {
  if (!logs) return [];

  const frames: { programId: string; lines: string[] }[] = [];

  let current: { programId: string; lines: string[] } | null = null;

  for (const line of logs) {
    for (const pid of programIds) {
      if (line.startsWith(`Program ${pid} invoke`)) {
        current = { programId: pid, lines: [] };
        frames.push(current);
        break;
      }
    }

    if (current) {
      current.lines.push(line);
    }

    if (current && line.startsWith(`Program ${current.programId} success`)) {
      current = null;
    }
  }

  return frames;
};

export const parseIxLogs = (
  frames: { programId: string; lines: string[] }[],
): ParsedIxLog[] => {
  const result: ParsedIxLog[] = [];

  for (const frame of frames) {
    let current: ParsedIxLog | null = null;

    for (const line of frame.lines) {
      const ixMatch = line.match(/^Program log: Instruction: (.+)$/);
      if (ixMatch) {
        if (current) result.push(current);

        current = {
          programId: frame.programId,
          ix: ixMatch[1],
          programData: [],
        };
        continue;
      }

      const dataMatch = line.match(/^Program data: (.+)$/);
      if (dataMatch && current) {
        current.programData.push(Buffer.from(dataMatch[1], 'base64'));
      }
    }

    if (current) result.push(current);
  }

  return result;
};
