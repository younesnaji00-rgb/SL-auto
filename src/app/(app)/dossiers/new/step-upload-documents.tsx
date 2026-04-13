'use client';

import { useRef, useMemo } from 'react';
import { Upload, X, FileIcon, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DOCUMENT_TYPES as defaultDocTypes } from '@/lib/constants';
import { useOptions } from '@/hooks/use-options';

interface UploadedFile {
  file: File;
  preview: string;
}

interface StepUploadDocumentsProps {
  categorizedFiles: Record<string, UploadedFile[]>;
  onCategorizedFilesChange: (files: Record<string, UploadedFile[]>) => void;
}

export default function StepUploadDocuments({
  categorizedFiles,
  onCategorizedFilesChange,
}: StepUploadDocumentsProps) {
  const { options: dbDocTypes } = useOptions('options_types_documents', [...defaultDocTypes]);
  const docTypes = useMemo(
    () =>
      dbDocTypes.length > 0
        ? dbDocTypes.map((d) => d.label)
        : [...defaultDocTypes],
    [dbDocTypes]
  );

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileSelect = (typeLabel: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newFiles: UploadedFile[] = Array.from(files).map((file) => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
    }));
    const updated = { ...categorizedFiles };
    updated[typeLabel] = [...(updated[typeLabel] || []), ...newFiles];
    onCategorizedFilesChange(updated);
  };

  const handleRemoveFile = (typeLabel: string, index: number) => {
    const updated = { ...categorizedFiles };
    const files = [...(updated[typeLabel] || [])];
    const removed = files.splice(index, 1);
    if (removed[0]?.preview) URL.revokeObjectURL(removed[0].preview);
    if (files.length === 0) {
      delete updated[typeLabel];
    } else {
      updated[typeLabel] = files;
    }
    onCategorizedFilesChange(updated);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  const totalFiles = Object.values(categorizedFiles).reduce((sum, files) => sum + files.length, 0);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      {totalFiles > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-sm">
          <FileText className="h-4 w-4 text-blue-600 shrink-0" />
          <span className="text-blue-700 dark:text-blue-300">
            <strong>{totalFiles}</strong> document(s) ajouté(s) au total
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {docTypes.map((typeLabel) => {
          const files = categorizedFiles[typeLabel] || [];
          return (
            <Card key={typeLabel} className="border">
              <CardHeader className="py-3 px-4 bg-heading-bg border-b">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="truncate">{typeLabel}</span>
                  {files.length > 0 && (
                    <Badge variant="secondary" className="ml-2 shrink-0">
                      {files.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                {files.map((uf, idx) => (
                  <div
                    key={`${typeLabel}-${idx}`}
                    className="flex items-center gap-2 p-2 rounded-md bg-muted/20 border text-sm"
                  >
                    <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{uf.file.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatSize(uf.file.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(typeLabel, idx)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                <input
                  ref={(el) => { fileInputRefs.current[typeLabel] = el; }}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp"
                  className="hidden"
                  onChange={(e) => {
                    handleFileSelect(typeLabel, e.target.files);
                    e.target.value = '';
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 text-muted-foreground"
                  onClick={() => fileInputRefs.current[typeLabel]?.click()}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Ajouter
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
