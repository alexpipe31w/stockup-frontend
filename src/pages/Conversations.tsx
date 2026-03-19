import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  getConversations, getMessages, sendMessage,
  takeoverConversation, releaseConversation, closeConversation,
} from '../services/api';
import api from '../services/api';

// ── Icons ─────────────────────────────────────────────────────────────────────
const SearchIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>);
const TrashIcon  = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>);
const SendIcon   = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>);
const BotIcon    = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 010 2h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 010-2h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2z"/></svg>);
const UserIcon   = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>);
const CloseIcon  = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>);
const FilterIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>);
const BackIcon   = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>);
const ChevronDownIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>);

// ── Types ─────────────────────────────────────────────────────────────────────
type FilterKey = 'all' | 'active' | 'pending_human' | 'human' | 'closed';

const STATUS_TABS: { key: FilterKey; label: string }[] = [
  { key: 'all',           label: 'Todas'      },
  { key: 'active',        label: 'IA activa'  },
  { key: 'pending_human', label: 'Pendientes' },
  { key: 'human',         label: 'En vivo'    },
  { key: 'closed',        label: 'Cerradas'   },
];

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  active:        { label: 'IA activa',     cls: 'bg-green-100 text-green-700'   },
  pending_human: { label: 'Espera humano', cls: 'bg-orange-100 text-orange-700' },
  human:         { label: 'Con asesor',    cls: 'bg-blue-100 text-blue-700'     },
  closed:        { label: 'Cerrada',       cls: 'bg-slate-100 text-slate-500'   },
};

const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

const fmtDate = (d: string) => {
  const date  = new Date(d);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return fmtTime(d);
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
};

// ── Umbral para considerar que el usuario está "al fondo" del chat
const SCROLL_THRESHOLD = 80; // px desde el fondo

// ── Component ─────────────────────────────────────────────────────────────────
export default function Conversations() {
  const { storeId } = useAuth();

  const [conversations, setConversations] = useState<any[]>([]);
  const [selected,      setSelected]      = useState<any>(null);
  const [messages,      setMessages]      = useState<any[]>([]);
  const [text,          setText]          = useState('');
  const [sending,       setSending]       = useState(false);

  const [filter,      setFilter]      = useState<FilterKey>('all');
  const [search,      setSearch]      = useState('');
  const [dateFrom,    setDateFrom]    = useState('');
  const [dateTo,      setDateTo]      = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting,     setDeleting]     = useState(false);

  // ── Refs para scroll inteligente ──────────────────────────────────────────
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef            = useRef<HTMLDivElement>(null);
  const pollRef              = useRef<NodeJS.Timeout | null>(null);

  const isAtBottomRef   = useRef(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const prevMsgCountRef = useRef(0);

  // ── Detectar posición del scroll ──────────────────────────────────────────
  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isAtBottomRef.current = distFromBottom < SCROLL_THRESHOLD;
    setShowScrollBtn(!isAtBottomRef.current && prevMsgCountRef.current < messages.length);
  }, [messages.length]);

  // ── Scroll al fondo ────────────────────────────────────────────────────────
  // FIX: 'instant' no existe en los DOM types de react-scripts.
  // Usamos 'auto' (sin animación) como equivalente compatible.
  const scrollToBottom = useCallback((behavior: 'smooth' | 'auto' = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior });
    setShowScrollBtn(false);
    isAtBottomRef.current = true;
  }, []);

  // ── Load conversaciones ────────────────────────────────────────────────────
  const loadConversations = useCallback(() => {
    getConversations(storeId).then(res => setConversations(res.data));
  }, [storeId]);

  useEffect(() => {
    loadConversations();
    pollRef.current = setInterval(loadConversations, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadConversations]);

  // ── Load mensajes — scroll inteligente ────────────────────────────────────
  useEffect(() => {
    if (!selected) return;
    prevMsgCountRef.current = 0;
    isAtBottomRef.current   = true;
    setShowScrollBtn(false);

    const load = () =>
      getMessages(selected.conversationId).then(res => {
        const newMsgs: any[] = res.data;
        setMessages(prev => {
          const hadNew = newMsgs.length > prev.length;
          if (hadNew) {
            prevMsgCountRef.current = newMsgs.length;
            if (isAtBottomRef.current) {
              setTimeout(() => scrollToBottom('smooth'), 50);
            } else {
              setShowScrollBtn(true);
            }
          }
          return newMsgs;
        });
      });

    // Primera carga: ir al fondo sin animación ('auto' = sin transición)
    getMessages(selected.conversationId).then(res => {
      setMessages(res.data);
      prevMsgCountRef.current = res.data.length;
      setTimeout(() => scrollToBottom('auto'), 50);
    });

    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [selected?.conversationId]); // eslint-disable-line

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!text.trim() || !selected) return;
    setSending(true);
    try {
      await sendMessage({
        conversationId: selected.conversationId,
        content:        text.trim(),
        sender:         'store',
        isAiResponse:   false,
      });
      setText('');
      getMessages(selected.conversationId).then(res => {
        setMessages(res.data);
        prevMsgCountRef.current = res.data.length;
        setTimeout(() => scrollToBottom('smooth'), 50);
      });
    } catch (err: any) {
      console.error('Error enviando:', err.response?.data);
    } finally {
      setSending(false);
    }
  };

  const handleTakeover = async () => {
    await takeoverConversation(selected.conversationId);
    setSelected((s: any) => ({ ...s, status: 'human' }));
    loadConversations();
  };

  const handleRelease = async () => {
    await releaseConversation(selected.conversationId);
    setSelected((s: any) => ({ ...s, status: 'active' }));
    loadConversations();
  };

  const handleClose = async () => {
    await closeConversation(selected.conversationId);
    setSelected((s: any) => ({ ...s, status: 'closed' }));
    loadConversations();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/conversations/${deleteTarget.conversationId}`);
      setConversations(prev => prev.filter(c => c.conversationId !== deleteTarget.conversationId));
      if (selected?.conversationId === deleteTarget.conversationId) setSelected(null);
    } catch (err) {
      console.error('Error eliminando:', err);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = conversations.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (search) {
      const q     = search.toLowerCase();
      const name  = (c.customer?.name  ?? '').toLowerCase();
      const phone = (c.customer?.phone ?? '').toLowerCase();
      if (!name.includes(q) && !phone.includes(q)) return false;
    }
    if (dateFrom && new Date(c.createdAt) < new Date(dateFrom)) return false;
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59);
      if (new Date(c.createdAt) > to) return false;
    }
    return true;
  });

  const activeFilterCount = [search, dateFrom, dateTo].filter(Boolean).length;

  const statusBadge = (status: string) => {
    const s = STATUS_BADGE[status] ?? { label: status, cls: 'bg-slate-100 text-slate-500' };
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span>;
  };

  const countFor = (k: FilterKey) =>
    k === 'all' ? conversations.length : conversations.filter(c => c.status === k).length;

  const showSidebar = !selected;
  const showChat    = !!selected;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <div className={`
        ${showSidebar ? 'flex' : 'hidden'} md:flex
        w-full md:w-80 lg:w-96
        bg-white border-r border-slate-100
        flex-col flex-shrink-0 overflow-hidden
      `}>
        <div className="px-4 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-800 text-lg">Conversaciones</h2>
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition ${
                showFilters ? 'text-white' : 'text-slate-400 hover:bg-slate-100'
              }`}
              style={showFilters ? { background: 'linear-gradient(135deg,#2563eb,#9333ea)' } : {}}
            >
              <FilterIcon />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          <div className="relative mb-3">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><SearchIcon /></span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar cliente o teléfono..."
              className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {showFilters && (
            <div className="space-y-2 mb-3 bg-slate-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Rango de fecha</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Desde</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Hasta</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                </div>
              </div>
              {(dateFrom || dateTo || search) && (
                <button onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); }}
                  className="text-xs text-red-500 hover:underline">
                  Limpiar filtros
                </button>
              )}
            </div>
          )}

          <div className="flex gap-1 flex-wrap">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition flex items-center gap-1 ${
                  filter === tab.key ? 'text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
                style={filter === tab.key ? { background: 'linear-gradient(135deg,#2563eb,#9333ea)' } : {}}
              >
                {tab.label}
                <span className={`text-[10px] px-1 rounded-full ${filter === tab.key ? 'bg-white/20' : 'bg-slate-200 text-slate-400'}`}>
                  {countFor(tab.key)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {filtered.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-12">Sin conversaciones</p>
          ) : filtered.map(conv => (
            <div
              key={conv.conversationId}
              className={`flex items-start gap-3 px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition cursor-pointer group ${
                selected?.conversationId === conv.conversationId ? 'bg-blue-50' : ''
              }`}
              onClick={() => setSelected(conv)}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 mt-0.5"
                style={{ background: 'linear-gradient(135deg,#2563eb,#9333ea)' }}
              >
                {conv.customer?.name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className="font-medium text-slate-800 text-sm truncate">
                    {conv.customer?.name ?? conv.customer?.phone}
                  </p>
                  <p className="text-[10px] text-slate-400 flex-shrink-0">{fmtDate(conv.createdAt)}</p>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  {statusBadge(conv.status)}
                  {conv.status === 'closed' && (
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteTarget(conv); }}
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 transition"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Panel chat ───────────────────────────────────────────────────── */}
      {selected ? (
        <div className={`
          ${showChat ? 'flex' : 'hidden'} md:flex
          flex-1 flex-col min-w-0 overflow-hidden
        `}>
          {/* Header */}
          <div className="bg-white border-b border-slate-100 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between shadow-sm flex-shrink-0">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <button
                className="md:hidden flex-shrink-0 w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-lg transition"
                onClick={() => setSelected(null)}
              >
                <BackIcon />
              </button>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#2563eb,#9333ea)' }}
              >
                {selected.customer?.name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 truncate">{selected.customer?.name ?? selected.customer?.phone}</p>
                <p className="text-xs text-slate-400 truncate">{selected.customer?.phone}</p>
              </div>
              <div className="ml-1 flex-shrink-0">{statusBadge(selected.status)}</div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {(selected.status === 'active' || selected.status === 'pending_human') && (
                <button onClick={handleTakeover}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs md:text-sm font-medium text-white"
                  style={{ background: 'linear-gradient(135deg,#2563eb,#9333ea)' }}>
                  <UserIcon />
                  <span className="hidden sm:inline">trol</span>
                </button>
              )}
              {selected.status === 'human' && (
                <button onClick={handleRelease}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs md:text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 transition">
                  <BotIcon />
                  <span className="hidden sm:inline">Devolver a IA</span>
                </button>
              )}
              {selected.status !== 'closed' && (
                <button onClick={handleClose}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs md:text-sm font-medium bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-600 transition">
                  <CloseIcon />
                  <span className="hidden sm:inline">Cerrar</span>
                </button>
              )}
              {selected.status === 'closed' && (
                <button onClick={() => setDeleteTarget(selected)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs md:text-sm font-medium bg-red-50 text-red-500 hover:bg-red-100 transition">
                  <TrashIcon />
                  <span className="hidden sm:inline">Eliminar</span>
                </button>
              )}
            </div>
          </div>

          {/* ── Área de mensajes ──────────────────────────────────────────── */}
          <div className="relative flex-1 min-h-0">
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="h-full overflow-y-auto overscroll-contain px-4 md:px-6 py-4 space-y-3 bg-slate-50"
            >
              {messages.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-12">Sin mensajes aún</p>
              ) : messages.map((msg: any) => {
                const isClient = msg.sender === 'customer';
                return (
                  <div key={msg.messageId} className={`flex ${isClient ? 'justify-start' : 'justify-end'}`}>
                    <div
                      className={`max-w-[75%] sm:max-w-sm md:max-w-md lg:max-w-lg px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                        isClient
                          ? 'bg-white text-slate-800 border border-slate-100 rounded-tl-sm'
                          : msg.isAiResponse
                            ? 'text-white rounded-tr-sm'
                            : 'bg-blue-600 text-white rounded-tr-sm'
                      }`}
                      style={!isClient && msg.isAiResponse ? { background: 'linear-gradient(135deg,#2563eb,#9333ea)' } : {}}
                    >
                      {!isClient && (
                        <p className="text-xs opacity-70 mb-1">{msg.isAiResponse ? 'IA' : 'Tú'}</p>
                      )}
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      <p className={`text-xs mt-1 ${isClient ? 'text-slate-400' : 'opacity-60'}`}>
                        {fmtTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Botón flotante "↓ Nuevos mensajes" */}
            {showScrollBtn && (
              <button
                onClick={() => scrollToBottom('smooth')}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white shadow-lg transition-all animate-bounce"
                style={{ background: 'linear-gradient(135deg,#2563eb,#9333ea)' }}
              >
                <ChevronDownIcon />
                Nuevos mensajes
              </button>
            )}
          </div>

          {/* Input */}
          <div className="flex-shrink-0">
            {selected.status === 'human' ? (
              <div className="bg-white border-t border-slate-100 px-4 md:px-6 py-3 md:py-4">
                <div className="flex items-end gap-2 md:gap-3">
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Escribe un mensaje..."
                    rows={2}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none text-sm"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !text.trim()}
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#2563eb,#9333ea)' }}
                  >
                    {sending
                      ? <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                      : <SendIcon />}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2">Enter para enviar · Shift+Enter nueva línea</p>
              </div>
            ) : selected.status === 'closed' ? (
              <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 text-center text-sm text-slate-400">
                Conversación cerrada
              </div>
            ) : (
              <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 text-center text-sm text-slate-500">
                La IA está manejando esta conversación —{' '}
                <button
                  onClick={handleTakeover}
                  className="font-semibold text-blue-600 hover:underline"
                >
                  tomar el control
                </button>{' '}
                para intervenir directamente
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center flex-col gap-3 text-slate-400 bg-slate-50">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          <p className="text-sm">Selecciona una conversación para ver el chat</p>
        </div>
      )}

      {/* ── Modal confirmar eliminar ───────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-slate-800 mb-2">¿Eliminar conversación?</h3>
            <p className="text-sm text-slate-500 mb-1">
              Se eliminarán todos los mensajes de la conversación con{' '}
              <span className="font-semibold">{deleteTarget.customer?.name ?? deleteTarget.customer?.phone}</span>.
            </p>
            <p className="text-xs text-green-700 bg-green-50 rounded-xl px-3 py-2 mb-5">
              ✓ El cliente y su historial de pedidos no serán afectados.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-50">
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
