import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { FiFileText, FiDownload } from 'react-icons/fi'

const typeColor = { offer:'badge-blue', appointment:'badge-green', confirmation:'badge-purple', experience:'badge-navy', salary:'badge-yellow', service_agreement:'badge-blue' }

const printLetter = (content, title) => {
  const w = window.open('', '_blank')
  w.document.write(`<html><head><title>${title}</title>
  <style>body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;padding:40px;color:#1a1a1a;line-height:1.7}
  .header{text-align:center;border-bottom:2px solid #2563EB;padding-bottom:20px;margin-bottom:30px}
  pre{white-space:pre-wrap;font-family:inherit}@media print{body{margin:0}}</style></head>
  <body><div class="header"><strong style="font-size:24px;color:#0B1F3A">Raxwo Pvt Ltd</strong>
  <p style="color:#666;font-size:12px">123 Galle Road, Colombo 03 · hello@raxwo.com</p></div>
  <pre>${content}</pre></body></html>`)
  w.document.close(); w.print()
}

export default function EmployeeLetters() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-letters'],
    queryFn: () => api.get('/letters/my').then(r => r.data),
  })
  const letters = data?.letters || []

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">My Letters</h1>
          <p className="page-subtitle">{letters.length} letters issued</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12"><div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto"/></div>
      ) : letters.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FiFileText size={40} className="mx-auto mb-2 opacity-30"/><p>No letters issued yet</p>
          <p className="text-xs mt-1">Contact HR to request a letter</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {letters.map(l => (
            <div key={l._id} className="card card-body card-hover">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <FiFileText className="text-secondary" size={18}/>
                </div>
                <span className={`badge ${typeColor[l.type]||'badge-gray'} capitalize`}>{l.type}</span>
              </div>
              <h3 className="font-bold text-primary font-heading mb-1">{l.title}</h3>
              <p className="text-xs text-gray-400 mb-4">Issued on {new Date(l.issuedDate).toLocaleDateString('en-LK', { day:'numeric', month:'long', year:'numeric' })}</p>
              <button onClick={() => printLetter(l.content, l.title)} className="btn-ghost btn-sm w-full justify-center">
                <FiDownload size={13}/> Print / Download
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
