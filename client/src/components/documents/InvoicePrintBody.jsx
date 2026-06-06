import { formatMoney } from '../../lib/currencies'
import { buildDocumentLetterheadHtml, directorSealBlockHtml } from '../../lib/documentPrint'
import { absoluteMediaUrl, mediaUrl } from '../../lib/media'

const FONT = "'Segoe UI', system-ui, sans-serif"
const CLR = { dark: '#0f172a', mid: '#475569', light: '#64748b', muted: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', accent: '#0ea5e9' }
const thStyle = { border: `1px solid ${CLR.border}`, padding: '8px 10px', fontSize: '8.5pt', textTransform: 'uppercase', letterSpacing: '0.05em', color: CLR.mid, fontWeight: 700 }
const tdStyle = { border: `1px solid ${CLR.border}`, padding: '8px 10px', verticalAlign: 'top' }

function sigImgSrc(data, forPrint) {
  if (!data) return ''
  return forPrint ? absoluteMediaUrl(data) : mediaUrl(data)
}

export default function InvoicePrintBody({
  invoice,
  siteSettings = {},
  showLetterhead = true,
  showRefOnDocument = true,
  forPrint = false,
}) {
  const inv = invoice || {}
  const currency = inv.currency || 'LKR'
  const termsLines = (inv.paymentTerms || '').split('\n').map((l) => l.trim()).filter(Boolean)

  return (
    <div className="invoice-doc-inner" style={{ fontFamily: FONT, color: CLR.dark, fontSize: '10.5pt', lineHeight: 1.55 }}>

      {showLetterhead && (
        <div className="doc-letterhead-wrap" style={{ marginBottom: '20px' }}>
          <div
            dangerouslySetInnerHTML={{
              __html: buildDocumentLetterheadHtml(siteSettings, {
                forPrint,
                showTagline: siteSettings.letterheadTagline || 'Next Level Tech',
              }),
            }}
          />
        </div>
      )}

      {/* Title + meta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', pageBreakInside: 'avoid' }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '20pt', fontWeight: 800, letterSpacing: '0.06em', color: CLR.dark }}>INVOICE</h2>
          {inv.invoiceNo && (
            <p style={{ margin: '2px 0 0', fontSize: '10pt', fontWeight: 600, color: CLR.accent, letterSpacing: '0.02em' }}>{inv.invoiceNo}</p>
          )}
          {inv.project?.title && (
            <p style={{ margin: '4px 0 0', color: CLR.mid, fontWeight: 500, fontSize: '10.5pt' }}>{inv.project.title}</p>
          )}
        </div>
        <div style={{ textAlign: 'right', fontSize: '10pt', color: CLR.mid, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ margin: 0 }}>
            <span style={{ color: CLR.muted, textTransform: 'uppercase', fontSize: '8.5pt', fontWeight: 700, display: 'block', marginBottom: '2px' }}>Invoice date</span>
            <span style={{ color: CLR.dark, fontWeight: 500 }}>
              {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-LK', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
            </span>
          </p>
          {showRefOnDocument && inv.invoiceNo && (
            <p style={{ margin: 0 }}>
              <span style={{ color: CLR.muted, textTransform: 'uppercase', fontSize: '8.5pt', fontWeight: 700, display: 'block', marginBottom: '2px' }}>Invoice no.</span>
              <span style={{ color: CLR.dark, fontWeight: 600 }}>{inv.invoiceNo}</span>
            </p>
          )}
          {inv.dueDate && (
            <p style={{ margin: 0 }}>
              <span style={{ color: CLR.muted, textTransform: 'uppercase', fontSize: '8.5pt', fontWeight: 700, display: 'block', marginBottom: '2px' }}>Due date</span>
              <span style={{ color: CLR.dark, fontWeight: 500 }}>
                {new Date(inv.dueDate).toLocaleDateString('en-LK', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Client + invoice details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', pageBreakInside: 'avoid' }}>
        <div style={{ padding: '14px 16px', background: CLR.bg, borderRadius: '8px', border: `1px solid ${CLR.border}` }}>
          <p style={{ margin: '0 0 6px', fontSize: '8.5pt', fontWeight: 700, color: CLR.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Billed to</p>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '10.5pt', color: CLR.dark }}>{inv.client?.name || 'Client'}</p>
          {inv.client?.email && <p style={{ margin: '3px 0 0', fontSize: '9.5pt', color: CLR.light }}>{inv.client.email}</p>}
          {inv.client?.phone && <p style={{ margin: '3px 0 0', fontSize: '9.5pt', color: CLR.light }}>{inv.client.phone}</p>}
        </div>
        <div style={{ padding: '14px 16px', background: CLR.bg, borderRadius: '8px', border: `1px solid ${CLR.border}`, textAlign: 'right' }}>
          <p style={{ margin: '0 0 6px', fontSize: '8.5pt', fontWeight: 700, color: CLR.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Invoice details</p>
          {inv.invoiceNo && (
            <p style={{ margin: 0, fontSize: '10pt', color: CLR.dark, fontWeight: 600 }}>
              <span style={{ color: CLR.muted, fontWeight: 700, fontSize: '8.5pt', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Invoice no. </span>
              {inv.invoiceNo}
            </p>
          )}
          <p style={{ margin: '6px 0 0', fontSize: '9.5pt', color: CLR.light, textTransform: 'capitalize' }}>
            <span style={{ color: CLR.muted }}>Status:</span> {inv.status || '—'}
          </p>
        </div>
      </div>

      {/* Items */}
      <table style={{ width: '100%', borderCollapse: 'collapse', margin: '0 0 20px', fontSize: '10pt' }}>
        <thead>
          <tr style={{ background: '#f1f5f9' }}>
            <th style={{ ...thStyle, textAlign: 'left' }}>Description</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>Qty</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Unit price</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {(inv.items || []).map((item, i) => (
            <tr key={i}>
              <td style={{ ...tdStyle }}>{item.description}</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{item.quantity}</td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>{formatMoney(item.unitPrice || 0, currency)}</td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{formatMoney(item.total || 0, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ width: '260px', marginLeft: 'auto', fontSize: '10pt', marginBottom: '20px', pageBreakInside: 'avoid' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: CLR.mid }}>
          <span>Subtotal</span><span>{formatMoney(inv.subtotal || 0, currency)}</span>
        </div>
        {Number(inv.discountTotal) > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: CLR.mid }}>
            <span>Discount</span><span>-{formatMoney(inv.discountTotal, currency)}</span>
          </div>
        )}
        {Number(inv.tax) > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: CLR.mid }}>
            <span>Tax ({inv.taxRate}%)</span><span>{formatMoney(inv.tax, currency)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 6px', marginTop: '6px', borderTop: `2px solid ${CLR.accent}`, fontSize: '12pt', fontWeight: 800, color: CLR.dark }}>
          <span>Total</span><span>{formatMoney(inv.total || 0, currency)}</span>
        </div>
        {Number(inv.totalPaid) > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: '#15803d' }}>
            <span>Paid</span><span>{formatMoney(inv.totalPaid, currency)}</span>
          </div>
        )}
        {Number(inv.remainingBalance) > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontWeight: 700, color: '#b91c1c' }}>
            <span>Balance due</span><span>{formatMoney(inv.remainingBalance, currency)}</span>
          </div>
        )}
      </div>

      {inv.notes && (
        <div style={{ marginBottom: '16px', pageBreakInside: 'avoid' }}>
          <div style={{ borderTop: `2px solid ${CLR.border}`, paddingTop: '12px' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '8.5pt', fontWeight: 700, color: CLR.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Notes</h4>
            <p style={{ margin: 0, fontSize: '9pt', lineHeight: 1.65, color: CLR.mid, whiteSpace: 'pre-wrap' }}>{inv.notes}</p>
          </div>
        </div>
      )}

      {termsLines.length > 0 && (
        <div style={{ marginBottom: '16px', pageBreakInside: 'avoid' }}>
          <div style={{ border: `1px solid ${CLR.border}`, borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '10px 18px', background: CLR.dark }}>
              <h4 style={{ margin: 0, fontSize: '8.5pt', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Payment terms
              </h4>
            </div>
            <div style={{ padding: '14px 18px', background: '#fafbfc' }}>
              <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '8.5pt', lineHeight: 1.7, color: CLR.mid }}>
                {termsLines.map((line, i) => (
                  <li key={i} style={{ paddingLeft: '4px', marginBottom: i < termsLines.length - 1 ? '5px' : 0 }}>{line}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}

      {(inv.signatures?.authorizer?.data || inv.signatures?.seal?.data) && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '40px', pageBreakInside: 'avoid' }}>
          <div style={{ width: '260px', textAlign: 'center' }}>
            {inv.signatures.authorizer?.data ? (
              <img src={sigImgSrc(inv.signatures.authorizer.data, forPrint)} alt="Signature" style={{ maxHeight: '70px', marginBottom: '8px', display: 'block', marginInline: 'auto' }} crossOrigin="anonymous" />
            ) : (
              <div style={{ height: '70px', marginBottom: '8px' }} />
            )}
            
            <div style={{ borderTop: `2px solid ${CLR.dark}`, paddingTop: '8px', marginTop: '4px', marginBottom: '16px' }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '10pt', color: CLR.dark, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{inv.signatures.authorizer?.name || 'Authorized Signatory'}</p>
              {inv.signatures.authorizer?.title && (
                <p style={{ margin: '4px 0 0', fontSize: '8.5pt', color: CLR.mid }}>{inv.signatures.authorizer.title}</p>
              )}
            </div>

            {inv.signatures.seal?.data && (
              <img 
                src={sigImgSrc(inv.signatures.seal.data, forPrint)} 
                alt="Seal" 
                style={{ maxHeight: '110px', display: 'block', marginInline: 'auto', marginBottom: '8px' }} 
                crossOrigin="anonymous" 
              />
            )}
            
            {inv.signatures.seal?.note && (
              <p style={{ margin: 0, fontSize: '8.5pt', color: CLR.mid, fontStyle: 'italic' }}>{inv.signatures.seal.note}</p>
            )}
          </div>
        </div>
      )}

      {!inv.signatures?.authorizer?.data && !inv.signatures?.seal?.data && siteSettings && (
        <div dangerouslySetInnerHTML={{
          __html: directorSealBlockHtml({
            directorName: siteSettings.quotationDirectorName || '',
            sealUrl: siteSettings.sealUrl || '',
            forPrint,
          }),
        }} />
      )}
    </div>
  )
}
