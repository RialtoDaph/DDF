-- ============================================================================
-- chat_messages.user_id had no covering index for its foreign key
-- (supabase advisor: unindexed_foreign_keys).
-- ============================================================================

create index if not exists chat_messages_user_id_idx on chat_messages (user_id);
