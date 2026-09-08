import { useState } from 'react';
import { runDataHealthCheck, DataHealthReport } from '../../data/import-export/dataHealth';

export function DataHealthPanel() {
  const [report, setReport] = useState<DataHealthReport | null>(null);
  const [checking, setChecking] = useState(false);

  const runCheck = async () => {
    setChecking(true);
    try {
      const result = await runDataHealthCheck();
      setReport(result);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div>
      <h2>Data health</h2>
      <button type="button" className="btn btn--secondary" onClick={runCheck} disabled={checking}>
        {checking ? 'Checking…' : 'Run data health check'}
      </button>
      {report && (
        <div className={`data-health-result ${report.healthy ? 'is-positive' : 'is-negative'}`}>
          <p>
            {report.healthy
              ? 'No issues found.'
              : `${report.issues.filter((i) => i.severity === 'error').length} issue(s) need attention.`}
          </p>
          {report.issues.length > 0 && (
            <ul className="admin-list">
              {report.issues.map((issue, i) => (
                <li key={i} className="admin-list__item">
                  <span className={`chip ${issue.severity === 'error' ? 'chip--danger' : 'chip--muted'}`}>
                    {issue.severity}
                  </span>
                  <span>{issue.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
