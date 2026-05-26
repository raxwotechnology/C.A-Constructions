import { formatMoney } from '../../lib/currencies'
import { buildDocumentLetterheadHtml, directorSealBlockHtml } from '../../lib/documentPrint'

const PAYMENT_LABELS = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  card: 'Card',
  online: 'Online Payment',
  custom: 'Custom',
}

export default function QuotationPrintBody({
  quotation,
  siteSettings = {},
  preparedByDisplay,
  bankLabel,
  showLetterhead = true,
  thankYouMessage,
  showRefOnDocument = true,
  showSeal = true,
  editableNotes,
  editableTerms,
  onNotesChange,
  onTermsChange,
  onThankYouChange,
}) {
  const q = quotation || {}
  const currency = q.currency || 'LKR'
  const prepared = preparedByDisplay || q.preparedBy || q.generatedBy?.name || ''
  const directorName = q.directorName || siteSettings.quotationDirectorName || ''
  const sealUrl = q.directorSealUrl || siteSettings.sealUrl || ''
  const thanks = thankYouMessage ?? siteSettings.quotationThankYouMessage ?? 'Thank you for your business.'
  const notes = editableNotes !== undefined ? editableNotes : q.notes
  const terms = editableTerms !== undefined ? editableTerms : q.terms
  const canEdit = Boolean(onNotesChange || onTermsChange || onThankYouChange)

  const payLabel =
    q.paymentMethod === 'custom'
      ? q.paymentMethodCustom || 'Custom'
      : PAYMENT_LABELS[q.paymentMethod] || q.paymentMethod || ''

  return (
    <div className="quotation-doc-inner">
      {showLetterhead && (
        <div className="doc-letterhead-wrap">
          <div
            dangerouslySetInnerHTML={{
              __html: buildDocumentLetterheadHtml(siteSettings, {
                forPrint: false,
                showTagline: siteSettings.letterheadTagline || 'Next Level Tech',
              }),
            }}
          />
        </div>
      )}

      <div className="flex flex-wrap justify-between gap-4 mb-6">
        <div>
          <h2 className="doc-title text-2xl font-black tracking-wide text-slate-900">QUOTATION</h2>
          {q.title ? <p className="text-slate-600 font-medium">{q.title}</p> : null}
        </div>
        <div className="text-right text-sm text-slate-600">
          {q.validUntil ? (
            <p>
              <span className="text-slate-400 uppercase text-xs font-bold">Valid until</span>
              <br />
              {new Date(q.validUntil).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' })}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
        <div>
          <p className="text-xs uppercase font-bold text-slate-400 mb-1">Quotation for</p>
          <p className="font-bold text-slate-800">{q.client?.name || 'Client'}</p>
          {q.client?.email && <p className="text-sm text-slate-600">{q.client.email}</p>}
          {q.client?.phone && <p className="text-sm text-slate-600">{q.client.phone}</p>}
        </div>
        <div className="sm:text-right">
          <p className="text-xs uppercase font-bold text-slate-400 mb-1">Prepared by</p>
          <p className="font-semibold text-slate-800">{prepared || '—'}</p>
          {payLabel && (
            <p className="text-sm text-slate-600 mt-2">
              <span className="text-slate-400">Payment:</span> {payLabel}
            </p>
          )}
          {bankLabel && (
            <p className="text-sm text-slate-600">
              <span className="text-slate-400">Bank:</span> {bankLabel}
            </p>
          )}
        </div>
      </div>

      <table className="doc-table w-full text-sm mb-6">
        <thead>
          <tr>
            <th>Description</th>
            <th className="text-center">Qty</th>
            <th className="text-right">Unit price</th>
            <th className="text-right">Disc.</th>
            <th className="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {(q.items || []).map((item, i) => (
            <tr key={i}>
              <td>{item.description}</td>
              <td className="text-center">{item.quantity}</td>
              <td className="text-right">{formatMoney(item.unitPrice || 0, currency)}</td>
              <td className="text-right">{item.discount > 0 ? `${item.discount}%` : '—'}</td>
              <td className="text-right font-medium">{formatMoney(item.total || 0, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="doc-totals space-y-1 mb-6">
        <div className="doc-totals-row flex justify-between">
          <span>Subtotal</span>
          <span>{formatMoney(q.subtotal || 0, currency)}</span>
        </div>
        {Number(q.transportCharge) > 0 && (
          <div className="doc-totals-row flex justify-between">
            <span>Transport charge</span>
            <span>{formatMoney(q.transportCharge, currency)}</span>
          </div>
        )}
        {Number(q.taxRate) > 0 && (
          <div className="doc-totals-row flex justify-between">
            <span>Tax ({q.taxRate}%)</span>
            <span>{formatMoney(q.tax || 0, currency)}</span>
          </div>
        )}
        <div className="doc-totals-row total flex justify-between font-bold text-lg border-t-2 border-sky-500 pt-2">
          <span>Total</span>
          <span>{formatMoney(q.total || 0, currency)}</span>
        </div>
        {Number(q.advanceAmount) > 0 && (
          <div className="doc-totals-row flex justify-between text-sm text-slate-500">
            <span>Advance</span>
            <span>{formatMoney(q.advanceAmount, currency)}</span>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6 text-sm border-t border-slate-100 pt-4">
        {(notes || canEdit) && (
          <div>
            <h4 className="font-bold text-xs uppercase text-slate-500 mb-2">Notes</h4>
            {canEdit && onNotesChange ? (
              <div
                className="text-slate-600 whitespace-pre-wrap min-h-[2em] outline-none focus:ring-2 focus:ring-sky-200 rounded px-1 -mx-1"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => onNotesChange(e.currentTarget.innerText)}
              >
                {notes}
              </div>
            ) : (
              <p className="text-slate-600 whitespace-pre-wrap">{notes}</p>
            )}
          </div>
        )}
        {(terms || canEdit) && (
          <div>
            <h4 className="font-bold text-xs uppercase text-slate-500 mb-2">Terms & conditions</h4>
            {canEdit && onTermsChange ? (
              <div
                className="text-slate-600 whitespace-pre-wrap min-h-[2em] outline-none focus:ring-2 focus:ring-sky-200 rounded px-1 -mx-1"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => onTermsChange(e.currentTarget.innerText)}
              >
                {terms}
              </div>
            ) : (
              <p className="text-slate-600 whitespace-pre-wrap">{terms}</p>
            )}
          </div>
        )}
      </div>

      <div className="doc-footer-area">
        {thanks ? (
          canEdit && onThankYouChange ? (
            <p
              className="doc-thankyou text-center italic text-slate-500 mt-8 outline-none focus:ring-2 focus:ring-sky-200 rounded px-2"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => onThankYouChange(e.currentTarget.innerText)}
            >
              {thanks}
            </p>
          ) : (
            <p className="doc-thankyou text-center italic text-slate-500 mt-8">{thanks}</p>
          )
        ) : null}

        {showSeal && (directorName || sealUrl) && (
          <div
            className="mt-8 text-right"
            dangerouslySetInnerHTML={{
              __html: directorSealBlockHtml({ directorName, sealUrl, forPrint: false }),
            }}
          />
        )}

        {showRefOnDocument && q.quotationNo ? (
          <p className="text-[10px] text-slate-400 text-right mt-6 tracking-wide">Ref: {q.quotationNo}</p>
        ) : null}
      </div>
    </div>
  )
}
