import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const root = new URL('../../', import.meta.url);
const fixtureSql = await readFile(new URL('supabase/tests/fixtures/supabase_platform_minimal.sql', root), 'utf8');
const baselineSql = await readFile(new URL('supabase/baseline/20261017120000_lead_mvp_baseline.sql', root), 'utf8');
const catalogSql = await readFile(new URL('supabase/tests/lead_mvp_baseline_catalog.sql', root), 'utf8');

const ids = {
  clientA: '10000000-0000-4000-8000-000000000001',
  clientB: '10000000-0000-4000-8000-000000000002',
  clientWithoutInquiry: '10000000-0000-4000-8000-000000000003',
  invalidRole: '10000000-0000-4000-8000-000000000004',
  trainerA: '20000000-0000-4000-8000-000000000001',
  trainerB: '20000000-0000-4000-8000-000000000002',
  trainerWithoutInquiry: '20000000-0000-4000-8000-000000000003',
  admin: '30000000-0000-4000-8000-000000000001',
  idempotencyA: '40000000-0000-4000-8000-000000000001',
  idempotencyB: '40000000-0000-4000-8000-000000000002',
};

const db = new PGlite('memory://');
const completed = [];

async function step(name, callback) {
  try {
    await callback();
    completed.push(name);
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

async function asRole(role, userId, callback) {
  await db.exec(`set role ${role}`);
  try {
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId ?? '']);
    return await callback();
  } finally {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

async function expectDatabaseError(callback, pattern) {
  await assert.rejects(callback, (error) => {
    assert.match(String(error?.message ?? error), pattern);
    return true;
  });
}

async function scalar(sql, params = []) {
  const result = await db.query(sql, params, { rowMode: 'array' });
  return result.rows[0]?.[0];
}

try {
  await step('frische lokale PostgreSQL-Testumgebung initialisieren', async () => {
    await db.exec(fixtureSql);
    assert.equal(await scalar('select current_user'), 'postgres');
    assert.ok(Number(await scalar("select current_setting('server_version_num')")) >= 150000);
  });

  await step('Lead-MVP-Baseline vollständig ausführen', async () => {
    await db.exec(baselineSql);
    assert.equal(await scalar("select to_regclass('public.profiles') is not null"), true);
  });

  await step('SQL-Katalog- und Berechtigungsmatrix ausführen', async () => {
    await db.exec(catalogSql);
  });

  await step('Client-, Trainer- und ungültige Rollen-Signups ausführen', async () => {
    const users = [
      [ids.clientA, 'client-a@example.test', { role: 'client', name: 'Client A' }],
      [ids.clientB, 'client-b@example.test', { role: 'client', name: 'Client B' }],
      [ids.clientWithoutInquiry, 'client-clean@example.test', { role: 'client', name: 'Client Löschbar' }],
      [ids.invalidRole, 'invalid@example.test', { role: 'admin', name: 'Kein Admin' }],
      [ids.trainerA, 'trainer-a@example.test', { role: 'trainer', name: 'Trainer A' }],
      [ids.trainerB, 'trainer-b@example.test', { role: 'trainer', name: 'Trainer B' }],
      [ids.trainerWithoutInquiry, 'trainer-clean@example.test', { role: 'trainer', name: 'Trainer Löschbar' }],
      [ids.admin, 'admin@example.test', { role: 'client', name: 'Admin' }],
    ];

    for (const [id, email, metadata] of users) {
      await db.query(
        'insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3::jsonb)',
        [id, email, JSON.stringify(metadata)]
      );
    }

    assert.equal(await scalar('select role from public.profiles where id = $1', [ids.clientA]), 'client');
    assert.equal(await scalar('select role from public.profiles where id = $1', [ids.trainerA]), 'trainer');
    assert.equal(await scalar('select role from public.profiles where id = $1', [ids.invalidRole]), 'client');
    assert.equal(await scalar('select count(*)::int from public.clients where id = $1', [ids.invalidRole]), 1);
    assert.equal(await scalar('select status from public.trainers where id = $1', [ids.trainerA]), 'pending');

    await db.query("update public.profiles set role = 'admin' where id = $1", [ids.admin]);
  });

  await step('Trainerfreigabe und öffentliche Feldtrennung erzwingen', async () => {
    await asRole('anon', null, async () => {
      assert.equal(await scalar('select count(*)::int from public.trainers_public'), 0);
      await expectDatabaseError(() => db.query('select email from public.trainers'), /permission denied/i);
    });

    await asRole('authenticated', ids.trainerA, async () => {
      await db.query("update public.trainers set bio = 'Geprüftes Profil' where id = $1", [ids.trainerA]);
      await expectDatabaseError(
        () => db.query("update public.trainers set status = 'approved' where id = $1", [ids.trainerA]),
        /permission denied/i
      );
      await expectDatabaseError(
        () => db.query("update public.trainers set email = 'changed@example.test' where id = $1", [ids.trainerA]),
        /permission denied/i
      );
    });

    await asRole('service_role', ids.admin, async () => {
      await db.query("update public.trainers set status = 'approved' where id = $1", [ids.trainerA]);
    });

    await asRole('anon', null, async () => {
      const visible = await db.query('select id, name, bio from public.trainers_public');
      assert.deepEqual(visible.rows.map((row) => row.id), [ids.trainerA]);
      assert.equal(visible.rows[0].bio, 'Geprüftes Profil');
    });

    await asRole('authenticated', ids.trainerB, async () => {
      assert.equal(await scalar('select count(*)::int from public.trainers where id = $1', [ids.trainerA]), 0);
    });

    await asRole('authenticated', ids.admin, async () => {
      assert.equal(await scalar('select count(*)::int from public.trainers'), 3);
    });
  });

  let activeOfferId;
  await step('aktive und inaktive Angebote korrekt filtern', async () => {
    await asRole('authenticated', ids.trainerA, async () => {
      activeOfferId = await scalar(
        `insert into public.trainer_offers
          (trainer_id, title, type, duration_minutes, price, service_mode, pricing_model)
         values ($1, 'Aktives Paket', 'paid', 60, 120, 'Online', 'single_session')
         returning id`,
        [ids.trainerA]
      );
      const inactiveId = await scalar(
        `insert into public.trainer_offers
          (trainer_id, title, type, duration_minutes, price, service_mode, pricing_model)
         values ($1, 'Inaktives Paket', 'paid', 60, 90, 'Online', 'single_session')
         returning id`,
        [ids.trainerA]
      );
      await db.query('update public.trainer_offers set is_active = false where id = $1', [inactiveId]);
    });

    await asRole('authenticated', ids.trainerB, async () => {
      await db.query(
        `insert into public.trainer_offers
          (trainer_id, title, type, duration_minutes, price, service_mode, pricing_model)
         values ($1, 'Pending Paket', 'paid', 60, 80, 'Online', 'single_session')`,
        [ids.trainerB]
      );
    });

    await asRole('anon', null, async () => {
      const offers = await db.query('select title from public.trainer_offers order by title');
      assert.deepEqual(offers.rows, [{ title: 'Aktives Paket' }]);
    });

    await asRole('service_role', ids.admin, async () => {
      await db.query("update public.trainers set status = 'approved' where id = $1", [ids.trainerB]);
    });
  });

  let inquiryA;
  await step('Anfragen nur durch Clients und idempotent erstellen', async () => {
    await asRole('authenticated', ids.clientA, async () => {
      const created = await db.query(
        'select * from public.create_inquiry($1, $2, $3, $4)',
        [ids.trainerA, activeOfferId, 'Bitte kontaktieren Sie mich für ein Erstgespräch.', ids.idempotencyA]
      );
      inquiryA = created.rows[0].inquiry_id;
      assert.equal(created.rows[0].was_created, true);

      const repeated = await db.query(
        'select * from public.create_inquiry($1, $2, $3, $4)',
        [ids.trainerA, activeOfferId, 'Bitte kontaktieren Sie mich für ein Erstgespräch.', ids.idempotencyA]
      );
      assert.equal(repeated.rows[0].inquiry_id, inquiryA);
      assert.equal(repeated.rows[0].was_created, false);
    });

    await asRole('authenticated', ids.clientB, async () => {
      const createdInquiryB = await scalar(
        'select inquiry_id from public.create_inquiry($1, $2, $3, $4)',
        [ids.trainerB, null, 'Ich interessiere mich für ein unverbindliches Gespräch.', ids.idempotencyB]
      );
      assert.ok(createdInquiryB);
      assert.equal(await scalar('select count(*)::int from public.inquiries where id = $1', [inquiryA]), 0);
      await expectDatabaseError(
        () => db.query(
          'insert into public.inquiries (client_id, trainer_id, client_name, client_email, trainer_name, message, idempotency_key) values ($1, $2, $3, $4, $5, $6, gen_random_uuid())',
          [ids.clientB, ids.trainerA, 'Client B', 'client-b@example.test', 'Trainer A', 'Direkter Insert ist verboten.']
        ),
        /permission denied/i
      );
    });

    await asRole('authenticated', ids.trainerA, async () => {
      await expectDatabaseError(
        () => db.query(
          'select * from public.create_inquiry($1, $2, $3, $4)',
          [ids.trainerA, activeOfferId, 'Trainer darf keine Anfrage anlegen.', '40000000-0000-4000-8000-000000000099']
        ),
        /INQUIRY_CLIENT_ONLY/
      );
    });
    await asRole('authenticated', ids.admin, async () => {
      await expectDatabaseError(
        () => db.query(
          'select * from public.create_inquiry($1, $2, $3, $4)',
          [ids.trainerA, activeOfferId, 'Admin darf keine Client-Anfrage anlegen.', '40000000-0000-4000-8000-000000000098']
        ),
        /INQUIRY_CLIENT_ONLY/
      );
    });
  });

  await step('Client-, Trainer- und Admin-Zugriffe trennen', async () => {
    await asRole('authenticated', ids.clientA, async () => {
      assert.equal(await scalar('select count(*)::int from public.inquiries'), 1);
    });
    await asRole('authenticated', ids.trainerA, async () => {
      assert.equal(await scalar('select count(*)::int from public.inquiries'), 1);
    });
    await asRole('authenticated', ids.trainerB, async () => {
      assert.equal(await scalar('select count(*)::int from public.inquiries'), 1);
    });
    await asRole('authenticated', ids.admin, async () => {
      assert.equal(await scalar('select count(*)::int from public.inquiries'), 2);
      assert.equal(await scalar('select count(*)::int from public.inquiry_status_events'), 2);
    });
  });

  await step('erlaubte und verbotene Anfrage-Statusübergänge erzwingen', async () => {
    await asRole('authenticated', ids.trainerB, async () => {
      await expectDatabaseError(
        () => db.query("select public.transition_inquiry_status($1, 'viewed')", [inquiryA]),
        /INQUIRY_NOT_FOUND/
      );
    });
    await asRole('authenticated', ids.clientA, async () => {
      await expectDatabaseError(
        () => db.query("select public.transition_inquiry_status($1, 'viewed')", [inquiryA]),
        /INQUIRY_TRAINER_ONLY/
      );
    });
    await asRole('authenticated', ids.trainerA, async () => {
      await expectDatabaseError(
        () => db.query("select public.transition_inquiry_status($1, 'contacted')", [inquiryA]),
        /INQUIRY_INVALID_TRANSITION/
      );
      assert.equal(await scalar("select public.transition_inquiry_status($1, 'viewed')", [inquiryA]), 'viewed');
      assert.equal(await scalar("select public.transition_inquiry_status($1, 'contacted')", [inquiryA]), 'contacted');
      assert.equal(await scalar("select public.transition_inquiry_status($1, 'closed')", [inquiryA]), 'closed');
    });
    await asRole('authenticated', ids.admin, async () => {
      assert.equal(await scalar('select count(*)::int from public.inquiry_status_events where inquiry_id = $1', [inquiryA]), 4);
    });
  });

  await step('Avatar- und Verifizierungsdokumente nach Eigentümer trennen', async () => {
    await asRole('authenticated', ids.trainerA, async () => {
      await db.query(
        "insert into storage.objects (bucket_id, name, owner_id) values ('avatars', $1, $2)",
        [`${ids.trainerA}/avatar.webp`, ids.trainerA]
      );
      await db.query(
        "insert into storage.objects (bucket_id, name, owner_id) values ('verification-docs', $1, $2)",
        [`${ids.trainerA}/license.pdf`, ids.trainerA]
      );
      const updated = await db.query(
        "update storage.objects set metadata = '{\"verified\":false}'::jsonb where bucket_id = 'verification-docs' and name = $1 returning id",
        [`${ids.trainerA}/license.pdf`]
      );
      assert.equal(updated.rows.length, 1);
      const deleted = await db.query(
        "delete from storage.objects where bucket_id = 'avatars' and name = $1 returning id",
        [`${ids.trainerA}/avatar.webp`]
      );
      assert.equal(deleted.rows.length, 1);
      await expectDatabaseError(
        () => db.query(
          "insert into storage.objects (bucket_id, name, owner_id) values ('verification-docs', $1, $2)",
          [`${ids.trainerB}/forged.pdf`, ids.trainerA]
        ),
        /row-level security/i
      );
    });

    await asRole('authenticated', ids.trainerB, async () => {
      assert.equal(await scalar("select count(*)::int from storage.objects where bucket_id = 'verification-docs'"), 0);
      assert.equal(await scalar("select count(*)::int from storage.objects where bucket_id = 'avatars'"), 0);
      const foreignUpdate = await db.query(
        "update storage.objects set metadata = '{}'::jsonb where bucket_id = 'verification-docs' and name = $1 returning id",
        [`${ids.trainerA}/license.pdf`]
      );
      assert.equal(foreignUpdate.rows.length, 0);
      const foreignDelete = await db.query(
        "delete from storage.objects where bucket_id = 'verification-docs' and name = $1 returning id",
        [`${ids.trainerA}/license.pdf`]
      );
      assert.equal(foreignDelete.rows.length, 0);
    });

    await asRole('anon', null, async () => {
      assert.equal(await scalar('select count(*)::int from storage.objects'), 0);
    });

    await asRole('service_role', ids.admin, async () => {
      assert.equal(await scalar("select count(*)::int from storage.objects where bucket_id = 'verification-docs'"), 1);
    });
  });

  await step('Kontolöschung ohne Anfrage erlauben und mit Anfrage blockieren', async () => {
    await asRole('authenticated', ids.trainerWithoutInquiry, async () => {
      await db.query(
        `insert into public.trainer_offers
          (trainer_id, title, type, duration_minutes, price, service_mode, pricing_model)
         values ($1, 'Zu löschendes Angebot', 'paid', 45, 70, 'Vor Ort', 'single_session')`,
        [ids.trainerWithoutInquiry]
      );
    });
    await asRole('service_role', ids.admin, async () => {
      await db.query('select public.delete_user_data($1)', [ids.clientWithoutInquiry]);
      assert.equal(await scalar('select count(*)::int from public.profiles where id = $1', [ids.clientWithoutInquiry]), 0);
      assert.equal(await scalar('select count(*)::int from public.clients where id = $1', [ids.clientWithoutInquiry]), 0);

      await expectDatabaseError(
        () => db.query('select public.delete_user_data($1)', [ids.clientA]),
        /ACCOUNT_DELETION_REQUIRES_INQUIRY_RETENTION_DECISION/
      );
      assert.equal(await scalar('select count(*)::int from public.profiles where id = $1', [ids.clientA]), 1);

      await db.query('select public.delete_user_data($1)', [ids.trainerWithoutInquiry]);
      assert.equal(await scalar('select count(*)::int from public.trainer_offers where trainer_id = $1', [ids.trainerWithoutInquiry]), 0);
      assert.equal(await scalar('select count(*)::int from public.trainers where id = $1', [ids.trainerWithoutInquiry]), 0);
      assert.equal(await scalar('select count(*)::int from public.profiles where id = $1', [ids.trainerWithoutInquiry]), 0);
    });
    assert.equal(await scalar('select count(*)::int from auth.users where id = $1', [ids.clientWithoutInquiry]), 1);
    assert.equal(await scalar('select count(*)::int from auth.users where id = $1', [ids.trainerWithoutInquiry]), 1);
  });

  await step('privilegierte Funktionen auf Rechte und leeren search_path prüfen', async () => {
    const functions = await db.query(`
      select namespace.nspname as schema_name,
             procedure.proname as function_name,
             procedure.prosecdef as security_definer,
             procedure.proconfig
      from pg_proc procedure
      join pg_namespace namespace on namespace.oid = procedure.pronamespace
      where (namespace.nspname, procedure.proname) in (
        ('verifit_private', 'is_admin'),
        ('verifit_private', 'is_approved_trainer'),
        ('verifit_private', 'public_trainers'),
        ('verifit_private', 'handle_new_user'),
        ('public', 'create_inquiry'),
        ('public', 'transition_inquiry_status'),
        ('public', 'assert_user_deletion_allowed'),
        ('public', 'delete_user_data')
      )
      order by 1, 2
    `);
    assert.equal(functions.rows.length, 8);
    for (const fn of functions.rows) {
      assert.equal(fn.security_definer, true, `${fn.schema_name}.${fn.function_name} muss SECURITY DEFINER sein`);
      assert.ok(fn.proconfig?.includes('search_path=""'), `${fn.schema_name}.${fn.function_name} braucht search_path=''`);
    }

    assert.equal(await scalar("select has_function_privilege('anon', 'public.create_inquiry(uuid,uuid,text,uuid)', 'execute')"), false);
    assert.equal(await scalar("select has_function_privilege('authenticated', 'public.create_inquiry(uuid,uuid,text,uuid)', 'execute')"), true);
    assert.equal(await scalar("select has_function_privilege('authenticated', 'public.delete_user_data(uuid)', 'execute')"), false);
    assert.equal(await scalar("select has_function_privilege('service_role', 'public.delete_user_data(uuid)', 'execute')"), true);
  });

  console.log(`\n${completed.length} Laufzeitprüfungen erfolgreich.`);
} finally {
  await db.close();
}
