# Storage-Policies (storage.objects)

| Policy | Cmd | Bedingung |
|---|---|---|
| Admins lesen alle Verifizierungsdokumente | SELECT | bucket_id = 'verification-docs' AND Admin (profiles.role = 'admin') |
| Trainer Dokumente Lesen | SELECT | bucket_id = 'trainer-documents' (**keine Nutzer-Einschränkung**) |
| Trainer Dokumente Upload | INSERT | bucket_id = 'trainer-documents' (**keine Nutzer-Einschränkung**) |
| Trainer lesen eigene Dokumente | SELECT | bucket_id = 'verification-docs' AND erster Ordner = auth.uid() |
| Trainer löschen eigene Dokumente | DELETE | bucket_id = 'verification-docs' AND erster Ordner = auth.uid() |
| Trainer upload eigene Dokumente | INSERT | bucket_id = 'verification-docs' AND erster Ordner = auth.uid() |

Buckets: `avatars` (öffentlich, 5 MB, JPG/PNG/WebP) wurde in der Release-Polish-Migration für Staging angelegt.
Der Upload ist nur im eigenen Ordner `<auth.uid()>/` erlaubt; öffentliche Leser können nur Avatar-Dateien lesen.
`verification-docs` bleibt privat und wird weiterhin über Signed URLs genutzt. Ausweis-Uploads und Security-Advisor-Export sind weiterhin offen.
