-- Fix: permitir eliminar usuarios que tienen subordinados (reporta_a)
-- El constraint original bloqueaba el DELETE si otro usuario apuntaba al eliminado.
-- Con ON DELETE SET NULL, los subordinados quedan con reporta_a = null.
--
-- Ejecutar en Supabase SQL Editor → Run.

alter table users drop constraint if exists users_reporta_a_fkey;

alter table users
  add constraint users_reporta_a_fkey
  foreign key (reporta_a) references users(id)
  on delete set null;
