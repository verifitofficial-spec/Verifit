'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { Send, User as UserIcon } from 'lucide-react';
import { isMissingRelationError } from '@/lib/supabaseErrors';

interface Contact {
  id: string;
  name: string | null;
  email?: string | null;
}

interface ChatMessage {
  id?: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

interface ChatProps {
  currentUserId: string;
}

export default function Chat({ currentUserId }: ChatProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(true);

  useEffect(() => {
    async function loadContacts() {
      setLoadingContacts(true);

      // 1. Prüfen, ob der aktuelle Nutzer ein Trainer ist
      const { data: trainerCheck } = await supabase
        .from('trainers')
        .select('id')
        .eq('id', currentUserId)
        .single();

      if (trainerCheck) {
        // Nutzer ist Trainer -> Lade Kunden
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id, name, email');
        if (clientsData) setContacts(clientsData);
      } else {
        // Nutzer ist Kunde -> Lade Trainer
        let { data: trainersData, error: trainersError } = await supabase
          .from('trainers_public')
          .select('id, name');
        if (isMissingRelationError(trainersError, 'trainers_public')) {
          const fallback = await supabase
            .from('trainers')
            .select('id, name')
            .eq('status', 'approved');
          trainersData = fallback.data;
          trainersError = fallback.error;
        }
        if (trainersError) console.error('Trainerkontakte konnten nicht geladen werden');
        if (trainersData) setContacts(trainersData);
      }

      setLoadingContacts(false);
    }

    if (currentUserId) {
      loadContacts();
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!activeContact || !currentUserId) return;
    const activeContactId = activeContact.id;

    async function loadMessages() {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${activeContactId}),and(sender_id.eq.${activeContactId},receiver_id.eq.${currentUserId})`
        )
        .order('created_at', { ascending: true });

      if (data) setMessages(data);
    }

    loadMessages();

    // Supabase Realtime Subscription für neue Nachrichten
    const channel = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as ChatMessage;
          if (
            (msg.sender_id === currentUserId && msg.receiver_id === activeContactId) ||
            (msg.sender_id === activeContactId && msg.receiver_id === currentUserId)
          ) {
            setMessages((prev) => [...prev, msg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeContact, currentUserId]);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !activeContact) return;

    const payload = {
      sender_id: currentUserId,
      receiver_id: activeContact.id,
      content: newMessage.trim(),
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('messages').insert(payload);

    if (error) {
      console.error('Fehler beim Senden:', error.message);
    } else {
      setNewMessage('');
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-canvas/80 rounded-2xl border border-line p-4 h-[500px]">
      {/* Kontakte-Liste */}
      <div className="border-r border-line/80 pr-4 space-y-3 overflow-y-auto">
        <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">Kontakte</h3>
        {loadingContacts ? (
          <p className="text-xs text-ink-muted">Lade Kontakte...</p>
        ) : contacts.length === 0 ? (
          <p className="text-xs text-ink-muted">Keine Kontakte gefunden.</p>
        ) : (
          contacts.map((contact) => (
            <button
              key={contact.id}
              onClick={() => setActiveContact(contact)}
              className={`w-full text-left p-3 rounded-xl text-xs transition flex items-center gap-3 border ${
                activeContact?.id === contact.id
                  ? 'bg-accent-soft border-accent text-accent font-bold'
                  : 'bg-surface border-line text-ink-soft hover:border-line-strong'
              }`}
            >
              <div className="p-2 bg-surface-soft rounded-full text-ink-muted">
                <UserIcon size={14} />
              </div>
              <div className="truncate">
                <p className="font-semibold text-ink truncate">{contact.name || 'Unbenannter Nutzer'}</p>
                {contact.email && <p className="text-[10px] text-ink-muted truncate">{contact.email}</p>}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Chat-Fenster */}
      <div className="md:col-span-2 flex flex-col justify-between h-full pl-0 md:pl-2">
        {activeContact ? (
          <>
            <div className="pb-3 border-b border-line">
              <h3 className="text-sm font-bold text-ink">{activeContact.name || activeContact.email}</h3>
            </div>

            {/* Nachrichten-Verlauf */}
            <div className="flex-1 overflow-y-auto my-3 space-y-2 pr-2">
              {messages.length === 0 ? (
                <p className="text-center text-xs text-ink-muted mt-10">Noch keine Nachrichten. Schreibe die erste Nachricht!</p>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === currentUserId;
                  return (
                    <div
                    key={msg.id ?? `${msg.created_at}-${msg.sender_id}`}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] px-3.5 py-2 rounded-xl text-xs ${
                          isMe
                            ? 'bg-accent text-primary-foreground font-medium rounded-br-none'
                            : 'bg-surface text-ink-soft border border-line rounded-bl-none'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Eingabeformular */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                placeholder="Nachricht schreiben..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 bg-surface border border-line rounded-xl px-3.5 py-2.5 text-xs text-ink focus:outline-none focus:border-accent"
              />
              <button
                type="submit"
                className="bg-accent hover:bg-accent-strong text-primary-foreground px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Send size={14} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-ink-muted text-xs">
            Wähle einen Kontakt aus, um das Gespräch zu starten.
          </div>
        )}
      </div>
    </div>
  );
}
