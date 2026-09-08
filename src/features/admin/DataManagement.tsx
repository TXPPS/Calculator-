import { useRef, useState } from 'react';
import { exportBackup, validateBackup, importBackup, clearAllData, BackupFile } from '../../data/import-export/backup';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { resetDbConnection } from '../../data/database/db';

export function DataManagement() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<{ data: BackupFile; summary: string } | null>(null);
  const [importError, setImportError] = useState<string[] | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleExport = async () => {
    const backup = await exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `household-plan-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus('Backup exported.');
  };

  const handleFileChosen = async (file: File) => {
    setImportError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const validation = validateBackup(parsed);
      if (!validation.valid) {
        setImportError(validation.errors);
        return;
      }
      setPendingImport({
        data: parsed as BackupFile,
        summary: `${validation.summary.months} month(s), ${validation.summary.incomeEntries} income entries, ${validation.summary.expenseEntries} expense entries, ${validation.summary.categories} categories.`,
      });
    } catch {
      setImportError(['This file could not be parsed as valid JSON.']);
    }
  };

  const confirmImport = async () => {
    if (!pendingImport) return;
    await importBackup(pendingImport.data);
    resetDbConnection();
    setPendingImport(null);
    setStatus('Backup imported. Reloading…');
    setTimeout(() => window.location.reload(), 600);
  };

  return (
    <div>
      <h2>Data management</h2>
      <div className="admin-actions">
        <button type="button" className="btn btn--secondary" onClick={handleExport}>
          Export backup
        </button>
        <button type="button" className="btn btn--secondary" onClick={() => fileInputRef.current?.click()}>
          Import backup
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="visually-hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileChosen(file);
            e.target.value = '';
          }}
        />
        <button type="button" className="btn btn--danger-ghost" onClick={() => setClearOpen(true)}>
          Clear all data
        </button>
      </div>
      {status && <p className="save-confirmation">{status}</p>}
      {importError && (
        <ul className="form-errors" role="alert">
          {importError.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pendingImport !== null}
        title="Replace all data with this backup?"
        message={`This will replace all household data with the imported backup: ${pendingImport?.summary ?? ''} Your current data will be overwritten.`}
        confirmLabel="Replace data"
        danger
        onCancel={() => setPendingImport(null)}
        onConfirm={confirmImport}
      />

      <ConfirmDialog
        open={clearOpen}
        title="Clear all data?"
        message="This permanently deletes every monthly plan, income entry, bill, and setting. This cannot be undone."
        confirmLabel="Clear everything"
        danger
        onCancel={() => setClearOpen(false)}
        onConfirm={async () => {
          await clearAllData();
          resetDbConnection();
          setClearOpen(false);
          window.location.reload();
        }}
      />
    </div>
  );
}
