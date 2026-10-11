/*
  Whether the visitor has moved between pages inside the app in this session (as in Proxy Papers,
  src/lib/intro/navState.js). The splash only runs on a fresh load; after a client navigation an
  intro can wait for the page transition to uncover it. MotionShell marks it before every change.
*/
let clientNavigated = false;

export const markClientNavigated = () => {
  clientNavigated = true;
};

export const hasClientNavigated = () => clientNavigated;
