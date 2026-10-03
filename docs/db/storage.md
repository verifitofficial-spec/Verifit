# Storage-Policies (storage.objects)

| Policy | Cmd | Bedingung |
|---|---|---|
| Admins lesen alle Verifizierungsdokumente | SELECT | bucket_id = 'verification-docs' AND Admin (profiles.role = 'admin') |
| Trainer Dokumente Lesen | SELECT | bucket_id = 'trainer-documents' (**keine Nutzer-Einschränkung**) |
| Trainer Dokumente Upload | INSERT | bucket_id = 'trainer-documents' (**keine Nutzer-Einschränkung**) |
| Trainer lesen eigene Dokumente | SELECT | bucket_id = 'verification-docs' AND erster Ordner = auth.uid() |
| Trainer löschen eigene Dokumente | DELETE | bucket_id = 'verification-docs' AND erster Ordner = auth.uid() |
| Trainer upload eigene Dokumente | INSERT | bucket_id = 'verification-docs' AND erster Ordner = auth.uid() |

Buckets (Abfrage `select id, name, public, file_size_limit, allowed_mime_types from storage.buckets;`): noch nicht exportiert.
Fehlend: Bucket `avatars`, Bucket für Ausweis-Uploads, Limits für Größe/MIME.
