# SVY platform — задачи

## Backlog

### SEC-001 — Singleton роли OWNER и DEVELOPER (privilege-escalation guard)
**Приоритет:** высокий (безопасность)

Нельзя, чтобы было больше одного OWNER или больше одного DEVELOPER, и нельзя
самому себе назначить OWNER/DEVELOPER, чтобы получить доступ.

**Что сделать:**
- Регистрация ВСЕГДА создаёт `STUDENT` (роль не принимается из тела запроса).
- Назначение роли — только через защищённый эндпоинт (OWNER, и только OWNER может
  выдавать OWNER/DEVELOPER). Никакого self-assign.
- При попытке выдать `OWNER` или `DEVELOPER`, когда такой пользователь уже есть →
  ошибка 409 «роль уже занята» (проверка `count(role) === 0` в транзакции).
- На уровне БД — частичный уникальный индекс на `role` для OWNER/DEVELOPER
  (Postgres `CREATE UNIQUE INDEX ... WHERE role IN ('OWNER','DEVELOPER')`) как
  страховка от гонок.
- Тест: попытка зарегистрироваться с `role: OWNER` в теле → игнорируется (STUDENT);
  попытка назначить второго OWNER → 409.

**Где:** `src/app/api/auth/register`, будущий `src/app/api/admin/users/[id]/role`,
`prisma/schema.prisma` (partial unique index через `@@index`/raw migration), `src/lib/rbac.ts`.

### UI-001 — Сайдбар не «прилипает» (скроллится с контентом) ✅ ИСПРАВЛЕНО
**Приоритет:** средний (UX)

На длинных страницах админки (`/admin/users` и др.) левый сайдбар скроллился вместе
с основным контентом — логотип SVY и карточка пользователя «уезжали». Причина:
`<aside>` был обычной flex-колонкой без `position: sticky`/фиксированной высоты.

**Фикс:** `lg:sticky lg:top-0 lg:h-screen` на `<aside>` + `overflow-y-auto` на nav —
сайдбар теперь стоит на месте на всю высоту экрана, контент скроллится отдельно.
**Файл:** `src/app/(admin)/admin/layout.tsx`.
**TODO:** проверить тот же паттерн в `(coach)` и `(student)` лейаутах (там свои шеллы).
