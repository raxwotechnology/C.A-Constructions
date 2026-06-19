import SectionHeader from '../../components/ui/SectionHeader'
import MessagingWorkspace from '../../components/messages/MessagingWorkspace'

export default function ClientMessages() {
  return (
    <div className="animate-fade-in">
      <section className="bg-gradient-hero pt-32 pb-10">
        <div className="container-max">
          <p className="text-white/70 text-sm">Client Portal</p>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-white mt-2">Messages</h1>
          <p className="text-white/75 mt-2">Realtime communication with admin and delivery teams.</p>
        </div>
      </section>
      <section className="section-padding bg-slate-50">
        <div className="container-max">
          <SectionHeader title="Inbox" subtitle="Your recent conversations and support threads." />
          <MessagingWorkspace embedded />
        </div>
      </section>
    </div>
  )
}
