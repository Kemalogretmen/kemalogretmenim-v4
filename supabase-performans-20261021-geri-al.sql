-- Optional operator rollback for the 19 policy optimizations and two indexes.
-- Keeps PT409 and the corrected administrator-only health report in place.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
alter policy "aquarium_account_owner" on public."aquarium_accounts" using (((owner_id = auth.uid()) AND current_user_is_teacher()));
alter policy "aquarium_live_owner" on public."aquarium_live_state" using (((owner_id = auth.uid()) AND current_user_is_teacher()));
alter policy "aquarium_owner" on public."aquarium_shares" using (((owner_id = auth.uid()) AND current_user_is_teacher())) with check (((owner_id = auth.uid()) AND current_user_is_teacher()));
alter policy "aquarium_child_owner" on public."aquarium_student_links" using ((current_user_is_teacher() AND (EXISTS ( SELECT 1
 FROM aquarium_shares a
 WHERE ((a.id = aquarium_student_links.share_id) AND (a.owner_id = auth.uid())))))) with check ((current_user_is_teacher() AND (EXISTS ( SELECT 1
 FROM aquarium_shares a
 WHERE ((a.id = aquarium_student_links.share_id) AND (a.owner_id = auth.uid()))))));
alter policy "user_content_progress delete own" on public."user_content_progress" using ((auth.uid() = user_id));
alter policy "user_content_progress insert own" on public."user_content_progress" with check ((auth.uid() = user_id));
alter policy "user_content_progress parent read linked students" on public."user_content_progress" using ((EXISTS ( SELECT 1
 FROM parent_student_links l
 WHERE ((l.parent_id = auth.uid()) AND (l.status = 'active'::text) AND (l.student_profile_id = user_content_progress.user_id)))));
alter policy "user_content_progress read own" on public."user_content_progress" using ((auth.uid() = user_id));
alter policy "user_content_progress teacher read assigned students" on public."user_content_progress" using ((EXISTS ( SELECT 1
 FROM teacher_class_students s
 WHERE ((s.teacher_id = auth.uid()) AND (s.status <> 'removed'::text) AND (s.student_profile_id = user_content_progress.user_id)))));
alter policy "user_content_progress update own" on public."user_content_progress" using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
alter policy "user_profiles insert own profile" on public."user_profiles" with check ((auth.uid() = id));
alter policy "user_profiles parent teacher student read related" on public."user_profiles" using (((id = auth.uid()) OR (EXISTS ( SELECT 1
 FROM parent_student_links l
 WHERE ((l.status = ANY (ARRAY['pending'::text, 'active'::text])) AND (((l.parent_id = auth.uid()) AND ((user_profiles.id = l.student_profile_id) OR (user_profiles.id = l.teacher_id))) OR ((l.student_profile_id = auth.uid()) AND (user_profiles.id = l.parent_id)) OR ((l.teacher_id = auth.uid()) AND ((user_profiles.id = l.parent_id) OR (user_profiles.id = l.student_profile_id)))))))));
alter policy "user_profiles read own profile" on public."user_profiles" using ((auth.uid() = id));
alter policy "user_profiles update own profile" on public."user_profiles" using ((auth.uid() = id)) with check ((auth.uid() = id));
alter policy "parent_student_links read related" on public."parent_student_links" using (((parent_id = auth.uid()) OR (student_profile_id = auth.uid()) OR (teacher_id = auth.uid())));
alter policy "teacher_class_students teacher update own" on public."teacher_class_students" using (((teacher_id = auth.uid()) OR (student_profile_id = auth.uid()))) with check (((teacher_id = auth.uid()) OR (student_profile_id = auth.uid())));
alter policy "teacher_class_students parent read linked" on public."teacher_class_students" using ((EXISTS ( SELECT 1
 FROM parent_student_links l
 WHERE ((l.parent_id = auth.uid()) AND (l.status = 'active'::text) AND (l.student_membership_id = teacher_class_students.id)))));
alter policy "teacher_class_students teacher read own" on public."teacher_class_students" using (((teacher_id = auth.uid()) OR (student_profile_id = auth.uid())));
alter policy "teacher_class_students teacher insert own" on public."teacher_class_students" with check (((teacher_id = auth.uid()) AND current_user_is_teacher() AND (EXISTS ( SELECT 1
 FROM teacher_classes c
 WHERE ((c.id = teacher_class_students.class_id) AND (c.teacher_id = auth.uid()) AND (c.status = 'active'::text))))));
CREATE UNIQUE INDEX idx_content_reactions_unique ON public.content_reactions USING btree (content_type, content_id, visitor_id);
CREATE UNIQUE INDEX idx_user_content_progress_unique ON public.user_content_progress USING btree (user_id, content_type, content_id);
commit;
