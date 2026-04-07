'use client';

import { useCallback } from 'react';
import { Upload, X, FileText, ScanSearch, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface UploadedFile {
  file: File;
  preview: string;
}

interface StepDocumentsProps {
  scanFiles: UploadedFile[];
  normalFiles: UploadedFile[];
  onScanFilesChange: (files: UploadedFile[]) => void;
  onNormalFilesChange: (files: UploadedFile[]) => void;
}

function FileList({ files, onRemove }: { files: UploadedFile[]; onRemove: (i: number) => void }) {
  if (files.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-2 mt-3">
      {files.map((uf, i) => (
        <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border bg-card hover:shadow-sm transition-shadow">
          {uf.preview ? (
            <img src={uf.preview} alt="" className="w-10 h-10 rounded object-cover border shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded bg-red-50 dark:bg-red-950/30 flex items-center justify-center border shrink-0">
              <FileText className="w-5 h-5 text-red-500" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{uf.file.name}</p>
            <p className="text-xs text-muted-foreground">{(uf.file.size / 1024).toFixed(0)} KB</p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => onRemove(i)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}

export default function StepDocuments({ scanFiles, normalFiles, onScanFilesChange, onNormalFilesChange }: StepDocumentsProps) {

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, target: 'scan' | 'normal') => {
    const selected = e.target.files;
    if (!selected) return;
    const newFiles: UploadedFile[] = Array.from(selected).map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
    }));
    if (target === 'scan') {
      onScanFilesChange([...scanFiles, ...newFiles]);
    } else {
      onNormalFilesChange([...normalFiles, ...newFiles]);
    }
    e.target.value = '';
  }, [scanFiles, normalFiles, onScanFilesChange, onNormalFilesChange]);

  const removeScanFile = useCallback((index: number) => {
    const updated = [...scanFiles];
    if (updated[index].preview) URL.revokeObjectURL(updated[index].preview);
    updated.splice(index, 1);
    onScanFilesChange(updated);
  }, [scanFiles, onScanFilesChange]);

  const removeNormalFile = useCallback((index: number) => {
    const updated = [...normalFiles];
    if (updated[index].preview) URL.revokeObjectURL(updated[index].preview);
    updated.splice(index, 1);
    onNormalFilesChange(updated);
  }, [normalFiles, onNormalFilesChange]);

  const totalFiles = scanFiles.length + normalFiles.length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Téléverser les documents</h3>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Importez vos documents dans la zone appropriée. Les documents à scanner seront analysés par l'IA pour pré-remplir le formulaire.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Documents à scanner */}
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <ScanSearch className="h-4 w-4" />
              Documents à scanner (IA)
            </CardTitle>
            <CardDescription className="text-xs">
              Lettre de mission, constat amiable... L'IA extraira les données automatiquement.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg cursor-pointer bg-blue-50/30 dark:bg-blue-950/20 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 hover:border-blue-400 transition-all group">
              <Upload className="w-6 h-6 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs text-muted-foreground"><span className="font-semibold text-blue-600 dark:text-blue-400">Cliquez</span> ou glisser-déposer</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">PDF, PNG, JPG</p>
              <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => handleFileSelect(e, 'scan')} />
            </label>
            <FileList files={scanFiles} onRemove={removeScanFile} />
            {scanFiles.length > 0 && (
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-2">{scanFiles.length} fichier(s) à scanner</p>
            )}
          </CardContent>
        </Card>

        {/* Documents normaux */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Documents normaux
            </CardTitle>
            <CardDescription className="text-xs">
              Photos, factures, autres pièces jointes. Ces documents seront enregistrés sans scan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 hover:border-muted-foreground/30 transition-all group">
              <Upload className="w-6 h-6 text-muted-foreground mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs text-muted-foreground"><span className="font-semibold">Cliquez</span> ou glisser-déposer</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">PDF, PNG, JPG</p>
              <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => handleFileSelect(e, 'normal')} />
            </label>
            <FileList files={normalFiles} onRemove={removeNormalFile} />
            {normalFiles.length > 0 && (
              <p className="text-xs text-muted-foreground font-medium mt-2">{normalFiles.length} fichier(s)</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Total summary */}
      {totalFiles > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          <strong>{totalFiles}</strong> document(s) au total
        </div>
      )}

      {/* Hint */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
        <ScanSearch className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
        <div className="text-sm space-y-1">
          <p className="font-medium text-blue-700 dark:text-blue-400">Comment ça marche ?</p>
          <p className="text-blue-600/80 dark:text-blue-400/70">
            Cliquez <strong>"Scanner & Continuer"</strong> pour lancer l'analyse IA sur les documents à scanner,
            ou <strong>"Passer le scan"</strong> pour remplir manuellement. Tous les documents (scannés + normaux) seront sauvegardés avec le dossier.
          </p>
        </div>
      </div>
    </div>
  );
}
