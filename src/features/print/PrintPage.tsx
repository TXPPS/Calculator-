import { useAppData } from '../../context/AppDataContext';
import { Money } from '../../components/shared/Money';
import { EmptyState } from '../../components/shared/EmptyState';
import { monthKeyLabel } from '../../domain/monthly-plan/types';

export function PrintPage() {
  const { household, selectedMonth, summary, incomeEntries, expenseEntries } = useAppData();

  if (!selectedMonth) {
    return <EmptyState title="No month selected" message="Select a monthly plan first." />;
  }

  const section = (label: string, kind: 'bill' | 'planned' | 'familyFun' | 'savings') => {
    const entries = expenseEntries.filter((e) => e.section === kind);
    if (entries.length === 0) return null;
    return (
      <div className="print-section">
        <h3>{label}</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Owner</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td>{e.name}</td>
                <td>
                  {e.owner === 'both'
                    ? 'Both'
                    : e.owner === 'person1'
                    ? household.personNames.person1
                    : household.personNames.person2}
                </td>
                <td>
                  <Money cents={e.amountCents} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <section className="page print-summary">
      <div className="no-print">
        <button type="button" className="btn btn--primary" onClick={() => window.print()}>
          Print this summary
        </button>
      </div>

      <h1>{household.appName} — {monthKeyLabel(selectedMonth.monthKey)}</h1>

      <div className="print-section">
        <h3>Income</h3>
        <table>
          <thead>
            <tr>
              <th>Source</th>
              <th>Person</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {incomeEntries.map((e) => (
              <tr key={e.id}>
                <td>{e.description}</td>
                <td>{e.person === 'person1' ? household.personNames.person1 : household.personNames.person2}</td>
                <td>
                  <Money cents={e.amountCents} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          {household.personNames.person1}: <Money cents={summary.income.person1Cents} /> ·{' '}
          {household.personNames.person2}: <Money cents={summary.income.person2Cents} /> · Household:{' '}
          <Money cents={summary.income.householdCents} />
        </p>
      </div>

      {section('Required Bills', 'bill')}
      {section('Planned Spending', 'planned')}
      {section('Family Fun Fund', 'familyFun')}
      {section('Savings', 'savings')}

      <div className="print-section">
        <h3>Summary</h3>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>{household.personNames.person1}</th>
              <th>{household.personNames.person2}</th>
              <th>Household</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Income</td>
              <td>
                <Money cents={summary.income.person1Cents} />
              </td>
              <td>
                <Money cents={summary.income.person2Cents} />
              </td>
              <td>
                <Money cents={summary.income.householdCents} />
              </td>
            </tr>
            <tr>
              <td>Total allocated</td>
              <td>
                <Money cents={summary.totalAllocated.person1Cents} />
              </td>
              <td>
                <Money cents={summary.totalAllocated.person2Cents} />
              </td>
              <td>
                <Money cents={summary.totalAllocated.householdCents} />
              </td>
            </tr>
            <tr>
              <td>Remaining</td>
              <td>
                <Money cents={summary.remaining.person1Cents} colorize />
              </td>
              <td>
                <Money cents={summary.remaining.person2Cents} colorize />
              </td>
              <td>
                <Money cents={summary.remaining.householdCents} colorize />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {selectedMonth.notes && (
        <div className="print-section">
          <h3>Notes</h3>
          <p>{selectedMonth.notes}</p>
        </div>
      )}
    </section>
  );
}
