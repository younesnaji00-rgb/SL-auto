'use client';

import { PageHeader } from '@/components/layout/page-header';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Bug,
  Paperclip,
  Send,
  Loader2,
  FileIcon,
  Download,
  X,
  Inbox,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PageLoader } from '@/components/ui/page-loader';
import { EmptyState } from '@/components/ui/empty-state';
import { InlineLoader } from '@/components/ui/inline-loader';
import { Badge } from '@/components/ui/badge';
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
    <div className="space-y-4">
      <PageHeader
        title="Signaler un bug"
        icon={<Bug />}
        subtitle="Décrivez le problème rencontré. Vous pouvez envoyer des messages, joindre des fichiers ou enregistrer un message vocal."
      />
      <ChatThread
        conversationUid={firebaseUser.uid}
        currentUser={firebaseUser}
        profile={profile}
      />
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
    <div className="space-y-4">
      <PageHeader title="Signaler un bug" icon={<Bug />} count={conversations?.length || 0} subtitle="Conversations des utilisateurs" />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 min-h-[calc(100dvh-200px)]">
        {/* Conversations list */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
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
                className="border-0 bg-transparent py-12"
              />
            ) : (
              <div className="divide-y">
                {conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedUid(c.id)}
                    className={cn(
                      'w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors',
                      selectedUid === c.id && 'bg-primary/5'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 shrink-0 border">
                        <AvatarFallback className="bg-primary/5 text-primary text-xs">
                          {(c.recipientNom || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold truncate">{c.recipientNom}</span>
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                            {formatDate(c.lastMessageAt)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-muted-foreground truncate">{c.lastMessage || 'Message vocal'}</p>
                          {c.unreadByAdmin > 0 && (
                            <Badge className="h-5 min-w-[20px] justify-center text-[11px] bg-primary">
                              {c.unreadByAdmin}
                            </Badge>
                          )}
                        </div>
                        <Badge variant="outline" className="text-[11px] px-1 py-0 mt-1">{c.recipientRole}</Badge>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat area */}
        <Card className="overflow-hidden flex flex-col">
          {selectedUid ? (
            <>
              <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden h-8 w-8"
                  onClick={() => setSelectedUid(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Avatar className="h-8 w-8 border">
                  <AvatarFallback className="bg-primary/5 text-primary text-xs">
                    {(selected?.recipientNom || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold">{selected?.recipientNom}</p>
                  <p className="text-[11px] text-muted-foreground">{selected?.recipientEmail}</p>
                </div>
              </div>
              <ChatThread
                conversationUid={selectedUid}
                currentUser={currentUser}
                profile={profile}
              />
            </>
          ) : (
            <CardContent className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <Bug className="h-12 w-12 mb-3 opacity-10" />
              <p className="text-sm">Sélectionnez une conversation</p>
            </CardContent>
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
    <div className="flex flex-col flex-1 min-h-0">
      <input
        type="file"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
        disabled={isSending}
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[calc(100dvh-340px)]">
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
            className="border-0 bg-transparent py-10"
          />
        ) : (
          messages.map((msg) => {
            const isOwn = msg.auteur === currentEmail;
            return (
              <div key={msg.id} className={cn('flex gap-3', isOwn && 'flex-row-reverse')}>
                <Avatar className="h-8 w-8 shrink-0 border">
                  <AvatarFallback className={cn('text-xs', isOwn ? 'bg-primary/10 text-primary' : 'bg-muted')}>
                    {(msg.auteurNom || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className={cn('max-w-[75%] space-y-1', isOwn && 'items-end')}>
                  <div className={cn('flex items-center gap-2 flex-wrap', isOwn && 'flex-row-reverse')}>
                    <span className="text-xs font-semibold">{msg.auteurNom}</span>
                    {msg.auteurRole && (
                      <Badge variant="outline" className="text-[11px] px-1 py-0">{msg.auteurRole}</Badge>
                    )}
                    <span className="text-[11px] text-muted-foreground">{formatDate(msg.date)}</span>
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
                      'rounded-2xl p-3 text-sm whitespace-pre-wrap',
                      isOwn
                        ? 'bg-primary text-primary-foreground rounded-tr-none'
                        : 'bg-accent/50 rounded-tl-none'
                    )}>
                      {msg.contenu}
                    </div>
                  )}

                  {/* File attachment */}
                  {msg.pieceJointe && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-[11px] gap-2 rounded-full border-primary/20 hover:bg-primary/5"
                      onClick={() => handleDownload(msg.pieceJointe!.url, msg.pieceJointe!.nom)}
                    >
                      <FileIcon className="h-3 w-3 text-primary" />
                      <span className="max-w-[120px] truncate">{msg.pieceJointe.nom}</span>
                      <Download className="h-3 w-3 opacity-50" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Compose area */}
      <div className="border-t p-4 space-y-3">
        {selectedFile && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1 pr-1">
              <span className="truncate max-w-[150px]">{selectedFile.name}</span>
              <button
                type="button"
                className="h-4 w-4 rounded-full hover:bg-muted"
                onClick={() => setSelectedFile(null)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          </div>
        )}

        {voiceBlob ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Message vocal prêt ({voiceBlob.duration}s)</span>
              <Button variant="ghost" size="sm" onClick={() => setVoiceBlob(null)}>
                <X className="h-3 w-3 mr-1" /> Annuler
              </Button>
            </div>
            <Button onClick={handleSend} loading={isSending} size="sm">
              {isSending ? 'Envoi...' : <><Send className="h-4 w-4 mr-2" /> Envoyer</>}
            </Button>
          </div>
        ) : (
          <>
            <Textarea
              placeholder="Décrivez le problème..."
              className="min-h-[80px] resize-none"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isSending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-primary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSending}
                  title="Joindre un fichier"
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
                {isSending ? 'Envoi...' : <>Envoyer<Send className="ml-2 h-4 w-4" /></>}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
