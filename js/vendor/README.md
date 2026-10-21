# Supabase browser client

- Version: 2.118.0 (the same version returned by the site's existing `@supabase/supabase-js@2` CDN URL during investigation on 21 October 2026).
- Source: https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js
- License: MIT, adjacent `supabase-2.118.0.LICENSE`.
- SHA-256 of the copied browser bundle: `bee24fc29228ed5a370f76a2ba1ca3c399549edad2fef23453c80148856a49af`.

The aquarium loads this local copy before `user-auth.js`, avoiding a blocking dependency on an external CDN during sign-in. Session persistence, access rules, endpoints and storage keys are unchanged. Updating this file is explicit; the versioned filename prevents accidental mixed caches.
