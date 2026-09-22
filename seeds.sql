-- Example content so the site is not empty at launch.
--
-- Every row here is marked is_seed = 1 and is LABELLED IN THE TEXT ITSELF as an example.
-- These are composites written for the launch, not real people's accounts — publishing
-- invented testimony as if it were real would poison the one thing this project has.
--
-- Delete them the moment real stories land:
--   wrangler d1 execute lyme-db --remote --command "DELETE FROM stories WHERE is_seed = 1"

INSERT INTO stories
  (slug, display_name, state, onset_year, title, body, consent_publish, consent_social,
   status, approved_at, is_seed, manage_token)
VALUES
('example-eleven-doctors-1', 'Example Story', 'Connecticut', 2016,
 'Eleven doctors before anyone tested me',
 'EXAMPLE STORY — this is placeholder content written for the site launch, not a real person''s account. It will be replaced by genuine submissions.

It started with a summer where I could not get warm. Then the joint pain, then the weeks where I would lose a word mid-sentence and have to describe the thing instead of naming it.

I saw eleven doctors over two years. I was told it was stress, then perimenopause, then fibromyalgia, then anxiety. One of them asked whether I had a lot going on at home. Nobody ran a Lyme test, because I never found a tick and I never had the bullseye rash — and it turns out most people do not.

By the time somebody finally tested me I had stopped working. I am better now than I was. I am not the person I was in 2015, and I have stopped expecting to be.

What I want is simple. I want the test to be better, I want doctors to stop treating a negative result as the end of the conversation, and I want somebody to count us properly.',
 1, 0, 'approved', datetime('now', '-6 days'), 1, 'seed-token-000000000001'),

('example-my-son-was-nine-2', 'Example Story', 'Pennsylvania', 2019,
 'My son was nine when the headaches started',
 'EXAMPLE STORY — this is placeholder content written for the site launch, not a real person''s account. It will be replaced by genuine submissions.

He was a kid who never sat still and then he was a kid who slept fourteen hours and cried about the light. Three months of headaches before anyone said the word Lyme.

The hardest part was not the illness. It was the year of being told, gently and repeatedly, that a nine-year-old could not possibly be that tired unless something else was going on at home. You start to doubt what you are seeing with your own eyes.

He is fourteen now and doing well. I still think about the families who gave up at month two because a doctor made them feel foolish for asking again.',
 1, 0, 'approved', datetime('now', '-3 days'), 1, 'seed-token-000000000002'),

('example-i-was-the-lucky-one-3', 'Example Story', 'Minnesota', 2021,
 'I was the lucky one, and it still took eight months',
 'EXAMPLE STORY — this is placeholder content written for the site launch, not a real person''s account. It will be replaced by genuine submissions.

I want to be clear that my case is the good outcome. I found the tick. I had the rash. I got treated and I recovered.

It still took eight months to get back to work, and I spent most of that time being told that because I had been treated, whatever I was still feeling was not Lyme disease any more. Maybe that is true. Nobody could tell me what it was instead.

I am signing because the argument about what to call it has been going on for forty years while people wait, and because the government has records about tick research from the 1950s that three separate sessions of Congress have asked to see. Publish them. If there is nothing in them, that is an answer too.',
 1, 0, 'approved', datetime('now', '-1 days'), 1, 'seed-token-000000000003');
