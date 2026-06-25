import { execFile } from 'child_process'

export interface CommandResult {
  ok: boolean
  stdout: string
  stderr: string
}

export function runCommand(command: string, args: string[] = []): Promise<CommandResult> {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: 5000 }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        stdout: stdout.toString(),
        stderr: stderr.toString()
      })
    })
  })
}

export async function commandExists(command: string): Promise<boolean> {
  const result = await runCommand('which', [command])
  return result.ok
}
