# Deep Project Assessment: AI Auto-Schema Matching Onboarding

---

## 1. Current State Analysis

### 1.1 What Works Well (Strong Foundation)

| Component | Status | Quality |
|---|---|---|
| Prisma Schema | ✅ Complete | 13 models, well-normalized, merchant-isolated |
| File Parser | ✅ Complete | CSV, XLSX, JSON, TSV, XML with sheet detection |
| AI Entity Detection | ✅ Working | Groq LLM (`openai/gpt-oss-20b`) detects Customer/Product/Order |
| AI Column Mapping | ✅ Working | Confidence-scored mappings with transforms |
| Validation & FK Resolution | ✅ Working | Customer email→ID, Product name→ID lookups |
| Transactional Import | ✅ Working | Bulk inserts with FK resolution, `skipDuplicates` |
| Post-Import Processing | ✅ Working | Replenishment calc, discount classification, opportunities |
| Groq AI Integration | ✅ Working | Reuses existing `callModel()` with tool calling |

### 1.2 Critical Gaps for "Any Schema" Auto-Matching

| Gap | Severity | Impact |
|---|---|---|
| No Dynamic Schema Registry | 🔴 Critical | AI hardcoded to 3 entities; can't adapt to new schemas |
| No Semantic Embedding Service | 🔴 Critical | Column matching only by name/sample, not semantic meaning |
| No Vector DB / Similarity Search | 🔴 Critical | No semantic similarity search for fuzzy matching |
| Frontend Syntax Error | 🔴 Critical | Line 234 in `ImportDataPage.jsx` breaks the build |
| No Schema Drift Detection | 🟠 High | Can't detect when uploaded schema diverges from target |
| No Few-Shot Memory | 🟠 High | No learning from past successful mappings |
| No Schema Versioning | 🟠 High | Can't track schema evolution |
| No Auto-Migration Generation | 🟠 High | No SQL migration generation for schema changes |
| No Merchant Schema Extensions | 🟠 High | No custom fields per merchant |
| Dual Import Flows | 🟡 Medium | Legacy `/csv` + new `/import/` cause confusion |

*(Note: the original doc listed "No Semantic Embedding," "No Vector Embeddings," and "No Vector DB" as three separate rows — these have been merged above since they describe the same underlying gap.)*

### 1.3 Architecture Shift Needed

```
CURRENT: Hardcoded 3 entities  →  AI maps to fixed 3 targets
NEEDED:  Dynamic Schema Registry → AI matches ANY source to ANY target
```

---

## 2. 2-Day Execution Plan (48 Hours)

### 2.0 Prerequisites — Do First (30 min)

1. **Fix the blocking syntax error**
   ```bash
   cd frontend/frontend
   # Fix line 234 in ImportDataPage.jsx — arrow function syntax
   ```
2. **Clear caches and verify the build**
   ```bash
   rm -rf node_modules/.cache node_modules/.vite dist
   npm run build   # Must pass before proceeding
   ```

---

### 2.1 Day 1 — Core AI Schema Matching Engine (12 hrs)

#### Morning (6 hrs): Semantic Matching Engine

**Task 1.1 — Schema Registry Service** *(2 hrs, 🔴 P0)*
File: `backend/src/services/import/schemaRegistry.js`
```js
// Dynamic schema introspection at runtime
export class SchemaRegistry {
  constructor(prisma) { this.prisma = prisma; }

  async getTargetSchema(merchantId) {
    // Introspect actual DB schema + Prisma models
    // Return { entities: [{ name, fields: [{name, type, required, relation?, enum?}] }] }
  }

  async getSchemaEmbeddings(merchantId) {
    // Generate/store vector embeddings for each field
    // Return { fieldPath: embedding[] }
  }
}
```

**Task 1.2 — Vector Embedding Service** *(2 hrs, 🔴 P0)*
File: `backend/src/services/import/embeddingService.js`
```js
// Use sentence-transformers or OpenAI embeddings
// Store in pgvector or in-memory HNSW
export class EmbeddingService {
  async embed(text) { /* return vector */ }
  async searchSimilar(queryVector, topK = 5) { /* return [{fieldPath, score}] */ }
  async indexSchema(schema) { /* batch embed all field descriptions */ }
}
```
Dependency: add `@xenova/transformers` (local) or use Groq embeddings.

**Task 1.3 — Semantic Column Matcher** *(2 hrs, 🔴 P0)*
File: `backend/src/services/import/semanticMatcher.js`
```js
export class SemanticMatcher {
  constructor(embeddingService, schemaRegistry) {}

  async matchColumns(sourceColumns, targetSchema) {
    // 1. Exact name match (confidence 1.0)
    // 2. Fuzzy name match (confidence 0.8)
    // 3. Semantic embedding similarity (cosine > 0.85 → 0.9)
    // 4. Data type compatibility (boost/penalty)
    // 5. Sample value pattern match (regex/format)
    // Return merged confidence score
  }
}
```

#### Afternoon (6 hrs): Dynamic Schema Pipeline

**Task 1.4 — Dynamic Schema Registry API** *(1.5 hrs, 🔴 P0)*
File: `backend/src/routes/schema-route.js`
```
GET    /api/schema/target      # Get current target schema
POST   /api/schema/register    # Register new schema version
GET    /api/schema/history      # Schema evolution timeline
POST   /api/schema/diff         # Compare uploaded vs target
```

**Task 1.5 — Enhanced AI Mapper (Semantic + Few-Shot)** *(2.5 hrs, 🔴 P0)*
Modify: `backend/src/services/import/dataProfiler.js`
- Add `fewShotExamples` from successful past mappings
- Enhance `MAPPING_PROMPT` with semantic similarity hints
- Add `semanticHints` from the embedding service

**Task 1.6 — Schema Differ & Migration Generator** *(2 hrs, 🔴 P0)*
File: `backend/src/services/import/schemaDiffer.js`
```js
export class SchemaDiffer {
  diff(sourceSchema, targetSchema) {
    // Returns: { added, removed, modified, compatible: boolean }
  }

  generateMigration(diff) {
    // Returns: { sql: string, reversible: boolean, warnings: [] }
  }
}
```

---

### 2.2 Day 2 — Production Hardening & Frontend (12 hrs)

#### Morning (6 hrs): Robustness & Learning

**Task 2.1 — Feedback Loop / Continuous Learning** *(2 hrs, 🟠 P1)*
File: `backend/src/services/import/feedbackLoop.js`
```js
export class FeedbackLoop {
  async recordCorrection(originalMapping, correctedMapping) {
    // Store in few_shot_examples table
    // Update embedding index
    // Retrain/refresh semantic matcher
  }

  async getFewShotExamples(sourceColumn, targetEntity) {
    // Retrieve similar past corrections
  }
}
```
DB migration: add `few_shot_examples` table.

**Task 2.2 — Schema Drift Detection & Alerts** *(1.5 hrs, 🟠 P1)*
File: `backend/src/services/import/driftDetector.js`
```js
export class DriftDetector {
  async detectDrift(merchantId, uploadedSchema) {
    const target = await this.schemaRegistry.getTargetSchema(merchantId);
    return this.differ.detectDrift(uploadedSchema, target);
  }

  async scheduleDriftChecks(merchantId, cron) { /* cron job */ }
}
```

**Task 2.3 — Merchant Schema Extensions** *(1.5 hrs, 🟠 P1)*
DB migration:
```sql
CREATE TABLE merchant_schema_extensions (
  id SERIAL PRIMARY KEY,
  merchant_id INT REFERENCES Merchant(id),
  entity_name VARCHAR(100),
  custom_fields JSONB,  -- { fieldName: {type, required, ...} }
  created_at TIMESTAMP DEFAULT NOW()
);
```
API: `POST /api/schema/extend` — merchant adds custom fields.

**Task 2.4 — Confidence Calibration** *(1 hr, 🟡 P2)*
File: `backend/src/services/import/calibrator.js`
```js
export class ConfidenceCalibrator {
  async calibrate(predictions, outcomes) {
    // Platt scaling / isotonic regression
    // Update confidence thresholds per entity
  }
}
```

#### Afternoon (6 hrs): Frontend & Integration

**Task 2.5 — Fix Frontend & Unified Import Wizard** *(2 hrs, 🔴 P0)*
- Fix: `frontend/frontend/src/pages/ImportDataPage.jsx` line 234 (arrow function syntax error)
- Unify flows: remove legacy `/csv` route, single `/import/` wizard

New UX flow:
```
Upload → AI Analyze (semantic matches) → Review Mappings (confidence badges)
       → Validate (semantic warnings) → Confirm → Process
```

New components:
- `SchemaDiffViewer` — visual diff of uploaded vs. target schema
- `MappingConfidenceBadge` — color-coded confidence
- `SemanticMatchReason` — e.g. "Matched via semantic similarity (0.92)"
- `DriftWarningBanner` — e.g. "Schema drift detected: 3 new fields"

**Task 2.6 — Schema Visualization & Diff UI** *(2 hrs, 🔴 P0)*
New files:
- `frontend/frontend/src/components/SchemaDiffViewer.jsx`
- `frontend/frontend/src/components/MappingTable.jsx`
- `frontend/frontend/src/components/ConfidenceIndicator.jsx`

**Task 2.7 — End-to-End Integration Test** *(1.5 hrs)*
Test matrix:
1. CSV with exact column names → 100% auto-map
2. CSV with renamed columns (`cust_email` → `email`) → fuzzy match
3. CSV with semantic synonyms (`client_email` → `email`) → semantic match
4. CSV with extra columns → ignored gracefully
5. CSV with missing required fields → validation error
6. XLSX multi-sheet → sheet detection
7. JSON nested → flatten + map
8. Schema drift → drift warning + migration preview
9. Merchant custom fields → extension mapping
10. Feedback correction → few-shot learning improves next mapping

**Task 2.8 — Documentation & Monitoring** *(0.5 hrs)*
- Add `/api/docs` for the import API
- Add structured logging for the import pipeline
- Add metrics: `import.duration`, `import.rows`, `import.confidence.avg`, `import.drift.detected`

---

## 3. File Creation Checklist

### 3.1 New Backend Files

| File | Purpose | Priority |
|---|---|---|
| `backend/src/services/import/schemaRegistry.js` | Dynamic schema introspection | 🔴 P0 |
| `backend/src/services/import/embeddingService.js` | Vector embeddings | 🔴 P0 |
| `backend/src/services/import/semanticMatcher.js` | Semantic column matching | 🔴 P0 |
| `backend/src/services/import/schemaDiffer.js` | Schema diff & migration generation | 🔴 P0 |
| `backend/src/services/import/feedbackLoop.js` | Few-shot learning storage | 🟠 P1 |
| `backend/src/services/import/driftDetector.js` | Schema drift detection / cron | 🟠 P1 |
| `backend/src/services/import/calibrator.js` | Confidence calibration | 🟡 P2 |
| `backend/src/routes/schema-route.js` | Schema management API | 🔴 P0 |
| `prisma/migrations/*_add_few_shot_and_extensions.sql` | DB schema | 🔴 P0 |

*(The original checklist listed `feedbackLoop.js`, `driftDetector.js`, and `calibrator.js` twice each; duplicates removed here.)*

### 3.2 Modified Backend Files

| File | Changes | Priority |
|---|---|---|
| `backend/src/services/import/dataProfiler.js` | Add semantic hints, few-shot examples | 🔴 P0 |
| `backend/src/services/import/index.js` | Integrate semantic matcher, drift check | 🔴 P0 |
| `backend/src/services/import/validator.js` | Add drift warnings, extension validation | 🟠 P1 |
| `backend/src/services/import/schemaMapper.js` | Use semantic matcher | 🔴 P0 |
| `backend/src/routes/import-route.js` | Add drift check, extension handling | 🔴 P0 |
| `prisma/schema.prisma` | Add `few_shot_examples`, `merchant_schema_extensions` | 🔴 P0 |

### 3.3 New Frontend Files

| File | Purpose | Priority |
|---|---|---|
| `frontend/frontend/src/components/SchemaDiffViewer.jsx` | Visual schema diff | 🔴 P0 |
| `frontend/frontend/src/components/MappingTable.jsx` | Enhanced mapping table | 🔴 P0 |
| `frontend/frontend/src/components/ConfidenceIndicator.jsx` | Confidence badges | 🔴 P0 |
| `frontend/frontend/src/components/SemanticMatchReason.jsx` | Explain AI matches | 🟠 P1 |
| `frontend/frontend/src/components/DriftWarningBanner.jsx` | Drift warnings | 🟠 P1 |
| `frontend/frontend/src/pages/ImportDataPage.jsx` | Fix syntax error, unify flow | 🔴 P0 |

### 3.4 Modified Frontend Files

| File | Changes |
|---|---|
| `frontend/frontend/src/pages/ImportDataPage.jsx` | Fix syntax, unify flow, integrate new components |
| `frontend/frontend/src/api/client.js` | Add schema API calls |
| `frontend/frontend/src/App.jsx` | Remove legacy `/import-data` route |

### 3.5 DB Migrations

| Migration | Purpose |
|---|---|
| `prisma/migrations/*_add_few_shot_examples.sql` | Few-shot learning storage |
| `prisma/migrations/*_add_merchant_schema_extensions.sql` | Custom merchant fields |

---

## 4. Cleanup: Files to Remove, Keep, and Create

This section covers what happens to the *existing* codebase when the new unified import pipeline lands — separate from Section 3, which only listed the new work.

### 4.1 Files to Delete (Obsolete)

These are replaced outright by the new unified pipeline and should be removed once the new versions are in place.

| File | Reason | Replaced By |
|---|---|---|
| `backend/src/routes/import-route.js` *(legacy `/csv`, `/confirm` endpoints)* | Old manual CSV flow with hardcoded entity types | New `/import/analyze`, `/import/validate`, `/import/confirm`, `/import/process` in a new `backend/src/routes/import-route.js` |
| `backend/src/services/import/validator.js` *(legacy `validateAndTransform`, `transformCustomer`, `transformProduct`, `transformOrder`)* | Hardcoded per-entity validation/transforms | `schemaMapper.js` + new `validator.js` with dynamic mapping |
| `frontend/frontend/src/pages/ImportDataPage.jsx` *(old multi-step CSV wizard)* | Legacy 6-step CSV-only wizard | New unified `ImportDataPage.jsx` with AI analysis |
| `frontend/frontend/src/pages/DatabaseSetupPage.jsx` | Separate DB setup page | Merged into the unified import wizard |
| `frontend/frontend/src/pages/OnboardingPage.jsx` | Redundant onboarding choice | Merged into the registration flow |
| `frontend/frontend/src/pages/TestPage.jsx` | Leftover test page | N/A — just dead weight |

Note: the original list also flagged the old `import-route.js` a second time for its legacy `importCustomers`/`importProducts`/`importOrders` functions — same file as row 1 above, replaced by the unified `confirmImport` in `import/index.js`.

**Delete commands:**
```bash
# Backend - old import route (a NEW one replaces it)
rm backend/src/routes/import-route.js

# Frontend - old pages
rm frontend/frontend/src/pages/ImportDataPage.jsx      # OLD - replaced by NEW version
rm frontend/frontend/src/pages/DatabaseSetupPage.jsx   # REMOVED - merged into wizard
rm frontend/frontend/src/pages/OnboardingPage.jsx      # REMOVED - merged into registration
rm frontend/frontend/src/pages/TestPage.jsx            # Test file
```

⚠️ **Sequencing matters:** delete the old `import-route.js` and `ImportDataPage.jsx` only *after* their replacements (same filenames) are written and working — don't delete first or you'll break the build mid-plan.

### 4.2 Files to Keep (Core Infrastructure — Untouched)

Everything below stays as-is. This list is deduplicated from the original (which repeated several services/routes 2–3 times each).

**Core / DB**
- `prisma/schema.prisma`, `prisma/seed.ts`
- `backend/src/lib/prisma.ts`
- `backend/src/config/aiClient.js` (Groq client, reused)

**Auth**
- `backend/src/services/authService.js`
- `backend/src/middleware/auth.js`
- `backend/src/routes/auth-route.js`
- `frontend/frontend/src/context/AuthContext.jsx`

**Campaigns & Opportunities**
- `backend/src/services/opportunityEngine.js`
- `backend/src/services/replenishment-intervalService.js`
- `backend/src/services/discountClassifier.js`
- `backend/src/services/policyEngine.js`
- `backend/src/services/campaignService.js`
- `backend/src/services/campaignSimulator.js`
- `backend/src/services/orchestrator.js`
- `backend/src/services/approvalService.js`
- `backend/src/routes/campaign-route.js`, `campaigns-route.js`, `approval-route.js`, `customer-route.js`, `opportunities-route.js`, `orchestrator-route.js`, `policy-route.js`

**Notifications & Payments**
- `backend/src/services/notificationService.js`
- `backend/src/services/emailService.js`
- `backend/src/services/schedulerService.js`
- `backend/src/services/razorpayService.js`
- `backend/src/services/autoNotificationService.js`
- `backend/src/routes/razorpay-execution-route.js`
- `backend/src/routes/notificationPrefsRoute.js`

**Import pipeline — pieces that survive unchanged**
- `backend/src/services/import/index.js` (unified orchestrator)
- `backend/src/services/import/fileParser.js`
- `backend/src/services/import/dataProfiler.js`
- `backend/src/services/import/schemaMapper.js`
- (new) `backend/src/services/import/validator.js`
- (new) `backend/src/routes/import-route.js`
- All the new files from Section 3.1–3.3 (`schemaRegistry.js`, `embeddingService.js`, `semanticMatcher.js`, `schemaDiffer.js`, `feedbackLoop.js`, `driftDetector.js`, `calibrator.js`, `schema-route.js`, and the 5 new frontend components + new `ImportDataPage.jsx`)

**Frontend — general**
- `frontend/frontend/src/pages/DashboardPage.jsx`, `CampaignsPage.jsx`, `CampaignResultsPage.jsx`, `AuditTrailPage.jsx`, `OpportunitiesPage.jsx`, `OpportunityDetailPage.jsx`, `RegisterPage.jsx`, `LoginPage.jsx`
- `frontend/frontend/src/components/*` (all existing UI components)
- `frontend/frontend/src/api/client.js`
- `frontend/frontend/src/App.jsx`, `main.jsx`, `index.css`

**Project-level**
- `scripts/generate-demo-data.js`, `docker-compose.yml`, `package.json`, `prisma.config.ts`, `.env`, `readme.md`, `prd.md`

Note: the original list marked `OnboardingPage.jsx` both "delete" (4.1) and "keep for now, merge later" — treat it as **delete once the registration flow absorbs it**, not before.

### 4.3 Verification Checklist (Run After Cleanup)

```bash
# 1. Backend builds
cd backend && npm run build   # or npx tsc --noEmit

# 2. Frontend builds
cd frontend/frontend && npm run build

# 3. Database migrations apply
npx prisma migrate deploy

# 4. Dev servers start
npm run dev   # both backend and frontend
```

### 4.4 Cleanup Summary

| Action | Count |
|---|---|
| Files to **DELETE** | 4 (old import route + 3 frontend pages) — see 4.1 for the full 6-item delete list including the test page |
| Files to **CREATE** | 18 (12 backend services/routes, 6 frontend components/pages) |
| Files to **MODIFY** | 6 (`prisma/schema.prisma`, `import/index.js`, `dataProfiler.js`, `schemaMapper.js`, `validator.js`, `import-route.js`) |
| Files to **KEEP** untouched | ~60+ (core business logic, auth, campaigns, opportunities, UI components) |

**Net effect:** −4 files removed, +18 new files added → a smaller, more maintainable import pipeline despite the net file count going up.

---

## 5. Hourly Timeline

### Day 1

| Time | Task |
|---|---|
| 0:00–0:30 | Fix syntax error, clear caches, verify build |
| 0:30–2:30 | Schema Registry + Embedding Service |
| 2:30–4:30 | Semantic Matcher + Integration |
| 4:30–6:00 | Schema Differ + Migration Generator |
| 6:00–7:30 | Schema Registry API + Enhanced AI Mapper |
| 7:30–9:00 | Schema Diff API + Enhanced AI Mapper (continued) |
| 9:00–10:30 | Integration testing of Day 1 backend |

### Day 2

| Time | Task |
|---|---|
| 0:00–2:00 | Feedback Loop + Drift Detector + Extensions |
| 2:00–3:30 | Confidence Calibrator + DB Migrations |
| 3:30–5:00 | Fix Frontend syntax + Unified Import Wizard |
| 5:30–7:30 | Schema Diff Viewer + Mapping Table + Confidence UI |
| 7:30–9:00 | Drift Banner + Semantic Reason + E2E Tests |
| 9:00–10:00 | Documentation + Monitoring + Final verification |

---

## 6. Success Criteria (Definition of Done)

| Metric | Target |
|---|---|
| Build passes | ✅ `npm run build` passes, zero errors |
| Auto-map exact columns | 100% confidence |
| Fuzzy rename (`cust_email` → `email`) | ≥ 0.85 confidence |
| Semantic synonym (`client_email` → `email`) | ≥ 0.8 confidence |
| Extra columns | Gracefully ignored |
| Missing required fields | Clear validation error |
| XLSX multi-sheet | Auto-detect correct sheet |
| JSON nested | Flatten + map |
| Schema drift | Warning + migration preview |
| Custom fields | Mapped via extensions |
| Feedback correction | Improves next mapping |

*(Original doc listed "Build passes" twice; consolidated to one row.)*

---

## 7. Risk Mitigation

| Risk | Probability | Mitigation |
|---|---|---|
| Embedding model too slow | Medium | Use local `@xenova/transformers` (runs in Node) |
| Groq rate limits | Low | Batch AI calls, cache embeddings |
| pgvector not available | Low | Use in-memory HNSW (`hnswlib-node`) |
| Schema introspection slow | Low | Cache schema, refresh on migration |
| Frontend build breaks | High | Fix syntax error FIRST |

---

## 8. Dependencies to Add

```json
{
  "dependencies": {
    "@xenova/transformers": "^2.17.0",  // Local embeddings
    "hnswlib-node": "^2.0.0",           // In-memory vector search
    "pgvector": "^0.2.0"                // If using pgvector
  }
}
```

---

## 9. Deliverables

- **Day 1 deliverable:** Working semantic matcher that beats the exact-match baseline.
- **Day 2 deliverable:** Production-ready unified import with drift detection + learning.

**Bottom line:** The existing codebase is ~80% there. The missing 20% is semantic understanding + continuous learning. This plan closes that gap in 48 hours.
