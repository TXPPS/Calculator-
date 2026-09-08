import { FormEvent, useState } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { categoryRepository } from '../../data/repositories/categoryRepository';
import { validateName } from '../../domain/calculations/validation';

export function CategorySettings() {
  const { categories, refreshCategories } = useAppData();
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const sorted = [...categories].sort((a, b) => a.order - b.order);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    const check = validateName(newName);
    if (!check.valid) {
      setError(check.error!);
      return;
    }
    setError(null);
    await categoryRepository.create(newName.trim(), categories.length);
    setNewName('');
    await refreshCategories();
  };

  const move = async (id: string, direction: -1 | 1) => {
    const idx = sorted.findIndex((c) => c.id === id);
    const swapWith = idx + direction;
    if (swapWith < 0 || swapWith >= sorted.length) return;
    const ids = sorted.map((c) => c.id);
    const tmp = ids[idx]!;
    ids[idx] = ids[swapWith]!;
    ids[swapWith] = tmp;
    await categoryRepository.reorder(ids);
    await refreshCategories();
  };

  return (
    <div>
      <h2>Categories</h2>
      <form className="inline-form" onSubmit={handleAdd}>
        <label className="field field--inline">
          <span className="visually-hidden">New category name</span>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category name"
          />
        </label>
        <button type="submit" className="btn btn--secondary">
          Add category
        </button>
      </form>
      {error && (
        <ul className="form-errors" role="alert">
          <li>{error}</li>
        </ul>
      )}
      <ul className="admin-list">
        {sorted.map((cat, idx) => (
          <li key={cat.id} className={`admin-list__item ${cat.archived ? 'is-archived' : ''}`}>
            {editingId === cat.id ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={async () => {
                  const check = validateName(editingName);
                  if (check.valid) {
                    await categoryRepository.save({ ...cat, name: editingName.trim() });
                    await refreshCategories();
                  }
                  setEditingId(null);
                }}
                autoFocus
              />
            ) : (
              <span className="admin-list__name">{cat.name}</span>
            )}
            <div className="admin-list__actions">
              <button
                type="button"
                className="btn btn--small"
                onClick={() => move(cat.id, -1)}
                disabled={idx === 0}
                aria-label={`Move ${cat.name} up`}
              >
                ↑
              </button>
              <button
                type="button"
                className="btn btn--small"
                onClick={() => move(cat.id, 1)}
                disabled={idx === sorted.length - 1}
                aria-label={`Move ${cat.name} down`}
              >
                ↓
              </button>
              <button
                type="button"
                className="btn btn--small"
                onClick={() => {
                  setEditingId(cat.id);
                  setEditingName(cat.name);
                }}
              >
                Rename
              </button>
              <button
                type="button"
                className="btn btn--small"
                onClick={async () => {
                  await categoryRepository.archive(cat.id, !cat.archived);
                  await refreshCategories();
                }}
              >
                {cat.archived ? 'Restore' : 'Archive'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
