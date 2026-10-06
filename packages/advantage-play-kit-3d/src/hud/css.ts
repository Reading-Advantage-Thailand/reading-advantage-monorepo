/** Installs a stylesheet once per page, keyed by id (the kit ships its CSS as text, so no bundler CSS loader is needed). */
export function installCss(id: string, text: string): void {
  if (typeof document === 'undefined' || document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = text;
  document.head.append(el);
}
