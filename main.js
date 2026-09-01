/**
 * ScanRebut — backend Apps Script.
 *
 * Format attendu du code-barres : reference-date-code_defaut-numero_unique
 * Exemple : EF4052C-20260903-280012-192327098
 *
 * Deux façons d'utiliser ce backend :
 *  - doGet() sert l'interface historique (index.html), utilisable telle
 *    quelle mais avec un scan « photo unique » (l'iframe sandbox d'Apps
 *    Script bloque le flux vidéo continu getUserMedia).
 *  - doPost() est une API JSON appelée depuis la page GitHub Pages
 *    (docs/index.html) qui, elle, tourne hors du sandbox Apps Script et
 *    peut donc faire du scan vidéo continu.
 *
 * Dans les deux cas, la validation OK/NOK (référence + anti-doublon) est
 * faite côté client ; ce backend se contente d'enregistrer la session
 * validée (tri par code défaut) en JSON sur le Drive de l'utilisateur.
 */

// Jeton anti-abus simple pour l'API doPost (endpoint public ANYONE_ANONYMOUS).
// Visible côté client (docs/index.html) : ça filtre les appels au hasard,
// ce n'est pas une vraie authentification.
var API_SECRET = 'srb_7hq2m9wz4k1x';

function doGet(e) {
  return HtmlService
    .createHtmlOutputFromFile('index')
    .setTitle('ScanRebut')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * API JSON utilisée par la page GitHub Pages (fetch cross-origin).
 * Corps attendu : {"secret": "...", "reference": "...", "scans": [...]}
 */
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.secret !== API_SECRET) {
      return jsonOutput({ error: 'unauthorized' });
    }
    var result = buildAndSaveSession(body.reference, body.scans);
    return jsonOutput(result);
  } catch (err) {
    return jsonOutput({ error: String(err) });
  }
}

function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Appelée depuis l'interface index.html (doGet) via google.script.run.
 * Conservée pour compatibilité ; délègue à buildAndSaveSession.
 *
 * @param {string} reference Référence en cours de contrôle.
 * @param {Array<Object>} scans Scans validés OK de la session.
 * @return {Object} Résumé {fileName, fileUrl, fileId, total, tri}.
 */
function saveSession(reference, scans) {
  return buildAndSaveSession(reference, scans);
}

/**
 * Construit le tri par code défaut et sauvegarde un fichier JSON sur le
 * Drive de l'utilisateur.
 *
 * @param {string} reference Référence en cours de contrôle.
 * @param {Array<Object>} scans Scans validés OK de la session, chacun
 *   sous la forme {codeBarre, reference, date, codeDefaut, numeroUnique, timestamp}.
 * @return {Object} Résumé {fileName, fileUrl, fileId, total, tri}.
 */
function buildAndSaveSession(reference, scans) {
  reference = String(reference || '').trim();
  scans = Array.isArray(scans) ? scans : [];

  var tri = {};
  scans.forEach(function (s) {
    var code = String((s && s.codeDefaut) || 'INCONNU');
    tri[code] = (tri[code] || 0) + 1;
  });

  var tz = Session.getScriptTimeZone();
  var horodatage = Utilities.formatDate(new Date(), tz, 'yyyyMMdd_HHmmss');
  var nomFichier = 'Rebuts_' + (reference || 'SANS_REF') + '_' + horodatage + '.json';

  var payload = {
    reference: reference,
    dateGeneration: new Date().toISOString(),
    total: scans.length,
    triParCodeDefaut: tri,
    detail: scans
  };

  var blob = Utilities.newBlob(
    JSON.stringify(payload, null, 2),
    'application/json',
    nomFichier
  );
  var fichier = DriveApp.createFile(blob);

  return {
    fileName: nomFichier,
    fileUrl: fichier.getUrl(),
    fileId: fichier.getId(),
    total: scans.length,
    tri: tri
  };
}
