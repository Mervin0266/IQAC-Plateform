# CHRIST UNIVERSITY IQAC PLATFORM
# PHASE E — POSTGRESQL LOGICAL BACKUP & RESTORE VERIFICATION REPORT

> **Document Type:** Disaster Recovery & Backup Verification Evidence  
> **System:** CHRIST (Deemed to be University) — Internal Quality Assurance Cell (IQAC) Platform  
> **Database Engine:** PostgreSQL 18.1 (Local Disposable Test Instance)  
> **Backup Utility:** `pg_dump.exe` (v18.1)  
> **Restore Utility:** `psql.exe` (v18.1)  
> **Date of Execution:** October 21, 2026  
> **Local Dry-Run Status:** 🟢 **VERIFIED 100% PASSED (Synthetic Relational Dataset)**  
> **Institutional Production Status:** 🟡 **NOT VERIFIED (Awaiting Staging Promotion & Institutional DBA Execution)**  

---

## 1. Local Disaster Recovery Dry-Run Execution Evidence

A full, logical database dump and restore exercise was conducted using real PostgreSQL utilities against the disposable test database (`iqac_test`) and restored into a separate, isolated target database (`iqac_restore_test`).

```
========================================================================
CHRIST UNIVERSITY IQAC — PHASE E3 REAL PG_DUMP & RESTORE VERIFICATION
========================================================================
Source Disposable Database: iqac_test
Target Restore Database:   iqac_restore_test
pg_dump utility:           C:\Program Files\PostgreSQL\18\bin\pg_dump.exe
psql utility:              C:\Program Files\PostgreSQL\18\bin\psql.exe

[1/6] Seeding synthetic relational benchmark dataset...
✓ Source records seeded: Users=11, Students=20, Faculty=10, AuditLogs=209

[2/6] Executing pg_dump logical backup...

[3/6] Verifying backup artifact integrity and SHA-256 checksum...
✓ Backup file created: security-audit/scratch/disposable_backup_logical.sql
✓ File size:           149,818 bytes
✓ Backup duration:     167 ms
✓ SHA-256 Checksum:    b6945dcf41bdbab296195863e3f189f4df9d84d3f1751be4a07a628e0f301664

[4/6] Provisioning separate disposable restore database (iqac_restore_test)...

[5/6] Restoring backup into separate disposable target via psql...
✓ Restoration duration: 476 ms

[6/6] Verifying schema, table parity, indexes, constraints, sequences, and audit logs...
✓ Restored records: Users=11, Students=20, Faculty=10, AuditLogs=209
✓ Restored indexes count: 79
✓ Restored sequences count: 2
✓ Smoke query verified: DR Student 1 (DR_REG_0001) successfully retrieved.
✓ Cleaned up temporary restore database: iqac_restore_test

========================================================================
PHASE E3 REAL BACKUP AND RESTORE VERIFICATION: 100% PASSED
========================================================================
```

---

## 2. Parity & Schema Verification Matrix

| Verification Check | Source (`iqac_test`) | Restored (`iqac_restore_test`) | Parity Status |
|---|:---:|:---:|:---:|
| **User Identity Records** | 11 | 11 | 🟢 **100% MATCH** |
| **Student Directory Records** | 20 | 20 | 🟢 **100% MATCH** |
| **Faculty Profile Records** | 10 | 10 | 🟢 **100% MATCH** |
| **AuditLog Trail Entries** | 209 | 209 | 🟢 **100% MATCH** |
| **Schema Indexes** | 79 | 79 | 🟢 **100% MATCH** |
| **Database Sequences** | 2 | 2 | 🟢 **100% MATCH** |
| **Foreign-Key Constraints** | Enforced | Enforced | 🟢 **100% MATCH** |
| **Application Smoke Query** | Retrievable | Retrievable (`DR_REG_0001`) | 🟢 **100% MATCH** |

---

## 3. Institutional Policy & Staging Prerequisites

1. **Zero Production Backups on Developer Workstations:** Live institutional database backups containing real student PII, faculty PAN cards, or confidential accreditation records must **NEVER** be restored to local developer laptops or unmanaged environments.
2. **Staging Verification Obligation:** GATE-10 remains marked **NOT VERIFIED** for production until an authorized institutional DBA executes `verify_pg_dump_restore.cjs` against an isolated staging replica in the university cloud infrastructure.
3. **No Unsubstantiated RPO/RTO:** While local synthetic dump and restore took under 1 second (167ms backup, 476ms restore), actual production Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO) must be benchmarked on institutional infrastructure with multi-gigabyte datasets.
