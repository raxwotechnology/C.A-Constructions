import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import api from '../../lib/api'
import { SITE_SETTINGS_QUERY_KEY } from '../../hooks/useSiteBranding'
import QuotationPrintBody from '../documents/QuotationPrintBody'
import { FiDownload, FiPrinter, FiX } from 'react-icons/fi'
import { printHtmlContent } from '../../lib/documentPrint'
import { layoutPrintExtraCss, loadQuotationLayout } from '../../lib/quotationPrintLayout'
import toast from 'react-hot-toast'

export default function ClientQuotationView({ quotationId, onClose }) {
  const id = quotationId
  const { data, isLoading, error } = useQuery({
    queryKey: ['client-quotation', id],
    queryFn: () => api.get(`/quotations/${id}`).then((r) => r.data?.quotation),
    enabled: !!id,
  })
  const { data: siteData } = useQuery({
    queryKey: SITE_SETTINGS_QUERY_KEY,
    queryFn: () => api.get('/site-settings').then((r) => r.data),
  })
  const site = siteData?.settings || {}
  const q = data

  const bankLabel = q?.bankAccount
    ? `${q.bankAccount.bankName || ''} · ${q.bankAccount.accountNumber || ''}`.trim()
    : ''

  const handlePrint = () => {
    const inner = document.getElementById('client-quotation-print-root')?.innerHTML
    if (!inner) return
    printHtmlContent({
      title: site.siteName || 'Quotation',
      bodyHtml: `<div class="doc-print-frame">${inner}</div>`,
      extraCss: layoutPrintExtraCss(loadQuotationLayout()),
    })
  }

  const handleDownload = async () => {
    try {
      const res = await api.get(`/quotations/${id}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `${q?.quotationNo || 'quotation'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF downloaded')
    } catch {
      toast.error('Could not download PDF')
    }
  }

  if (!id) return null

  return (
    <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Your quotation</h2>
            {q?.quotationNo && <p className="text-sm font-mono text-secondary">{q.quotationNo}</p>}
          </div>
          <div className="flex gap-2">
            {q && (
              <>
                <button type="button" className="btn-outline btn-sm" onClick={handleDownload}><FiDownload size={14}/> PDF</button>
                <button type="button" className="btn-primary btn-sm" onClick={handlePrint}><FiPrinter size={14}/> Print</button>
              </>
            )}
            <button type="button" className="p-2 hover:bg-slate-100 rounded-lg" onClick={onClose}><FiX/></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100">
          {isLoading && (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin" />
            </div>
          )}
          {error && <p className="text-center text-red-600 py-12">Could not load quotation.</p>}
          {q && (
            <div id="client-quotation-print-root" className="doc-print-frame bg-white shadow-lg border border-slate-200 rounded-lg p-6 sm:p-8 max-w-3xl mx-auto">
              <QuotationPrintBody
                quotation={q}
                siteSettings={site}
                bankLabel={bankLabel}
                preparedByDisplay={q.preparedBy || q.generatedBy?.name}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** Reads ?quotation= from URL and renders modal when present */
export function ClientQuotationViewFromUrl() {
  const [params, setParams] = useSearchParams()
  const id = params.get('quotation')
  if (!id) return null
  return (
    <ClientQuotationView
      quotationId={id}
      onClose={() => {
        params.delete('quotation')
        setParams(params, { replace: true })
      }}
    />
  )
}
