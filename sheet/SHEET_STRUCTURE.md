# Google Sheet structure

You do **not** need to build these tabs by hand. Run `setupSheets()` once from the Apps Script editor and it
creates every tab with the right headers. This file is a reference.

Keep the Sheet **private** (only you). The web app runs as you, so nobody else needs access to the Sheet itself.
Never edit the `Users` or `Sessions` tabs by hand.

| Tab | Columns | Purpose |
|---|---|---|
| Users | username, fullName, role, passwordHash, salt, active, createdAt, facultyId, department | Accounts. Role is `admin`, `chair` or `faculty`. Passwords are stored only as salted hashes. `department` is what a chair supervises. `facultyId` links a faculty account to its Faculty row. |
| Sessions | token, username, role, fullName, expiresAt | Active logins (6 hours). Expired rows are cleaned up at login. |
| Settings | key, value | `schoolYear` (printed on the IDP) and `manual`. Edit the value cells to change them. |
| Faculty | facultyId, name, rank, department, username, createdAt, updatedAt | One row per faculty member (created together with their account). |
| Assessments | facultyId, source, ratings, remarks, assessor, updatedAt | `source` = `self` (Annex D) or `chair` (Annex C). `ratings` is JSON like `{"q1_1":3,...}`. |
| LnsSurvey | facultyId, topics, modality, schedule, updatedAt | Annex G. `topics` is JSON `{"d1":"...","d2":"..."}` (one topic per domain). |
| Idp | facultyId, goal1, interv1, supp1, time1, goal2, interv2, supp2, time2, chairName, updatedAt | Annex I, Part III (faculty) and the chair sign-off name. |
| AuditLog | time, username, action, detail | Who did what. Passwords are never logged. |

## Roles

| Role | Tabs in the app | Can do |
|---|---|---|
| faculty | Annex D, Annex G, Annex I | Fill their **own** self-assessment, learner needs survey and IDP goals. Read their own chair rating. |
| chair | Annex C, Annex I, Analytics | Rate faculty of **their own department**, sign off their IDP, see department analytics. |
| admin | Analytics, Annex I, Users & activity log | Read everything (all departments), manage accounts. Admin does not rate anyone. |
