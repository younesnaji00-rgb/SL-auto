'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  Paperclip,
  Send,
  Trash2,
  FileIcon,
  Loader2,
  Download,
  Pencil,
  X,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  collection,
  query,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  where,
  getDocs,
} from 'firebase/firestore';
import {
  ref,
  deleteObject
} from 'firebase/storage';
import { uploadFileWithOfflineSupport } from '@/lib/offline/upload-file';
import { useFirestore, useAuth, useCollection, useStorage } from '@/firebase';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { logHistorique } from './log-historique';

type PieceJointe = {
  nom: string;
  url: string;
  taille: number;
  storagePath: string;
};

type Comment = {
  id: string;
  contenu: string;
  auteur: string;
  auteurNom?: string;
  auteurRole?: string;
  date: any;
  pieceJointe: PieceJointe | null;
  // Support for legacy data fields
  text?: string;
  authorName?: string;
  createdAt?: any;
  attachments?: any[];
  editedAt?: any;
};

type CommentairesTabProps = {
  dossierId: string;
};

export default function CommentairesTab({ dossierId }: CommentairesTabProps) {
  const db = useFirestore();
  const auth = useAuth();
  const storage = useStorage();
  const { canDelete } = useCurrentUser();
  const { toast } = useToast();
  
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const [commentText, setCommentText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // We fetch all comments and sort them client-side to ensure all records (legacy and new) are shown
  const commentsQuery = useMemo(() => {
    if (!db) return null;
    return collection(db, 'dossiers', dossierId, 'commentaires');
  }, [db, dossierId]);

  const { data: rawComments, loading } = useCollection<Comment>(commentsQuery as any);

  const comments = useMemo(() => {
    if (!rawComments) return [];
    return [...rawComments].sort((a, b) => {
      const dateA = (a.date || a.createdAt)?.toDate ? (a.date || a.createdAt).toDate().getTime() : 0;
      const dateB = (b.date || b.createdAt)?.toDate ? (b.date || b.createdAt).toDate().getTime() : 0;
      return dateB - dateA;
    });
  }, [rawComments]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if ((!commentText.trim() && !selectedFile) || !db || !storage) return;
    const userEmail = auth?.currentUser?.email || 'Admin';
    setIsSubmitting(true);

    try {
      let pieceJointeData = null;

      if (selectedFile) {
        const timestamp = Date.now();
        const storagePath = `dossiers/${dossierId}/commentaires/${timestamp}_${selectedFile.name}`;

        const result = await uploadFileWithOfflineSupport({
          storage,
          db,
          file: selectedFile,
          fileName: selectedFile.name,
          storagePath,
          // We use the commentaires collection but the helper creates a placeholder doc.
          // For comments, we handle attachment inline, so we pass a dummy path and handle below.
          firestoreDocPath: `dossiers/${dossierId}/_pending_attachments`,
          firestoreMetadata: {
            nom: selectedFile.name,
            taille: selectedFile.size,
            storagePath,
          },
        });

        if (result.queued) {
          pieceJointeData = {
            nom: selectedFile.name,
            url: null,
            taille: selectedFile.size,
            storagePath,
            pendingUpload: true,
          };
        } else {
          pieceJointeData = {
            nom: selectedFile.name,
            url: result.url,
            taille: selectedFile.size,
            storagePath,
          };
        }
      }

      // Look up user name and role from the users collection
      let auteurNom = userEmail;
      let auteurRole = '';
      try {
        const usersSnap = await getDocs(query(collection(db, 'users'), where('email', '==', userEmail)));
        if (!usersSnap.empty) {
          const userData = usersSnap.docs[0].data();
          auteurNom = userData.nom || userEmail;
          auteurRole = userData.role || '';
        }
      } catch (e) {
        console.warn('Could not fetch user details for comment:', e);
      }

      await addDoc(collection(db, 'dossiers', dossierId, 'commentaires'), {
        contenu: commentText,
        auteur: userEmail,
        auteurNom,
        auteurRole,
        date: serverTimestamp(),
        pieceJointe: pieceJointeData,
        _localCreatedAt: Date.now(),
      });

      await logHistorique(db, dossierId, 'Commentaire ajouté', userEmail, 'Un nouveau commentaire a été posté.', 'commentaire', auteurNom);

      setCommentText('');
      setSelectedFile(null);
      toast({ title: 'Commentaire ajouté' });
    } catch (error: any) {
      console.error('Comment send error:', error);
      toast({ 
        variant: 'destructive', 
        title: "Erreur lors de l'envoi",
        description: error.message
      });
    } finally {
      setIsSubmitting(false);
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
    } catch (e) {
      console.error('Download error:', e);
      toast({ variant: 'destructive', title: "Erreur lors du téléchargement" });
    }
  };

  const handleStartEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditText(comment.contenu || comment.text || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editText.trim() || !db) return;
    setIsSavingEdit(true);

    try {
      const commentRef = doc(db, 'dossiers', dossierId, 'commentaires', commentId);
      await updateDoc(commentRef, {
        contenu: editText,
        text: editText, // Maintain legacy field support
        editedAt: serverTimestamp()
      });
      setEditingId(null);
      toast({ title: 'Commentaire modifié' });
    } catch (error) {
      console.error('Comment edit error:', error);
      toast({ variant: 'destructive', title: 'Erreur lors de la modification' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteComment = async (commentId: string, storagePath?: string) => {
    if (!db || !storage) return;
    const userEmail = auth?.currentUser?.email || 'Admin';
    setDeletingId(commentId);

    try {
      if (storagePath) {
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef).catch(err => console.warn('Storage file already missing or error:', err));
      }

      await deleteDoc(doc(db, 'dossiers', dossierId, 'commentaires', commentId));
      toast({ title: 'Commentaire supprimé' });
    } catch (error) {
      console.error('Comment delete error:', error);
      toast({ variant: 'destructive', title: 'Erreur lors de la suppression' });
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (ts: any) => {
    if (!ts) return '-';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return format(date, "d MMM yyyy 'à' HH:mm", { locale: fr });
  };

  const currentUserEmail = auth?.currentUser?.email || 'Inconnu';

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <input 
        type="file" 
        className="hidden" 
        ref={attachmentInputRef}
        onChange={handleFileChange}
        disabled={isSubmitting}
      />

      <Card className="shadow-sm border-primary/10">
        <CardContent className="p-4 space-y-4">
          <Textarea 
            placeholder="Écrire un commentaire..." 
            className="min-h-[100px] resize-none focus-visible:ring-primary"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            disabled={isSubmitting}
          />
          
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

          <div className="flex items-center justify-between border-t pt-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:text-primary"
              onClick={() => attachmentInputRef.current?.click()}
              disabled={isSubmitting}
              title="Attacher un fichier"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <Button 
              onClick={handleSend} 
              disabled={isSubmitting || (!commentText.trim() && !selectedFile)}
              className="px-6"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Envoyer
                  <Send className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : comments.length === 0 ? (
          <EmptyState
            icon={<MessageSquare />}
            title="Aucun commentaire pour le moment"
            description="Ajoutez votre premier commentaire avec le formulaire ci-dessus."
          />
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-4 group">
              <Avatar className="h-10 w-10 shrink-0 border">
                <AvatarFallback className="bg-primary/5 text-primary">
                  {(comment.auteurNom || comment.auteur || comment.authorName || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{comment.auteurNom || comment.auteur || comment.authorName}</span>
                      {comment.auteurRole && (
                        <Badge variant="outline" className="text-[11px] px-1.5 py-0 font-medium">{comment.auteurRole}</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{formatDate(comment.date || comment.createdAt)}</span>
                    </div>
                    {comment.auteurNom && comment.auteur && comment.auteurNom !== comment.auteur && (
                      <div className="text-[11px] text-muted-foreground">{comment.auteur}</div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {(comment.auteur === currentUserEmail || comment.authorName === currentUserEmail) && editingId !== comment.id && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => handleStartEdit(comment)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {(comment.auteur === currentUserEmail || comment.authorName === currentUserEmail || canDelete) && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteComment(comment.id, comment.pieceJointe?.storagePath || comment.attachments?.[0]?.storagePath)}
                        disabled={deletingId === comment.id}
                      >
                        {deletingId === comment.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                
                {editingId === comment.id ? (
                  <div className="space-y-2">
                    <Textarea 
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="min-h-[80px] bg-background"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={handleCancelEdit} disabled={isSavingEdit}>
                        Annuler
                      </Button>
                      <Button size="sm" onClick={() => handleSaveEdit(comment.id)} disabled={isSavingEdit}>
                        {isSavingEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Sauvegarder'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-accent/30 rounded-2xl rounded-tl-none p-4 text-sm text-foreground/90 whitespace-pre-wrap relative">
                    {comment.contenu || comment.text}
                    {comment.editedAt && (
                      <div className="mt-2 text-[11px] text-muted-foreground italic">
                        Modifié le {formatDate(comment.editedAt)}
                      </div>
                    )}
                  </div>
                )}

                {(comment.pieceJointe || (comment.attachments && comment.attachments.length > 0)) && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {comment.pieceJointe ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-[11px] gap-2 rounded-full border-primary/20 hover:bg-primary/5"
                        onClick={() => handleDownload(comment.pieceJointe!.url, comment.pieceJointe!.nom)}
                      >
                        <FileIcon className="h-3 w-3 text-primary" />
                        <span className="max-w-[120px] truncate">{comment.pieceJointe.nom}</span>
                        <Download className="h-3 w-3 opacity-50" />
                      </Button>
                    ) : (
                      comment.attachments?.map((file: any, i: number) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          className="h-8 text-[11px] gap-2 rounded-full border-primary/20 hover:bg-primary/5"
                          onClick={() => handleDownload(file.downloadURL, file.fileName)}
                        >
                          <FileIcon className="h-3 w-3 text-primary" />
                          <span className="max-w-[120px] truncate">{file.fileName}</span>
                          <Download className="h-3 w-3 opacity-50" />
                        </Button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
