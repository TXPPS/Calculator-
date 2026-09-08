import { useAppData } from '../../context/AppDataContext';

interface CategorySelectProps {
  value: string | null;
  onChange: (categoryId: string | null) => void;
  required?: boolean;
  id?: string;
}

export function CategorySelect({ value, onChange, required = false, id }: CategorySelectProps) {
  const { activeCategories } = useAppData();
  return (
    <select
      id={id}
      value={value ?? ''}
      required={required}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">{required ? 'Select a category…' : 'No category'}</option>
      {activeCategories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
