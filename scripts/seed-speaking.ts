/**
 * Speaking-task seeder.
 *
 * Assignment (from Dilshod, Savynt chat 30 Jun 2026): add IELTS speaking
 * questions to the site. One speaking exam = Part 1 + Part 2 (cue card) +
 * Part 3, sourced from the "IELTS SPEAKING ASSISTANT APP QUESTIONS" channel.
 *
 * Each exam below is a plain {@link BuilderTask} — the exact shape the manual
 * Test Builder posts — lowered via {@link builderToNormalized} and written with
 * the shared {@link persistNormalizedTask} helper, so seeded content is
 * byte-for-byte identical to a coach-authored task. Idempotent by slug.
 *
 * Run against prod:
 *   export DATABASE_URL=$(grep -E '^DATABASE_URL=' .env.local | sed 's/^DATABASE_URL=//' | tr -d '"' | tr -d "'")
 *   npx tsx scripts/seed-speaking.ts
 *
 * ─── SOURCE MAP (channel @IELTS_Speaking_Assistant_App, read via ?embed=1&mode=tme) ───
 * Exam N = Part1[N] + Part2[N] + Part3[N].  Part3 message id = Part2 id + 1.
 *
 * PART 1 ids (48 topics), in order:
 *   3756 3757 3758 3760 3761 3762 3763 3764 3765 3766 3767 3768 3769 3770 3771 3772
 *   3773 3774 3775 3776 3777 3778 3779 3780 3782 3783 3784 3785 3786 3787 3788 3789
 *   3790 3792 3793 3794 3795 3796 3797 3798 3799 3800 3801 3802 3803 3804 3805 3806
 * PART 2 ids (66 topics), in order (Part 3 = id+1):
 *   3834 3836 3839 3841 3843 3845 3847 3849 3851 3853 3855 3857 3859 3861 3863 3865
 *   3867 3869 3871 3873 3875 3877 3879 3881 3883 3885 3887 3889 3891 3893 3895 3899
 *   3901 3903 3905 3907 3909 3911 3913 3915 3917 3919 3921 3923 3925 3927 3929 3931
 *   3933 3935 3937 3939 3941 3943 3945 3947 3949 3951 3953 3955 3957 3959 3961 3963
 *   3965 3967
 *
 * NOTE: every source post is plain text — IELTS Speaking has no images by format
 * (Part 2 is a printed cue card). `imageUrl` stays unset here; it is optional.
 *
 * PROGRESS: Tests 1–16 done (Part1 3756‑3772 / Part2 3834‑3865).
 * NEXT: Test 17 → Part1 3773, Part2 3867, Part3 3868. Target: 50 exams
 * (note: channel has only 48 Part 1 topics, so 49–50 need an alt Part 1 source).
 */

import { prisma } from '@/lib/prisma'
import { persistNormalizedTask } from '@/lib/tasks/persist'
import { builderTaskSchema, builderToNormalized, type BuilderTask } from '@/types/builder'

/** Shorthand: turn a list of prompt strings into builder questions. */
function prompts(list: string[]): BuilderTask['groups'][number]['questions'] {
  return list.map((prompt) => ({
    prompt,
    options: [],
    answerText: '',
    points: 9,
  }))
}

const PART1_INSTRUCTION =
  'Part 1 — Introduction & interview. The examiner asks about yourself and familiar topics. Answer each question in a few sentences.'
const PART2_INSTRUCTION =
  'Part 2 — Long turn. You have 1 minute to prepare (make notes), then speak for 1–2 minutes on the cue card below. The examiner will not interrupt you.'
const PART3_INSTRUCTION =
  'Part 3 — Two-way discussion. The examiner asks broader, more abstract questions related to the Part 2 topic. Explain and justify your opinions.'

// ---------------------------------------------------------------------------
// Exams. Add more objects to this array and re-run — existing ones upsert.
// ---------------------------------------------------------------------------
const EXAMS: BuilderTask[] = [
  {
    title: 'IELTS Speaking — Test 1',
    track: 'IELTS',
    skill: 'SPEAKING',
    type: 'PRACTICE',
    durationMin: 14,
    topics: ['Work and Studies', 'Cities'],
    publish: true,
    groups: [
      {
        type: 'SPEAKING_PROMPT',
        instruction: PART1_INSTRUCTION + ' Topic: Work and Studies.',
        questions: prompts([
          'Do you work or are you a student?',
          'What work do you do? / What subjects are you studying?',
          'Why did you choose that job?',
          'Why did you choose to study that subject?',
          'Do you like your job?',
          'Is there anything you dislike about your job?',
          'What do you like about your studies?',
          'What do you dislike about your studies?',
          'What was your dream job when you were young?',
          'Have you changed your mind on your dream job?',
        ]),
      },
      {
        type: 'SPEAKING_PROMPT',
        instruction: PART2_INSTRUCTION,
        questions: prompts([
          'Describe a city you’ve been to and want to visit again. You should say: what city it was; when you went there; what you did there; and explain why you liked it.',
        ]),
      },
      {
        type: 'SPEAKING_PROMPT',
        instruction: PART3_INSTRUCTION + ' Topic: Cities.',
        questions: prompts([
          'What is the difference between living in the countryside and the city?',
          'Do you prefer to live in the city or in the countryside?',
          'Is it good for elderly people to live in large cities?',
          'Is it possible that all of the population move to cities?',
          'Will people live in the countryside in the future?',
          'Do you think people in the countryside are friendlier than in cities?',
          'What should the government do to improve citizens’ safety?',
          'What changes usually take place in cities and towns?',
          'Are there any changes in your city?',
        ]),
      },
    ],
  },
  {
    title: 'IELTS Speaking — Test 2',
    track: 'IELTS',
    skill: 'SPEAKING',
    type: 'PRACTICE',
    durationMin: 14,
    topics: ['Hometown', 'Being proud'],
    publish: true,
    groups: [
      {
        type: 'SPEAKING_PROMPT',
        instruction: PART1_INSTRUCTION + ' Topic: Hometown & the area you live in.',
        questions: prompts([
          'Please describe your hometown a little.',
          'What is your town well-known for?',
          'Do you like your hometown?',
          'Is that a big city or a small place?',
          'How long have you been living there?',
          'Do you think you will continue living there for a long time?',
          'Would you like to live in the countryside in the future?',
          'Have you ever lived in the countryside?',
          'Do you ever spend time in the countryside?',
          'What is the difference between living in the countryside and the city?',
          'What do people living in the countryside like to do?',
          'What do you like to do in the countryside?',
          'How has your town changed over the last 20 years?',
        ]),
      },
      {
        type: 'SPEAKING_PROMPT',
        instruction: PART2_INSTRUCTION,
        questions: prompts([
          'Describe a family member who did something that made you feel proud. You should say: who this person is; what this person did; and explain why you felt proud of them.',
        ]),
      },
      {
        type: 'SPEAKING_PROMPT',
        instruction: PART3_INSTRUCTION + ' Topic: Being proud.',
        questions: prompts([
          'On what occasions would adults feel proud of themselves?',
          'Is it a good idea to reward children for doing homework or housework?',
          'What would children do to make their parents proud?',
          'What did you do to make your parents proud when you were young?',
          'What advantages of yours make you proud?',
          'When was the last time that you felt proud of yourself?',
          'Is it good to reward children too often?',
        ]),
      },
    ],
  },
  {
    title: 'IELTS Speaking — Test 3',
    track: 'IELTS',
    skill: 'SPEAKING',
    type: 'PRACTICE',
    durationMin: 14,
    topics: ['Home and Accommodation', 'Jobs'],
    publish: true,
    groups: [
      {
        type: 'SPEAKING_PROMPT',
        instruction: PART1_INSTRUCTION + ' Topic: Home & accommodation.',
        questions: prompts([
          'What colour would you choose to paint the walls of your room?',
          'What colour would you never use in your home?',
          'Can you describe the place where you live?',
          'What kind of housing accommodation do you live in?',
          'What do you like about your flat?',
          'Which room does your family spend most of the time in?',
          'What can you see from the windows where you live?',
          'Do you prefer living in a house or a flat?',
          'What would you like to change in your flat?',
          'What do you dislike about your flat?',
        ]),
      },
      {
        type: 'SPEAKING_PROMPT',
        instruction: PART2_INSTRUCTION,
        questions: prompts([
          'Describe your perfect job. You should say: what it is; how you can get this job; what kinds of work you would do for the job; and explain why you want to have it.',
        ]),
      },
      {
        type: 'SPEAKING_PROMPT',
        instruction: PART3_INSTRUCTION + ' Topic: Jobs.',
        questions: prompts([
          'What kind of jobs do children like?',
          'How can people find a perfect job?',
          'What factors should people take into account when choosing a job?',
          'Which is more important when choosing a job, high salary or interest?',
          'Is salary the main reason people choose a certain job?',
        ]),
      },
    ],
  },
  {
    title: 'IELTS Speaking — Test 4',
    track: 'IELTS',
    skill: 'SPEAKING',
    type: 'PRACTICE',
    durationMin: 14,
    topics: ['Reading', 'Mobile phones'],
    publish: true,
    groups: [
      {
        type: 'SPEAKING_PROMPT',
        instruction: PART1_INSTRUCTION + ' Topic: Reading.',
        questions: prompts([
          'Do you like reading?',
          'What books do you like to read?',
          'What book did you read recently?',
          'What did you learn from it?',
          'Do you prefer to read on paper or on a screen?',
          'When do you need to read carefully, and when not?',
          'Do you prefer scanning or detailed reading?',
        ]),
      },
      {
        type: 'SPEAKING_PROMPT',
        instruction: PART2_INSTRUCTION,
        questions: prompts([
          'Describe an experience when you were not allowed to use a mobile phone. You should say: what you did; when it was; where it was; and why you were not allowed to use a mobile phone.',
        ]),
      },
      {
        type: 'SPEAKING_PROMPT',
        instruction: PART3_INSTRUCTION + ' Topic: Mobile phones.',
        questions: prompts([
          'Do young and old people use phones in the same way?',
          'What positive and negative effects do mobile phones have on friendship?',
          'Is it a waste of time to take pictures with mobile phones?',
          'Many people think mobile phones can be annoying at times. Can you give any examples of that?',
          'Do you think there should be laws on the use of mobile phones?',
        ]),
      },
    ],
  },
  {
    title: 'IELTS Speaking — Test 5',
    track: 'IELTS',
    skill: 'SPEAKING',
    type: 'PRACTICE',
    durationMin: 14,
    topics: ['Gifts', 'Fame and children'],
    publish: true,
    groups: [
      {
        type: 'SPEAKING_PROMPT',
        instruction: PART1_INSTRUCTION + ' Topic: Gifts.',
        questions: prompts([
          'What kind of gifts are popular in your country?',
          'What’s the best gift you have ever received?',
          'What do you give others as gifts?',
          'What gift have you received recently?',
          'How do we choose gifts?',
          'Do you think you are good at choosing gifts?',
          'Have you ever sent handmade gifts to others?',
        ]),
      },
      {
        type: 'SPEAKING_PROMPT',
        instruction: PART2_INSTRUCTION,
        questions: prompts([
          'Describe a famous person you’d like to meet. You should say: who this person is; where you’d like to meet this person; how you know this person; and why you’d like to meet this person.',
        ]),
      },
      {
        type: 'SPEAKING_PROMPT',
        instruction: PART3_INSTRUCTION + ' Topic: Fame and children.',
        questions: prompts([
          'What are the advantages and disadvantages of being a famous child?',
          'What can children do with their fame?',
          'What can today’s children do to become famous?',
          'Do people become famous just because of their talent?',
        ]),
      },
    ],
  },
  {
    title: 'IELTS Speaking — Test 6',
    track: 'IELTS',
    skill: 'SPEAKING',
    type: 'PRACTICE',
    durationMin: 14,
    topics: ['Morning time', 'Having a rest, doing exercise'],
    publish: true,
    groups: [
      {
        type: 'SPEAKING_PROMPT',
        instruction: PART1_INSTRUCTION + ' Topic: Morning time.',
        questions: prompts([
          'Do you like to get up early?',
          'What is your morning routine?',
          'What do you usually do in the morning?',
          'What did you do in the morning when you were little?',
          'Do you spend your mornings doing the same things on both weekends and weekdays?',
        ]),
      },
      {
        type: 'SPEAKING_PROMPT',
        instruction: PART2_INSTRUCTION,
        questions: prompts([
          'Describe a place in your home where you like to relax. You should say: where it is; what it is like; what you like doing there; and why you feel relaxed there.',
        ]),
      },
      {
        type: 'SPEAKING_PROMPT',
        instruction: PART3_INSTRUCTION + ' Topic: Having a rest & doing exercise.',
        questions: prompts([
          'Why is it difficult for some people to relax?',
          'Do you think there should be classes for training young people and children how to relax?',
          'Which is more important, mental relaxation or physical relaxation?',
          'Do people in your country exercise after work?',
          'What are the benefits of doing exercise?',
          'What is the place where people spend most of their time in their home?',
        ]),
      },
    ],
  },
  {
    title: 'IELTS Speaking — Test 7',
    track: 'IELTS',
    skill: 'SPEAKING',
    type: 'PRACTICE',
    durationMin: 14,
    topics: ['Hobby', 'New and old things, toys'],
    publish: true,
    groups: [
      {
        type: 'SPEAKING_PROMPT',
        instruction: PART1_INSTRUCTION + ' Topic: Hobby.',
        questions: prompts([
          'Do you have any hobbies?',
          'Do you have the same hobbies as your family members?',
          'Did you have any hobbies when you were a child?',
          'Do you have a hobby that you’ve had since childhood?',
        ]),
      },
      {
        type: 'SPEAKING_PROMPT',
        instruction: PART2_INSTRUCTION,
        questions: prompts([
          'Describe something you can’t live without (not a computer or phone). You should say: what it is; how you use it; how often you use it; and how it helps you and why you can’t live without it.',
        ]),
      },
      {
        type: 'SPEAKING_PROMPT',
        instruction: PART3_INSTRUCTION + ' Topic: New and old things, toys.',
        questions: prompts([
          'Do you think that keeping old things in a family is a great way to connect with the past?',
          'Why do grown-ups hate to throw away old things?',
          'How have people’s shopping habits changed in recent decades?',
          'How has the way people buy things changed?',
          'How do shops attract customers?',
          'What makes people buy new things?',
          'Why do all children like toys?',
          'Do you think it’s good for a child to take his or her favourite toy with them all the time?',
        ]),
      },
    ],
  },
  {
    title: 'IELTS Speaking — Test 8',
    track: 'IELTS',
    skill: 'SPEAKING',
    type: 'PRACTICE',
    durationMin: 14,
    topics: ['Sports teams', 'Smiling'],
    publish: true,
    groups: [
      {
        type: 'SPEAKING_PROMPT',
        instruction: PART1_INSTRUCTION + ' Topic: Sports teams.',
        questions: prompts([
          'Have you ever been part of a sports team?',
          'Are team sports popular in your culture?',
          'Do you like watching team games?',
          'What are the differences between team sports and individual sports?',
        ]),
      },
      {
        type: 'SPEAKING_PROMPT',
        instruction: PART2_INSTRUCTION,
        questions: prompts([
          'Describe an occasion when you saw a lot of people smiling. You should say: what occasion it was; where it was; and why they were smiling.',
        ]),
      },
      {
        type: 'SPEAKING_PROMPT',
        instruction: PART3_INSTRUCTION + ' Topic: Smiling.',
        questions: prompts([
          'Do you think people who like to smile are more friendly?',
          'Why do most people smile in photographs?',
          'Do women smile more than men? Why?',
          'Do people smile more when they are younger or older?',
        ]),
      },
    ],
  },
  {
    title: 'IELTS Speaking — Test 9',
    track: 'IELTS',
    skill: 'SPEAKING',
    type: 'PRACTICE',
    durationMin: 14,
    topics: ['Typing', 'Advice'],
    publish: true,
    groups: [
      {
        type: 'SPEAKING_PROMPT',
        instruction: PART1_INSTRUCTION + ' Topic: Typing.',
        questions: prompts([
          'Do you type on a desktop or laptop keyboard every day?',
          'When did you learn how to type on a keyboard?',
          'How do you improve your typing?',
        ]),
      },
      {
        type: 'SPEAKING_PROMPT',
        instruction: PART2_INSTRUCTION,
        questions: prompts([
          'Describe a time when you gave advice to others. You should say: who you gave advice to; what the situation was; what advice you gave; and what the result was.',
        ]),
      },
      {
        type: 'SPEAKING_PROMPT',
        instruction: PART3_INSTRUCTION + ' Topic: Advice.',
        questions: prompts([
          'What problems can people face if they ask many different people for advice?',
          'Why do some people like to ask others for advice on almost everything?',
          'In general, what kind of person is most suitable for giving advice to others?',
          'Should people prepare before giving advice?',
          'Is it good to ask advice from strangers online?',
          'What are the personalities of people whose job is to give advice to others?',
        ]),
      },
    ],
  },
  {
    title: 'IELTS Speaking — Test 10',
    track: 'IELTS',
    skill: 'SPEAKING',
    type: 'PRACTICE',
    durationMin: 14,
    topics: ['Walking', 'Apps and programs'],
    publish: true,
    groups: [
      {
        type: 'SPEAKING_PROMPT',
        instruction: PART1_INSTRUCTION + ' Topic: Walking.',
        questions: prompts([
          'Do you walk a lot?',
          'Did you often go outside to have a walk when you were a child?',
          'Why do people like to walk in parks?',
          'Where would you like to take a long walk if you had the chance?',
          'Where have you gone for a walk lately?',
        ]),
      },
      {
        type: 'SPEAKING_PROMPT',
        instruction: PART2_INSTRUCTION,
        questions: prompts([
          'Describe an app or program on your computer or phone. You should say: what app or program it is; when and where you found it; how you use it; and how you feel about it.',
        ]),
      },
      {
        type: 'SPEAKING_PROMPT',
        instruction: PART3_INSTRUCTION + ' Topic: Apps and programs.',
        questions: prompts([
          'What are the drawbacks of having too many apps?',
          'Why do some people not like using apps?',
          'What are the most and the least popular apps in your country?',
          'What kind of apps do you have on your phone?',
          'What are the differences between old and young people when using apps?',
        ]),
      },
    ],
  },
  {
    title: 'IELTS Speaking — Test 11',
    track: 'IELTS', skill: 'SPEAKING', type: 'PRACTICE', durationMin: 14,
    topics: ['Buildings', 'Working abroad, travelling'], publish: true,
    groups: [
      { type: 'SPEAKING_PROMPT', instruction: PART1_INSTRUCTION + ' Topic: Buildings.', questions: prompts([
        'Do you take photos of buildings?',
        'Is there a building that you would like to visit?',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART2_INSTRUCTION, questions: prompts([
        'Describe a country in which you would like to work or live for a short period of time. You should say: what country or city it is; how you know about it; what type of work you would like to do there; and why you would like to work in this country.',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART3_INSTRUCTION + ' Topic: Working abroad & travelling.', questions: prompts([
        'Why do people like travelling?',
        'What jobs can people do abroad for a short period of time?',
        'Is it good that now people have an opportunity to work abroad?',
      ]) },
    ],
  },
  {
    title: 'IELTS Speaking — Test 12',
    track: 'IELTS', skill: 'SPEAKING', type: 'PRACTICE', durationMin: 14,
    topics: ['Views', 'Old things, museums'], publish: true,
    groups: [
      { type: 'SPEAKING_PROMPT', instruction: PART1_INSTRUCTION + ' Topic: Views.', questions: prompts([
        'Do you like taking pictures of different views?',
        'Do you prefer views in urban areas or rural areas?',
        'Do you prefer views in your own country or in other countries?',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART2_INSTRUCTION, questions: prompts([
        'Describe an important old thing that your family has kept for a long time. You should say: what it is; how your family first got this thing; how long your family has kept it; and why this thing is important to your family.',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART3_INSTRUCTION + ' Topic: Old things & museums.', questions: prompts([
        'What are the differences between the things that people keep today and the things that people kept in the past?',
        'As well as family photographs, what are some other things that people keep in their family for a long time?',
        'In your culture, what sorts of things do people pass down from generation to generation?',
        'What kinds of things are kept in museums?',
        'What’s the influence of technology on museums?',
      ]) },
    ],
  },
  {
    title: 'IELTS Speaking — Test 13',
    track: 'IELTS', skill: 'SPEAKING', type: 'PRACTICE', durationMin: 14,
    topics: ['Scenery', 'Transportation, air pollution'], publish: true,
    groups: [
      { type: 'SPEAKING_PROMPT', instruction: PART1_INSTRUCTION + ' Topic: Scenery.', questions: prompts([
        'Do you like to take pictures of good scenery?',
        'Do you look out the window at the scenery when travelling by bus or car?',
        'Do you prefer the mountains or the sea?',
        'What are the most beautiful sights you have seen while travelling?',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART2_INSTRUCTION, questions: prompts([
        'Describe a long bike, motorbike, or car trip that you would like to take. You should say: when you want to go; where you want to go; how long it will take you; and why it is interesting.',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART3_INSTRUCTION + ' Topic: Transportation & air pollution.', questions: prompts([
        'How are transportation systems in rural and urban areas different?',
        'Which mode of transport is more popular in your country, a bicycle or car?',
        'Do you think air pollution comes mostly from mobile vehicles?',
        'Do you think people need to change the way of transportation drastically to protect the environment?',
      ]) },
    ],
  },
  {
    title: 'IELTS Speaking — Test 14',
    track: 'IELTS', skill: 'SPEAKING', type: 'PRACTICE', durationMin: 14,
    topics: ['Childhood activities', 'Shopping'], publish: true,
    groups: [
      { type: 'SPEAKING_PROMPT', instruction: PART1_INSTRUCTION + ' Topic: Childhood activities.', questions: prompts([
        'What did you enjoy doing as a child?',
        'Did you enjoy your childhood?',
        'Did you prefer to do activities alone or with a group of people when you were a child?',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART2_INSTRUCTION, questions: prompts([
        'Describe a shop you often visit. You should say: what shop it is and where it is; what it sells; and why you like it.',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART3_INSTRUCTION + ' Topic: Shopping.', questions: prompts([
        'Do you think that people buy a lot of things that they don’t need?',
        'Do you often buy more than you expected?',
      ]) },
    ],
  },
  {
    title: 'IELTS Speaking — Test 15',
    track: 'IELTS', skill: 'SPEAKING', type: 'PRACTICE', durationMin: 14,
    topics: ['Stages in life', 'Imagination'], publish: true,
    groups: [
      { type: 'SPEAKING_PROMPT', instruction: PART1_INSTRUCTION + ' Topic: Stages in life.', questions: prompts([
        'How do people remember each stage of their lives?',
        'At what age do you think people are the happiest?',
        'Do you enjoy being the age you are now?',
        'What did you often do with your friends in your childhood?',
        'Do you have any plans for the next five years?',
        'What do you think is the most important thing at the moment?',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART2_INSTRUCTION, questions: prompts([
        'Describe a time you needed to use your imagination. You should say: what you did using imagination; when it was; whether it was easy or difficult; and how you felt.',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART3_INSTRUCTION + ' Topic: Imagination.', questions: prompts([
        'What kind of jobs require imagination?',
        'Do scientists need imagination in their work?',
        'Do you think adults can have lots of imagination?',
        'What subjects are helpful for children’s imagination?',
      ]) },
    ],
  },
  {
    title: 'IELTS Speaking — Test 16',
    track: 'IELTS', skill: 'SPEAKING', type: 'PRACTICE', durationMin: 14,
    topics: ['Daily routine', 'Films'], publish: true,
    groups: [
      { type: 'SPEAKING_PROMPT', instruction: PART1_INSTRUCTION + ' Topic: Daily routine.', questions: prompts([
        'How do you organise your study time?',
        'What is your daily study routine?',
        'Do you ever change your plans?',
        'Have you ever changed your routine?',
        'What’s your favourite time of the day?',
        'Do you go to sleep early or stay up late?',
        'Do you often stay up late?',
        'Do you think it’s important to have a daily routine for your study?',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART2_INSTRUCTION, questions: prompts([
        'Describe a film you watched and enjoyed. You should say: what the film was about; when and where you watched it; and why you liked it and why you want to watch it again.',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART3_INSTRUCTION + ' Topic: Films.', questions: prompts([
        'What makes a movie a blockbuster?',
        'Are actors and actresses important to movies?',
        'Do you think films with famous actors or actresses are more likely to become successful films?',
        'What kinds of movies are successful in your country?',
        'Do people in your country still like to go to a cinema?',
        'Where do people watch movies?',
        'Do people in your country prefer to watch domestic movies or foreign movies?',
        'Do you think only well-known directors can create the best movies?',
      ]) },
    ],
  },
  {
    title: 'IELTS Speaking — Test 17',
    track: 'IELTS', skill: 'SPEAKING', type: 'PRACTICE', durationMin: 14,
    topics: ['Animals and pets', 'Stories'], publish: true,
    groups: [
      { type: 'SPEAKING_PROMPT', instruction: PART1_INSTRUCTION + ' Topic: Animals and pets.', questions: prompts([
        'What’s your favourite animal?',
        'Have you ever had a pet?',
        'What’s the most popular animal in your country?',
        'Where do you prefer to keep your pet, indoors or outdoors?',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART2_INSTRUCTION, questions: prompts([
        'Describe a story you read recently. You should say: what it is about; when you read it; whether you liked it; and what you learned from it.',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART3_INSTRUCTION + ' Topic: Stories.', questions: prompts([
        'Why do most children like listening to stories before bedtime?',
        'Is a good storyline important for a movie?',
        'Why do children like hearing the same bedtime story?',
      ]) },
    ],
  },
  {
    title: 'IELTS Speaking — Test 18',
    track: 'IELTS', skill: 'SPEAKING', type: 'PRACTICE', durationMin: 14,
    topics: ['Days off', 'Intelligence'], publish: true,
    groups: [
      { type: 'SPEAKING_PROMPT', instruction: PART1_INSTRUCTION + ' Topic: Days off.', questions: prompts([
        'When was the last time you had a few days off?',
        'What do you do when you have days off?',
        'What would you like to do if you had a day off tomorrow?',
        'Do you usually spend your days off with your parents or with your friends?',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART2_INSTRUCTION, questions: prompts([
        'Describe a person who solved a problem in a smart way. You should say: who this person is; what the problem was; what solution they gave; and why you think it was a clever solution.',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART3_INSTRUCTION + ' Topic: Intelligence.', questions: prompts([
        'Are people born clever or need to learn to be clever?',
        'Why are some children more intelligent than others?',
        'Do you think society needs people with different types of intelligence?',
        'Does modern society need talents of all kinds?',
        'How do children become smart at school?',
        'Why are some people well-rounded and others only good at one thing?',
      ]) },
    ],
  },
  {
    title: 'IELTS Speaking — Test 19',
    track: 'IELTS', skill: 'SPEAKING', type: 'PRACTICE', durationMin: 14,
    topics: ['Food', 'Environmental protection'], publish: true,
    groups: [
      { type: 'SPEAKING_PROMPT', instruction: PART1_INSTRUCTION + ' Topic: Food.', questions: prompts([
        'What kinds of food do you particularly like?',
        'What kinds of food are most popular in your country?',
        'Is there any food you don’t like?',
        'What kind of food did you like when you were young?',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART2_INSTRUCTION, questions: prompts([
        'Describe a person who encouraged you to protect the nature. You should say: who this person is; how this person encouraged you; what this person encouraged you to do; and how you feel about this person.',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART3_INSTRUCTION + ' Topic: Environmental protection.', questions: prompts([
        'How can parents teach their children to protect nature?',
        'Should schools teach children to get close to nature?',
        'Do you think there should be laws to protect nature?',
      ]) },
    ],
  },
  {
    title: 'IELTS Speaking — Test 20',
    track: 'IELTS', skill: 'SPEAKING', type: 'PRACTICE', durationMin: 14,
    topics: ['Keys', 'Spending and saving money'], publish: true,
    groups: [
      { type: 'SPEAKING_PROMPT', instruction: PART1_INSTRUCTION + ' Topic: Keys.', questions: prompts([
        'Have you ever locked yourself out?',
        'Do you think it’s a good idea to leave your keys with a neighbour?',
        'Have you ever lost your keys?',
        'Do you always bring a lot of keys with you?',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART2_INSTRUCTION, questions: prompts([
        'Describe an occasion when you paid more than expected. You should say: what you bought; how much you paid; why you bought it; and why you paid more.',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART3_INSTRUCTION + ' Topic: Spending and saving money.', questions: prompts([
        'What do young people spend money on?',
        'Is it good and necessary to teach children to save money?',
        'Do you think it is important to save money?',
        'Do you think that people buy a lot of things that they don’t need?',
      ]) },
    ],
  },
  {
    title: 'IELTS Speaking — Test 21',
    track: 'IELTS', skill: 'SPEAKING', type: 'PRACTICE', durationMin: 14,
    topics: ['Dreams', 'Helping others'], publish: true,
    groups: [
      { type: 'SPEAKING_PROMPT', instruction: PART1_INSTRUCTION + ' Topic: Dreams.', questions: prompts([
        'Do you remember your dreams when you wake up?',
        'Do you think dreams will affect life?',
        'Do you think dreams have special meanings?',
        'Do you like hearing other people’s dreams?',
        'Do you share your dreams with others?',
        'Do you want to make your dreams come true?',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART2_INSTRUCTION, questions: prompts([
        'Describe a person who often helps others. You should say: who this person is; how you know this person; how this person helps you; and why you think this person is helpful.',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART3_INSTRUCTION + ' Topic: Helping others.', questions: prompts([
        'What can children help parents with?',
        'In your view, should children be taught to help others?',
        'Should children help their parents with household chores?',
        'What kind of help do people need when looking for a new job?',
        'Who should people ask for help, colleagues or family members?',
      ]) },
    ],
  },
  {
    title: 'IELTS Speaking — Test 22',
    track: 'IELTS', skill: 'SPEAKING', type: 'PRACTICE', durationMin: 14,
    topics: ['Memory', 'Technology and communication'], publish: true,
    groups: [
      { type: 'SPEAKING_PROMPT', instruction: PART1_INSTRUCTION + ' Topic: Memory.', questions: prompts([
        'How do you remember important things?',
        'Are you good at memorising things?',
        'Have you ever forgotten something important?',
        'What do you need to remember in your daily life?',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART2_INSTRUCTION, questions: prompts([
        'Describe a piece of technology (not a phone) that you would like to own. You should say: what it is; how you knew it; how much it costs; and why you’d like to own it.',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART3_INSTRUCTION + ' Topic: Technology & communication.', questions: prompts([
        'What are the differences between talking with friends online and face-to-face?',
        'What technology do people currently use?',
        'Does technological development have a negative impact on communication among people?',
        'Do you think technology unites or separates people?',
        'What effects does technology have on people’s relationships?',
        'What are the differences between the technology of the past and that of today?',
        'What are the differences between making friends in real life and online?',
      ]) },
    ],
  },
  {
    title: 'IELTS Speaking — Test 23',
    track: 'IELTS', skill: 'SPEAKING', type: 'PRACTICE', durationMin: 14,
    topics: ['Spare time', 'Music events'], publish: true,
    groups: [
      { type: 'SPEAKING_PROMPT', instruction: PART1_INSTRUCTION + ' Topic: Spare time.', questions: prompts([
        'What free time activities are popular with people in your country?',
        'What do you do when you have free time?',
        'Who do you usually spend your spare time with?',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART2_INSTRUCTION, questions: prompts([
        'Describe a music event that you didn’t enjoy. You should say: what it was; who you went with; why you went there; and why you didn’t like it.',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART3_INSTRUCTION + ' Topic: Music events.', questions: prompts([
        'What kind of music events do people like today?',
      ]) },
    ],
  },
  {
    title: 'IELTS Speaking — Test 24',
    track: 'IELTS', skill: 'SPEAKING', type: 'PRACTICE', durationMin: 14,
    topics: ['Crowded places', 'Encouraging others'], publish: true,
    groups: [
      { type: 'SPEAKING_PROMPT', instruction: PART1_INSTRUCTION + ' Topic: Crowded places.', questions: prompts([
        'Do most people like crowded places?',
        'Do you like crowded places?',
        'When was the last time you were in a crowded place?',
        'Is the city where you live crowded?',
        'Is there a crowded place near where you live?',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART2_INSTRUCTION, questions: prompts([
        'Describe a time when you encouraged someone to do something that they didn’t want to do. You should say: who this person is; what you encouraged them to do; how this person reacted; and why you encouraged this person to do it.',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART3_INSTRUCTION + ' Topic: Encouraging others.', questions: prompts([
        'Is the role of a leader important in a group?',
        'How can leaders encourage employees?',
        'When should parents encourage their children?',
        'Do you think some people are better than others at persuading?',
        'What kind of encouragement should parents give?',
      ]) },
    ],
  },
  {
    title: 'IELTS Speaking — Test 25',
    track: 'IELTS', skill: 'SPEAKING', type: 'PRACTICE', durationMin: 14,
    topics: ['Teachers', 'Learning new things'], publish: true,
    groups: [
      { type: 'SPEAKING_PROMPT', instruction: PART1_INSTRUCTION + ' Topic: Teachers.', questions: prompts([
        'Would you like to be a teacher?',
        'Do you think you could be a teacher?',
        'Do you have a favourite teacher?',
        'How does this teacher help you?',
        'How has your favourite teacher helped you?',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART2_INSTRUCTION, questions: prompts([
        'Describe one of your friends who learned something new (not from a teacher). You should say: who this person is; what this person learned; why they learned it; and whether it would be easier to learn from a teacher.',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART3_INSTRUCTION + ' Topic: Learning new things.', questions: prompts([
        'Do you think learning many subjects at one time is better or learning one subject is better?',
        'Do you think learning many subjects is beneficial to your work?',
        'Do you think all teachers should have entertaining teaching styles?',
        'Should teachers make lessons fun?',
        'Is it important for people to learn new skills all life long?',
        'Do you think enterprises should provide training for their employees?',
      ]) },
    ],
  },
  {
    title: 'IELTS Speaking — Test 26',
    track: 'IELTS', skill: 'SPEAKING', type: 'PRACTICE', durationMin: 14,
    topics: ['Social media', 'Making plans'], publish: true,
    groups: [
      { type: 'SPEAKING_PROMPT', instruction: PART1_INSTRUCTION + ' Topic: Social media.', questions: prompts([
        'Do you think you spend too much time on social media?',
        'What do people often do on social media?',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART2_INSTRUCTION, questions: prompts([
        'Describe a person who makes plans a lot and is good at planning. You should say: who this person is; how you knew this person; what plans this person makes; and how you feel about this person.',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART3_INSTRUCTION + ' Topic: Making plans.', questions: prompts([
        'In general, do you think planning is important?',
        'Do you think everyone in your country makes everyday plans?',
        'Do you think children should plan their future careers?',
        'Should children ask their teachers or parents for advice when making plans?',
        'What activities do we need to plan ahead?',
        'Is making study plans popular among young people?',
        'Do you think choosing a college major is closely related to a person’s future career?',
      ]) },
    ],
  },
  {
    title: 'IELTS Speaking — Test 27',
    track: 'IELTS', skill: 'SPEAKING', type: 'PRACTICE', durationMin: 14,
    topics: ['Dreams and ambitions', 'Drawing, museums'], publish: true,
    groups: [
      { type: 'SPEAKING_PROMPT', instruction: PART1_INSTRUCTION + ' Topic: Dreams and ambitions.', questions: prompts([
        'What was your dream when you were a child?',
        'Are you the kind of person who sticks to dreams?',
        'Do you think you are an ambitious person?',
        'Are you an ambitious person?',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART2_INSTRUCTION, questions: prompts([
        'Describe a child who loves drawing or painting. You should say: who this child is; how you knew him or her; how often he or she draws or paints; and why he or she likes drawing or painting.',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART3_INSTRUCTION + ' Topic: Drawing & museums.', questions: prompts([
        'What is the right age for a child to learn drawing?',
        'Why do most children draw more often than adults do?',
        'Why do some people visit galleries or museums instead of viewing artworks online?',
        'Do you think galleries and museums should be free of charge?',
        'How do artworks inspire people?',
      ]) },
    ],
  },
  {
    title: 'IELTS Speaking — Test 28',
    track: 'IELTS', skill: 'SPEAKING', type: 'PRACTICE', durationMin: 14,
    topics: ['Mirrors', 'Quiet places'], publish: true,
    groups: [
      { type: 'SPEAKING_PROMPT', instruction: PART1_INSTRUCTION + ' Topic: Mirrors.', questions: prompts([
        'Would you use mirrors to decorate your room?',
        'Do you usually take a mirror with you?',
        'How often do you use a mirror?',
        'Do you like looking at yourself in a mirror?',
        'Have you ever bought a mirror?',
        'Do you use a mirror before buying clothing?',
        'What functions does a mirror have?',
        'Do you think a mirror is a good decoration?',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART2_INSTRUCTION, questions: prompts([
        'Describe a quiet place that you like to go to. You should say: what place it is; how often you go there and when you go there; what you do there; and why you like this place.',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART3_INSTRUCTION + ' Topic: Quiet places.', questions: prompts([
        'Is it hard to find quiet places in cities?',
        'Can people bring children to these noise-free places?',
        'What places should be noise-free?',
        'Are there many quiet places in your city?',
        'Why do people sometimes prefer to be alone?',
        'Why do people go to quiet places?',
        'Is there any place that is absolutely quiet?',
        'Why is it difficult to stay in a quiet place?',
      ]) },
    ],
  },
  {
    title: 'IELTS Speaking — Test 29',
    track: 'IELTS', skill: 'SPEAKING', type: 'PRACTICE', durationMin: 14,
    topics: ['Music', 'TV programs and videos'], publish: true,
    groups: [
      { type: 'SPEAKING_PROMPT', instruction: PART1_INSTRUCTION + ' Topic: Music.', questions: prompts([
        'Do you prefer sad or happy music?',
        'Does happy music make you feel more excited?',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART2_INSTRUCTION, questions: prompts([
        'Describe a program you like to watch. You should say: what program it is; when you watch it; and why you like it.',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART3_INSTRUCTION + ' Topic: TV programs & videos.', questions: prompts([
        'What shows do old people and young people watch?',
        'What other programs do you like to watch?',
        'What TV programs are popular in your country?',
        'Do people in your country like to watch foreign TV programs?',
        'Do you think watching talk shows is a waste of time?',
        'Do you think we can acquire knowledge from watching TV programs?',
        'What’s the benefit of letting kids watch animal videos rather than visiting zoos?',
        'Do teachers play videos in class in your country?',
      ]) },
    ],
  },
  {
    title: 'IELTS Speaking — Test 30',
    track: 'IELTS', skill: 'SPEAKING', type: 'PRACTICE', durationMin: 14,
    topics: ['Tidiness', 'Buildings and architecture'], publish: true,
    groups: [
      { type: 'SPEAKING_PROMPT', instruction: PART1_INSTRUCTION + ' Topic: Tidiness.', questions: prompts([
        'Would you say you are a tidy person?',
        'Do you like to keep things tidy?',
        'How do you keep things tidy?',
        'Do you think it is possible for people to be tidy all the time?',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART2_INSTRUCTION, questions: prompts([
        'Describe an unusual building you’d like to visit. You should say: what building it is; how you know about it; what the building looks like; and why you want to visit it.',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART3_INSTRUCTION + ' Topic: Buildings & architecture.', questions: prompts([
        'Is the appearance of a public building as important as its functionality?',
        'Is it worth spending a lot of money on the appearance of a building?',
        'Is it more important for a building to look good on the outside or on the inside?',
        'Why do people like to visit historical places?',
        'What types of buildings are popular in your country?',
      ]) },
    ],
  },
  {
    title: 'IELTS Speaking — Test 31',
    track: 'IELTS', skill: 'SPEAKING', type: 'PRACTICE', durationMin: 14,
    topics: ['Websites', 'Watching TV'], publish: true,
    groups: [
      { type: 'SPEAKING_PROMPT', instruction: PART1_INSTRUCTION + ' Topic: Websites.', questions: prompts([
        'What kinds of websites do you often visit?',
        'What kinds of websites are popular in your country?',
        'What is your favourite website?',
        'Are there any changes to the websites you often visit?',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART2_INSTRUCTION, questions: prompts([
        'Describe a TV series that you like. You should say: what it is about; who the main characters are; and why you like it.',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART3_INSTRUCTION + ' Topic: Watching TV.', questions: prompts([
        'Do you think parents should limit their children from watching television?',
        'Would your family watch TV together?',
        'What are the differences in television viewing habits between the elderly and the young?',
        'How has technology changed the way people watch television?',
        'What do you think about ads in TV series?',
      ]) },
    ],
  },
  {
    title: 'IELTS Speaking — Test 32',
    track: 'IELTS', skill: 'SPEAKING', type: 'PRACTICE', durationMin: 14,
    topics: ['Watches', 'Travelling and rest'], publish: true,
    groups: [
      { type: 'SPEAKING_PROMPT', instruction: PART1_INSTRUCTION + ' Topic: Watches.', questions: prompts([
        'Do you like to wear watches?',
        'Do you think a watch is important for you?',
        'Have you ever received a watch as a gift?',
        'Why do people like expensive watches?',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART2_INSTRUCTION, questions: prompts([
        'Describe a place you’d like to visit in your free time. You should say: where it is; what you will do there; how long you will stay there; and why you’d like to visit it.',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART3_INSTRUCTION + ' Topic: Travelling & rest.', questions: prompts([
        'Why do some people prefer to travel in their own country rather than going abroad?',
        'Some people don’t like to travel abroad. Why?',
        'Why do people choose to travel or live abroad?',
      ]) },
    ],
  },
  {
    title: 'IELTS Speaking — Test 33',
    track: 'IELTS', skill: 'SPEAKING', type: 'PRACTICE', durationMin: 14,
    topics: ['Shopping', 'Food and cooking'], publish: true,
    groups: [
      { type: 'SPEAKING_PROMPT', instruction: PART1_INSTRUCTION + ' Topic: Shopping.', questions: prompts([
        'Do you like shopping?',
        'How often do you go shopping?',
        'Do you compare prices when you shop?',
        'Is it difficult for you to make choices when you shop?',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART2_INSTRUCTION, questions: prompts([
        'Describe a special cake you received. You should say: what kind of cake it was; when you had it; who you were with; and why it was special.',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART3_INSTRUCTION + ' Topic: Food and cooking.', questions: prompts([
        'What food do people in your country eat on special occasions?',
        'What is the difference between special food in your country and other countries?',
        'Why do many people like to spend a lot of money on food on special days?',
        'What do you think of people using their mobile phones during a meal?',
        'Do you think it’s good to communicate when eating with your family?',
        'More and more people are unwilling to cook. Why is this happening?',
      ]) },
    ],
  },
  {
    title: 'IELTS Speaking — Test 34',
    track: 'IELTS', skill: 'SPEAKING', type: 'PRACTICE', durationMin: 14,
    topics: ['Cars', 'Tall buildings'], publish: true,
    groups: [
      { type: 'SPEAKING_PROMPT', instruction: PART1_INSTRUCTION + ' Topic: Cars.', questions: prompts([
        'What type of car do you like?',
        'What colour car would you choose to buy?',
        'Do you think car colours are important?',
        'What do you usually do when there’s a traffic jam?',
        'Do you prefer to be a driver or a passenger?',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART2_INSTRUCTION, questions: prompts([
        'Describe a tall building in your town that you like or dislike. You should say: where this building is; what it looks like; what it is used for; and explain why you like or dislike it.',
      ]) },
      { type: 'SPEAKING_PROMPT', instruction: PART3_INSTRUCTION + ' Topic: Tall buildings.', questions: prompts([
        'What do you think buildings will be like in the future?',
        'Which do most people prefer, living in a bungalow or in a tall building?',
        'Why are taller and taller buildings being constructed nowadays?',
      ]) },
    ],
  },
]

/**
 * Optional CLI filter: `npx tsx scripts/seed-speaking.ts 32-34` or `... 5,9`.
 * Without it every exam is re-upserted, which is slow over the Railway proxy
 * once the list grows. Matches the trailing number in "… — Test N".
 */
function selectExams(argv: string[]): BuilderTask[] {
  const spec = argv[2]
  if (!spec) return EXAMS
  const wanted = new Set<number>()
  for (const part of spec.split(',')) {
    const range = part.match(/^(\d+)-(\d+)$/)
    if (range) {
      for (let i = Number(range[1]); i <= Number(range[2]); i++) wanted.add(i)
    } else if (/^\d+$/.test(part)) {
      wanted.add(Number(part))
    }
  }
  return EXAMS.filter((e) => {
    const n = Number(e.title.match(/Test (\d+)$/)?.[1])
    return Number.isFinite(n) && wanted.has(n)
  })
}

async function main() {
  const selected = selectExams(process.argv)
  console.log(`Seeding ${selected.length} speaking exam(s)…\n`)
  for (const raw of selected) {
    const parsed = builderTaskSchema.safeParse(raw)
    if (!parsed.success) {
      console.error(`  ✗ "${raw.title}" invalid:`, parsed.error.flatten().fieldErrors)
      continue
    }
    // builderToNormalized derives a stable slug from the title, so re-runs
    // upsert the same task rather than duplicating it.
    const normalized = builderToNormalized(parsed.data)
    // Open our own transaction with a generous timeout: the prod DB sits behind
    // the Railway proxy, so the ~10 round-trips per task exceed Prisma's default
    // 5s interactive-transaction limit (P2028). Passing the tx client makes
    // persistNormalizedTask run inside it instead of opening its own.
    const res = await prisma.$transaction(
      (tx) => persistNormalizedTask(normalized, { status: 'PUBLISHED', authorId: null }, tx),
      { timeout: 30_000, maxWait: 30_000 },
    )
    console.log(
      `  ${res.created ? '＋ created' : '↻ updated'}  ${res.slug}  ` +
        `(${res.groupCount} parts, ${res.questionCount} prompts)`,
    )
  }
  console.log('\nDone.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
