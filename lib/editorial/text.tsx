// Renderiza apenas texto: o React escapa tudo; sem HTML, sem markdown.
// Quebras de linha são preservadas via CSS (whitespace-pre-line).
export function EditorialText({ value }: { value: string }) {
  return <span className="whitespace-pre-line">{value}</span>
}
