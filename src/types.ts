export const severities = ['error', 'warning', 'info'] as const;
export type Severity = (typeof severities)[number];

export type Finding = {
  id: string;
  severity: Severity;
  title: string;
  evidence: string[];
  remediation: string;
};

export type RuleContext = {
  root: string;
  files: ReadonlySet<string>;
  readText(path: string): Promise<string | undefined>;
};

export type Rule = {
  id: string;
  title: string;
  evaluate(context: RuleContext): Promise<Finding | undefined>;
};

export type ReportSummary = {
  error: number;
  warning: number;
  info: number;
  total: number;
};

export type Report = {
  schemaVersion: '1.0.0';
  tool: { name: 'repo-doctor'; version: string };
  repository: { path: string };
  generatedAt: string;
  summary: ReportSummary;
  findings: Finding[];
};

export type ScanOptions = {
  now?: Date;
};
