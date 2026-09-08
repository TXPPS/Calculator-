import { DayPositionSelect } from '../../components/shared/DayPositionSelect';
import { PayFrequency, PaycheckSchedule, defaultPaycheckSchedule } from '../../domain/income/payFrequency';

interface PaycheckScheduleFieldsProps {
  schedule: PaycheckSchedule;
  onChange: (schedule: PaycheckSchedule) => void;
}

const FREQUENCY_LABELS: Record<PayFrequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Every 2 Weeks / Biweekly',
  semiMonthly: 'Twice Monthly / Semi-Monthly',
  monthly: 'Monthly',
};

export function PaycheckScheduleFields({ schedule, onChange }: PaycheckScheduleFieldsProps) {
  return (
    <div className="paycheck-schedule">
      <label className="field">
        <span className="field__label">Frequency</span>
        <select
          value={schedule.frequency}
          onChange={(e) => onChange(defaultPaycheckSchedule(e.target.value as PayFrequency))}
        >
          {(Object.keys(FREQUENCY_LABELS) as PayFrequency[]).map((f) => (
            <option key={f} value={f}>
              {FREQUENCY_LABELS[f]}
            </option>
          ))}
        </select>
        {schedule.frequency === 'biweekly' && (
          <span className="field__hint">
            Every 14 days from the known payday below — distinct from Semi-Monthly's two fixed
            calendar dates each month.
          </span>
        )}
      </label>

      {(schedule.frequency === 'weekly' || schedule.frequency === 'biweekly') && (
        <label className="field">
          <span className="field__label">Known payday (schedule anchor)</span>
          <input
            type="date"
            value={schedule.anchorDate ?? ''}
            onChange={(e) => onChange({ ...schedule, anchorDate: e.target.value || null })}
            required
          />
          <span className="field__hint">
            Any real payday on this schedule — used to calculate which paydays fall in any month.
          </span>
        </label>
      )}

      {schedule.frequency === 'semiMonthly' && (
        <div className="split-percentage-row">
          <label className="field field--inline">
            <span className="field__label">First payday</span>
            <DayPositionSelect
              value={schedule.semiMonthly?.first ?? 1}
              onChange={(first) =>
                onChange({
                  ...schedule,
                  semiMonthly: { first, second: schedule.semiMonthly?.second ?? 15 },
                })
              }
            />
          </label>
          <label className="field field--inline">
            <span className="field__label">Second payday</span>
            <DayPositionSelect
              value={schedule.semiMonthly?.second ?? 15}
              onChange={(second) =>
                onChange({
                  ...schedule,
                  semiMonthly: { first: schedule.semiMonthly?.first ?? 1, second },
                })
              }
            />
          </label>
        </div>
      )}

      {schedule.frequency === 'monthly' && (
        <label className="field">
          <span className="field__label">Payday</span>
          <DayPositionSelect
            value={schedule.monthlyDay ?? 1}
            onChange={(monthlyDay) => onChange({ ...schedule, monthlyDay })}
          />
        </label>
      )}
    </div>
  );
}
