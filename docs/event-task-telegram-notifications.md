# Task completion Telegram notifications

When a player completes an event task, the backend creates a `TASK_COMPLETED`
notification in the existing transactional outbox. Daily and weekly task
completions do not create Telegram notifications.

The Russian Telegram post contains the task type and title, the completing
player's username, the granted currency, score and attribute rewards, and the
completion time in Moscow time. If the task requires an image proof, the submitted
proof image is attached to the post. Optional proof images for tasks that do not
require proof are not published.

The outbox entry uses the task submission ID as its deduplication key. Delivery is
active only when `TELEGRAM_NOTIFICATIONS_ENABLED=true` and uses the existing
Telegram queue, retry, media-resolution, and error-handling workflow.
