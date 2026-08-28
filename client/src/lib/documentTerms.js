/** Resolve terms text from invoice/quotation-shaped documents */
export function resolveDocumentTerms(doc = {}) {
  return String(doc.paymentTerms || doc.terms || '').trim()
}

export function termsLinesFromDoc(doc = {}) {
  return resolveDocumentTerms(doc)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}
