tablename,policyname,permissive,roles,cmd,qual,with_check
bookings,bookings_read_participants,PERMISSIVE,{authenticated},SELECT,((auth.uid() = client_id) OR (auth.uid() = trainer_id) OR is_admin()),null
client_trackings,Erlaube allen Zugriff auf client_trackings,PERMISSIVE,{public},ALL,true,true
clients,Clients können eigenes Profil lesen,PERMISSIVE,{authenticated},ALL,(auth.uid() = id),(auth.uid() = id)
clients,Users can insert their own client profile.,PERMISSIVE,{authenticated},INSERT,null,(auth.uid() = id)
foods,Öffentlicher Lesezugriff für Foods,PERMISSIVE,{public},SELECT,true,null
messages,Users can insert messages,PERMISSIVE,{public},INSERT,null,(auth.uid() = sender_id)
messages,Users can view their own messages,PERMISSIVE,{public},SELECT,((auth.uid() = sender_id) OR (auth.uid() = receiver_id)),null
profiles,Users can read own profile,PERMISSIVE,{authenticated},SELECT,(auth.uid() = id),null
trainer_offers,offers_read,PERMISSIVE,{public},SELECT,"((is_active AND (EXISTS ( SELECT 1
   FROM trainers t
  WHERE ((t.id = trainer_offers.trainer_id) AND (t.status = 'approved'::text))))) OR (auth.uid() = trainer_id) OR is_admin())",null
trainer_offers,offers_trainer_write,PERMISSIVE,{authenticated},ALL,(auth.uid() = trainer_id),(auth.uid() = trainer_id)
trainer_slots,slots_public_read,PERMISSIVE,{public},SELECT,true,null
trainer_slots,slots_trainer_delete_free,PERMISSIVE,{authenticated},DELETE,((auth.uid() = trainer_id) AND (status = 'free'::text)),null
trainer_slots,slots_trainer_insert,PERMISSIVE,{authenticated},INSERT,null,((auth.uid() = trainer_id) AND (status = 'free'::text))
trainers,Admin update trainers,PERMISSIVE,{authenticated},UPDATE,"(EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))","(EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))"
trainers,Allow public insert,PERMISSIVE,"{anon,authenticated}",INSERT,null,true
trainers,Trainer can update own profile,PERMISSIVE,{authenticated},UPDATE,(email = (auth.jwt() ->> 'email'::text)),(email = (auth.jwt() ->> 'email'::text))
trainers,Trainer dürfen ihren Status nicht selbst ändern,PERMISSIVE,{public},UPDATE,(auth.uid() = id),"((auth.uid() = id) AND (status = ( SELECT trainers_1.status
   FROM trainers trainers_1
  WHERE (trainers_1.id = auth.uid()))))"
trainers,Trainer können sich nur als pending registrieren,PERMISSIVE,{public},INSERT,null,((auth.uid() = id) AND (status = 'pending'::text))
trainers,Öffentlicher Lesezugriff,PERMISSIVE,{public},SELECT,true,null