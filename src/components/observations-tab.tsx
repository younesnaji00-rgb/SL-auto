'use client';

import React, { useState, useMemo } from 'react';
import { Send, Loader2, Eye, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { collection, addDoc, serverTimestamp, orderBy, query } from 'firebase/firestore';
import { useFirestore, useAuth, useCollection } from '@/firebase';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { addObservation } from '@/app/(app)/dossiers/[id]/log-observation';

type Observation = {
  id: string;
  text: string;
  type: 'Planification' | 'Décision de statut' | 'Expert' | 'Général';
  author: string;
  authorEmail: string;
  authorRole: string;
  source: string;
  createdAt: any;
  dossierId: string;
};

const TYPE_BADGE_STYLES: Record<string, string> = {
  'Planification':      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'Décision de statut': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  'Expert':             'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  'Général':            'bg-secondary text-secondary-foreground',
};

const ROLE_BADGE_STYLES: Record<string, string> = {
  'Admin':                'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'Responsable d\'équipe':'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  'Gestionnaire':         'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  'Agent de Terrain':     'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  'Chiffreur':            'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
};

type ObservationsTabProps = {
  dossierId: string;
  section: 'dossiers' | 'assignations-atg' | 'assignations-chiffrage';
  variant?: 'tab' | 'collapsible';
};

export default function ObservationsTab({ dossierId, section, variant = 'tab' }: ObservationsTabProps) {
  const db = useFirestore();
  const auth = useAuth();
  const { canWrite, profile } = useCurrentUser();
  const { toast } = useToast();
  const canAdd = canWrite(section);

  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  const obsQuery = useMemo(() => {
    if (!db) return null;
    return query(
      collection(db, 'dossiers', dossierId, 'observations'),
      orderBy('createdAt', 'desc')
    );
  }, [db, dossierId]);

  const { data: rawObservations, loading } = useCollection<Observation>(obsQuery as any);

  const observations = useMemo(() => {
    if (!rawObservations) return [];
    return [...rawObservations].sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      return dateB - dateA;
    });
  }, [rawObservations]);

  const handleSubmit = async () => {
    if (!text.trim() || !db) return;
    setIsSubmitting(true);

    const userEmail = auth?.currentUser?.email || 'Admin';
    const userName = profile?.nom || userEmail;
    const userRole = profile?.role || 'Admin';

    try {
      await addObservation(db, dossierId, text.trim(), 'Général', userName, userEmail, userRole, section);
      setText('');
      toast({ title: 'Observation ajoutée' });
    } catch (err: any) {
      console.error('Failed to add observation:', err);
      toast({ variant: 'destructive', title: 'Erreur', description: err.message || 'Impossible d\'ajouter l\'observation.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <div className="space-y-4">
      {/* Compose area */}
      {canAdd && (
        <div className="flex flex-col gap-2">
          <Textarea
            placeholder="Ajouter une observation..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            className="resize-none text-sm"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!text.trim() || isSubmitting}
              className="h-8 text-xs gap-1.5"
            >
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Envoyer
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Chargement...
        </div>
      ) : observations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Eye className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">Aucune observation pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {observations.map((obs) => (
            <div key={obs.id} className="flex gap-3 p-3 rounded-lg border bg-card">
              <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                  {(obs.author || '?')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center flex-wrap gap-1.5">
                  <span className="text-sm font-semibold truncate">{obs.author || 'Inconnu'}</span>
                  <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', ROLE_BADGE_STYLES[obs.authorRole] || '')}>
                    {obs.authorRole || 'N/A'}
                  </Badge>
                  <Badge className={cn('text-[10px] px-1.5 py-0 border-0', TYPE_BADGE_STYLES[obs.type] || TYPE_BADGE_STYLES['Général'])}>
                    {obs.type}
                  </Badge>
                  {obs.createdAt?.toDate && (
                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                      {format(obs.createdAt.toDate(), 'dd MMM yyyy à HH:mm', { locale: fr })}
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">{obs.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (variant === 'collapsible') {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-accent/50 transition-colors rounded-t-lg">
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Observations</span>
                {observations.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                    {observations.length}
                  </Badge>
                )}
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4">
              {content}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  return content;
}
