import SectionHeader from '../../components/ui/SectionHeader'
import MessagingWorkspace from '../../components/messages/MessagingWorkspace'

export default function MessagesCenter() {
  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader title="Messages" subtitle="Realtime communication with clients and team members." />
      <MessagingWorkspace embedded />
    </div>
  )
}
