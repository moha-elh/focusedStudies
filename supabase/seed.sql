-- Local test data only: `npm run db:reset` loads it into the local database. Never runs against production.
-- Sign in at http://localhost:3000/login with the local test account: test@focuslearn.dev / focuslearn

-- The test user, as Supabase Auth stores an email + password sign-up.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
values ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated',
  'test@focuslearn.dev', extensions.crypt('focuslearn', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{"name":"Test learner"}', now(), now(), '', '', '', '');

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111',
  '{"sub":"11111111-1111-4111-8111-111111111111","email":"test@focuslearn.dev","email_verified":true}', 'email', now(), now(), now());

-- A library with a mix: graded videos, one still being watched, two folders and an empty one.
insert into public.sessions (user_id, video_id, title, recap, feedback, notes, folder, created_at, updated_at) values
  ('11111111-1111-4111-8111-111111111111', 'aircAruvnKk', 'But what is a neural network? | Deep learning chapter 1',
   'A network is layers of neurons; each holds a number and the weights decide how one layer lights up the next.',
   '{"score":84,"summary":"Clear picture of layers and weights. You skipped what biases do.","covered":[{"text":"Neurons hold activations between 0 and 1","t":120}],"missed":[{"text":"Biases shift when a neuron activates","t":560}],"incorrect":[]}',
   '[{"t":95,"text":"Each neuron = a number"},{"t":610,"text":"Weights + bias, then sigmoid"}]', 'Machine learning', now() - interval '6 days', now() - interval '5 days'),
  ('11111111-1111-4111-8111-111111111111', 'IHZwWFHWa-w', 'Gradient descent, how neural networks learn | Deep learning chapter 2',
   'The cost says how wrong the network is, and gradient descent nudges every weight downhill to lower it.',
   '{"score":71,"summary":"Good on the cost function. Backpropagation came out a bit vague.","covered":[{"text":"The cost function averages the error","t":300}],"missed":[{"text":"The gradient points to the steepest increase","t":700}],"incorrect":[]}',
   '[{"t":300,"text":"Cost = sum of squared errors"}]', 'Machine learning', now() - interval '4 days', now() - interval '3 days'),
  ('11111111-1111-4111-8111-111111111111', 'WUvTyaaNkzM', 'The essence of calculus',
   'Calculus is about slicing things into tiny pieces: areas under curves and rates of change are two sides of one idea.',
   '{"score":62,"summary":"You have the big idea. Make the link between the two halves explicit.","covered":[{"text":"Area of a circle from thin rings","t":180}],"missed":[{"text":"The fundamental theorem ties derivatives and integrals","t":900}],"incorrect":[]}',
   '[]', 'Math', now() - interval '2 days', null),
  ('11111111-1111-4111-8111-111111111111', 'rfscVS0vtbw', 'Learn Python - Full Course for Beginners', '', null,
   '[{"t":42,"text":"print() shows output"},{"t":1310,"text":"Lists are zero-indexed"}]', null, now() - interval '1 day', now() - interval '2 hours');

insert into public.folders (user_id, name) values
  ('11111111-1111-4111-8111-111111111111', 'Machine learning'),
  ('11111111-1111-4111-8111-111111111111', 'Math'),
  ('11111111-1111-4111-8111-111111111111', 'Reading list');

-- The test user is an admin locally, so /admin works. In production, add yourself with the insert in the migration.
insert into public.admins (user_id) values ('11111111-1111-4111-8111-111111111111');

-- 30 days of made-up traffic so the dashboard has something to draw.
insert into public.events (at, user_id, visitor, name, path, referrer)
select now() - make_interval(days => d, hours => (random() * 20)::int),
  case when random() < 0.3 then '11111111-1111-4111-8111-111111111111'::uuid end,
  'visitor-' || (random() * (20 + d))::int,
  'page_view',
  (array['/', '/', '/', '/library', '/watch/[id]', '/watch/[id]', '/login', '/privacy'])[1 + (random() * 7)::int],
  case when random() < 0.25 then (array['google.com', 'youtube.com', 'x.com', 'reddit.com'])[1 + (random() * 3)::int] end
from generate_series(0, 29) d, generate_series(1, 40) n
where n < 8 + 30 * (1 - d / 30.0) * random(); -- busier lately, a different count each day

insert into public.events (at, visitor, name, path, detail) values
  (now() - interval '3 hours', 'visitor-3', 'client_error', '/watch/[id]', 'TypeError: Cannot read properties of undefined (reading ''getCurrentTime'')'),
  (now() - interval '2 days', 'visitor-9', 'client_error', '/library', 'ChunkLoadError: Loading chunk 412 failed.');

insert into public.feedback (message, page) values
  ('Would love a dark mode for late-night studying.', '/watch/aircAruvnKk'),
  ('The grading said I missed something I definitely mentioned.', '/library');
