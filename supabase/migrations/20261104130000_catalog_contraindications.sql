-- V12-06 (RF-035, TRN-03 §5): revisão de marcadores, contraindicações explícitas e escrita delas
-- em exercícios personalizados (TELA-036). Heurística conservadora, não orientação clínica.
grant insert, delete on public.exercise_contraindications to sync_writer;
create policy exercise_contraindications_custom_insert on public.exercise_contraindications
  for insert to sync_writer with check (app.owns_custom_exercise(exercise_id));
create policy exercise_contraindications_custom_delete on public.exercise_contraindications
  for delete to sync_writer using (app.owns_custom_exercise(exercise_id));

-- Seed gerado por scripts/catalog/seed-sql.ts --seguranca.
update public.exercises set load_markers = array['axial_spine_load', 'deep_knee_flexion_loaded', 'wrist_loaded_extension', 'technical_high', 'hip_deep_flexion_loaded']::text[] where id = 'cc3641d2-5783-589e-9012-f2d66cdc2685';
update public.exercises set load_markers = array['deep_knee_flexion_loaded', 'hip_deep_flexion_loaded']::text[] where id = '1cfa3e6b-3cb9-5bfc-aa1f-71c19fa2a8ee';
update public.exercises set load_markers = array['deep_knee_flexion_loaded', 'axial_spine_load', 'hip_deep_flexion_loaded']::text[] where id = '3c0448f4-6774-5b56-b509-5d58541945db';
update public.exercises set load_markers = array['axial_spine_load', 'deep_knee_flexion_loaded', 'hip_deep_flexion_loaded']::text[] where id = '19e3396c-e15c-59f7-a255-3c2f8a988163';
update public.exercises set load_markers = array['deep_knee_flexion_loaded', 'ankle_loaded']::text[] where id = '6ab951ec-abdb-5085-bf6d-914570126664';
update public.exercises set load_markers = array['axial_spine_load', 'deep_knee_flexion_loaded', 'ankle_loaded', 'technical_high']::text[] where id = 'd9176df4-239d-52fc-946c-6a5c855e8beb';
update public.exercises set load_markers = array['deep_knee_flexion_loaded', 'ankle_loaded']::text[] where id = 'e6668fa6-b460-52f2-9006-c9cc2bbe8751';
update public.exercises set load_markers = array['deep_knee_flexion_loaded', 'ankle_loaded']::text[] where id = 'd4a0347f-644c-5bb7-92d8-2e00a8224e75';
update public.exercises set load_markers = array['deep_knee_flexion_loaded', 'hip_deep_flexion_loaded']::text[] where id = '16a58a2c-5ff7-5a49-b31a-1552afcf5a7e';
update public.exercises set load_markers = array['technical_high']::text[] where id = '3001dffb-44f0-5f40-a609-a37a840e8b04';
update public.exercises set load_markers = array['axial_spine_load', 'ankle_loaded']::text[] where id = 'ba1b3f33-8ef6-5311-92cd-8eaddf5bdf70';
update public.exercises set load_markers = array['ankle_loaded']::text[] where id = '2f2f4492-10c9-573f-b208-dd076a6a8eba';
update public.exercises set load_markers = array['ankle_loaded']::text[] where id = '804f40c1-9206-5962-8c08-7d32fdd5c327';
update public.exercises set load_markers = array['ankle_loaded']::text[] where id = '060c3f48-3394-5abd-beeb-5a4c89c6f37c';
update public.exercises set load_markers = array['overhead', 'axial_spine_load']::text[] where id = 'a058997e-6eb3-50ce-b217-7e21c07f3663';

insert into public.exercise_contraindications (exercise_id, restriction_code) values
  ('73a5d562-b180-503d-9ad5-e646bbbea4ab', 'shoulder'),
  ('3567e9e4-f577-5e04-9b0a-f8ee03c914f6', 'shoulder'),
  ('96442052-1130-5eb5-ac2a-525e01a35261', 'shoulder'),
  ('951633d1-d6d5-5888-ba14-0c88ae791ab5', 'shoulder'),
  ('05e47a08-dc06-5d29-8bd9-6ebcb1d4dcd2', 'elbow'),
  ('25e3f466-75cd-5fee-9d8a-4718639e0934', 'shoulder'),
  ('95c0bee1-3a87-5f97-aea3-32ce4a14b5bc', 'neck'),
  ('2c5d0d8d-51ca-52d2-a2f5-45ac01eb24f2', 'shoulder'),
  ('abe8f757-012b-58b3-b5cd-4f4d820309f8', 'shoulder'),
  ('5ac2f521-00ac-52bc-8559-1ccc2622d68b', 'shoulder'),
  ('f7958170-b6ed-5d4d-9967-56a6f89bf8eb', 'shoulder'),
  ('c1e685a2-8395-5507-a794-4b1ac2d0288c', 'neck'),
  ('c1e685a2-8395-5507-a794-4b1ac2d0288c', 'thoracic'),
  ('c1e685a2-8395-5507-a794-4b1ac2d0288c', 'lower_back'),
  ('2ea0bf62-42fe-541c-8af2-5f5b6787607a', 'knee'),
  ('526ac580-d49b-5fe0-bc3a-33847ba1831a', 'knee'),
  ('526ac580-d49b-5fe0-bc3a-33847ba1831a', 'ankle'),
  ('d4a0347f-644c-5bb7-92d8-2e00a8224e75', 'hip'),
  ('62240686-2942-5c2a-8acb-2bf2f7b8e14d', 'knee'),
  ('3001dffb-44f0-5f40-a609-a37a840e8b04', 'lower_back'),
  ('3001dffb-44f0-5f40-a609-a37a840e8b04', 'knee'),
  ('c0e12aa4-85fc-527a-b71d-b4db85a383bb', 'lower_back'),
  ('3becb61f-a100-51d0-8175-e51334937479', 'lower_back'),
  ('7032d635-010f-5b94-b6b2-8af24de2aaf6', 'lower_back'),
  ('7032d635-010f-5b94-b6b2-8af24de2aaf6', 'hip'),
  ('4dadb079-e427-519c-8030-1afcb9b1d305', 'lower_back'),
  ('8203f60f-f293-550a-b4ae-cff5f753c2c1', 'hip'),
  ('cc410b31-1393-5720-bc2e-9de55ce2d2f9', 'hip'),
  ('821a6fb8-6602-5adf-8537-015bb556f214', 'wrist'),
  ('2769a12d-d06d-5afa-9a8d-4cb9c6e62412', 'elbow'),
  ('2769a12d-d06d-5afa-9a8d-4cb9c6e62412', 'wrist'),
  ('9bd8a00f-7498-56d2-a6e9-d4decc7e8a84', 'wrist'),
  ('f82a6e59-ccff-5001-bef5-c1792c2cd3e9', 'wrist'),
  ('f4e786d4-6186-52f2-a888-9d216b19b535', 'wrist'),
  ('f4e786d4-6186-52f2-a888-9d216b19b535', 'neck'),
  ('f4e786d4-6186-52f2-a888-9d216b19b535', 'lower_back'),
  ('f4e786d4-6186-52f2-a888-9d216b19b535', 'ankle'),
  ('a61cfdc4-6c9f-53b9-804c-4976df336280', 'elbow'),
  ('a058997e-6eb3-50ce-b217-7e21c07f3663', 'elbow'),
  ('002883e5-c011-510c-9de5-8a65195fd31f', 'elbow'),
  ('0493a64a-2a1f-535f-9ca0-ca372cc813d9', 'elbow'),
  ('f53ff083-da31-5d75-9c81-d5774ec8672f', 'neck'),
  ('f53ff083-da31-5d75-9c81-d5774ec8672f', 'lower_back'),
  ('b8ce15a6-538f-5ee7-b6e1-273ecb950270', 'lower_back'),
  ('b8ce15a6-538f-5ee7-b6e1-273ecb950270', 'hip'),
  ('fa63444f-fcff-5057-88a3-caedc980c75d', 'shoulder'),
  ('fa63444f-fcff-5057-88a3-caedc980c75d', 'lower_back'),
  ('fa63444f-fcff-5057-88a3-caedc980c75d', 'hip'),
  ('d1648501-0790-5530-8b77-d246e3899c31', 'lower_back'),
  ('d1648501-0790-5530-8b77-d246e3899c31', 'hip'),
  ('96e11940-48f5-5f74-9ee3-229dc125106d', 'neck'),
  ('96e11940-48f5-5f74-9ee3-229dc125106d', 'thoracic'),
  ('96e11940-48f5-5f74-9ee3-229dc125106d', 'lower_back');
