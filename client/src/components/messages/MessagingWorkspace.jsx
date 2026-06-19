import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import { FiSend, FiSearch, FiUsers, FiPlus, FiX, FiArrowLeft } from 'react-icons/fi'
import api from '../../lib/api'
import { getSocketOrigin } from '../../lib/devApi'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

function renderMessageContent(content) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return content.split(urlRegex).map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline text-blue-100 hover:text-white font-medium">
          {part}
        </a>
      );
    }
    return part;
  });
}

function renderReceivedMessageContent(content) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return content.split(urlRegex).map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline text-blue-600 hover:text-blue-800 font-medium">
          {part}
        </a>
      );
    }
    return part;
  });
}

export default function MessagingWorkspace({ embedded = false }) {
  const qc = useQueryClient()
  const { token, user } = useAuthStore()
  const [selectedChatId, setSelectedChatId] = useState('')
  const [isGroupSelected, setIsGroupSelected] = useState(false)
  const [content, setContent] = useState('')
  const selectedKey = useMemo(() => (user?._id ? `msg:selectedChatId:${user._id}` : ''), [user?._id])
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [groupForm, setGroupForm] = useState({ name: '', members: [] })
  const [mobileShowChat, setMobileShowChat] = useState(false)

  const { data: contactsData } = useQuery({
    queryKey: ['message-contacts'],
    queryFn: () => api.get('/messages/contacts').then((r) => r.data),
  })
  const contacts = contactsData?.users || []
  const groups = contactsData?.groups || []

  const { data: threadsData } = useQuery({
    queryKey: ['message-threads'],
    queryFn: () => api.get('/messages/threads').then((r) => r.data),
    refetchInterval: 20000,
  })
  const threads = threadsData?.threads || []

  useEffect(() => {
    if (!selectedKey) return
    const saved = window.localStorage.getItem(selectedKey)
    const savedType = window.localStorage.getItem(selectedKey + '_type')
    if (saved) {
      setSelectedChatId(saved)
      setIsGroupSelected(savedType === 'group')
    }
  }, [selectedKey])

  useEffect(() => {
    if (!selectedChatId && contacts.length > 0) {
      setSelectedChatId(contacts[0]._id)
      setIsGroupSelected(false)
    }
  }, [selectedChatId, contacts])

  useEffect(() => {
    if (!selectedKey || !selectedChatId) return
    window.localStorage.setItem(selectedKey, selectedChatId)
    window.localStorage.setItem(selectedKey + '_type', isGroupSelected ? 'group' : 'user')
  }, [selectedKey, selectedChatId, isGroupSelected])

  const activeChatId = useMemo(() => {
    if (selectedChatId) return selectedChatId
    return contacts[0]?._id || ''
  }, [selectedChatId, contacts])

  const { data: messagesData } = useQuery({
    queryKey: ['message-thread', activeChatId],
    queryFn: () => api.get(`/messages/threads/${activeChatId}`).then((r) => r.data),
    enabled: Boolean(activeChatId),
    keepPreviousData: true,
    staleTime: 15000,
  })
  const messages = messagesData?.messages || []

  const sendMutation = useMutation({
    mutationFn: (payload) => api.post('/messages', payload).then((r) => r.data),
    onSuccess: () => {
      setContent('')
      qc.invalidateQueries({ queryKey: ['message-thread', activeChatId] })
      qc.invalidateQueries({ queryKey: ['message-threads'] })
    },
  })

  const createGroupMut = useMutation({
    mutationFn: (payload) => api.post('/messages/groups', payload).then(r => r.data),
    onSuccess: () => {
      setShowCreateGroup(false)
      setGroupForm({ name: '', members: [] })
      qc.invalidateQueries({ queryKey: ['message-contacts'] })
      toast.success('Group created')
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to create group')
  })

  useEffect(() => {
    if (!token) return undefined
    const socket = io(getSocketOrigin(), {
      auth: { token },
      transports: ['websocket'],
    })

    socket.on('message:new', () => {
      qc.invalidateQueries({ queryKey: ['message-threads'] })
      if (activeChatId) qc.invalidateQueries({ queryKey: ['message-thread', activeChatId] })
    })

    return () => socket.disconnect()
  }, [token, activeChatId, qc])

  const onSend = () => {
    if (!activeChatId || !content.trim()) return
    const payload = { content }
    if (isGroupSelected) payload.groupId = activeChatId
    else payload.recipientId = activeChatId
    sendMutation.mutate(payload)
  }

  const activeChatName = useMemo(() => {
    if (isGroupSelected) return groups.find(g => g._id === activeChatId)?.name || 'Group'
    return contacts.find(x => x._id === activeChatId)?.name || 'Select a contact'
  }, [activeChatId, isGroupSelected, groups, contacts])

  // Combine threads with contacts/groups so everyone shows up in the sidebar
  const sidebarItems = useMemo(() => {
    const items = []
    groups.forEach(g => {
      const t = threads.find(th => th.group && th.group._id === g._id)
      items.push({
        id: g._id,
        isGroup: true,
        name: g.name,
        role: 'Group',
        lastMessage: t?.lastMessage || '',
        unread: t?.unread || 0,
        lastAt: t?.lastAt ? new Date(t.lastAt).getTime() : 0,
      })
    })
    contacts.forEach(c => {
      const t = threads.find(th => th.user && th.user._id === c._id)
      items.push({
        id: c._id,
        isGroup: false,
        name: c.name,
        role: c.role,
        lastMessage: t?.lastMessage || '',
        unread: t?.unread || 0,
        lastAt: t?.lastAt ? new Date(t.lastAt).getTime() : 0,
      })
    })
    return items.sort((a, b) => b.lastAt - a.lastAt || a.name.localeCompare(b.name))
  }, [contacts, groups, threads])

  return (
    <div className={`${embedded ? '' : 'container-max py-4 lg:py-10'}`}>
      <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
        <div className={`card p-3 lg:p-4 lg:col-span-1 flex flex-col h-[calc(100vh-140px)] lg:h-[620px] ${mobileShowChat ? 'hidden lg:flex' : 'flex'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="form-input !pl-10 text-sm" placeholder="Search chats" />
            </div>
            {user?.role !== 'client' && (
              <button onClick={() => setShowCreateGroup(true)} className="ml-2 btn-secondary p-2 lg:p-2.5 rounded-lg" title="Create Group">
                <FiPlus size={18} />
              </button>
            )}
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setSelectedChatId(item.id); setIsGroupSelected(item.isGroup); setMobileShowChat(true); }}
                className={`w-full text-left p-3 rounded-xl border transition-colors ${
                  activeChatId === item.id ? 'border-secondary/50 bg-blue-50/40' : 'border-slate-200 hover:border-secondary/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.isGroup ? <FiUsers className="text-secondary" /> : null}
                    <p className="text-sm font-semibold text-primary">{item.name}</p>
                  </div>
                  {item.unread ? <span className="badge badge-blue">{item.unread}</span> : null}
                </div>
                <p className="text-xs text-slate-500 capitalize mt-1">{item.role}</p>
                {item.lastMessage ? <p className="text-xs text-slate-400 mt-1 truncate">{item.lastMessage}</p> : null}
              </button>
            ))}
          </div>
        </div>

        <div className={`card p-3 lg:p-5 lg:col-span-2 h-[calc(100vh-140px)] lg:h-[620px] flex flex-col ${mobileShowChat ? 'flex' : 'hidden lg:flex'}`}>
          <div className="pb-3 lg:pb-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileShowChat(false)}
                className="lg:hidden p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 mr-1.5"
                title="Back to list"
              >
                <FiArrowLeft size={18} />
              </button>
              {isGroupSelected && <FiUsers className="text-slate-400" />}
              <p className="font-semibold text-primary truncate max-w-[200px] sm:max-w-xs">{activeChatName}</p>
            </div>
          </div>

          <div className="flex-1 py-4 space-y-3 overflow-y-auto pr-1">
            {messages.map((msg) => {
              const mine = String(msg.sender?._id || msg.sender) === String(user?._id)
              return (
                <div key={msg._id} className={`max-w-[85%] lg:max-w-[80%] rounded-2xl p-3 text-sm ${mine ? 'ml-auto bg-secondary text-white rounded-br-sm' : 'bg-slate-100 text-slate-700 rounded-bl-sm'}`}>
                  {!mine && isGroupSelected && (
                    <p className="text-[11px] font-bold text-slate-400 mb-1">{msg.sender?.name}</p>
                  )}
                  {mine ? renderMessageContent(msg.content) : renderReceivedMessageContent(msg.content)}
                </div>
              )
            })}
          </div>

          <div className="pt-3 lg:pt-4 border-t border-slate-100 flex items-center gap-2 lg:gap-3">
            <input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your message..."
              className="form-input text-sm rounded-full px-4"
              onKeyDown={(e) => { if (e.key === 'Enter') onSend() }}
            />
            <button className="btn-primary shrink-0 p-2.5 lg:px-4 lg:py-2.5 rounded-full flex items-center gap-1.5" type="button" onClick={onSend} disabled={sendMutation.isPending || !content.trim()}>
              <FiSend size={16} /> <span className="hidden lg:inline">Send</span>
            </button>
          </div>
        </div>
      </div>

      {showCreateGroup && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold font-heading">Create Group Chat</h3>
              <button onClick={() => setShowCreateGroup(false)} className="text-gray-400 hover:text-red-500">
                <FiX size={24} />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createGroupMut.mutate({ name: groupForm.name, memberIds: groupForm.members }); }}>
              <div className="space-y-4">
                <div>
                  <label className="form-label">Group Name</label>
                  <input required value={groupForm.name} onChange={e => setGroupForm(s => ({ ...s, name: e.target.value }))} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Select Members</label>
                  <div className="max-h-60 overflow-y-auto space-y-2 border rounded-xl p-2 bg-slate-50">
                    {contacts.map(c => (
                      <label key={c._id} className="flex items-center gap-2 p-2 hover:bg-white rounded border border-transparent hover:border-slate-200 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={groupForm.members.includes(c._id)}
                          onChange={(e) => {
                            if (e.target.checked) setGroupForm(s => ({ ...s, members: [...s.members, c._id] }))
                            else setGroupForm(s => ({ ...s, members: s.members.filter(id => id !== c._id) }))
                          }}
                          className="rounded text-secondary focus:ring-secondary"
                        />
                        <span className="text-sm font-medium">{c.name}</span>
                        <span className="text-xs text-slate-400 capitalize bg-slate-100 px-1.5 rounded">{c.role}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="pt-2">
                  <button type="submit" disabled={createGroupMut.isPending || groupForm.members.length === 0} className="btn-primary w-full justify-center">
                    {createGroupMut.isPending ? 'Creating...' : 'Create Group'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
