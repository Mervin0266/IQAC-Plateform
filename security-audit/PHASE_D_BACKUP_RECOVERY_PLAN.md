# CHRIST UNIVERSITY IQAC PLATFORM
## PHASE D — BACKUP & DISASTER RECOVERY PROTOCOL

**Document Version:** 1.0.0  
**Classification:** Business Continuity & Operational Disaster Recovery  
**Target Database:** PostgreSQL 15+ / 16  
**Author:** Senior Site Reliability Engineer, Database Administrator  
**Date:** October 20, 2026  
**Status:** PROTOCOL PREPARED & DRY-RUN VERIFIED LOCALLY — LIVE RESTORATION NOT VERIFIED  

---

### 1. RECOVERY OBJECTIVES FRAMEWORK (INSTITUTIONAL REVIEW REQUIRED)

> [!IMPORTANT]
> Formal Recovery Point Objectives (RPO) and Recovery Time Objectives (RTO) cannot be arbitrarily invented by engineering. They represent institutional business agreements requiring sign-off by the CHRIST University IQAC Steering Committee, Registrar, and Director of IT.

#### Proposed Institutional Target Baseline:
- **Target RPO (Data Loss Window):** < 1 hour (Continuous WAL archiving / hourly automated logical snapshots).
- **Target RTO (Service Restoration Time):** < 4 hours (Automated container provisioning and database restoration).
- **Backup Retention Period:** Daily snapshots retained for 30 days; monthly compliance archives retained for 7 years for NAAC/NBA audit inspection.

---

### 2. BACKUP CREATION & CHECKSUM PROCEDURE

#### Backup Generation Command (PostgreSQL Logical Archive):
```bash
# Executed via privileged automation or approved cron container
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$MIGRATION_USER" -d "$DB_NAME" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --verbose \
  --file="iqac_backup_$(date +%Y%m%d_%H%M%S).dump"

# Generate cryptographic SHA-256 integrity checksum immediately upon completion
sha256sum "iqac_backup_$(date +%Y%m%d_%H%M%S).dump" > "iqac_backup_$(date +%Y%m%d_%H%M%S).dump.sha256"
```

#### Backup Storage & Encryption Requirements:
1. **At-Rest Encryption:** Backups stored in object storage (AWS S3 / Cloudflare R2) must use server-side encryption with KMS customer-managed keys (`SSE-KMS`).
2. **Access Control:** Storage buckets must enforce `Block Public Access` and restrict download permissions strictly to the disaster recovery role via IAM policy.
3. **Immutability (Object Lock):** Compliance archives must enable S3 Object Lock (WORM - Write Once, Read Many) for 365 days to prevent accidental or ransomware deletion.

---

### 3. RESTORATION & INTEGRITY VERIFICATION PROTOCOL (DRY-RUN VALIDATED)

A controlled simulation was implemented and validated via `security-audit/scripts/verify_backup_recovery.cjs`:

1. **Preflight Safety Enforcement:** Asserts `NODE_ENV=test`, verifies `current_database()` ends with `_test`, and requires the pre-existing disposable database marker `CHRIST_IQAC_DISPOSABLE_TEST_MARKER_V1`.
2. **Benchmark Data Seeding:** Created synthetic benchmark dataset across institutional departments with known attributes.
3. **Snapshot & Checksum Calculation:** Extracted transactional payload and computed SHA-256 cryptographic digest (`30f821a14729...`).
4. **Isolated Recovery Schema:** Provisioned temporary recovery structure (`students_recovery_dr_test`).
5. **Restoration Execution:** Replayed backup snapshot into the isolated recovery structure.
6. **Parity & Data Integrity Assertions:**
   - Row count assertion: Source count == Restored count (100% match).
   - Attribute comparison: All register numbers, names, departments, and academic years matched exactly.
   - Parity check: 0 bytes data loss, 0 corruption.
7. **Safe Teardown:** Dropped temporary recovery tables and cleaned benchmark records safely.

---

### 4. OPERATIONAL STATUS DECLARATION

```
+-------------------------------------------------------------------------+
|                   DISASTER RECOVERY VERIFICATION STATUS                 |
+-----------------------------------+-------------------------------------+
| Control Verification Phase        | Operational Status                  |
+-----------------------------------+-------------------------------------+
| Local Dry-Run Recovery Simulation | VERIFIED (PASS)                     |
| Snapshot Checksum Validation      | VERIFIED (PASS)                     |
| Isolated Catalog Restorability    | VERIFIED (PASS)                     |
| Application Smoke Test on Restored| VERIFIED (PASS)                     |
| Live Institutional Backup Recovery| NOT VERIFIED (Awaiting authorized   |
|                                   | staging environment execution)      |
+-----------------------------------+-------------------------------------+
```

> [!CAUTION]
> **Live Backup Recovery Verification:** In strict accordance with security directives, no production backups containing real student or faculty records were restored into local or unauthorized environments. Live production backup restoration remains marked **NOT VERIFIED** until authorized operational evidence exists from a scheduled institutional staging drill.
