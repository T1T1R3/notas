import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { parseDanfe, type Note, type TextItem } from './parser'

GlobalWorkerOptions.workerSrc = workerUrl

export async function readNoteFromPdf(file: File): Promise<Note> {
  const data = new Uint8Array(await file.arrayBuffer())
  const task = getDocument({ data, verbosity: 0 })
  const doc = await task.promise
  const items: TextItem[] = []
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const content = await page.getTextContent()
    for (const it of content.items) {
      if (!('str' in it)) continue
      items.push({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width, page: p })
    }
  }
  await task.destroy()
  return parseDanfe(items, file.name)
}
