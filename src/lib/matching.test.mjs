import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  compareOfferPrice,
  getAvailableExperienceLevels,
  getAvailableGoals,
  getAvailableServiceModes,
  getCandidateOffers,
  getMatchingOffers,
  isMissingPhase3MetadataError,
  isOfferTypePriceValid,
  normalizeDatabasePrice,
  normalizeTargetLevels,
  offerMetadataForPersistence,
  offerSupportsMode,
  partitionMatchingTrainers,
  reconcileDynamicMatchingAnswers,
  toggleTargetLevelSelection,
  validateOfferMetadata,
} from './matching.ts';
import { isAuthorizationError, isInvalidPayloadError, isMissingRelationError } from './supabaseErrors.ts';
import { isOwnedVerificationDocumentPath } from './verificationDocuments.ts';

const answers = {
  experience: 'Fortgeschritten', goal: 'Muskelaufbau', mode: 'Vor Ort',
  sessionsPerMonth: 4, monthlyBudget: 240,
};

function offer(patch = {}) {
  return {
    id: 'offer-1', title: 'Training', type: 'paid', isActive: true, price: 60, serviceMode: 'Vor Ort',
    durationMinutes: 60, pricingModel: 'single_session', includedSessions: null, ...patch,
  };
}

function trainer(patch = {}) {
  return {
    id: 'trainer-1', name: 'Anna', specialties: ['Muskelaufbau'], targetLevels: ['Fortgeschritten'],
    offers: [offer()], ...patch,
  };
}

test('Einzeltraining: 60 Euro mal vier Einheiten ergibt 240 Euro und liegt exakt im Budget', () => {
  const result = compareOfferPrice(offer(), 4, 240);
  assert.equal(result.monthlyCost, 240);
  assert.equal(result.withinBudget, true);
});

test('Paket verwendet Gesamtpreis und enthaltene Einheiten ohne blinde Multiplikation', () => {
  const result = compareOfferPrice(offer({ price: 500, pricingModel: 'package', includedSessions: 10 }), 4, 300);
  assert.equal(result.monthlyCost, null);
  assert.equal(result.unitPrice, 50);
  assert.equal(result.withinBudget, null);
});

test('Paket bleibt ohne Laufzeit auch bei exakt passender Einheitenzahl monatlich nicht vergleichbar', () => {
  const result = compareOfferPrice(offer({ price: 240, pricingModel: 'package', includedSessions: 4 }), 4, 240);
  assert.equal(result.monthlyCost, null);
  assert.equal(result.unitPrice, 60);
  assert.equal(result.withinBudget, null);
});

test('Monatliche Pauschale wird nicht mit Einheiten multipliziert', () => {
  const result = compareOfferPrice(offer({ price: 180, pricingModel: 'monthly' }), 8, 200);
  assert.equal(result.monthlyCost, 180);
  assert.equal(result.withinBudget, true);
});

test('Fehlender Preis wird nicht als kostenlos oder innerhalb des Budgets behandelt', () => {
  const result = compareOfferPrice(offer({ price: null }), 4, 500);
  assert.equal(result.monthlyCost, null);
  assert.equal(result.withinBudget, null);
});

test('Nur kostenlose Erstgespräche und tatsächlich positive Bezahlpreise sind konsistent', () => {
  assert.equal(isOfferTypePriceValid('discovery', 0), true);
  assert.equal(isOfferTypePriceValid('discovery', 50), false);
  assert.equal(isOfferTypePriceValid('paid', 50), true);
  assert.equal(isOfferTypePriceValid('paid', 0), false);
  assert.equal(getMatchingOffers(trainer({ offers: [offer({ price: 0 })] }), answers).length, 0);
});

test('Angebot oberhalb des Budgets wird transparent markiert', () => {
  assert.equal(compareOfferPrice(offer({ price: 61 }), 4, 240).withinBudget, false);
});

test('Hybrid deckt einzelne Formen ab, eine einzelne Form aber keine Hybrid-Anfrage', () => {
  assert.equal(offerSupportsMode('Hybrid', 'Online'), true);
  assert.equal(offerSupportsMode('Online', 'Hybrid'), false);
  assert.equal(offerSupportsMode(null, 'Online'), false);
});

test('Partielle Kandidatenlogik verwendet für Niveau, Fachgebiet und Ergebnis dieselben Regeln', () => {
  const trainers = [
    trainer({ id: 'beginner', specialties: ['Muskelaufbau', 'Gewichtsmanagement'], targetLevels: ['Anfänger'] }),
    trainer({ id: 'advanced', specialties: ['Muskelaufbau'], targetLevels: ['Fortgeschritten'] }),
  ];

  assert.deepEqual(getAvailableExperienceLevels(trainers), ['Anfänger', 'Fortgeschritten']);
  assert.deepEqual(new Set(getAvailableGoals(trainers, 'Anfänger')), new Set(['Muskelaufbau', 'Gewichtsmanagement']));
  assert.deepEqual(getAvailableGoals(trainers, 'Profi'), []);
  assert.equal(getCandidateOffers(trainers[1], { experience: 'Fortgeschritten', goal: 'Muskelaufbau' }).length, 1);
  assert.equal(getMatchingOffers(trainers[1], answers).length, 1);
});

test('Trainingsformen werden aus tatsächlichen Angeboten mit der gemeinsamen Hybrid-Regel abgeleitet', () => {
  const onlineAndOnsite = trainer({
    offers: [offer({ id: 'online', serviceMode: 'Online' }), offer({ id: 'onsite', serviceMode: 'Vor Ort' })],
  });
  const hybrid = trainer({ id: 'hybrid', offers: [offer({ id: 'hybrid-offer', serviceMode: 'Hybrid' })] });
  const criteria = { experience: 'Fortgeschritten', goal: 'Muskelaufbau' };

  assert.deepEqual(getAvailableServiceModes([onlineAndOnsite], criteria), ['Vor Ort', 'Online']);
  assert.deepEqual(getAvailableServiceModes([hybrid], criteria), ['Vor Ort', 'Online', 'Hybrid']);
});

test('Inaktive, kostenlose und nicht klassifizierte Angebote erzeugen keine dynamischen Optionen', () => {
  const unavailable = [
    trainer({ id: 'inactive', offers: [offer({ isActive: false })] }),
    trainer({ id: 'discovery', offers: [offer({ type: 'discovery', price: 0 })] }),
    trainer({ id: 'unclassified', offers: [offer({ serviceMode: null })] }),
    trainer({ id: 'without-specialty', specialties: [] }),
  ];

  assert.deepEqual(getAvailableExperienceLevels(unavailable), []);
  assert.deepEqual(getAvailableGoals(unavailable, 'Fortgeschritten'), []);
  assert.deepEqual(getAvailableServiceModes(unavailable, answers), []);
});

test('Revalidierung erhält gültige Folgeantworten und entfernt nur ungültige Ziel- oder Formwerte', () => {
  const trainers = [
    trainer({ id: 'beginner-online', targetLevels: ['Anfänger'], offers: [offer({ serviceMode: 'Online' })] }),
    trainer({ id: 'advanced-onsite', targetLevels: ['Fortgeschritten'], offers: [offer({ serviceMode: 'Vor Ort' })] }),
    trainer({
      id: 'advanced-mobility',
      specialties: ['Mobility & Stretching'],
      targetLevels: ['Fortgeschritten'],
      offers: [offer({ serviceMode: 'Online' })],
    }),
  ];
  const downstream = { sessionsPerMonth: 4, monthlyBudget: 250 };

  assert.deepEqual(
    reconcileDynamicMatchingAnswers(trainers, {
      experience: 'Fortgeschritten', goal: 'Mobility & Stretching', mode: 'Online', ...downstream,
    }),
    { experience: 'Fortgeschritten', goal: 'Mobility & Stretching', mode: 'Online', ...downstream }
  );
  assert.deepEqual(
    reconcileDynamicMatchingAnswers(trainers, {
      experience: 'Fortgeschritten', goal: 'Muskelaufbau', mode: 'Online', ...downstream,
    }),
    { experience: 'Fortgeschritten', goal: 'Muskelaufbau', mode: '', ...downstream }
  );
  assert.deepEqual(
    reconcileDynamicMatchingAnswers(trainers, {
      experience: 'Anfänger', goal: 'Mobility & Stretching', mode: 'Online', ...downstream,
    }),
    { experience: 'Anfänger', goal: '', mode: '', ...downstream }
  );
});

test('Ziel, Niveau und Angebotsform sind harte, belegte Kriterien', () => {
  assert.equal(getMatchingOffers(trainer(), answers).length, 1);
  assert.equal(getMatchingOffers(trainer({ targetLevels: [] }), answers).length, 0);
  assert.equal(getMatchingOffers(trainer({ offers: [offer({ serviceMode: 'Online' })] }), answers).length, 0);
});

test('Passendes Kundenniveau und passender Trainer ergeben genau ein Matching-Angebot', () => {
  assert.equal(getMatchingOffers(trainer(), answers).length, 1);
});

test('Ein nicht passendes Kundenniveau schließt den Trainer aus', () => {
  assert.equal(getMatchingOffers(trainer({ targetLevels: ['Anfänger'] }), answers).length, 0);
});

test('Ein Trainer ohne gepflegte Zielniveaus wird nicht als passend angenommen', () => {
  assert.equal(getMatchingOffers(trainer({ targetLevels: [] }), answers).length, 0);
});

test('Ein inaktives Angebot wird auch bei sonst vollständiger Übereinstimmung ausgeschlossen', () => {
  assert.equal(getMatchingOffers(trainer({ offers: [offer({ isActive: false })] }), answers).length, 0);
});

test('Gespeicherte Betreuungsniveaus werden dedupliziert und in einheitlicher Reihenfolge übernommen', () => {
  assert.deepEqual(
    normalizeTargetLevels(['Profi', 'Anfänger', 'Profi', 'Fortgeschritten']),
    ['Anfänger', 'Fortgeschritten', 'Profi']
  );
});

test('Zielniveau-Auswahl verwendet ausschließlich die drei unterstützten Werte', () => {
  assert.deepEqual(toggleTargetLevelSelection(['Profi'], 'Anfänger'), ['Anfänger', 'Profi']);
  assert.deepEqual(toggleTargetLevelSelection(['Anfänger', 'Profi'], 'Profi'), ['Anfänger']);
});

test('Anfänger, Fortgeschrittene und Profis matchen jeweils nur bei ausdrücklicher Auswahl', () => {
  const allLevels = trainer({ targetLevels: ['Anfänger', 'Fortgeschritten', 'Profi'] });

  for (const experience of ['Anfänger', 'Fortgeschritten', 'Profi']) {
    assert.equal(getMatchingOffers(allLevels, { ...answers, experience }).length, 1);
    assert.equal(getMatchingOffers(trainer({ targetLevels: [] }), { ...answers, experience }).length, 0);
  }
});

test('Fehlende, falsch formatierte und unerwartete Betreuungsniveaus werden nicht als Match übernommen', () => {
  assert.deepEqual(normalizeTargetLevels(null), []);
  assert.deepEqual(normalizeTargetLevels('Anfänger'), []);
  assert.deepEqual(normalizeTargetLevels(['Anfänger', 'Unbekannt', null]), ['Anfänger']);
});

test('Exakte Treffer und Alternativen werden getrennt und nachvollziehbar sortiert', () => {
  const result = partitionMatchingTrainers([
    trainer({ id: 'expensive', name: 'Teuer', offers: [offer({ price: 80 })] }),
    trainer({ id: 'package', name: 'Paket', offers: [offer({ price: 300, pricingModel: 'package', includedSessions: 6 })] }),
    trainer({ id: 'unknown', name: 'Unklar', offers: [offer({ pricingModel: null })] }),
    trainer({ id: 'fit', name: 'Passend' }),
  ], answers);
  assert.deepEqual(result.exact.map(({ trainer: item }) => item.id), ['fit']);
  assert.deepEqual(result.alternatives.map(({ trainer: item }) => item.id), ['package', 'expensive']);
});

test('Budgetpassendes Einzeltraining ist ein exakter Treffer', () => {
  const result = partitionMatchingTrainers([trainer()], answers);
  assert.deepEqual(result.exact.map(({ trainer: item }) => item.id), ['trainer-1']);
  assert.deepEqual(result.alternatives, []);
});

test('Budgetpassender Monatstarif ist exakt, ein zu teurer Monatstarif nur Alternative', () => {
  const withinBudget = trainer({ id: 'monthly-fit', offers: [offer({ pricingModel: 'monthly', price: 200 })] });
  const aboveBudget = trainer({ id: 'monthly-expensive', offers: [offer({ pricingModel: 'monthly', price: 280 })] });
  const result = partitionMatchingTrainers([aboveBudget, withinBudget], answers);

  assert.deepEqual(result.exact.map(({ trainer: item }) => item.id), ['monthly-fit']);
  assert.deepEqual(result.alternatives.map(({ trainer: item }) => item.id), ['monthly-expensive']);
  assert.deepEqual(result.alternatives[0].offers[0].reason, { type: 'budget_exceeded', amount: 40 });
});

test('Zu teures Einzeltraining verwendet dieselbe Monatskostenbasis für den Alternativgrund', () => {
  const result = partitionMatchingTrainers([trainer({ offers: [offer({ price: 70 })] })], answers);

  assert.equal(result.exact.length, 0);
  assert.equal(result.alternatives[0].offers[0].comparison.monthlyCost, 280);
  assert.deepEqual(result.alternatives[0].offers[0].reason, { type: 'budget_exceeded', amount: 40 });
});

test('Paket wird mit belegtem Gesamt- und Einheitspreis nur als Alternative ausgewiesen', () => {
  const result = partitionMatchingTrainers([
    trainer({ offers: [offer({ price: 300, pricingModel: 'package', includedSessions: 6 })] }),
  ], answers);

  assert.equal(result.exact.length, 0);
  assert.equal(result.alternatives[0].offers[0].comparison.monthlyCost, null);
  assert.deepEqual(result.alternatives[0].offers[0].reason, {
    type: 'package_not_monthly_comparable', totalPrice: 300, includedSessions: 6, unitPrice: 50,
  });
});

test('Paket ohne positive Einheitenzahl, Discovery und inaktive Angebote sind keine Ergebnisse', () => {
  const result = partitionMatchingTrainers([
    trainer({ id: 'package-without-sessions', offers: [offer({ pricingModel: 'package', includedSessions: null })] }),
    trainer({ id: 'package-zero-sessions', offers: [offer({ pricingModel: 'package', includedSessions: 0 })] }),
    trainer({ id: 'discovery', offers: [offer({ type: 'discovery', price: 0 })] }),
    trainer({ id: 'inactive', offers: [offer({ isActive: false })] }),
  ], answers);

  assert.deepEqual(result, { exact: [], alternatives: [] });
});

test('Fehlende, null, negative und nicht endliche Preise werden ausgeschlossen', () => {
  const result = partitionMatchingTrainers([
    trainer({ id: 'missing', offers: [offer({ price: undefined })] }),
    trainer({ id: 'null', offers: [offer({ price: null })] }),
    trainer({ id: 'zero', offers: [offer({ price: 0 })] }),
    trainer({ id: 'negative', offers: [offer({ price: -1 })] }),
    trainer({ id: 'infinite', offers: [offer({ price: Number.POSITIVE_INFINITY })] }),
    trainer({ id: 'nan', offers: [offer({ price: Number.NaN })] }),
  ], answers);

  assert.deepEqual(result, { exact: [], alternatives: [] });
});

test('Trainer mit exaktem Angebot erscheint trotz alternativen Angebots nur einmal', () => {
  const result = partitionMatchingTrainers([
    trainer({ offers: [offer({ id: 'exact' }), offer({ id: 'expensive', price: 90 })] }),
  ], answers);

  assert.equal(result.exact.length, 1);
  assert.deepEqual(result.exact[0].offers.map(({ offer: item }) => item.id), ['exact']);
  assert.equal(result.alternatives.length, 0);
});

test('Mehrere passende Angebote erzeugen nur einen Trainereintrag', () => {
  const matchingTrainer = trainer({
    offers: [offer({ id: 'first', price: 50 }), offer({ id: 'second', price: 60 })],
  });
  const result = partitionMatchingTrainers(
    [matchingTrainer, { ...matchingTrainer, name: 'Doppelter Quelldatensatz' }],
    answers
  );

  assert.equal(result.exact.length, 1);
  assert.equal(result.exact[0].offers.length, 2);
});

test('Alternativen werden auf höchstens drei Trainer begrenzt', () => {
  const result = partitionMatchingTrainers(
    Array.from({ length: 5 }, (_, index) => trainer({
      id: `alternative-${index}`,
      name: `Alternative ${index}`,
      offers: [offer({ id: `offer-${index}`, price: 80 + index })],
    })),
    answers
  );

  assert.equal(result.alternatives.length, 3);
});

test('Fehlendes Budget oder fehlende Einheiten erzeugen keine exakten Treffer', () => {
  assert.deepEqual(partitionMatchingTrainers([trainer()], { ...answers, monthlyBudget: null }), { exact: [], alternatives: [] });
  assert.deepEqual(partitionMatchingTrainers([trainer()], { ...answers, sessionsPerMonth: null }), { exact: [], alternatives: [] });
});

test('Freitext und unbekannte Abrechnungsmodelle erweitern die Kernkriterien nicht', () => {
  const result = partitionMatchingTrainers([
    trainer({
      id: 'bio-only', specialties: ['Gewichtsmanagement'], bio: 'Muskelaufbau für Fortgeschrittene',
      offers: [offer({ title: 'Muskelaufbau vor Ort' })],
    }),
    trainer({ id: 'unknown-model', offers: [offer({ pricingModel: 'weekly' })] }),
  ], answers);

  assert.deepEqual(result, { exact: [], alternatives: [] });
});

test('Ohne zulässigen Alternativgrund bleibt die Alternativgruppe leer', () => {
  const result = partitionMatchingTrainers([trainer()], answers);
  assert.equal(result.exact.length, 1);
  assert.deepEqual(result.alternatives, []);
});

test('Datenbankpreise unterscheiden NULL und leere Werte von einem echten Zahlenwert', () => {
  assert.equal(normalizeDatabasePrice(null), null);
  assert.equal(normalizeDatabasePrice(''), null);
  assert.equal(normalizeDatabasePrice('60.50'), 60.5);
});

test('Legacy-Fallback akzeptiert nur belegte Fehler zu fehlenden Phase-3-Spalten', () => {
  assert.equal(isMissingPhase3MetadataError({ code: '42703', message: 'column trainers.target_levels does not exist' }), true);
  assert.equal(isMissingPhase3MetadataError({ code: 'PGRST204', message: "Could not find the 'pricing_model' column" }), true);
  assert.equal(isMissingPhase3MetadataError({ code: '42501', message: 'permission denied' }), false);
  assert.equal(isMissingPhase3MetadataError({ code: '42703', message: 'column trainers.email does not exist' }), false);
});

test('View-Fallback akzeptiert nur eine exakt fehlende Relation', () => {
  assert.equal(isMissingRelationError({ code: '42P01', message: 'relation trainers_public does not exist' }, 'trainers_public'), true);
  assert.equal(isMissingRelationError({ code: 'PGRST205', message: "Could not find 'trainers_public' in the schema cache" }, 'trainers_public'), true);
  assert.equal(isMissingRelationError({ code: '42501', message: 'permission denied for trainers_public' }, 'trainers_public'), false);
  assert.equal(isMissingRelationError({ code: '42P01', message: 'relation profiles does not exist' }, 'trainers_public'), false);
  assert.equal(isMissingRelationError({ code: 'PGRST205', message: "Could not find 'profiles' in the schema cache" }, 'trainers_public'), false);
});

test('Eine fehlende öffentliche View bleibt von einer echten leeren Ergebnisliste unterscheidbar', () => {
  assert.equal(isMissingRelationError({ code: 'PGRST205', message: "Could not find 'trainers_public' in the schema cache" }, 'trainers_public'), true);
  assert.deepEqual(partitionMatchingTrainers([], answers), { exact: [], alternatives: [] });
});

test('Kostenloses Kennenlernen ignoriert alte Paketwerte, Pakete benötigen enthaltene Einheiten', () => {
  assert.equal(validateOfferMetadata({
    type: 'discovery', price: 0, serviceMode: 'Online', pricingModel: 'package', includedSessions: null,
  }), null);
  assert.equal(validateOfferMetadata({
    type: 'paid', price: 200, serviceMode: 'Online', pricingModel: 'package', includedSessions: null,
  }), 'Bitte gib an, wie viele Einheiten das Paket enthält.');
  assert.equal(validateOfferMetadata({
    type: 'paid', price: 200, serviceMode: 'Online', pricingModel: 'package', includedSessions: 4,
  }), null);
  assert.deepEqual(offerMetadataForPersistence({
    type: 'discovery', serviceMode: 'Online', pricingModel: 'package', includedSessions: 4,
  }), { service_mode: 'Online', pricing_model: null, included_sessions: null });
  assert.deepEqual(offerMetadataForPersistence({
    type: 'paid', serviceMode: 'Online', pricingModel: 'single_session', includedSessions: 4,
  }), { service_mode: 'Online', pricing_model: 'single_session', included_sessions: null });
  assert.deepEqual(offerMetadataForPersistence({
    type: 'paid', serviceMode: 'Online', pricingModel: 'package', includedSessions: 4,
  }), { service_mode: 'Online', pricing_model: 'package', included_sessions: 4 });
});

test('Berechtigungsfehler bleiben von Schemafehlern unterscheidbar', () => {
  assert.equal(isAuthorizationError({ code: '42501', message: 'permission denied' }), true);
  assert.equal(isAuthorizationError({ code: 'PGRST301', message: 'JWT expired' }), true);
  assert.equal(isAuthorizationError({ code: '42703', message: 'column target_levels does not exist' }), false);
});

test('Ungültige Payloads bleiben von Berechtigungsfehlern unterscheidbar', () => {
  assert.equal(isInvalidPayloadError({ code: '23514', message: 'check constraint failed' }), true);
  assert.equal(isInvalidPayloadError({ code: '22P02', message: 'invalid input syntax' }), true);
  assert.equal(isInvalidPayloadError({ code: '42501', message: 'permission denied' }), false);
});

test('Verifizierungsdokumente bleiben an Nutzer, Typ und Dateiformat gebunden', () => {
  const trainerId = '11111111-1111-4111-8111-111111111111';
  assert.equal(isOwnedVerificationDocumentPath(trainerId, 'license', `${trainerId}/license-1728670000000.pdf`), true);
  assert.equal(isOwnedVerificationDocumentPath(trainerId, 'insurance', `${trainerId}/license-1728670000000.pdf`), false);
  assert.equal(isOwnedVerificationDocumentPath(trainerId, 'license', `other-user/license-1728670000000.pdf`), false);
  assert.equal(isOwnedVerificationDocumentPath(trainerId, 'license', `${trainerId}/folder/license-1728670000000.pdf`), false);
  assert.equal(isOwnedVerificationDocumentPath(trainerId, 'license', `${trainerId}/license-anything.pdf`), false);
});

test('Ergebnisse bleiben ohne Slot-Daten deterministisch nach Name und Quellreihenfolge sortiert', () => {
  const result = partitionMatchingTrainers([
    trainer({ id: 'zoe', name: 'Zoe' }),
    trainer({ id: 'anna-first', name: 'Anna' }),
    trainer({ id: 'anna-second', name: 'Anna' }),
  ], answers);

  assert.deepEqual(
    result.exact.map(({ trainer: item }) => item.id),
    ['anna-first', 'anna-second', 'zoe']
  );
});

const quizSource = await readFile(new URL('../app/quiz/page.tsx', import.meta.url), 'utf8');

test('Quiz funktioniert ohne vorhandene Slot-Tabelle', () => {
  assert.doesNotMatch(quizSource, /trainer_slots/);
});

test('Ein Slot-Ladefehler kann Quiz-Ergebnisse nicht mehr blockieren', () => {
  assert.doesNotMatch(quizSource, /freeSlots|isFutureFreeSlot|slotRes/);
});
