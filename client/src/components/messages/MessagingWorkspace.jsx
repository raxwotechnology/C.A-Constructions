import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import { FiSend, FiSearch } from 'react-icons/fi'
import api from '../../lib/api'
import useAuthStore from '../../store/authStore'

export default function MessagingWorkspace({ embedded = false }) {
  const qc = useQueryClient()
  const { token, user } = useAuthStore()
  const [selectedUserId, setSelectedUserId] = useState('')
  const [content, setContent] = useState('')
  const selectedKey = useMemo(() => (user?._id ? `msg:selectedUserId:${user._id}` : ''), [user?._id])

  const { data: contactsData } = useQuery({
    queryKey: ['message-contacts'],
    queryFn: () => api.get('/messages/contacts').then((r) => r.data),
  })
  const contacts = contactsData?.users || []

  const { data: threadsData } = useQuery({
    queryKey: ['message-threads'],
    queryFn: () => api.get('/messages/threads').then((r) => r.data),
    refetchInterval: 20000,
  })
  const threads = threadsData?.threads || []

  useEffect(() => {
    if (!selectedKey) return
    const saved = window.localStorage.getItem(selectedKey)
    if (saved) setSelectedUserId(saved)
  }, [selectedKey])

  useEffect(() => {
    if (!selectedUserId && contacts.length > 0) setSelectedUserId(contacts[0]._id)
  }, [selectedUserId, contacts])

  useEffect(() => {
    if (!selectedKey || !selectedUserId) return
    window.localStorage.setItem(selectedKey, selectedUserId)
  }, [selectedKey, selectedUserId])

  const activeUserId = useMemo(() => {
    if (selectedUserId) return selectedUserId
    return threads[0]?.user?._id || contacts[0]?._id || ''
  }, [selectedUserId, threads, contacts])

  const { data: messagesData } = useQuery({
    queryKey: ['message-thread', activeUserId],
    queryFn: () => api.get(`/messages/threads/${activeUserId}`).then((r) => r.data),
    enabled: Boolean(activeUserId),
    keepPreviousData: true,
    staleTime: 15000,
  })
  const messages = messagesData?.messages || []

  const sendMutation = useMutation({
    mutationFn: (payload) => api.post('/messages', payload).then((r) => r.data),
    onSuccess: () => {
      setContent('')
      qc.invalidateQueries({ queryKey: ['message-thread', activeUserId] })
      qc.invalidateQueries({ queryKey: ['message-threads'] })
    },
  })

  useEffect(() => {
    if (!token) return undefined
    const socket = io((import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', ''), {
      auth: { token },
      transports: ['websocket'],
    })

    socket.on('message:new', () => {
      qc.invalidateQueries({ queryKey: ['message-threads'] })
      if (activeUserId) qc.invalidateQueries({ queryKey: ['message-thread', activeUserId] })
    })

    return () => socket.disconnect()
  }, [token, activeUserId, qc])

  const onSend = () => {
    if (!activeUserId || !content.trim()) return
    sendMutation.mutate({ recipientId: activeUserId, content })
  }

  return (
    <div className={`${embedded ? '' : 'container-max py-10'}`}>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-4 lg:col-span-1">
          <div className="relative mb-3">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="form-input pl-9" placeholder="Search contacts" />
          </div>
          <div className="space-y-2 max-h-[520px] overflow-y-auto">
            {contacts.map((person) => {
              const thread = threads.find((t) => t.user?._id === person._id)
              return (
                <button
                  key={person._id}
                  onClick={() => setSelectedUserId(person._id)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${
                    activeUserId === person._id ? 'border-secondary/50 bg-blue-50/40' : 'border-slate-200 hover:border-secondary/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-primary">{person.name}</p>
                    {thread?.unread ? <span className="badge badge-blue">{thread.unread}</span> : null}
                  </div>
                  <p className="text-xs text-slate-500 capitalize mt-1">{person.role}</p>
                  {thread?.lastMessage ? <p className="text-xs text-slate-400 mt-1 truncate">{thread.lastMessage}</p> : null}
                </button>
              )
            })}
          </div>
        </div>

        <div className="card p-5 lg:col-span-2 h-[620px] flex flex-col">
          <div className="pb-4 border-b border-slate-100">
            <p className="font-semibold text-primary">
              {contacts.find((x) => x._id === activeUserId)?.name || 'Select a contact'}
            </p>
          </div>

          <div className="flex-1 py-4 space-y-3 overflow-y-auto">
            {messages.map((msg) => {
              const mine = String(msg.sender?._id || msg.sender) === String(user?._id)
              return (
                <div key={msg._id} className={`max-w-[80%] rounded-2xl p-3 text-sm ${mine ? 'ml-auto bg-secondary text-white' : 'bg-slate-100 text-slate-700'}`}>
                  {msg.content}
                </div>
              )
            })}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
            <input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your message..."
              className="form-input"
              onKeyDown={(e) => { if (e.key === 'Enter') onSend() }}
            />
            <button className="btn-primary" type="button" onClick={onSend} disabled={sendMutation.isPending}>
              <FiSend size={14} /> Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
