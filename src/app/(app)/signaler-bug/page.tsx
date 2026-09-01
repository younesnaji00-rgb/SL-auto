'use client';

import { PageHeader } from '@/components/layout/page-header';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Bug,
  Paperclip,
  FileIcon,
  Download,
  X,
  Inbox,
  ArrowLeft,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PageLoader } from '@/components/ui/page-loader';
import { EmptyState } from '@/components/ui/empty-state';
import { InlineLoader } from '@/components/ui/inline-loader';
import {
  collection,
  query,
  orderBy,
  addDoc,
  setDoc,
  doc,
  serverTimestamp,
  increment,
  updateDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useFirestore, useAuth, useCollection, useStorage } from '@/firebase';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import VoiceRecorder from '@/components/voice-recorder';
import VoicePlayer from '@/components/voice-player';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type BugMessage = {
  id: string;
  contenu: string;
  auteur: string;
  auteurNom: string;
  auteurRole: string;
  auteurUid: string;
  date: any;
  pieceJointe: {
    nom: string;
    url: string;
    taille: number;
    storagePath: string;
  } | null;
  vocale: {
    url: string;
    duree: number;
    storagePath: string;
  } | null;
  type: 'text' | 'vocal';
};

type Conversation = {
  id: string;
  recipientUid: string;
  recipientNom: string;
  recipientEmail: string;
  recipientRole: string;
  lastMessage: string;
  lastMessageAt: any;
  unreadByAdmin: number;
};

/** Neutral pill for roles; status pairs only where a state is conveyed. */
const Chip = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <span className={cn('inline-flex h-5 max-w-full items-center truncate rounded-full px-2 text-[11px] font-medium', className)}>
    {children}
  </span>
);

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function SignalerBugPage() {
  const { profile, firebaseUser, isAdmin } = useCurrentUser();

  if (!profile || !firebaseUser) {
    return <PageLoader label="Chargement…" />;
  }

  if (isAdmin) {
    return <AdminInbox currentUser={firebaseUser} profile={profile} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Signaler un bug"
        subtitle="Décrivez le problème rencontré. Vous pouvez envoyer des messages, joindre des fichiers ou enregistrer un message vocal."
      />
      {/* The thread is the page's one paper block; the primary « Envoyer »
          lives at the right end of the compose bar (where the eye lands). */}
      <Card variant="tonal" className="flex flex-col overflow-hidden">
        <ChatThread
          conversationUid={firebaseUser.uid}
          currentUser={firebaseUser}
          profile={profile}
        />
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Admin Inbox                                                        */
/* ------------------------------------------------------------------ */

function AdminInbox({ currentUser, profile }: { currentUser: any; profile: any }) {
  const db = useFirestore();
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  const conversationsQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'bugReports'), orderBy('lastMessageAt', 'desc'));
  }, [db]);

  const { data: conversations, loading } = useCollection<Conversation>(conversationsQuery as any);

  const selected = conversations?.find(c => c.id === selectedUid);

  // Mark conversation as read when admin opens it
  useEffect(() => {
    if (!db || !selectedUid || !selected || selected.unreadByAdmin === 0) return;
    updateDoc(doc(db, 'bugReports', selectedUid), { unreadByAdmin: 0 }).catch(() => {});
  }, [db, selectedUid, selected]);

  const formatDate = (ts: any) => {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return format(date, 'd MMM HH:mm', { locale: fr });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Signaler un bug" count={loading ? undefined : (conversations?.length || 0)} subtitle="Conversations des utilisateurs" />

      <div className="grid min-h-[calc((100dvh-200px)/var(--app-zoom))] grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* Conversations list — hairline rows, selected row on surface-3. */}
        <Card variant="tonal" className="overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <InlineLoader label="Chargement…" size="md" />
            </div>
          ) : !conversations || conversations.length === 0 ? (
            <EmptyState
              icon={<Inbox />}
              title="Aucun rapport de bug"
              description="Les conversations apparaîtront ici dès qu'un utilisateur signalera un problème."
              dashed={false}
              className="bg-transparent py-12"
            />
          ) : (
            <ul className="divide-y divide-hairline" aria-label="Conversations">
              {conversations.map((c) => {
                const active = selectedUid === c.id;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedUid(c.id)}
                      aria-current={active ? 'true' : undefined}
                      className={cn(
                        'w-full px-4 py-3 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                        active && 'bg-surface-3 hover:bg-surface-3',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 shrink-0 shadow-rim">
                          <AvatarFallback className="bg-surface-3 text-xs text-ink-2">
                            {(c.recipientNom || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-ink">{c.recipientNom}</span>
                            <span className="t-caption whitespace-nowrap tabular-nums">
                              {formatDate(c.lastMessageAt)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="t-caption truncate">{c.lastMessage || 'Message vocal'}</p>
                            {c.unreadByAdmin > 0 && (
                              <Chip className="min-w-[20px] justify-center bg-status-info-bg tabular-nums text-status-info-fg">
                                {c.unreadByAdmin}
                              </Chip>
                            )}
                          </div>
                          {c.recipientRole && <Chip className="mt-1 bg-surface-3 text-ink-2">{c.recipientRole}</Chip>}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Chat area */}
        <Card variant="tonal" className="flex flex-col overflow-hidden">
          {selectedUid ? (
            <>
              <div className="flex min-h-[48px] items-center gap-3 border-b border-hairline px-4 py-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 lg:hidden"
                  onClick={() => setSelectedUid(null)}
                  aria-label="Retour aux conversations"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Avatar className="h-8 w-8 shadow-rim">
                  <AvatarFallback className="bg-surface-3 text-xs text-ink-2">
                    {(selected?.recipientNom || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{selected?.recipientNom}</p>
                  <p className="t-mono truncate text-xs text-ink-3">{selected?.recipientEmail}</p>
                </div>
                {selected?.recipientRole && <Chip className="ml-auto bg-surface-3 text-ink-2">{selected.recipientRole}</Chip>}
              </div>
              <ChatThread
                conversationUid={selectedUid}
                currentUser={currentUser}
                profile={profile}
              />
            </>
          ) : (
            <EmptyState
              icon={<MessageSquare />}
              title="Sélectionnez une conversation"
              description="Les messages de l'utilisateur s'afficheront ici."
              dashed={false}
              className="flex-1 bg-transparent"
            />
          )}
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Chat Thread                                                        */
/* ------------------------------------------------------------------ */

function ChatThread({
  conversationUid,
  currentUser,
  profile,
}: {
  conversationUid: string;
  currentUser: any;
  profile: any;
}) {
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const auth = useAuth();

  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [voiceBlob, setVoiceBlob] = useState<{ blob: Blob; duration: number } | null>(null);
  const [isSending, setIsSending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messagesQuery = useMemo(() => {
    if (!db) return null;
    return query(
      collection(db, 'bugReports', conversationUid, 'messages'),
      orderBy('date', 'asc')
    );
  }, [db, conversationUid]);

  const { data: messages, loading } = useCollection<BugMessage>(messagesQuery as any);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async () => {
    const hasContent = text.trim() || selectedFile || voiceBlob;
    if (!hasContent || !db || !storage || isSending) return;

    setIsSending(true);
    const userEmail = currentUser.email || 'Unknown';
    const userUid = currentUser.uid;
    const userName = profile?.nom || userEmail;
    const userRole = profile?.role || '';

    try {
      let pieceJointeData = null;
      let vocaleData = null;
      let messageType: 'text' | 'vocal' = 'text';

      // Upload file attachment
      if (selectedFile) {
        const timestamp = Date.now();
        const storagePath = `bugReports/${conversationUid}/fichiers/${timestamp}_${selectedFile.name}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, selectedFile);
        const url = await getDownloadURL(storageRef);
        pieceJointeData = {
          nom: selectedFile.name,
          url,
          taille: selectedFile.size,
          storagePath,
        };
      }

      // Upload voice message
      if (voiceBlob) {
        const timestamp = Date.now();
        const storagePath = `bugReports/${conversationUid}/vocales/${timestamp}.webm`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, voiceBlob.blob);
        const url = await getDownloadURL(storageRef);
        vocaleData = {
          url,
          duree: voiceBlob.duration,
          storagePath,
        };
        messageType = 'vocal';
      }

      // Add message
      await addDoc(collection(db, 'bugReports', conversationUid, 'messages'), {
        contenu: text.trim(),
        auteur: userEmail,
        auteurNom: userName,
        auteurRole: userRole,
        auteurUid: userUid,
        date: serverTimestamp(),
        pieceJointe: pieceJointeData,
        vocale: vocaleData,
        type: messageType,
      });

      // Update conversation metadata
      const isAdminSender = profile?.role === 'Admin';
      const conversationData: Record<string, any> = {
        lastMessage: voiceBlob ? 'Message vocal' : text.trim().slice(0, 100) || (selectedFile ? selectedFile.name : ''),
        lastMessageAt: serverTimestamp(),
      };
      if (!isAdminSender) {
        // Set recipient info + increment unread
        conversationData.recipientUid = conversationUid;
        conversationData.recipientNom = userName;
        conversationData.recipientEmail = userEmail;
        conversationData.recipientRole = userRole;
        conversationData.unreadByAdmin = increment(1);
      }
      await setDoc(doc(db, 'bugReports', conversationUid), conversationData, { merge: true });

      setText('');
      setSelectedFile(null);
      setVoiceBlob(null);
    } catch (error: any) {
      console.error('Bug report send error:', error);
      toast({
        variant: 'destructive',
        title: "Erreur lors de l'envoi",
        description: error.message,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleDownload = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      toast({ variant: 'destructive', title: 'Erreur lors du téléchargement' });
    }
  };

  const formatDate = (ts: any) => {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return format(date, "d MMM yyyy 'à' HH:mm", { locale: fr });
  };

  const currentEmail = currentUser.email || '';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <input
        type="file"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
        disabled={isSending}
      />

      {/* Messages */}
      <div className="max-h-[calc((100dvh-340px)/var(--app-zoom))] flex-1 space-y-4 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <InlineLoader label="Chargement…" size="md" />
          </div>
        ) : !messages || messages.length === 0 ? (
          <EmptyState
            icon={<Bug />}
            title="Aucun message pour le moment"
            description="Décrivez le problème rencontré ci-dessous."
            dashed={false}
            className="bg-transparent py-10"
          />
        ) : (
          messages.map((msg) => {
            const isOwn = msg.auteur === currentEmail;
            return (
              <div key={msg.id} className={cn('flex gap-3', isOwn && 'flex-row-reverse')}>
                <Avatar className="h-8 w-8 shrink-0 shadow-rim">
                  <AvatarFallback className={cn('text-xs', isOwn ? 'bg-accent text-accent-foreground' : 'bg-surface-3 text-ink-2')}>
                    {(msg.auteurNom || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className={cn('max-w-[75%] space-y-1', isOwn && 'flex flex-col items-end')}>
                  <div className={cn('flex flex-wrap items-center gap-2', isOwn && 'flex-row-reverse')}>
                    <span className="text-xs font-semibold text-ink">{msg.auteurNom}</span>
                    {msg.auteurRole && <Chip className="bg-surface-3 text-ink-2">{msg.auteurRole}</Chip>}
                    <span className="t-caption text-[11px] tabular-nums">{formatDate(msg.date)}</span>
                  </div>

                  {/* Voice message */}
                  {msg.vocale && (
                    <div className={cn(isOwn ? 'ml-auto' : '')}>
                      <VoicePlayer url={msg.vocale.url} duree={msg.vocale.duree} />
                    </div>
                  )}

                  {/* Text content */}
                  {msg.contenu && (
                    <div className={cn(
                      'whitespace-pre-wrap rounded-2xl p-3 text-sm',
                      isOwn
                        ? 'rounded-tr-none bg-accent text-accent-foreground'
                        : 'rounded-tl-none bg-surface-2 text-ink'
                    )}>
                      {msg.contenu}
                    </div>
                  )}

                  {/* File attachment */}
                  {msg.pieceJointe && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-2 rounded-full text-[11px]"
                      onClick={() => handleDownload(msg.pieceJointe!.url, msg.pieceJointe!.nom)}
                    >
                      <FileIcon className="h-3 w-3 text-ink-3" />
                      <span className="max-w-[120px] truncate">{msg.pieceJointe.nom}</span>
                      <Download className="h-3 w-3 text-ink-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Compose area — inputs are solid inside the paper (nested-solid rule). */}
      <div className="space-y-3 border-t border-hairline p-4">
        {selectedFile && (
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex h-7 max-w-[240px] items-center gap-1 rounded-full bg-surface-2 pl-3 pr-1 text-xs text-ink-2 shadow-rim">
              <span className="truncate">{selectedFile.name}</span>
              <button
                type="button"
                className="rounded-full p-0.5 text-ink-3 hover:bg-surface-4 hover:text-ink"
                onClick={() => setSelectedFile(null)}
                aria-label="Retirer la pièce jointe"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          </div>
        )}

        {voiceBlob ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-ink-2">
              <span>Message vocal prêt ({voiceBlob.duration}s)</span>
              <Button variant="ghost" size="sm" onClick={() => setVoiceBlob(null)}>
                Annuler
              </Button>
            </div>
            <Button onClick={handleSend} loading={isSending}>
              {isSending ? 'Envoi…' : 'Envoyer'}
            </Button>
          </div>
        ) : (
          <>
            <Textarea
              placeholder="Décrivez le problème…"
              className="min-h-[80px] resize-none"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isSending}
              aria-label="Votre message"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-ink-3 hover:text-ink"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSending}
                  title="Joindre un fichier"
                  aria-label="Joindre un fichier"
                  type="button"
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
                <VoiceRecorder
                  onRecorded={(blob, duration) => setVoiceBlob({ blob, duration })}
                  maxDuration={120}
                  disabled={isSending}
                />
              </div>
              <Button
                onClick={handleSend}
                loading={isSending}
                disabled={!text.trim() && !selectedFile}
                className="px-6"
              >
                {isSending ? 'Envoi…' : 'Envoyer'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
