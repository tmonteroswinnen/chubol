/**
 * Build for putting on the internet.
 *
 * The only difference from a normal build is that it leaves out `references/` —
 * the original illustration, the sketch and the photo of the dog. They are the
 * author's own source material, an input to the work rather than part of the
 * game, and they were 7 MB against 6 for everything else.
 *
 * It calls Vite directly rather than setting an environment variable in front of
 * a shell command, because the same line has to work in PowerShell, in cmd, in a
 * POSIX shell and on the CI runner.
 */
import { build } from 'vite';

process.env.CHUBOL_PUBLIC = '1';
await build();
