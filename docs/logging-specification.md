# Aiki Logging Specification

Every event must include: `userId`, `inviteCode`, `featureFlags` (full object), `eventType`, `timestamp`.

---

## Interventions

- Time-wasting site visited (domain, whether prompt was shown or immediate redirect, whether blocked by operating hours / global lock / daily goal already met)
- Prompt shown (domain)
- Prompt response: stay or redirect (domain)
- Prompt failed to connect (domain)

---

## Sessions

- Session started (session ID, type: learning / timeWasting / voluntary, site domain, trigger domain, goal seconds)
- Session ended (session ID, type, site domain, duration seconds, goal seconds, completed, reason: skip / continue / tab\_closed / tab\_switch / extension\_disabled / reward\_claimed / goal\_met)
- Daily learning goal reached (goal seconds, total progress seconds)

---

## Reward

- Reward started (source: claim\_button / auto\_goal\_met, duration seconds, site domain)
- Reward ended (duration seconds)

---

## Settings changes

- Any setting changed (key, old value, new value)

---

## Extension lifecycle

- Installed
- Enabled / disabled
