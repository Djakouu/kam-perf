export interface ScriptCpuData {
  url: string;
  cpuTimeMs: number;
}

export function parseBootupTime(lhr: any): ScriptCpuData[] {
  const bootupTimeAudit = lhr.audits['bootup-time'];
  const networkRequestsAudit = lhr.audits['network-requests'];

  const scriptMap = new Map<string, number>();

  // 1. Populate from bootup-time (CPU data)
  if (bootupTimeAudit && bootupTimeAudit.details && bootupTimeAudit.details.items) {
    for (const item of bootupTimeAudit.details.items) {
      scriptMap.set(item.url, item.total);
    }
  }

  // 2. Populate from network-requests (Discovery of low-CPU scripts)
  if (networkRequestsAudit && networkRequestsAudit.details && networkRequestsAudit.details.items) {
    for (const item of networkRequestsAudit.details.items) {
      if (item.resourceType === 'Script') {
        if (!scriptMap.has(item.url)) {
          scriptMap.set(item.url, 0);
        }
      }
    }
  }

  const scriptData: ScriptCpuData[] = [];
  for (const [url, cpuTimeMs] of scriptMap.entries()) {
    scriptData.push({ url, cpuTimeMs });
  }

  return scriptData;
}