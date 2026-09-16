import SectionHeader from '../../components/ui/SectionHeader'
import MessagingWorkspace from '../../components/messages/MessagingWorkspace'
import ClientPageHeader from '../../components/ui/ClientPageHeader'

export default function ClientMessages() {
  return (
    <div className="animate-fade-in">
      <ClientPageHeader 
        title="Messages" 
        subtitle="Realtime communication with admin and delivery teams."
      />
      <section className="section-padding bg-slate-50 min-h-screen">
        <div className="container-max">
          <SectionHeader title="Inbox" subtitle="Your recent conversations and support threads." />
          <MessagingWorkspace embedded />
        </div>
      </section>
    </div>
  )
}
