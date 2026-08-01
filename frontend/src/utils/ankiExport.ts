import initSqlJs from 'sql.js';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const SEPARATOR = '\u001F';

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function generateId(base: number, offset: number): number {
  return base + offset;
}

const TEMPLATE_SQL = (deckName: string, deckId: number, modelId: number) => {
  const conf = JSON.stringify({
    nextPos: 1, estTimes: true, activeDecks: [1], sortType: 'noteFld',
    timeLim: 0, sortBackwards: false, addToCur: true, curDeck: 1,
    newBury: true, newSpread: 0, dueCounts: true, curModel: String(modelId), collapseTime: 1200,
  });

  const models = JSON.stringify({
    [modelId]: {
      vers: [], name: deckName, tags: [], did: deckId, usn: -1,
      req: [[0, 'all', [0]]],
      flds: [
        { name: 'Front', media: [], sticky: false, rtl: false, ord: 0, font: 'Arial', size: 20 },
        { name: 'Back', media: [], sticky: false, rtl: false, ord: 1, font: 'Arial', size: 20 },
      ],
      sortf: 0,
      latexPre: '\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n',
      tmpls: [{
        name: 'Card 1', qfmt: '{{Front}}', did: null, bafmt: '',
        afmt: '{{FrontSide}}\n\n<hr id="answer">\n\n{{Back}}', ord: 0, bqfmt: '',
      }],
      latexPost: '\\end{document}', type: 0, id: modelId,
      css: '.card { font-family: arial; font-size: 20px; text-align: center; color: black; background-color: white; }',
      mod: Math.floor(Date.now() / 1000),
    },
  });

  const decks = JSON.stringify({
    1: {
      desc: '', name: 'Default', extendRev: 50, usn: 0, collapsed: false,
      newToday: [0, 0], timeToday: [0, 0], dyn: 0, extendNew: 10, conf: 1,
      revToday: [0, 0], lrnToday: [0, 0], id: 1, mod: Math.floor(Date.now() / 1000),
    },
    [deckId]: {
      desc: '', name: deckName, extendRev: 50, usn: -1, collapsed: false,
      newToday: [0, 0], timeToday: [0, 0], dyn: 0, extendNew: 10, conf: 1,
      revToday: [0, 0], lrnToday: [0, 0], id: deckId, mod: Math.floor(Date.now() / 1000),
    },
  });

  const dconf = JSON.stringify({
    1: {
      name: 'Default', replayq: true,
      lapse: { leechFails: 8, minInt: 1, delays: [10], leechAction: 0, mult: 0 },
      rev: { perDay: 100, fuzz: 0.05, ivlFct: 1, maxIvl: 36500, ease4: 1.3, bury: true, minSpace: 1 },
      timer: 0, maxTaken: 60, usn: 0,
      new: { perDay: 20, delays: [1, 10], separate: true, ints: [1, 4, 7], initialFactor: 2500, bury: true, order: 1 },
      mod: 0, id: 1, autoplay: true,
    },
  });

  return `
PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE col (id integer primary key, crt integer not null, mod integer not null, scm integer not null, ver integer not null, dty integer not null, usn integer not null, ls integer not null, conf text not null, models text not null, decks text not null, dconf text not null, tags text not null);
INSERT INTO col VALUES(1,1388548800,${Date.now()},${Date.now()},11,0,0,0,'${conf}','${models}','${decks}','${dconf}','{}');
CREATE TABLE notes (id integer primary key, guid text not null, mid integer not null, mod integer not null, usn integer not null, tags text not null, flds text not null, sfld integer not null, csum integer not null, flags integer not null, data text not null);
CREATE TABLE cards (id integer primary key, nid integer not null, did integer not null, ord integer not null, mod integer not null, usn integer not null, type integer not null, queue integer not null, due integer not null, ivl integer not null, factor integer not null, reps integer not null, lapses integer not null, left integer not null, odue integer not null, odid integer not null, flags integer not null, data text not null);
CREATE TABLE revlog (id integer primary key, cid integer not null, usn integer not null, ease integer not null, ivl integer not null, lastIvl integer not null, factor integer not null, time integer not null, type integer not null);
CREATE TABLE graves (usn integer not null, oid integer not null, type integer not null);
CREATE INDEX ix_notes_usn on notes (usn);
CREATE INDEX ix_cards_usn on cards (usn);
CREATE INDEX ix_revlog_usn on revlog (usn);
CREATE INDEX ix_cards_nid on cards (nid);
CREATE INDEX ix_cards_sched on cards (did, queue, due);
CREATE INDEX ix_revlog_cid on revlog (cid);
CREATE INDEX ix_notes_csum on notes (csum);
COMMIT;`;
};

export async function exportToAnki(
  deckName: string,
  cards: { front: string; back: string }[],
) {
  const SQL = await initSqlJs();
  const now = Date.now();
  const deckId = now;
  const modelId = now + 1;

  const db = new SQL.Database();
  db.run(TEMPLATE_SQL(deckName, deckId, modelId));

  cards.forEach((card, i) => {
    const noteId = generateId(now, i * 2 + 10);
    const cardId = generateId(now, i * 2 + 11);
    const guid = String(hashCode(`${deckId}${card.front}${card.back}`));
    const flds = card.front + SEPARATOR + card.back;
    const csum = hashCode(flds) >>> 0;
    const mod = Math.floor(now / 1000) + i;

    db.run(
      'INSERT INTO notes VALUES(?,?,?,?,?,?,?,?,?,?,?)',
      [noteId, guid, modelId, mod, -1, '', flds, card.front, csum, 0, ''],
    );
    db.run(
      'INSERT INTO cards VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [cardId, noteId, deckId, 0, mod, -1, 0, 0, i, 0, 0, 0, 0, 0, 0, 0, 0, ''],
    );
  });

  const binaryArray = db.export();
  db.close();

  const zip = new JSZip();
  zip.file('collection.anki2', binaryArray);
  zip.file('media', '{}');

  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, `${deckName}.apkg`);
}
