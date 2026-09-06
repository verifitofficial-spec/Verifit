'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';

type Contact = {
  id: string;
  name: string;
  email: string;
};

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
};

export default function Chat({ currentUserId }: { currentUserId: string }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // 1. Kontakte laden (Beispiel: Alle anderen User aus der Auth/Trainer-Tabelle)
  useEffect(() => {
    async function fetchContacts() {
      // Hier laden wir je nach Rolle die passenden Gesprächspartner
      const { data, error } = await supabase.from('trainers').select('id, name, email');
      if (data && !error) {
        // Filtere den eigenen Account heraus
        const filtered = data.filter((c) => c.id !== currentUserId);
        setContacts(filtered);
        if (filtered.length > 0) setSelectedContact(filtered[0]);
      }
    }
    fetchContacts();
  }, [currentUserId]);

  // 2. Nachrichten für den ausgewählten Chat laden & Realtime aktivieren
  useEffect(() => {
    if (!selectedContact) return;

    async function fetchMessages() {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${selectedContact?.id}),and(sender_id.eq.${selectedContact?.id},receiver_id.eq.${currentUserId})`
        )
        .order('created_at', { ascending: true });

      if (data && !error) {
        setMessages(data);
      }
    }

    fetchMessages();

    // Supabase Realtime Subscription für neue Nachrichten
    const channel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${currentUserId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.sender_id === selectedContact.id) {
            setMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedContact, currentUserId]);

  // 3. Nachricht senden
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedContact) return;

    const msgPayload = {
      sender_id: currentUserId,
      receiver_id: selectedContact.id,
      content: newMessage,
    };

    const { data, error } = await supabase.from('messages').insert([msgPayload]).select();

    if (data && !error) {
      setMessages((prev) => [...prev, data[0]]);
      setNewMessage('');
    }
  }

  return (
    <div className="flex h-[600px] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Kontaktliste Sidebar */}
      <div className="w-1/3 border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800 font-bold text-sm text-slate-300">
          Gesprächspartner
        </div>
        <div className="overflow-y-auto flex-1 divide-y divide-slate-800/50">
          {contacts.map((contact) => (
            <button
              key={contact.id}
              onClick={() => setSelectedContact(contact)}
              className={`w-full p-4 text-left transition flex flex-col ${
                selectedContact?.id === contact.id ? 'bg-slate-800/80' : 'hover:bg-slate-800/40'
              }`}
            >
              <span className="font-semibold text-sm text-white">{contact.name}</span>
              <span className="text-xs text-slate-400 truncate">{contact.email}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chatfenster */}
      <div className="w-2/3 flex flex-col bg-slate-950/50">
        {selectedContact ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-slate-800 font-semibold text-sm text-emerald-400 bg-slate-900/50">
              Chat mit {selectedContact.name}
            </div>

            {/* Nachrichtenverlauf */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.map((msg) => {
                const isMe = msg.sender_id === currentUserId;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-xs md:max-w-md px-4 py-2.5 rounded-2xl text-sm ${
                        isMe
                          ? 'bg-emerald-500 text-slate-950 font-medium rounded-br-none'
                          : 'bg-slate-800 text-white rounded-bl-none border border-slate-700/50'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Eingabefeld */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 flex gap-2 bg-slate-900/50">
              <input
                type="text"
                placeholder="Schreibe eine Nachricht..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-5 py-2.5 rounded-xl font-bold text-sm transition"
              >
                Senden
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
            Wähle einen Kontakt aus, um zu chatten.
          </div>
        )}
      </div>
    </div>
  );
}