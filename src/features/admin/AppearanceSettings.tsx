import { useTheme } from '../../context/ThemeContext';
import { ThemePreference } from '../../data/database/schema';

const OPTIONS: { value: ThemePreference; label: string; description: string }[] = [
  { value: 'light', label: 'Light', description: 'Always use light mode.' },
  { value: 'dark', label: 'Dark', description: 'Always use dark mode.' },
  { value: 'system', label: 'System', description: "Match this device's setting." },
];

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <h2>Appearance</h2>
      <fieldset className="owner-fieldset">
        <legend>Theme</legend>
        <div className="owner-options owner-options--stacked">
          {OPTIONS.map((opt) => (
            <label className="owner-option" key={opt.value}>
              <input
                type="radio"
                checked={theme === opt.value}
                onChange={() => setTheme(opt.value)}
              />
              <span>
                <strong>{opt.label}</strong> — {opt.description}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
