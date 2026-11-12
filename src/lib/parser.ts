// Parser de DANFE (NF-e) a partir dos itens de texto extraídos pelo pdf.js.
// Módulo puro (sem dependências) para poder ser testado fora do navegador.

export interface TextItem {
  str: string
  x: number
  y: number
  w: number
  page: number
}

export interface Product {
  id: string
  noteId: string
  noteNumber: string
  code: string
  description: string // descrição completa (linhas unidas)
  name: string // descrição limpa (sem pedido/FCI)
  genericName: string // nome sem o código de modelo (ex: "ELEMENTO FILTRANTE DO AR")
  order: string // Pedido/Item, se houver
  ncm: string
  cst: string
  origin: number // 1º dígito do CST/CSOSN
  cfop: string
  unit: string
  qty: number
  unitPrice: number
  total: number
  discount: number
  icmsBase: number
  icmsValue: number
  ipiValue: number
  icmsRate: number
  ipiRate: number
}

export interface Note {
  id: string
  fileName: string
  accessKey: string
  number: string
  series: string
  issueDate: string
  issuerName: string
  issuerCnpj: string
  issuerUf: string
  recipientName: string
  recipientCnpj: string
  recipientUf: string
  operation: string
  totals: {
    products: number | null
    note: number | null
    icmsBase: number | null
    icms: number | null
    ipi: number | null
    pis: number | null
    cofins: number | null
    freight: number | null
    discount: number | null
  }
  products: Product[]
  warnings: string[]
}

const UF_CODES: Record<string, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
  '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL',
  '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP', '41': 'PR',
  '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF',
}

export const ORIGIN_LABELS: Record<number, string> = {
  0: 'Nacional',
  1: 'Estrangeira — importação direta',
  2: 'Estrangeira — adquirida no mercado interno',
  3: 'Nacional — conteúdo importado > 40% e ≤ 70%',
  4: 'Nacional — processos produtivos básicos (PPB)',
  5: 'Nacional — conteúdo importado ≤ 40%',
  6: 'Estrangeira — importação direta, sem similar (CAMEX)',
  7: 'Estrangeira — mercado interno, sem similar (CAMEX)',
  8: 'Nacional — conteúdo importado > 70%',
}

export const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()

/** "1.219,90" -> 1219.9 */
export function parseBR(s: string | null | undefined): number | null {
  if (!s) return null
  const m = s.replace(/R\$\s*/i, '').trim().match(/^-?[\d.]*\d(?:,\d+)?$/)
  if (!m) return null
  const n = Number(m[0].replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

interface Line {
  page: number
  y: number
  items: TextItem[]
  text: string
}

function buildLines(items: TextItem[]): Line[] {
  const sorted = [...items]
    .filter((i) => i.str.trim())
    .sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x)
  const lines: Line[] = []
  for (const it of sorted) {
    const last = lines[lines.length - 1]
    if (last && last.page === it.page && Math.abs(last.y - it.y) <= 2) last.items.push(it)
    else lines.push({ page: it.page, y: it.y, items: [it], text: '' })
  }
  for (const l of lines) {
    l.items.sort((a, b) => a.x - b.x)
    l.text = l.items.map((i) => i.str.trim()).join(' ').replace(/\s+/g, ' ')
  }
  return lines
}

/** Procura o valor posicionado logo abaixo de um rótulo (layout típico de DANFE). */
function valueBelow(items: TextItem[], labels: string[], occurrence = 0): string | null {
  const wanted = labels.map(norm)
  const found = items.filter((i) => wanted.includes(norm(i.str)))
  const label = found[occurrence]
  if (!label) return null
  const sameRow = items.filter(
    (i) => i.page === label.page && Math.abs(i.y - label.y) < 1.5 && i.x > label.x + 1,
  )
  const right = sameRow.length ? Math.min(...sameRow.map((i) => i.x)) - 1 : label.x + 220
  const cands = items.filter(
    (i) =>
      i.page === label.page &&
      i !== label &&
      i.y < label.y - 2 &&
      i.y > label.y - 20 &&
      i.x >= label.x - 14 &&
      i.x < right &&
      i.str.trim(),
  )
  if (!cands.length) return null
  const topY = Math.max(...cands.map((c) => c.y))
  return cands
    .filter((c) => Math.abs(c.y - topY) < 1.5)
    .sort((a, b) => a.x - b.x)
    .map((c) => c.str.trim())
    .join(' ')
}

const numBelow = (items: TextItem[], labels: string[]) => parseBR(valueBelow(items, labels))

const PRODUCT_RE =
  /^(.*?)\s*\b(\d{8}|\d{4}\.\d{2}\.\d{2})\s+(\d{3,4}|\d\/\d{2,3})\s+([1-7]\.?\d{3})\s+(\S+)\s+((?:-?[\d.]*\d(?:,\d+)?\s*){5,})$/

const STOP_RE =
  /DADOS ADICIONAIS|INFORMACOES COMPLEMENTARES|CALCULO DO ISSQN|RESERVADO AO FISCO|DADOS DOS PRODUTOS|CODIGO PRODUTO|DESCRICAO DO PRODUTO/

/** Encontra BC, valor e alíquota de ICMS consistentes entre si nas colunas numéricas restantes. */
function resolveTaxColumns(rest: number[]) {
  const n = rest.length
  type Tri = { b: number; v: number; a: number; err: number }
  const all: Tri[] = []
  for (let a = 2; a < n; a++) {
    const rate = rest[a]
    if (rate <= 0 || rate > 40) continue
    for (let v = a - 1; v >= 1; v--) {
      for (let b = v - 1; b >= 0; b--) {
        const bc = rest[b]
        const val = rest[v]
        if (bc <= 0 || val <= 0) continue
        // o valor do imposto é arredondado ao centavo: o erro máximo legítimo é R$ 0,005.
        // (tolerância folgada fazia o V.IPI 12,03 passar por alíquota de ICMS 12,03%)
        const err = Math.abs((bc * rate) / 100 - val)
        if (err <= 0.011) all.push({ b, v, a, err })
      }
    }
  }
  // para cada valor de imposto, fica só a combinação que melhor o explica
  const bestByV = new Map<number, Tri>()
  for (const t of all) {
    const cur = bestByV.get(t.v)
    if (!cur || t.err < cur.err) bestByV.set(t.v, t)
  }
  const tris = [...bestByV.values()]
  if (tris.length) {
    // o DANFE traz V.ICMS antes de V.IPI e ALÍQ. ICMS antes de ALÍQ. IPI
    const icms = tris.reduce((m, t) => (t.a < m.a || (t.a === m.a && t.v < m.v) ? t : m))
    const ipi = tris.find((t) => t.a > icms.a && t.v > icms.v)
    const after = rest.slice(icms.a + 1)
    const between = rest.slice(icms.v + 1, icms.a)
    return {
      discount: icms.b > 0 ? rest[icms.b - 1] : 0,
      icmsBase: rest[icms.b],
      icmsValue: rest[icms.v],
      icmsRate: rest[icms.a],
      ipiValue: ipi ? rest[ipi.v] : between.length ? between[between.length - 1] : 0,
      ipiRate: ipi ? rest[ipi.a] : after.length ? after[after.length - 1] : 0,
      ok: true,
    }
  }
  // sem ICMS destacado (isento/ST) ou layout desconhecido: layout padrão
  // (… DESC, BC, V.ICMS, V.IPI, ALIQ ICMS, ALIQ IPI)
  const at = (k: number) => (n - k >= 0 ? rest[n - k] : 0)
  const icmsValue = at(4)
  return {
    discount: n >= 6 ? at(6) : 0,
    icmsBase: at(5),
    icmsValue,
    ipiValue: at(3),
    icmsRate: at(2),
    ipiRate: at(1),
    ok: icmsValue === 0,
  }
}

function cleanDescription(desc: string) {
  let order = ''
  const om = desc.match(/Pedido\s*\/\s*Item\s*:?\s*(.*?)(?=\s*FCI\s*:|$)/i)
  if (om) order = om[1].replace(/\/\s*$/, '').trim()
  let name = desc
    .replace(/\s*-?\s*Pedido\s*\/\s*Item\s*:.*$/i, '')
    .replace(/\s*FCI\s*:.*$/i, '')
    .replace(/\s*[-–]\s*$/, '')
    .trim()
  if (!name) name = desc.trim()
  const words = name.split(' ')
  const genericName =
    words.length > 1 && /\d/.test(words[0]) ? words.slice(1).join(' ').trim() : name
  return { name, genericName, order }
}

let seq = 0
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`

export function parseDanfe(items: TextItem[], fileName: string): Note {
  const lines = buildLines(items)
  const allText = lines.map((l) => l.text).join('\n')
  const warnings: string[] = []
  const noteId = uid('nf')

  // ---- Chave de acesso (44 dígitos) e dados derivados
  let accessKey = ''
  for (const l of lines) {
    const m = l.text.match(/(?:^|\D)((?:\d{4}[\s.]?){10}\d{4})(?:\D|$)/)
    if (m) {
      accessKey = m[1].replace(/\D/g, '')
      break
    }
  }
  let issuerUf = ''
  let issuerCnpj = ''
  let series = ''
  let number = ''
  if (accessKey) {
    issuerUf = UF_CODES[accessKey.slice(0, 2)] ?? ''
    const c = accessKey.slice(6, 20)
    issuerCnpj = `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`
    series = String(Number(accessKey.slice(22, 25)))
    number = String(Number(accessKey.slice(25, 34)))
  }
  if (!number) {
    const m = allText.match(/N[º°o]\.?\s*([\d.]+)/i)
    if (m) number = String(Number(m[1].replace(/\./g, '')))
  }
  if (!series) series = allText.match(/S[ée]rie\s*:?\s*(\d+)/i)?.[1] ?? ''

  // ---- Emitente / destinatário
  const canhoto = allText.replace(/\n/g, ' ').match(/RECEBEMOS DE\s+(.+?)\s+OS PRODUTOS/i)
  const issuerName =
    canhoto?.[1]?.trim() ?? valueBelow(items, ['IDENTIFICAÇÃO DO EMITENTE']) ?? 'Emitente desconhecido'
  const recipientName = valueBelow(items, ['NOME / RAZÃO SOCIAL', 'NOME/RAZÃO SOCIAL']) ?? ''
  const recipientCnpj = valueBelow(items, ['CNPJ / CPF', 'CNPJ/CPF'], 1) ?? ''
  const recipientUf = valueBelow(items, ['UF']) ?? ''
  const issueDate =
    valueBelow(items, ['DATA DA EMISSÃO', 'DATA DE EMISSÃO']) ??
    allText.match(/EMISS[ÃA]O:?\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1] ??
    ''
  const operation = valueBelow(items, ['NATUREZA DA OPERAÇÃO']) ?? ''

  const totals = {
    products: numBelow(items, ['V. TOTAL PRODUTOS', 'VALOR TOTAL DOS PRODUTOS', 'V. TOTAL DOS PRODUTOS']),
    note:
      numBelow(items, ['V. TOTAL DA NOTA', 'VALOR TOTAL DA NOTA']) ??
      parseBR(allText.match(/VALOR TOTAL:\s*R\$\s*([\d.,]+)/i)?.[1]),
    icmsBase: numBelow(items, ['BASE DE CÁLC. DO ICMS', 'BASE DE CÁLCULO DO ICMS', 'BASE DE CALC. DO ICMS']),
    icms: numBelow(items, ['VALOR DO ICMS']),
    ipi: numBelow(items, ['VALOR TOTAL IPI', 'VALOR DO IPI', 'VALOR TOTAL DO IPI']),
    pis: numBelow(items, ['VALOR DO PIS', 'VALOR DO PIS/PASEP']),
    cofins: numBelow(items, ['VALOR DA COFINS', 'VALOR DO COFINS']),
    freight: numBelow(items, ['VALOR DO FRETE']),
    discount: numBelow(items, ['DESCONTO']),
  }

  // ---- Produtos
  const products: Product[] = []
  type Cur = { p: Product; descX: number; ncmX: number; raw: string; page: number }
  let current: Cur | null = null

  const flush = () => {
    if (!current) return
    const { name, genericName, order } = cleanDescription(current.raw)
    current.p.description = current.raw
    current.p.name = name
    current.p.genericName = genericName
    current.p.order = order
    products.push(current.p)
    current = null
  }

  for (const line of lines) {
    const m = line.text.match(PRODUCT_RE)
    if (m) {
      flush()
      const head = m[1].trim()
      const sp = head.indexOf(' ')
      const code = sp > 0 ? head.slice(0, sp) : head
      const desc = sp > 0 ? head.slice(sp + 1) : ''
      const nums = m[6].trim().split(/\s+/).map((s) => parseBR(s) ?? 0)
      const [qty, unitPrice, total] = nums
      const tax = resolveTaxColumns(nums.slice(3))
      const ncm = m[2].replace(/\./g, '')
      const cst = m[3].replace('/', '')
      const ncmItem = line.items.find((i) => i.str.includes(m[2]))
      const ncmX0 = ncmItem?.x ?? Infinity
      const descItem = line.items.find(
        (i) => i.str.trim() && !i.str.trim().startsWith(code) && i.x < ncmX0,
      )
      let descX = descItem?.x ?? line.items[0].x
      if (!descItem) {
        // código e descrição vieram no mesmo fragmento: estima onde começa a descrição
        const first = line.items[0]
        const len = first.str.length || 1
        descX = first.x + (first.w * (first.str.indexOf(desc.slice(0, 5)) || code.length + 1)) / len
      }
      if (!tax.ok)
        warnings.push(`Item ${code}: não foi possível confirmar a alíquota de ICMS pelos valores (BC × alíquota).`)
      current = {
        descX,
        ncmX: ncmItem?.x ?? Infinity,
        raw: desc,
        page: line.page,
        p: {
          id: uid('it'),
          noteId,
          noteNumber: number,
          code,
          description: '',
          name: '',
          genericName: '',
          order: '',
          ncm,
          cst,
          origin: Number(cst[0]),
          cfop: m[4].replace('.', ''),
          unit: m[5],
          qty,
          unitPrice,
          total,
          discount: tax.discount,
          icmsBase: tax.icmsBase,
          icmsValue: tax.icmsValue,
          ipiValue: tax.ipiValue,
          icmsRate: tax.icmsRate,
          ipiRate: tax.ipiRate,
        },
      }
      continue
    }
    if (!current) continue
    const t = norm(line.text)
    if (STOP_RE.test(t)) {
      flush()
      continue
    }
    const c = current as Cur
    // linha de continuação da descrição: todo o texto dentro da coluna de descrição
    const inDescCol =
      line.page === c.page && line.items.every((i) => i.x >= c.descX - 3 && i.x < c.ncmX - 2)
    if (inDescCol) {
      const piece = line.text.trim()
      // junta fragmentos de códigos quebrados (ex.: FCI quebrado em duas linhas)
      const glue = /[A-F0-9-]$/i.test(c.raw) && /^[A-F0-9-]{1,6}$/i.test(piece) && /FCI\s*:\s*[A-F0-9-]+$/i.test(c.raw)
      c.raw = glue ? c.raw + piece : `${c.raw} ${piece}`.trim()
    } else {
      flush()
    }
  }
  flush()

  if (!products.length)
    warnings.push('Nenhum produto encontrado. O PDF pode ser digitalizado (imagem) ou ter um layout não suportado.')

  const sum = products.reduce((s, p) => s + p.total, 0)
  if (totals.products != null && products.length && Math.abs(sum - totals.products) > 0.05)
    warnings.push(
      `A soma dos itens (${sum.toFixed(2)}) difere do total de produtos da nota (${totals.products.toFixed(2)}). Verifique se todos os itens foram lidos.`,
    )

  const icmsSum = products.reduce((s, p) => s + p.icmsValue, 0)
  if (totals.icms != null && products.length && Math.abs(icmsSum - totals.icms) > 0.05)
    warnings.push(
      `A soma do ICMS dos itens (${icmsSum.toFixed(2)}) difere do ICMS total da nota (${totals.icms.toFixed(2)}).`,
    )

  const ipiSum = products.reduce((s, p) => s + p.ipiValue, 0)
  if (totals.ipi != null && products.length && Math.abs(ipiSum - totals.ipi) > 0.05)
    warnings.push(
      `A soma do IPI dos itens (${ipiSum.toFixed(2)}) difere do IPI total da nota (${totals.ipi.toFixed(2)}).`,
    )

  return {
    id: noteId,
    fileName,
    accessKey,
    number,
    series,
    issueDate,
    issuerName,
    issuerCnpj,
    issuerUf,
    recipientName,
    recipientCnpj,
    recipientUf,
    operation,
    totals,
    products,
    warnings,
  }
}
