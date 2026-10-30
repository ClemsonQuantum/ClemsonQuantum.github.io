'use client';

import { useEffect } from 'react';

// A hello for anyone who opens the browser console: a small Bloch sphere and
// where to join. The root layout mounts this once, and client navigation
// keeps it mounted; the flag stops React's development double effect from
// logging it twice.
const SPHERE = String.raw`
        |0>
     .-'''''-.
   .'    ^    '.
  /      |      \
 |- - - -o- - - -|
  \             /
   '.         .'
     '-.....-'
        |1>`;

const MESSAGE =
  'Hello from the Clemson Quantum Club. Want to learn quantum computing, or help ' +
  'build this site? Come to a meeting: https://www.clemsonquantum.com/get-involved/';

let greeted = false;

export default function ConsoleGreeting() {
  useEffect(() => {
    if (greeted) return;
    greeted = true;
    console.info(`%c${SPHERE}\n\n%c${MESSAGE}`, 'color: #8b5cf6; font-family: monospace', '');
  }, []);
  return null;
}
