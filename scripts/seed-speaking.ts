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
 * PROGRESS: Tests 1–7 done (Part1 3756‑3763 / Part2 3834‑3847).
 * NEXT: Test 8 → Part1 3764, Part2 3849, Part3 3850.
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
]

async function main() {
  console.log(`Seeding ${EXAMS.length} speaking exam(s)…\n`)
  for (const raw of EXAMS) {
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
