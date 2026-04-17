export function postProcess(markdown: string): string {
  return markdown
    .replace(/\r\n/g, "\n")
    .replace(/!\[([^\]]*)\]\(media\/([^)]+)\)/g, "![$1](assets/$2)")
    .replace(/\n{3,}/g, "\n\n");
}
