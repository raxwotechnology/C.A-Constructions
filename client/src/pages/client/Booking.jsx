import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import SectionHeader from '../../components/ui/SectionHeader'

export default function ClientBooking() {
  const { register, handleSubmit, reset } = useForm()
  const mutation = useMutation({
    mutationFn: (payload) => api.post('/bookings', payload).then((r) => r.data),
    onSuccess: () => {
      toast.success('Booking request submitted successfully')
      reset()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to submit booking'),
  })

  return (
    <div className="animate-fade-in">
      <section className="bg-gradient-hero pt-32 pb-10">
        <div className="container-max">
          <p className="text-white/70 text-sm">Client Portal</p>
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-white mt-2">Booking</h1>
          <p className="text-white/75 mt-2">Request a project consultation and kick off your delivery pipeline.</p>
        </div>
      </section>
      <section className="section-padding bg-slate-50">
        <div className="container-max space-y-6 max-w-5xl">
          <SectionHeader title="Book a Service" subtitle="Tell us what you need — we’ll confirm and start the process." />
          <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="card p-6 grid md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Service</label>
          <select {...register('service', { required: true })} className="form-select">
            <option value="">Select service</option>
            <option>Web Development</option>
            <option>Mobile App Development</option>
            <option>Enterprise Systems</option>
            <option>Cloud & DevOps</option>
          </select>
        </div>
        <div>
          <label className="form-label">Preferred Date</label>
          <input {...register('preferredDate')} type="date" className="form-input" />
        </div>
        <div>
          <label className="form-label">Estimated Budget (LKR)</label>
          <input {...register('budget')} type="number" className="form-input" />
        </div>
        <div>
          <label className="form-label">Initial Amount (Optional)</label>
          <input {...register('amount')} type="number" className="form-input" />
        </div>
        <div className="md:col-span-2">
          <label className="form-label">Project Brief</label>
          <textarea {...register('brief', { required: true })} className="form-input min-h-28" />
        </div>
        <div className="md:col-span-2">
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>Submit Booking</button>
        </div>
      </form>
        </div>
      </section>
    </div>
  )
}
