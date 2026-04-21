'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
  CommandLoading,
} from '@/components/ui/command';
import { getAiSuggestion } from '@/lib/actions/ai-search';
import { useDebounce } from '@/hooks/use-debounce';

const GlobalSearch = () => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [suggestion, setSuggestion] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const debouncedQuery = useDebounce(query, 500);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);
  
  const runSearch = React.useCallback(async (searchQuery: string) => {
    if (!searchQuery) {
      setSuggestion(null);
      return;
    }
    setLoading(true);
    const { suggestion: aiSuggestion, error } = await getAiSuggestion(searchQuery);
    if(error) {
        setSuggestion("Erreur : suggestion indisponible.");
    } else {
        setSuggestion(aiSuggestion);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    runSearch(debouncedQuery);
  }, [debouncedQuery, runSearch]);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (!value) {
      setSuggestion(null);
      setLoading(false);
    }
  };


  return (
    <>
      <Button
        variant="outline"
        className="w-full max-w-sm justify-between text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(true)}
      >
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          <span>Rechercher...</span>
        </div>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Que cherchez-vous ?"
          value={query}
          onValueChange={handleInputChange}
        />
        <CommandList>
          {!suggestion && !loading && !query && (
            <CommandEmpty>Start typing to search.</CommandEmpty>
          )}
          {loading && <CommandLoading>Thinking...</CommandLoading>}
          {suggestion && !loading && (
            <CommandItem onSelect={() => setOpen(false)}>
              <span>{suggestion}</span>
            </CommandItem>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
};

export default GlobalSearch;
