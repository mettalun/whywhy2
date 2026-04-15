export function detectDevice(viewportWidth = window.innerWidth) {
  return viewportWidth < 1100 ? "mobile" : "pc";
}
