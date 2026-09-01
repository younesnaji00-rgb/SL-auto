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
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PageLoader } from '@/components/ui/page-loader';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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

/** Row-shaped loading placeholder — element-specs §15 (Carbon: skeleton
 *  instead of a spinner; NN/g: mirror the final layout). */
const RowsSkeleton = ({ rows, bubbles }: { rows: number; bubbles?: boolean }) => (
  <div className={cn('space-y-4', !bubbles && 'divide-y divide-hairline space-y-0')} aria-busy="true">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className={cn('flex gap-3', bubbles ? (i % 2 ? 'flex-row-reverse' : '') : 'items-center px-4 py-3')}>
        <Skeleton className={cn('shrink-0 rounded-full', bubbles ? 'h-8 w-8' : 'h-9 w-9')} />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-32" />
          <Skeleton className={cn(bubbles ? 'h-12 w-64 max-w-full rounded-2xl' : 'h-3 w-48')} />
        </div>
      </div>
    ))}
  </div>
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
      {/* Page header — element-specs §1: title + one-line subtitle, no action
          (the primary « Envoyer » lives at the end of the compose bar). */}
      <PageHeader
        title="Signaler un bug"
        subtitle="Décrivez le problème rencontré. Vous pouvez envoyer des messages, joindre des fichiers ou enregistrer un message vocal."
      />
      {/* Content card — element-specs §5: the thread is the page's one glass
          block; the compose bar sits inside it under a hairline. */}
      <Card className="flex flex-col overflow-hidden">
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
        {/* Inbox rows — element-specs §4 (Material 3 lists: leading avatar,
            label, supporting text, trailing text; two-line 56 px rows,
            hairlines only, whole row clickable, selected row on surface-3). */}
        <Card className="overflow-hidden">
          {loading ? (
            <RowsSkeleton rows={5} />
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
                            <span className="t-body truncate font-semibold">{c.recipientNom}</span>
                            <span className="t-caption whitespace-nowrap tabular-nums">
                              {formatDate(c.lastMessageAt)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className={cn('t-caption truncate', c.unreadByAdmin > 0 && 'font-medium text-ink-2')}>{c.lastMessage || 'Message vocal'}</p>
                            {/* Unread count — §11 count pill (surface-3 / ink-2,
                                tabular digits), labelled for assistive tech. */}
                            {c.unreadByAdmin > 0 && (
                              <span
                                className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-surface-3 px-1.5 text-[11px] font-semibold tabular-nums text-ink-2"
                                aria-label={`${c.unreadByAdmin} non lu${c.unreadByAdmin > 1 ? 's' : ''}`}
                              >
                                {c.unreadByAdmin}
                              </span>
                            )}
                          </div>
                          {/* Role chip — §11: neutral for informational categories. */}
                          {c.recipientRole && <Badge variant="neutral" className="mt-1">{c.recipientRole}</Badge>}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Chat area — §5 content card with a 48 px identity row on top. */}
        <Card className="flex flex-col overflow-hidden">
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
                  <p className="t-body truncate font-semibold">{selected?.recipientNom}</p>
                  <p className="t-mono truncate text-xs text-ink-3">{selected?.recipientEmail}</p>
                </div>
                {selected?.recipientRole && <Badge variant="neutral" className="ml-auto">{selected.recipientRole}</Badge>}
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

      {/* Messages — element-specs §4 (Material 3 lists: leading avatar as the
          anchor, headline = author 14/600, supporting = role chip + t-caption
          timestamp, then the body). Own messages are told apart by alignment
          and the surface step, not by the accent (rule 4: teal is for the
          primary action, active nav, links and focus only). */}
      <div className="max-h-[calc((100dvh-340px)/var(--app-zoom))] flex-1 space-y-4 overflow-y-auto p-4">
        {loading ? (
          <RowsSkeleton rows={3} bubbles />
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
                  <AvatarFallback className={cn('text-xs', isOwn ? 'bg-surface-4 text-ink' : 'bg-surface-3 text-ink-2')}>
                    {(msg.auteurNom || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className={cn('max-w-[75%] space-y-1', isOwn && 'flex flex-col items-end')}>
                  <div className={cn('flex flex-wrap items-center gap-2', isOwn && 'flex-row-reverse')}>
                    <span className="t-body font-semibold">{msg.auteurNom}</span>
                    {msg.auteurRole && <Badge variant="neutral">{msg.auteurRole}</Badge>}
                    <span className="t-caption tabular-nums">{formatDate(msg.date)}</span>
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
                      'whitespace-pre-wrap rounded-2xl p-3 text-sm text-ink',
                      isOwn
                        ? 'rounded-tr-none bg-surface-3'
                        : 'rounded-tl-none bg-surface-2'
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

      {/* Compose bar — element-specs §18 (Apple HIG toolbars: leading = the
          quiet tool group as `ghost` icon buttons with tooltips, trailing =
          the ONE primary « Envoyer »); §9: the textarea is a flat solid field.
          The primary stays enabled (GOV.UK: avoid disabled buttons) — an empty
          send is simply a no-op. */}
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-ink-3 hover:text-ink"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSending}
                      aria-label="Joindre un fichier"
                      type="button"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Joindre un fichier</TooltipContent>
                </Tooltip>
                <VoiceRecorder
                  onRecorded={(blob, duration) => setVoiceBlob({ blob, duration })}
                  maxDuration={120}
                  disabled={isSending}
                />
              </div>
              <Button onClick={handleSend} loading={isSending}>
                {isSending ? 'Envoi…' : 'Envoyer'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
