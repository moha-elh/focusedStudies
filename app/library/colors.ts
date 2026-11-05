// The macOS tag colors, each as a folder: the back (and tab) a step darker than the front. Text on the front is ink.
export const FOLDER_COLORS = {
  blue: ["#3a9be6", "#2f8ad8", "#8cd0fb", "#5fb8f4"],
  purple: ["#9b6ee0", "#8657d1", "#d3bcf8", "#b693f1"],
  pink: ["#e46aa8", "#d55595", "#f9bcd9", "#f193c3"],
  red: ["#e2564b", "#cf4339", "#f9aba3", "#f2857b"],
  orange: ["#ef8a2e", "#e07519", "#fccb94", "#f7ab5c"],
  yellow: ["#e8b923", "#d9a514", "#fce698", "#f5d35c"],
  green: ["#4fb35a", "#3fa04a", "#b0e4ae", "#84d085"],
  graphite: ["#8b8f96", "#777b83", "#d6d9dd", "#b8bcc2"],
} as const;

export type FolderColor = keyof typeof FOLDER_COLORS;
export const isFolderColor = (c: unknown): c is FolderColor => typeof c === "string" && Object.hasOwn(FOLDER_COLORS, c);

// As CSS variables, so the folder's classes stay the same whatever the color.
export const folderStyle = (c: string | null | undefined) => {
  const [back, back2, front, front2] = FOLDER_COLORS[isFolderColor(c) ? c : "blue"];
  return { "--back": back, "--back-2": back2, "--front": front, "--front-2": front2 } as React.CSSProperties;
};
