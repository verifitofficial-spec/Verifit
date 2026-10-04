'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { Send, User as UserIcon } from 'lucide-react';

interface ChatProps {
  currentUserId: string;
}

export default function Chat({ currentUserId }: ChatProps) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [activeContact, setActiveContact] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(true);

  useEffect(() => {
    async function loadContacts() {
      setLoadingContacts(true);

      const [{ data: bookingRows }, { data: messageRows }] = await Promise.all([
        supabase
          .from('bookings')
          .select('client_id, trainer_id')
          .or(`client_id.eq.${currentUserId},trainer_id.eq.${currentUserId}`),
        supabase
          .from('messages')
          .select('sender_id, receiver_id')
          .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`),
      ]);
      const contactIds = new Set<string>();
      for (const booking of bookingRows ?? []) {
        contactIds.add(booking.client_id === currentUserId ? booking.trainer_id : booking.client_id);
      }
      for (const message of messageRows ?? []) {
        contactIds.add(message.sender_id === currentUserId ? message.receiver_id : message.sender_id);
      }

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
        if (clientsData) setContacts(clientsData.filter((client) => contactIds.has(client.id)));
      } else {
        // Nutzer ist Kunde -> Lade Trainer
        const { data: trainersData } = await supabase
          .from('trainers')
          .select('id, name, email');
        if (trainersData) setContacts(trainersData.filter((trainer) => contactIds.has(trainer.id)));
      }

      setLoadingContacts(false);
    }

    if (currentUserId) {
      loadContacts();
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!activeContact || !currentUserId) return;

    async function loadMessages() {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${activeContact.id}),and(sender_id.eq.${activeContact.id},receiver_id.eq.${currentUserId})`
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
          const msg = payload.new;
          if (
            (msg.sender_id === currentUserId && msg.receiver_id === activeContact.id) ||
            (msg.sender_id === activeContact.id && msg.receiver_id === currentUserId)
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/80 rounded-2xl border border-slate-800 p-4 h-[500px]">
      {/* Kontakte-Liste */}
      <div className="border-r border-slate-800/80 pr-4 space-y-3 overflow-y-auto">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Kontakte</h3>
        {loadingContacts ? (
          <p className="text-xs text-slate-500">Lade Kontakte...</p>
        ) : contacts.length === 0 ? (
          <p className="text-xs text-slate-500">Keine Kontakte gefunden.</p>
        ) : (
          contacts.map((contact) => (
            <button
              key={contact.id}
              onClick={() => setActiveContact(contact)}
              className={`w-full text-left p-3 rounded-xl text-xs transition flex items-center gap-3 border ${
                activeContact?.id === contact.id
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="p-2 bg-slate-800 rounded-full text-slate-400">
                <UserIcon size={14} />
              </div>
              <div className="truncate">
                <p className="font-semibold text-white truncate">{contact.name || 'Unbenannter Nutzer'}</p>
                <p className="text-[10px] text-slate-500 truncate">{contact.email}</p>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Chat-Fenster */}
      <div className="md:col-span-2 flex flex-col justify-between h-full pl-0 md:pl-2">
        {activeContact ? (
          <>
            <div className="pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">{activeContact.name || activeContact.email}</h3>
            </div>

            {/* Nachrichten-Verlauf */}
            <div className="flex-1 overflow-y-auto my-3 space-y-2 pr-2">
              {messages.length === 0 ? (
                <p className="text-center text-xs text-slate-500 mt-10">Noch keine Nachrichten. Schreibe die erste Nachricht!</p>
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
                            ? 'bg-emerald-500 text-slate-950 font-medium rounded-br-none'
                            : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-bl-none'
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
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Send size={14} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">
            Wähle einen Kontakt aus, um das Gespräch zu starten.
          </div>
        )}
      </div>
    </div>
  );
}
